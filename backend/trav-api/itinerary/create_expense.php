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

if (!empty($data->Itinerary_ID) && !empty($data->Title) && isset($data->Amount)) {
    require_itinerary_access($conn, (int)$data->Itinerary_ID, trim((string)($data->Account ?? '')));
    $is_split = $data->IsSplit ? 1 : 0;
    
    $stmt = $conn->prepare("INSERT INTO `Itinerary_Expense` (`Itinerary_ID`, `Title`, `Amount`, `Currency`, `Category`, `Location`, `Payer`, `Is_Split`, `Type`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("isdssssis", 
        $data->Itinerary_ID, $data->Title, $data->Amount, $data->Currency, 
        $data->Category, $data->Location, $data->Payer, $is_split, $data->Type
    );

    if ($stmt->execute()) {
        $expense_id = $conn->insert_id;
        if ($is_split && isset($data->SplitShares)) {
            $share_stmt = $conn->prepare("INSERT INTO `Itinerary_Expense_Share` (`Expense_ID`, `Participant_Name`, `Share_Amount`) VALUES (?, ?, ?)");
            foreach ((array)$data->SplitShares as $participant => $share_amount) {
                $share_amount = (float)$share_amount;
                $share_stmt->bind_param("isd", $expense_id, $participant, $share_amount);
                $share_stmt->execute();
            }
            $share_stmt->close();
        }
        echo json_encode(["status" => "success", "message" => "記帳成功", "Expense_ID" => $expense_id]);
    } else {
        echo json_encode(["status" => "error", "message" => "資料庫寫入失敗：" . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
}
$conn->close();
?>
