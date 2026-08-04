<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
require_once 'api_helpers.php';
$data = read_json_body();
$conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Expense_Share` (`Share_ID` INT AUTO_INCREMENT PRIMARY KEY, `Expense_ID` INT NOT NULL, `Participant_Name` VARCHAR(100) NOT NULL, `Share_Amount` DECIMAL(12,2) NOT NULL DEFAULT 0, `Is_Settled` TINYINT(1) NOT NULL DEFAULT 0, INDEX (`Expense_ID`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if (!empty($data->Expense_ID) && !empty($data->Title) && isset($data->Amount)) {
    require_resource_access($conn, 'Itinerary_Expense', 'Expense_ID', (int)$data->Expense_ID, trim((string)($data->Account ?? '')));
    $stmt = $conn->prepare("UPDATE `Itinerary_Expense` SET `Title` = ?, `Amount` = ? WHERE `Expense_ID` = ?");
    $stmt->bind_param("sdi", $data->Title, $data->Amount, $data->Expense_ID);

    if ($stmt->execute()) {
        if (isset($data->ShareAmounts) && is_array($data->ShareAmounts)) {
            $share_stmt = $conn->prepare("UPDATE `Itinerary_Expense_Share` SET `Share_Amount` = ? WHERE `Share_ID` = ? AND `Expense_ID` = ?");
            foreach ($data->ShareAmounts as $share) {
                if (isset($share->Share_ID) && isset($share->Amount)) {
                    $share_amount = (float)$share->Amount;
                    $share_id = (int)$share->Share_ID;
                    $expense_id = (int)$data->Expense_ID;
                    $share_stmt->bind_param("dii", $share_amount, $share_id, $expense_id);
                    $share_stmt->execute();
                }
            }
            $share_stmt->close();
        }
        echo json_encode(["status" => "success"]);
    }
    else { echo json_encode(["status" => "error", "message" => "更新失敗"]); }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "資料不完整"]);
}
$conn->close();
?>
