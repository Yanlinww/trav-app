<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Invite_Code) && !empty($data->Account)) {
    // 尋找對應的行程 ID
    $stmt = $conn->prepare("SELECT `Itinerary_ID`, `Account` as OwnerAccount FROM `Itinerary` WHERE `Invite_Code` = ?");
    $stmt->bind_param("s", $data->Invite_Code);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($result) {
        if ($result['OwnerAccount'] === $data->Account) {
            echo json_encode(["status" => "error", "message" => "你已經是此行程的擁有者"]);
            exit();
        }
        // 寫入關聯表 (使用 INSERT IGNORE 避免重複加入報錯)
        $insertStmt = $conn->prepare("INSERT IGNORE INTO `Itinerary_Members` (`Itinerary_ID`, `Account`) VALUES (?, ?)");
        $insertStmt->bind_param("is", $result['Itinerary_ID'], $data->Account);
        $insertStmt->execute();
        
        if ($insertStmt->affected_rows > 0) {
            echo json_encode(["status" => "success", "message" => "成功加入行程"]);
        } else {
            echo json_encode(["status" => "error", "message" => "你已經加入過此行程"]);
        }
        $insertStmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "無效的邀請碼"]);
    }
} else { echo json_encode(["status" => "error", "message" => "資料不完整"]); }
$conn->close();
?>