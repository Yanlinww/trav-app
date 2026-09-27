<?php
/**
 * 個人行李：同一行程中，每個帳號各自讀取／儲存自己的清單。
 * 呼叫：POST /itinerary/luggage.php?action=get 或 update，參數放在 JSON 物件。
 * 主要資料表：Itinerary_Members 的 Luggage_Data 欄位。
 * 閱讀順序：上方共用驗證 → 兩個功能函式 → 底部分派與 JSON 回應。
 */
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/api_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_error('只允許 POST 請求', 405);
}

// 共用入口：網址選操作，JSON 提供行程、帳號及要儲存的行李資料。
$action = $_GET['action'] ?? '';
if (!in_array($action, ['get', 'update'], true)) {
    api_error('無效的行李操作', 400);
}

$data = read_json_body();
if (empty($data->Itinerary_ID)) {
    api_error('缺少行程 ID', 400);
}
// 讀取不需要 LuggageData；儲存必須提供，避免缺欄位時覆寫資料。
if ($action === 'update' && !isset($data->LuggageData)) {
    api_error('缺少必要參數', 400);
}

$itineraryId = (int)$data->Itinerary_ID;
$account = trim((string)($data->Account ?? ''));
// 兩種操作都先檢查擁有者／成員關係，再讀寫該帳號自己的清單。
require_itinerary_access($conn, $itineraryId, $account);

/**
 * 讀取自己的行李清單
 * action=get｜共用驗證區取得 Itinerary_ID、Account，再傳入此函式。
 * 以行程 ID + 帳號查 Itinerary_Members.Luggage_Data，每個帳號各自一份。
 * 回傳陣列：status、data；data 是前端儲存的 JSON 字串，沒有資料時為 null。
 */
function get_luggage(mysqli $conn, int $itineraryId, string $account): array {
    $stmt = $conn->prepare('SELECT `Luggage_Data` FROM `Itinerary_Members` WHERE `Itinerary_ID` = ? AND `Account` = ?');
    if (!$stmt) api_error('讀取行李失敗', 500);
    $stmt->bind_param('is', $itineraryId, $account);
    if (!$stmt->execute()) api_error('讀取行李失敗', 500);
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return ['status' => 'success', 'data' => $result['Luggage_Data'] ?? null];
}

/**
 * 儲存自己的行李清單
 * action=update｜輸入：Itinerary_ID、Account、LuggageData（前端傳 JSON 字串）。
 * 沒有成員資料列時新增；已存在時只覆寫 Luggage_Data，不清掉其他成員欄位。
 * 回傳陣列：status；失敗時附 message。此處不解析 LuggageData 的內層 JSON。
 */
function update_luggage(mysqli $conn, int $itineraryId, string $account, object $data): array {
    $stmt = $conn->prepare('INSERT INTO `Itinerary_Members` (`Itinerary_ID`, `Account`, `Luggage_Data`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `Luggage_Data` = VALUES(`Luggage_Data`)');
    if (!$stmt) api_error('儲存失敗', 500);
    $stmt->bind_param('iss', $itineraryId, $account, $data->LuggageData);
    $saved = $stmt->execute();
    $stmt->close();

    return $saved ? ['status' => 'success'] : ['status' => 'error', 'message' => '儲存失敗'];
}

// 分派至讀取或儲存函式；取得回應陣列後統一關閉連線、輸出 JSON。
$payload = $action === 'get'
    ? get_luggage($conn, $itineraryId, $account)
    : update_luggage($conn, $itineraryId, $account, $data);
$conn->close();
api_json($payload);
