<?php
/**
 * 行程細項：每天的景點／自訂項目、時間、座標與拖曳排序。
 * 呼叫：POST /itinerary/items.php?action=功能名稱，參數放在 JSON 物件。
 * 主要資料表：Itinerary_Item。
 * 閱讀順序：先看底部 $handlers 找功能，再看對應函式中的輸入、SQL 與回應。
 */
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/api_helpers.php';

/**
 * 共用工具：統一時間格式
 * 供 create、update_time 呼叫，不是獨立 action。
 * 空值回傳 null；合法 HH:mm 或 HH:mm:ss 回傳 HH:mm；格式錯誤回傳 false。
 * 呼叫端利用 false 判斷錯誤，null 則代表未設定／清除時間。
 */
function normalize_time_value($value) {
    if ($value === null || trim((string)$value) === '') return null;
    $value = trim((string)$value);
    if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/', $value)) return false;
    return substr($value, 0, 5);
}

/**
 * 讀取每天的行程細項
 * action=list｜輸入：Itinerary_ID。
 * 回傳：status、data（細項陣列），依 Day_Number、Sort_Order 排序，時間為 HH:mm。
 */
function items_get_itinerary_items(mysqli $conn, object $data): void {
    if (!empty($data->Itinerary_ID)) {$sql = "
            SELECT i.*
            FROM `Itinerary_Item` i
            WHERE i.`Itinerary_ID` = ?
            ORDER BY i.`Day_Number` ASC, i.`Sort_Order` ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $data->Itinerary_ID);
        $stmt->execute();$result = $stmt->get_result();$items = [];
        while ($row = $result->fetch_assoc()) {$items[] = [
                "id" => (string)$row['Item_ID'],
                "dayNumber" => (int)$row['Day_Number'],
                "title" => $row['Title'],
                "startTime" => $row['Start_Time'] ? substr($row['Start_Time'], 0, 5) : "",
                "endTime" => $row['End_Time'] ? substr($row['End_Time'], 0, 5) : "",
                "sortOrder" => (int)$row['Sort_Order'],
                "Latitude" => $row['Latitude'],
                "Longitude" => $row['Longitude']
            ];
        }

        echo json_encode(["status" => "success", "data" => $items], JSON_UNESCAPED_UNICODE);$stmt->close();
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "缺少行程 ID"], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * 建立行程細項
 * action=create｜必填：Itinerary_ID、Day_Number、Title。
 * 選填：StartTime、EndTime、Latitude、Longitude。
 * 時間先正規化；新項目放在同一天排序的末尾。回傳 status、message、Item_ID。
 */
