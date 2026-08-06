<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../../db_connect.php';
require_once '../api_helpers.php';
$data = read_json_body();
$conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Expense_Share` (`Share_ID` INT AUTO_INCREMENT PRIMARY KEY, `Expense_ID` INT NOT NULL, `Participant_Name` VARCHAR(100) NOT NULL, `Share_Amount` DECIMAL(12,2) NOT NULL DEFAULT 0, `Is_Settled` TINYINT(1) NOT NULL DEFAULT 0, INDEX (`Expense_ID`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if (!empty($data->Expense_ID)) {
    require_resource_access($conn, 'Itinerary_Expense', 'Expense_ID', (int)$data->Expense_ID, trim((string)($data->Account ?? '')));
    $share_stmt = $conn->prepare("DELETE FROM `Itinerary_Expense_Share` WHERE `Expense_ID` = ?");
    $share_stmt->bind_param("i", $data->Expense_ID);
    $share_stmt->execute();
    $share_stmt->close();

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
