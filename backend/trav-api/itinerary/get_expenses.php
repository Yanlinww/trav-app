<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID)) {
    $stmt = $conn->prepare("SELECT * FROM `Itinerary_Expense` WHERE `Itinerary_ID` = ? ORDER BY `Created_At` DESC");
    $stmt->bind_param("i", $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $expenses = [];
    while ($row = $result->fetch_assoc()) {
        // 將資料庫欄位映射回前端所需的駝峰命名格式
        $expenses[] = [
            "id" => $row['Expense_ID'],
            "title" => $row['Title'],
            "amount" => $row['Amount'],
            "currency" => $row['Currency'],
            "category" => $row['Category'],
            "location" => $row['Location'],
            "payer" => $row['Payer'],
            "isSplit" => (bool)$row['Is_Split'],
            "type" => $row['Type'],
            "date" => $row['Created_At']
        ];
    }
    echo json_encode(["status" => "success", "data" => $expenses]);
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少行程ID"]);
}
$conn->close();
?>