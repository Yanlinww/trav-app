<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../db_connect.php';
require_once '../api_helpers.php';
$data = read_json_body();

if (!empty($data->Itinerary_ID)) {
    $account = trim((string)($data->Account ?? ''));
    require_itinerary_access($conn, (int)$data->Itinerary_ID,$account);
    
    // 改為查詢 Itinerary_Members
    $stmt =$conn->prepare("SELECT `Luggage_Data` FROM `Itinerary_Members` WHERE `Itinerary_ID` = ? AND `Account` = ?");
    $stmt->bind_param("is", $data->Itinerary_ID, $account);$stmt->execute();
    $result =$stmt->get_result()->fetch_assoc();
    
    echo json_encode(["status" => "success", "data" => $result['Luggage_Data'] ?? null]);
    $stmt->close();
} else {
    api_error("缺少行程 ID", 400);
}
$conn->close();
?>