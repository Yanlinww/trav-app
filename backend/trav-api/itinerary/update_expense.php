<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Expense_ID) && !empty($data->Title) && isset($data->Amount)) {
    $stmt = $conn->prepare("UPDATE `Itinerary_Expense` SET `Title` = ?, `Amount` = ? WHERE `Expense_ID` = ?");
    $stmt->bind_param("sdi", $data->Title, $data->Amount, $data->Expense_ID);

    if ($stmt->execute()) { echo json_encode(["status" => "success"]); } 
    else { echo json_encode(["status" => "error", "message" => "更新失敗"]); }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "資料不完整"]);
}
$conn->close();
?>