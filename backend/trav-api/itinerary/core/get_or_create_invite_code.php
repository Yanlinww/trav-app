<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID)) {
    // 檢查是否已有邀請碼
    $stmt = $conn->prepare("SELECT `Invite_Code` FROM `Itinerary` WHERE `Itinerary_ID` = ?");
    $stmt->bind_param("i", $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!empty($result['Invite_Code'])) {
        echo json_encode(["status" => "success", "code" => $result['Invite_Code']]);
    } else {
        // 生成 6 碼隨機英數
        $newCode = substr(str_shuffle("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0, 6);
        $updateStmt = $conn->prepare("UPDATE `Itinerary` SET `Invite_Code` = ? WHERE `Itinerary_ID` = ?");
        $updateStmt->bind_param("si", $newCode, $data->Itinerary_ID);
        if ($updateStmt->execute()) {
            echo json_encode(["status" => "success", "code" => $newCode]);
        } else {
            echo json_encode(["status" => "error", "message" => "邀請碼生成失敗"]);
        }
        $updateStmt->close();
    }
} else { echo json_encode(["status" => "error", "message" => "缺少行程ID"]); }
$conn->close();
?>