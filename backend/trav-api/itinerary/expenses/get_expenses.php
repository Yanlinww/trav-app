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

if (!empty($data->Itinerary_ID)) {
    require_itinerary_access($conn, (int)$data->Itinerary_ID, trim((string)($data->Account ?? '')));
    $stmt = $conn->prepare("SELECT * FROM `Itinerary_Expense` WHERE `Itinerary_ID` = ? ORDER BY `Created_At` DESC");
    $stmt->bind_param("i", $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $expenses = [];
    while ($row = $result->fetch_assoc()) {
        // 將資料庫欄位映射回前端所需的駝峰命名格式
        $share_stmt = $conn->prepare("SELECT `Share_ID`, `Participant_Name`, `Share_Amount`, `Is_Settled` FROM `Itinerary_Expense_Share` WHERE `Expense_ID` = ? ORDER BY `Share_ID` ASC");
        $share_stmt->bind_param("i", $row['Expense_ID']);
        $share_stmt->execute();
        $share_result = $share_stmt->get_result();
        $shares = [];
        while ($share = $share_result->fetch_assoc()) {
            $shares[] = [
                "id" => $share['Share_ID'],
                "participant" => $share['Participant_Name'],
                "amount" => $share['Share_Amount'],
                "isSettled" => (bool)$share['Is_Settled']
            ];
        }
        $share_stmt->close();

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
            "date" => $row['Created_At'],
            "shares" => $shares
        ];
    }
    echo json_encode(["status" => "success", "data" => $expenses]);
    $stmt->close();
} else {
    api_error("缺少行程ID", 400);
}
$conn->close();
?>
