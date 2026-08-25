<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php';
require_once __DIR__ . '/auth/auth_session_helpers.php';

$data = json_decode(file_get_contents("php://input"));

$follower = require_authenticated_account($conn);
$target = trim((string)($data->Target_Account ?? ''));

if (!empty($follower) && !empty($target) && $follower !== $target) {
    $targetMember = $conn->prepare("SELECT 1 FROM Member WHERE Account = ? LIMIT 1");
    $targetMember->bind_param("s", $target);
    $targetMember->execute();
    $targetExists = $targetMember->get_result()->num_rows > 0;
    $targetMember->close();
    if (!$targetExists) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "找不到要追蹤的旅行者。"], JSON_UNESCAPED_UNICODE);
        $conn->close();
        exit();
    }
    
    // 🌟 2. 檢查是否已追蹤
    $stmt = $conn->prepare("SELECT 1 FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?");
    $stmt->bind_param("ss", $follower, $target);
    $stmt->execute();
    $isFollowing = $stmt->get_result()->num_rows > 0;
    $stmt->close(); // 務必關閉，避免 SQL 卡死

    if ($isFollowing) {
        $del = $conn->prepare("DELETE FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?");
        $del->bind_param("ss", $follower, $target);
        $del->execute();
        $del->close();
        $status = false;
    } else {
        $ins = $conn->prepare("INSERT INTO User_Follows (Follower_Account, Target_Account) VALUES (?, ?)");
        $ins->bind_param("ss", $follower, $target);
        if (!$ins->execute()) {
            echo json_encode(["status" => "error", "message" => "寫入失敗：" . $conn->error]);
            exit();
        }
        $ins->close();
        $status = true;
    }

    // 🌟 3. 重新計算粉絲數
    $countStmt = $conn->prepare("SELECT COUNT(*) as count FROM User_Follows WHERE Target_Account = ?");
    $countStmt->bind_param("s", $target);
    $countStmt->execute();
    $followersCount = $countStmt->get_result()->fetch_assoc()['count'];
    $countStmt->close();

    echo json_encode([
        "status" => "success", 
        "isFollowing" => $status, 
        "followersCount" => (int)$followersCount
    ]);
} else {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "參數錯誤或不能追蹤自己"], JSON_UNESCAPED_UNICODE);
}
$conn->close();
?>
