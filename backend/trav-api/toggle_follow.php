<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
// 🌟 修正 1：允許 Authorization 標頭，解決 CORS (Failed to fetch) 錯誤
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php';
// 🌟 修正 2：載入驗證函式
require_once __DIR__ . '/auth/auth_session_helpers.php'; 

// 自動建表防呆機制
$conn->query("CREATE TABLE IF NOT EXISTS `User_Follows` (
    `Follow_ID` INT AUTO_INCREMENT PRIMARY KEY,
    `Follower_Account` VARCHAR(50) NOT NULL COMMENT '按下追蹤的人',
    `Target_Account` VARCHAR(50) NOT NULL COMMENT '被追蹤的對象',
    `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_follow` (`Follower_Account`, `Target_Account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci");

$data = json_decode(file_get_contents("php://input"));

// 🌟 修正 3：透過 Token 安全取得現在是誰登入 (因為前端的 body 把 Follower_Account 拿掉了)
$follower = get_authenticated_account($conn);

// 如果 token 驗證不到，再退回去找前端傳的參數作為備案
if (empty($follower)) {
    $follower = $data->Follower_Account ?? '';
}

$target = $data->Target_Account ?? '';

if (!empty($follower) && !empty($target) && $follower !== $target) {
    
    $stmt = $conn->prepare("SELECT 1 FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?");
    $stmt->bind_param("ss", $follower, $target);
    $stmt->execute();
    $isFollowing = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    if ($isFollowing) {
        $del = $conn->prepare("DELETE FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?");
        $del->bind_param("ss", $follower, $target);
        $del->execute();
        $del->close();
        $status = false;
    } else {
        $ins = $conn->prepare("INSERT INTO User_Follows (Follower_Account, Target_Account) VALUES (?, ?)");
        $ins->bind_param("ss", $follower, $target);
        $ins->execute();
        $ins->close();
        $status = true;

        // 寫入追蹤通知給對方
        $notifMsg = "開始追蹤你了";
        $notif = $conn->prepare("INSERT INTO Notifications (Account, Sender_Account, Type, Message) VALUES (?, ?, 'follow', ?)");
        $notif->bind_param("sss", $target, $follower, $notifMsg);
        $notif->execute();
        $notif->close();
    }

    $countStmt = $conn->prepare("SELECT COUNT(*) as count FROM User_Follows WHERE Target_Account = ?");
    $countStmt->bind_param("s", $target);
    $countStmt->execute();
    $followersCount = $countStmt->get_result()->fetch_assoc()['count'];
    $countStmt->close();

    echo json_encode(["status" => "success", "isFollowing" => $status, "followersCount" => (int)$followersCount]);
} else {
    echo json_encode(["status" => "error", "message" => "參數錯誤或不能追蹤自己（請確認登入狀態）"]);
}
$conn->close();
?>