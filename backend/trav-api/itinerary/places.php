<?php
/**
 * 地點標籤：依 Google Place ID 讀取標籤，以及儲存地點／替換標籤。
 * 呼叫：POST /itinerary/places.php?action=get 或 update，參數放在 JSON 物件。
 * 主要資料表：Itinerary_Places、Itinerary_Place_Tags；更新使用資料庫交易。
 * 閱讀順序：先看底部 $handlers 找功能，再看對應函式中的輸入、SQL 與回應。
 */
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/api_helpers.php';

/**
 * 批次取得地點標籤
 * action=get｜輸入：Itinerary_ID、Account、PlaceIds（Google Place ID 陣列）。
 * 清除空白 ID 後以單次 SQL 查詢；沒有有效 ID 時直接回傳空陣列。
 * 回傳：status、data（Google Place ID → 標籤陣列）。
 */
function places_get_place_tags(mysqli $conn, object $data): void {
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    $account = trim((string)($data->Account ?? ''));
    $placeIds = is_array($data->PlaceIds ?? null) ? $data->PlaceIds : [];
    require_itinerary_access($conn, $itineraryId, $account);

    $placeIds = array_values(array_filter(array_map(static fn($id) => trim((string)$id), $placeIds), static fn($id) => $id !== ''));
    if (!$placeIds) api_json(['status' => 'success', 'data' => []]);

    // 依 ID 數量建立 ? 佔位符，批次查詢仍透過參數綁定傳值。
    $placeholders = implode(',', array_fill(0, count($placeIds), '?'));
    $types = 'i' . str_repeat('s', count($placeIds));
    $params = array_merge([$itineraryId], $placeIds);
    $stmt = $conn->prepare("SELECT p.Google_Place_ID, t.Tag FROM Itinerary_Places p INNER JOIN Itinerary_Place_Tags t ON t.Place_ID = p.Place_ID WHERE p.Itinerary_ID = ? AND p.Google_Place_ID IN ($placeholders)");
    if (!$stmt) api_error('讀取地點標籤失敗', 500);
    // mysqli 的 bind_param 需要參照，動態參數用參照陣列綁定。
    $bindArgs = [$types];
    foreach ($params as $key => &$value) $bindArgs[] = &$value;
    call_user_func_array([$stmt, 'bind_param'], $bindArgs);
    if (!$stmt->execute()) api_error('讀取地點標籤失敗', 500);
    $result = $stmt->get_result();
    $tags = [];
    while ($row = $result->fetch_assoc()) {
        $tags[$row['Google_Place_ID']][] = $row['Tag'];
    }
    $stmt->close();
    api_json(['status' => 'success', 'data' => $tags]);
}

/**
 * 儲存地點與替換標籤
 * action=update｜輸入：Itinerary_ID、Account、Place、Tags。
 * Place 必須含 GooglePlaceID、Name；Address、Latitude、Longitude 可省略。
 * 只保留下方 $allowedTags 中的標籤並去重；Tags 省略／空陣列會清除舊標籤。
 * 交易內寫地點、刪舊標籤、插入新標籤；回傳 status、data（GooglePlaceID、Tags）。
 */