function items_create_itinerary_item(mysqli $conn, object $data): void {
    if (!empty($data->Itinerary_ID) && !empty($data->Title) && !empty($data->Day_Number)) {
        $itinerary_id =$data->Itinerary_ID;
        $day_number =$data->Day_Number;
        $title =$data->Title;
        $start_time = normalize_time_value($data->StartTime ?? null);
        $end_time = normalize_time_value($data->EndTime ?? null);

        if ($start_time === false ||$end_time === false) {
            http_response_code(422);
            echo json_encode(["status" => "error", "message" => "時間格式錯誤"]);
            exit();
        }
        if ($start_time !== null &&$end_time !== null && $end_time ===$start_time) {
            http_response_code(422);
            echo json_encode(["status" => "error", "message" => "結束時間不可等於開始時間"]);
            exit();
        }

        $lat = isset($data->Latitude) ? $data->Latitude : null;
        $lng = isset($data->Longitude) ?$data->Longitude : null;

        // 以同一行程、同一天的最大排序加 1；當天第一個細項從 0 開始。
        $sort_stmt =$conn->prepare("SELECT MAX(`Sort_Order`) as MaxSort FROM `Itinerary_Item` WHERE `Itinerary_ID` = ? AND `Day_Number` = ?");
        $sort_stmt->bind_param("ii", $itinerary_id,$day_number);
        $sort_stmt->execute();$sort_result = $sort_stmt->get_result()->fetch_assoc();$new_sort_order = ($sort_result['MaxSort'] !== null) ?$sort_result['MaxSort'] + 1 : 0;
        $sort_stmt->close();

        // 參數順序對應 INSERT 的欄位順序。
        $stmt =$conn->prepare("INSERT INTO `Itinerary_Item` (`Itinerary_ID`, `Day_Number`, `Title`, `Start_Time`, `End_Time`, `Sort_Order`, `Latitude`, `Longitude`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

        $stmt->bind_param("iisssidd", $itinerary_id, $day_number, $title, $start_time, $end_time, $new_sort_order, $lat, $lng);

        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "建立成功", "Item_ID" => $conn->insert_id]);
        } else {
            echo json_encode(["status" => "error", "message" => "建立失敗: " . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少必要參數"]);
    }
}

/**
 * 修改細項標題
 * action=update_title｜輸入：Item_ID、Title（可為空字串）。
 * 只更新 Itinerary_Item.Title。
 * 回傳：status；失敗時附 message。
 */
function items_update_item_title(mysqli $conn, object $data): void {
    if (!empty($data->Item_ID) && isset($data->Title)) {
        $stmt = $conn->prepare("UPDATE `Itinerary_Item` SET `Title` = ? WHERE `Item_ID` = ?");
        $stmt->bind_param("si", $data->Title, $data->Item_ID);

        if ($stmt->execute()) {
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => "更新失敗：" . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
    }
}

/**
 * 修改細項開始／結束時間
 * action=update_time｜輸入：Item_ID；StartTime、EndTime 可省略。
 * 兩個時間一起覆寫，省略／空值會清除；格式錯誤或開始與結束相同時回 HTTP 422。
 * 回傳：status；目前沒有要求結束時間必須晚於開始時間。
 */
function items_update_item_time(mysqli $conn, object $data): void {
    if (!empty($data->Item_ID)) {
        $start = normalize_time_value($data->StartTime ?? null);
        $end = normalize_time_value($data->EndTime ?? null);
        if ($start === false || $end === false) {
            http_response_code(422);
            echo json_encode(["status" => "error", "message" => "時間格式不正確，請使用 HH:mm。"]);
            exit();
        }
        if ($start !== null && $end !== null && $end === $start) {
            http_response_code(422);
            echo json_encode(["status" => "error", "message" => "開始與結束時間不能相同。"]);
            exit();
        }

        $stmt = $conn->prepare("UPDATE `Itinerary_Item` SET `Start_Time` = ?, `End_Time` = ? WHERE `Item_ID` = ?");
        $stmt->bind_param("ssi", $start, $end, $data->Item_ID);

        if ($stmt->execute()) {
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => "更新失敗：" . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
    }
}

/**
 * 修改細項座標
 * action=update_location｜輸入：Item_ID、Latitude、Longitude；Title 可省略。
 * 檢查緯度 -90～90、經度 -180～180；Title 非空時才一併更新標題。
 * 回傳：status；資料無效為 HTTP 400，SQL 執行失敗為 HTTP 500。
 */
function items_update_item_location(mysqli $conn, object $data): void {
    $itemId = isset($data->Item_ID) ? (int)$data->Item_ID : 0;
    $lat = isset($data->Latitude) && is_numeric($data->Latitude) ? (float)$data->Latitude : null;
    $lng = isset($data->Longitude) && is_numeric($data->Longitude) ? (float)$data->Longitude : null;
    $title = isset($data->Title) ? trim((string)$data->Title) : '';

    if ($itemId <= 0 || $lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid item or coordinate data'], JSON_UNESCAPED_UNICODE);

        exit();
    }

    // 有非空標題時更新標題＋座標；只拖動地圖位置時可僅更新座標。
    if ($title !== '') {
        $stmt = $conn->prepare('UPDATE `Itinerary_Item` SET `Title` = ?, `Latitude` = ?, `Longitude` = ? WHERE `Item_ID` = ?');
        $stmt->bind_param('sddi', $title, $lat, $lng, $itemId);
    } else {
        $stmt = $conn->prepare('UPDATE `Itinerary_Item` SET `Latitude` = ?, `Longitude` = ? WHERE `Item_ID` = ?');
        $stmt->bind_param('ddi', $lat, $lng, $itemId);
    }

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success'], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to update item location'], JSON_UNESCAPED_UNICODE);
    }

    $stmt->close();
}

