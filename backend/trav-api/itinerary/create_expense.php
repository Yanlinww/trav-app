<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID) && !empty($data->Title) && isset($data->Amount)) {
    $is_split = $data->IsSplit ? 1 : 0;
    
    $stmt = $conn->prepare("INSERT INTO `Itinerary_Expense` (`Itinerary_ID`, `Title`, `Amount`, `Currency`, `Category`, `Location`, `Payer`, `Is_Split`, `Type`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("isdssssis", 
        $data->Itinerary_ID, $data->Title, $data->Amount, $data->Currency, 
        $data->Category, $data->Location, $data->Payer, $is_split, $data->Type
    );

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "記帳成功"]);
    } else {
        echo json_encode(["status" => "error", "message" => "資料庫寫入失敗：" . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
}
$conn->close();
?>