function places_update_place_tags(mysqli $conn, object $data): void {
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    $account = trim((string)($data->Account ?? ''));
    $place = is_object($data->Place ?? null) ? $data->Place : null;
    // 只接受這四種標籤，移除重複值；空清單代表清除全部舊標籤。
    $allowedTags = ['單人友善', '寵物友善', '餐廳', '咖啡廳'];
    $tags = is_array($data->Tags ?? null) ? array_values(array_unique(array_intersect($allowedTags, array_map('strval', $data->Tags)))) : [];

    require_itinerary_access($conn, $itineraryId, $account);
    if (!$place || trim((string)($place->GooglePlaceID ?? '')) === '' || trim((string)($place->Name ?? '')) === '') {
        api_error('缺少有效的地點資料', 400);
    }

    $googlePlaceId = trim((string)$place->GooglePlaceID);
    $name = trim((string)$place->Name);
    $address = trim((string)($place->Address ?? ''));
    $lat = is_numeric($place->Latitude ?? null) ? (float)$place->Latitude : null;
    $lng = is_numeric($place->Longitude ?? null) ? (float)$place->Longitude : null;
    $placeData = json_encode($place, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    // 地點與標籤是同一次儲存：全部成功才提交，中途出錯就回復。
    $conn->begin_transaction();
    try {
        // 步驟 1：新增地點；相同唯一鍵已存在時更新地點資料。
        $stmt = $conn->prepare('INSERT INTO Itinerary_Places (Itinerary_ID, Google_Place_ID, Name, Address, Latitude, Longitude, Place_Data) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE Name = VALUES(Name), Address = VALUES(Address), Latitude = VALUES(Latitude), Longitude = VALUES(Longitude), Place_Data = VALUES(Place_Data)');
        if (!$stmt) throw new Exception('建立地點資料失敗');
        $stmt->bind_param('isssdds', $itineraryId, $googlePlaceId, $name, $address, $lat, $lng, $placeData);
        if (!$stmt->execute()) throw new Exception('儲存地點資料失敗');
        $stmt->close();

        // 步驟 2：取得資料庫 Place_ID，供標籤表建立關聯。
        $stmt = $conn->prepare('SELECT Place_ID FROM Itinerary_Places WHERE Itinerary_ID = ? AND Google_Place_ID = ? LIMIT 1');
        $stmt->bind_param('is', $itineraryId, $googlePlaceId);
        $stmt->execute();
        $placeRow = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$placeRow) throw new Exception('找不到地點資料');
        $placeId = (int)$placeRow['Place_ID'];

        // 步驟 3：整組替換標籤，所以先刪除該地點的舊標籤。
        $stmt = $conn->prepare('DELETE FROM Itinerary_Place_Tags WHERE Place_ID = ?');
        $stmt->bind_param('i', $placeId);
        if (!$stmt->execute()) throw new Exception('清除地點標籤失敗');
        $stmt->close();

        // 步驟 4：寫入新標籤，來源為 user，並記錄更新帳號。
        if ($tags) {
            $stmt = $conn->prepare('INSERT INTO Itinerary_Place_Tags (Place_ID, Tag, Source, Confidence, Updated_By) VALUES (?, ?, \'user\', 1.000, ?)');
            foreach ($tags as $tag) {
                $stmt->bind_param('iss', $placeId, $tag, $account);
                if (!$stmt->execute()) throw new Exception('儲存地點標籤失敗');
            }
            $stmt->close();
        }
        // 步驟 5：確認所有寫入完成後提交交易並回應前端。
        $conn->commit();
        api_json(['status' => 'success', 'data' => ['GooglePlaceID' => $googlePlaceId, 'Tags' => $tags]]);
    } catch (Throwable $error) {
        // 任一步失敗就撤銷本次交易內的修改。
        $conn->rollback();
        api_error($error->getMessage(), 500);
    }
}

// ===== 請求入口與功能分派：所有功能共用這一段 =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST 請求', 405);
// 左側是網址的 action，右側是上方要執行的函式；只允許清單中的操作。
$handlers = [
    'get' => 'places_get_place_tags', // 批次取得地點標籤
    'update' => 'places_update_place_tags', // 儲存地點與替換標籤
];
// 例如 ?action=get；這是網址參數，即使 HTTP 方法是 POST 也用 $_GET 取得。
$action = $_GET['action'] ?? '';
if (!is_string($action) || !isset($handlers[$action])) api_error('無效的操作', 400);
// JSON 參數轉成物件，交給被選中的功能函式處理。
$data = read_json_body();
// 呼叫對應函式；回傳後關閉資料庫連線（若函式已 exit，則不會走到下方）。
$handlers[$action]($conn, $data);
$conn->close();