/**
 * 刪除單一行程細項
 * action=delete｜輸入：Item_ID。
 * 依 Item_ID 刪除 Itinerary_Item 資料列。
 * 回傳：status；失敗時附 message。
 */
function items_delete_itinerary_item(mysqli $conn, object $data): void {
    if (!empty($data->Item_ID)) {
        $stmt = $conn->prepare("DELETE FROM `Itinerary_Item` WHERE `Item_ID` = ?");
        $stmt->bind_param("i", $data->Item_ID);

        if ($stmt->execute()) {
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => "刪除失敗：" . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
    }
}

/**
 * 拖曳後批次更新排序
 * action=sort｜輸入：updates（非空陣列），每個元素包含 id、sortOrder。
 * 先把 ID 與排序轉成整數，再用單一 CASE UPDATE 更新多個細項。
 * 只更新 Sort_Order；日期與時間不在這裡修改。回傳 status。
 */
function items_update_sort_order(mysqli $conn, object $data): void {
    if (!empty($data->updates) && is_array($data->updates)) {
        // 運作機制：組合單一 SQL 語法進行批次更新 (Batch Update)，降低資料庫負載
        $cases = "";
        $ids = [];
        foreach ($data->updates as $update) {
            // 先轉整數，下面組合 CASE SQL 時只使用數字。
            $id = (int)$update->id;
            $sort = (int)$update->sortOrder;
            $cases .= " WHEN `Item_ID` = {$id} THEN {$sort}";
            $ids[] = $id;
        }

        if (count($ids) > 0) {
            $idList = implode(',', $ids);
            $query = "UPDATE `Itinerary_Item` SET `Sort_Order` = CASE {$cases} END WHERE `Item_ID` IN ({$idList})";

            if ($conn->query($query)) {
                echo json_encode(["status" => "success"]);
            } else {
                echo json_encode(["status" => "error", "message" => "資料庫更新失敗：" . $conn->error]);
            }
        }
    } else {
        echo json_encode(["status" => "error", "message" => "缺少更新資料"]);
    }
}

// ===== 請求入口與功能分派：所有功能共用這一段 =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST 請求', 405);
// 左側是網址的 action，右側是上方要執行的函式；只允許清單中的操作。
$handlers = [
    'list' => 'items_get_itinerary_items', // 讀取每天的行程細項
    'create' => 'items_create_itinerary_item', // 建立行程細項
    'update_title' => 'items_update_item_title', // 修改細項標題
    'update_time' => 'items_update_item_time', // 修改細項開始／結束時間
    'update_location' => 'items_update_item_location', // 修改細項座標
    'delete' => 'items_delete_itinerary_item', // 刪除單一行程細項
    'sort' => 'items_update_sort_order', // 拖曳後批次更新排序
];
// 例如 ?action=list；這是網址參數，即使 HTTP 方法是 POST 也用 $_GET 取得。
$action = $_GET['action'] ?? '';
if (!is_string($action) || !isset($handlers[$action])) api_error('無效的操作', 400);
// JSON 參數轉成物件，交給被選中的功能函式處理。
$data = read_json_body();
// 呼叫對應函式；回傳後關閉資料庫連線（若函式已 exit，則不會走到下方）。
$handlers[$action]($conn, $data);
$conn->close();
