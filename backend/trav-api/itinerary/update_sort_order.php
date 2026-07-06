<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200); exit();
}

require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->updates) && is_array($data->updates)) {
    // 運作機制：組合單一 SQL 語法進行批次更新 (Batch Update)，降低資料庫負載
    $cases = "";
    $ids = [];
    foreach ($data->updates as $update) {
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
$conn->close();
?>