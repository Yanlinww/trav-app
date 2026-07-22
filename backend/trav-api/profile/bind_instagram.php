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

if (!empty($data->Account) && !empty($data->Code)) {
    
    $app_id = '1349371613270362'; 
    $app_secret = 'b11dda73d29ffef9f873c97b2c2ae68a';
    $redirect_uri = 'http://localhost:3001/settings'; 

    // 🌟 呼叫「純 Instagram」的原生 API 端點
    $token_url = "https://api.instagram.com/oauth/access_token";
    $postData = [
        'client_id' => $app_id,
        'client_secret' => $app_secret,
        'grant_type' => 'authorization_code',
        'redirect_uri' => $redirect_uri,
        'code' => $data->Code
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $token_url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    $token_data = json_decode($response);

    // Instagram 原生 API 回傳的 ID 欄位叫做 user_id
    if (isset($token_data->user_id)) {
        $igId = $token_data->user_id; 

        // 🌟 寫回你的 instagram_id 欄位
        $stmt = $conn->prepare("UPDATE `Member` SET `instagram_id` = ? WHERE `Account` = ?");
        $stmt->bind_param("ss", $igId, $data->Account);
        
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "🎉 Instagram 原生綁定成功！"]);
        } else {
            echo json_encode(["status" => "error", "message" => "資料庫更新失敗：" . $stmt->error]);
        }
        $stmt->close();
        
    } else {
        echo json_encode(["status" => "error", "message" => "Instagram 授權驗證失敗", "debug" => $token_data]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
}
$conn->close();
?>