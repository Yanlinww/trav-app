<?php
// 🌟 終極跨網域防護罩
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 載入連線鑰匙
require_once 'db_connect.php';

// 接收前端傳來的 JSON
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Account) && !empty($data->Password)) {
    $account = $data->Account;
    $password = $data->Password;

    // 準備 SQL：用帳號（也就是 Email）去資料庫撈出該會員
    $stmt = $conn->prepare("SELECT * FROM `Member` WHERE `Account` = ?");
    $stmt->bind_param("s", $account);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        
        // 🔒 安全解密：比對前端傳來的密碼，跟資料庫裡的加密雜湊值是否吻合
        if (password_verify($password, $user['Password'])) {
            
            // 登入成功！回傳成功狀態與會員資料給 React
            echo json_encode([
                "status" => "success",
                "message" => "🎉 登入成功！歡迎回來 VOYAGE！",
                "user" => [
                    "id" => $user['Account'],
                    "email" => $user['Email'],
                    "nickname" => $user['Name']
                ]
            ], JSON_UNESCAPED_UNICODE);
            
        } else {
            echo json_encode(["status" => "error", "message" => "密碼輸入錯誤喔，請再確認一次！"], JSON_UNESCAPED_UNICODE);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "找不到此帳號，請確認輸入或先去註冊！"], JSON_UNESCAPED_UNICODE);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "請確實填寫帳號與密碼！"], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>