<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php';
require_once __DIR__ . '/auth/auth_session_helpers.php';

// 🌟 自動建表防呆機制
$conn->query("CREATE TABLE IF NOT EXISTS `User_Follows` (
    `Follow_ID` INT AUTO_INCREMENT PRIMARY KEY,
    `Follower_Account` VARCHAR(50) NOT NULL COMMENT '按下追蹤的人',
    `Target_Account` VARCHAR(50) NOT NULL COMMENT '被追蹤的對象',
    `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_follow` (`Follower_Account`, `Target_Account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci");

$data = json_decode(file_get_contents("php://input"));

$account = $data->Account ?? '';
$viewerAccount = get_authenticated_account($conn) ?? '';

if (!empty($account)) {
    $stmt = $conn->prepare("SELECT Account, Name, Avatar FROM Member WHERE Account = ?");
    $stmt->bind_param("s", $account);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $stmt->close(); // 關閉連線

        // 取得粉絲數
        $stmtFollowers = $conn->prepare("SELECT COUNT(*) as count FROM User_Follows WHERE Target_Account = ?");
        $stmtFollowers->bind_param("s", $account);
        $stmtFollowers->execute();
        $followersCount = $stmtFollowers->get_result()->fetch_assoc()['count'];
        $stmtFollowers->close();

        // 取得追蹤中
        $stmtFollowing = $conn->prepare("SELECT COUNT(*) as count FROM User_Follows WHERE Follower_Account = ?");
        $stmtFollowing->bind_param("s", $account);
        $stmtFollowing->execute();
        $followingCount = $stmtFollowing->get_result()->fetch_assoc()['count'];
        $stmtFollowing->close();

        // 判斷登入者是否已追蹤
        $isFollowing = false;
        if (!empty($viewerAccount)) {
            $stmtCheck = $conn->prepare("SELECT 1 FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?");
            $stmtCheck->bind_param("ss", $viewerAccount, $account);
            $stmtCheck->execute();
            $isFollowing = $stmtCheck->get_result()->num_rows > 0;
            $stmtCheck->close();
        }

        echo json_encode([
            "status" => "success", 
            "data" => [
                "account" => $user['Account'],
                "name" => $user['Name'],
                "avatar" => $user['Avatar'],
                "followersCount" => (int)$followersCount,
                "followingCount" => (int)$followingCount,
                "isFollowing" => $isFollowing
            ]
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "找不到此使用者"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "缺少帳號參數"]);
}
$conn->close();
?>
