<?php
// 🌟 終極跨網域防護罩 (解決 Failed to fetch 的關鍵)
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

// 載入連線鑰匙 (請確保 db_connect.php 也在同一個資料夾底下！)
require_once 'db_connect.php';

// 接收前端 (Next.js) 傳來的 JSON 資料
$data = json_decode(file_get_contents("php://input"));

// 檢查有沒有收到最重要的帳號跟密碼
if (!empty($data->Account) && !empty($data->Password)) {
    // 取得前端傳來的資料
    $account = $data->Account;
    $email = $data->Email ?? '';
    $name = $data->Name ?? '';
    $gender = $data->Gender ?? '';
    
    // 🔒 資安防護：密碼絕對不能明碼存進資料庫！我們要把它「雜湊(Hash)」加密
    $password_hashed = password_hash($data->Password, PASSWORD_DEFAULT);

    // 準備 SQL 寫入指令 (使用 ? 預處理來防止 SQL 隱碼攻擊)
    $stmt = $conn->prepare("INSERT INTO `Member` (`Account`, `Password`, `Email`, `Name`, `Gender`) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $account, $password_hashed, $email, $name, $gender);

    // 執行寫入並回傳結果給前端
    if ($stmt->execute()) {
        echo json_encode([
            "status" => "success", 
            "message" => "🎉 恭喜！帳號註冊成功，資料已寫入雲端！"
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            "status" => "error", 
            "message" => "註冊失敗，可能是帳號重複了：" . $stmt->error
        ], JSON_UNESCAPED_UNICODE);
    }
    
    $stmt->close();
} else {
    echo json_encode([
        "status" => "error", 
        "message" => "請確實填寫帳號與密碼！"
    ], JSON_UNESCAPED_UNICODE);
}

// 關閉資料庫連線
$conn->close();
?>