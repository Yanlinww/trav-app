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

if (!empty($data->Item_ID)) {
    $start = !empty($data->StartTime) ? $data->StartTime : null;
    $end = !empty($data->EndTime) ? $data->EndTime : null;
    
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
$conn->close();
?>