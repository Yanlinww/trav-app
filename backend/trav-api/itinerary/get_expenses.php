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

if (!empty($data->Itinerary_ID)) {
    // 依據建立時間反向排序，讓最新支出的顯示在最上面
    $stmt = $conn->prepare("SELECT * FROM `Expense` WHERE `Itinerary_ID` = ? ORDER BY `Created_At` DESC");
    $stmt->bind_param("i", $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $expenses = [];
    $total_amount = 0;
    
    while ($row = $result->fetch_assoc()) {
        $expenses[] = $row;
        $total_amount += $row['Amount']; // 運作機制：逐筆累加總金額
    }
    
    echo json_encode([
        "status" => "success", 
        "data" => $expenses,
        "total" => $total_amount
    ], JSON_UNESCAPED_UNICODE);
    
    $stmt->close();
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "缺少行程ID"], JSON_UNESCAPED_UNICODE);
}
$conn->close();
?>