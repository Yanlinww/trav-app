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

if (!empty($data->Itinerary_ID) && isset($data->LuggageData)) {
    $account = trim((string)($data->Account ?? ''));
    require_itinerary_access($conn, (int)$data->Itinerary_ID,$account);
    
    // 寫入或更新 Itinerary_Members 裡的 Luggage_Data
    $stmt =$conn->prepare("INSERT INTO `Itinerary_Members` (`Itinerary_ID`, `Account`, `Luggage_Data`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `Luggage_Data` = VALUES(`Luggage_Data`)");
    $stmt->bind_param("iss", $data->Itinerary_ID, $account,$data->LuggageData);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "儲存失敗"]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要參數"]);
}
$conn->close();
?>