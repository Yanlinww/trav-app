<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php';

// 🌟 自動建表防呆機制
$conn->query("CREATE TABLE IF NOT EXISTS `Notifications` (
    `Notification_ID` INT AUTO_INCREMENT PRIMARY KEY,
    `Account` VARCHAR(50) NOT NULL COMMENT '接收通知的帳號',
    `Sender_Account` VARCHAR(50) NULL COMMENT '觸發通知的帳號(誰按讚/留言/追蹤)',
    `Type` VARCHAR(20) NOT NULL COMMENT '通知類型: like, comment, follow',
    `Reference_ID` VARCHAR(50) NULL COMMENT '關聯的ID (貼文ID等)',
    `Message` VARCHAR(255) NOT NULL COMMENT '通知內容',
    `Is_Read` TINYINT(1) DEFAULT 0 COMMENT '0:未讀, 1:已讀',
    `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_notif_account` (`Account`, `Is_Read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci");

$data = json_decode(file_get_contents("php://input"));
$account = $data->Account ?? '';

if (!empty($account)) {
    // 撈取通知並 JOIN 取得發送者的頭像跟名字
    $stmt = $conn->prepare("
        SELECT n.*, m.Name as SenderName, m.Avatar as SenderAvatar 
        FROM Notifications n 
        LEFT JOIN Member m ON n.Sender_Account = m.Account 
        WHERE n.Account = ? 
        ORDER BY n.Created_At DESC LIMIT 50
    ");
    $stmt->bind_param("s", $account);
    $stmt->execute();
    $result = $stmt->get_result();

    $notifications = [];
    $unreadCount = 0;

    while ($row = $result->fetch_assoc()) {
        if ($row['Is_Read'] == 0) $unreadCount++;
        
        $notifications[] = [
            "id" => $row['Notification_ID'],
            "type" => $row['Type'],
            "referenceId" => $row['Reference_ID'],
            "message" => $row['Message'],
            "isRead" => (bool)$row['Is_Read'],
            "createdAt" => $row['Created_At'],
            "sender" => [
                "account" => $row['Sender_Account'],
                "name" => $row['SenderName'] ?? '系統',
                "avatar" => $row['SenderAvatar'] ?? ''
            ]
        ];
    }
    $stmt->close();

    echo json_encode([
        "status" => "success", 
        "data" => $notifications, 
        "unreadCount" => $unreadCount
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "缺少帳號參數"]);
}
$conn->close();
?>