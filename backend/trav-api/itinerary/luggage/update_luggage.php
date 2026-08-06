<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../../db_connect.php';
require_once '../api_helpers.php';
$data = read_json_body();

if (!empty($data->Itinerary_ID) && isset($data->LuggageData)) {
    require_itinerary_access($conn, (int)$data->Itinerary_ID, trim((string)($data->Account ?? '')));
    $stmt = $conn->prepare("UPDATE `Itinerary` SET `Luggage_Data` = ? WHERE `Itinerary_ID` = ?");
    $stmt->bind_param("si", $data->LuggageData, $data->Itinerary_ID);

    if ($stmt->execute()) { echo json_encode(["status" => "success"]); } 
    else { echo json_encode(["status" => "error", "message" => "更新失敗"]); }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "資料不完整"]);
}
$conn->close();
?>
