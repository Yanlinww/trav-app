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

    // 1. 拿 Code 去向 Meta 換取 Access Token
    $token_url = "https://graph.facebook.com/v18.0/oauth/access_token?"
        . "client_id=" . $app_id
        . "&redirect_uri=" . urlencode($redirect_uri)
        . "&client_secret=" . $app_secret
        . "&code=" . $data->Code;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $token_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    $token_data = json_decode($response);

    if (isset($token_data->access_token)) {
        $access_token = $token_data->access_token;

        // 2. 獲取用戶的 Facebook ID
        $profile_url = "https://graph.facebook.com/me?fields=id&access_token=" . $access_token;
        $ch2 = curl_init();
        curl_setopt($ch2, CURLOPT_URL, $profile_url);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        $profile_response = curl_exec($ch2);
        curl_close($ch2);

        $profile_data = json_decode($profile_response);

        if (isset($profile_data->id)) {
            $fbId = $profile_data->id; 

            // 3. 寫入 Member 資料表的 facebook_id 欄位
            $stmt = $conn->prepare("UPDATE `Member` SET `facebook_id` = ? WHERE `Account` = ?");
            $stmt->bind_param("ss", $fbId, $data->Account);
            
            if ($stmt->execute()) {
                echo json_encode(["status" => "success", "message" => "🎉 Facebook 綁定成功！"]);
            } else {
                echo json_encode(["status" => "error", "message" => "資料庫更新失敗：" . $stmt->error]);
            }
            $stmt->close();
            
        } else {
            echo json_encode(["status" => "error", "message" => "無法取得 Facebook 用戶 ID"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "授權代碼 (Code) 驗證失敗"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
}
$conn->close();
?>