<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Account) && !empty($data->AccessToken)) {
    
    // 1. 拿著前端傳來的 Token，去 Google 官方 API 查詢這是哪個使用者的帳號
    $googleApiUrl = "https://www.googleapis.com/oauth2/v3/userinfo?access_token=" . $data->AccessToken;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $googleApiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $googleUser = json_decode($response);

    // 2. 確認 Google 確實有回傳使用者的專屬 ID (sub)
    if (isset($googleUser->sub)) {
        $googleId = $googleUser->sub; // Google 給這個用戶的全球唯一 ID
        
        // 3. 把這個 Google ID 寫進我們的 Member 資料庫裡
        $stmt = $conn->prepare("UPDATE `Member` SET `google_id` = ? WHERE `Account` = ?");
        $stmt->bind_param("ss", $googleId, $data->Account);
        
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "🎉 Google 帳號綁定成功！"]);
        } else {
            echo json_encode(["status" => "error", "message" => "資料庫更新失敗：" . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "Google 授權碼驗證失敗或過期"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要欄位 (Account 或 AccessToken)"]);
}
$conn->close();
?>