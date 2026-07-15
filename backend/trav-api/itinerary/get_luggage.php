<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID)) {
    $stmt = $conn->prepare("SELECT `Luggage_Data` FROM `Itinerary` WHERE `Itinerary_ID` = ?");
    $stmt->bind_param("i", $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    
    // 若為 NULL，回傳空字串讓前端使用預設範本
    echo json_encode(["status" => "success", "data" => $result['Luggage_Data']]);
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少行程ID"]);
}
$conn->close();
?>