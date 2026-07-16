<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Expense_ID)) {
    $stmt = $conn->prepare("DELETE FROM `Itinerary_Expense` WHERE `Expense_ID` = ?");
    $stmt->bind_param("i", $data->Expense_ID);

    if ($stmt->execute()) { echo json_encode(["status" => "success"]); } 
    else { echo json_encode(["status" => "error", "message" => "刪除失敗"]); }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少Expense_ID"]);
}
$conn->close();
?>