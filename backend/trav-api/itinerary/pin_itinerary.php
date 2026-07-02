<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Account) && !empty($data->Itinerary_ID) && isset($data->Is_Pinned)) {
    $is_pinned = $data->Is_Pinned ? 1 : 0;
    
    $stmt = $conn->prepare("UPDATE `Itinerary` SET `Is_Pinned` = ? WHERE `Itinerary_ID` = ? AND `Account` = ?");
    $stmt->bind_param("iis", $is_pinned, $data->Itinerary_ID, $data->Account);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "釘選更新失敗：" . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
}
$conn->close();
?>