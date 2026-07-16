<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID) && !empty($data->Account)) {
    // 步驟 1：先確認使用者是 Owner 還是 Member
    $checkStmt = $conn->prepare("SELECT Account FROM Itinerary WHERE Itinerary_ID = ?");
    $checkStmt->bind_param("i", $data->Itinerary_ID);
    $checkStmt->execute();
    $result = $checkStmt->get_result()->fetch_assoc();
    $checkStmt->close();

    if ($result && $result['Account'] === $data->Account) {
        // 情況 A：使用者是 Owner -> 徹底刪除行程
        // (若資料庫未設定 ON DELETE CASCADE，需先手動刪除子表紀錄以免報錯)
        $conn->query("DELETE FROM Itinerary_Members WHERE Itinerary_ID = " . intval($data->Itinerary_ID));
        $conn->query("DELETE FROM Itinerary_Expense WHERE Itinerary_ID = " . intval($data->Itinerary_ID));
        
        $deleteStmt = $conn->prepare("DELETE FROM Itinerary WHERE Itinerary_ID = ?");
        $deleteStmt->bind_param("i", $data->Itinerary_ID);
        if ($deleteStmt->execute()) {
            echo json_encode(["status" => "success", "message" => "行程已徹底刪除"]);
        } else {
            echo json_encode(["status" => "error", "message" => "刪除失敗"]);
        }
        $deleteStmt->close();
    } else {
        // 情況 B：使用者是 Member -> 退出行程 (僅刪除關聯表紀錄)
        $leaveStmt = $conn->prepare("DELETE FROM Itinerary_Members WHERE Itinerary_ID = ? AND Account = ?");
        $leaveStmt->bind_param("is", $data->Itinerary_ID, $data->Account);
        $leaveStmt->execute();
        
        if ($leaveStmt->affected_rows > 0) {
            echo json_encode(["status" => "success", "message" => "已退出該共用行程"]);
        } else {
            echo json_encode(["status" => "error", "message" => "退出失敗或無此權限"]);
        }
        $leaveStmt->close();
    }
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要參數"]);
}
$conn->close();
?>