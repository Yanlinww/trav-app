<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
// 🌟 修正 1：允許 Authorization 標頭，解決 CORS (Failed to fetch) 錯誤
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once 'db_connect.php';
require_once __DIR__ . '/itinerary/api_helpers.php';
require_once __DIR__ . '/auth/auth_session_helpers.php';

// 自動建表防呆機制
$conn->query("CREATE TABLE IF NOT EXISTS `User_Follows` (
    `Follow_ID` INT AUTO_INCREMENT PRIMARY KEY,
    `Follower_Account` VARCHAR(50) NOT NULL COMMENT '按下追蹤的人',
    `Target_Account` VARCHAR(50) NOT NULL COMMENT '被追蹤的對象',
    `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_follow` (`Follower_Account`, `Target_Account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci");

$data = read_json_body();
// 追蹤者只能由有效登入權杖取得，絕不可相信前端傳來的帳號。
$follower = require_authenticated_account($conn);
$target = trim((string)($data->Target_Account ?? ''));

if ($target === '') {
    api_error('缺少要追蹤的旅行者。', 422);
}
if ($follower === $target) {
    api_error('不能追蹤自己。', 422);
}

$targetExists = $conn->prepare('SELECT 1 FROM Member WHERE Account = ? LIMIT 1');
if (!$targetExists) api_error('帳號檢查失敗。', 500);
$targetExists->bind_param('s', $target);
if (!$targetExists->execute() || !$targetExists->get_result()->fetch_row()) {
    $targetExists->close();
    api_error('找不到此旅行者。', 404);
}
$targetExists->close();

$stmt = $conn->prepare("SELECT 1 FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?");
if (!$stmt) api_error('追蹤狀態檢查失敗。', 500);
$stmt->bind_param("ss", $follower, $target);
$stmt->execute();
$isFollowing = $stmt->get_result()->num_rows > 0;
$stmt->close();

if ($isFollowing) {
    $del = $conn->prepare("DELETE FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?");
    if (!$del) api_error('取消追蹤失敗。', 500);
    $del->bind_param("ss", $follower, $target);
    $del->execute();
    $del->close();
    $status = false;
} else {
    $ins = $conn->prepare("INSERT INTO User_Follows (Follower_Account, Target_Account) VALUES (?, ?)");
    if (!$ins) api_error('建立追蹤失敗。', 500);
    $ins->bind_param("ss", $follower, $target);
    $ins->execute();
    $ins->close();
    $status = true;

    // 寫入追蹤通知給對方
    $notifMsg = "開始追蹤你了";
    $notif = $conn->prepare("INSERT INTO Notifications (Account, Sender_Account, Type, Message) VALUES (?, ?, 'follow', ?)");
    if ($notif) {
        $notif->bind_param("sss", $target, $follower, $notifMsg);
        $notif->execute();
        $notif->close();
    }
}

$countStmt = $conn->prepare("SELECT COUNT(*) as count FROM User_Follows WHERE Target_Account = ?");
if (!$countStmt) api_error('追蹤數量讀取失敗。', 500);
$countStmt->bind_param("s", $target);
$countStmt->execute();
$followersCount = $countStmt->get_result()->fetch_assoc()['count'];
$countStmt->close();

$conn->close();
api_json(["status" => "success", "isFollowing" => $status, "followersCount" => (int)$followersCount]);
?>
