<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
require_once 'api_helpers.php';
$data = read_json_body();

if (!empty($data->Itinerary_ID)) {
    require_itinerary_access($conn, (int)$data->Itinerary_ID, trim((string)($data->Account ?? '')));
    $stmt = $conn->prepare("SELECT `Luggage_Data` FROM `Itinerary` WHERE `Itinerary_ID` = ?");
    $stmt->bind_param("i", $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    
    // 若為 NULL，回傳空字串讓前端使用預設範本
    echo json_encode(["status" => "success", "data" => $result['Luggage_Data']]);
    $stmt->close();
} else {
    api_error("缺少行程ID", 400);
}
$conn->close();
?>
