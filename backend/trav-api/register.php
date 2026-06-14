<?php
// 🌟 終極跨網域防護罩 (必須放在第一行！)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// 🌟 攔截瀏覽器的「預檢請求 (OPTIONS)」並直接放行
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ----------------------------------------------------

// 載入連線鑰匙
require_once 'db_connect.php';

// 接收前端傳來的 JSON 資料
$data = json_decode(file_get_contents("php://input"));

// 檢查有沒有收到最重要的帳號跟密碼
if (!empty($data->Account) && !empty($data->Password)) {
    $account = $data->Account;
    $email = $data->Email ?? '';
    $name = $data->Name ?? '';
    $gender = $data->Gender ?? '';
    
    // 🔒 密碼加密
    $password_hashed = password_hash($data->Password, PASSWORD_DEFAULT);

    // 準備 SQL 寫入指令
    $stmt = $conn->prepare("INSERT INTO `Member` (`Account`, `Password`, `Email`, `Name`, `Gender`) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $account, $password_hashed, $email, $name, $gender);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "🎉 恭喜！帳號註冊成功，資料已寫入雲端！"]);
    } else {
        echo json_encode(["status" => "error", "message" => "註冊失敗，可能是帳號重複了：" . $stmt->error]);
    }
    
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "請確實填寫帳號與密碼！"]);
}

$conn->close();
?>