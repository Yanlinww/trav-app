<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php'; 
require_once __DIR__ . '/auth/auth_session_helpers.php';
$data = json_decode(file_get_contents("php://input"));

function respond_facebook_login_success(mysqli $conn, string $message, array $user): void {
    try {
        echo json_encode(["status" => "success", "message" => $message, "token" => issue_auth_session($conn, $user['id']), "user" => $user], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $error) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "登入工作階段建立失敗，請稍後再試。"], JSON_UNESCAPED_UNICODE);
    }
}

if (!empty($data->Code) && !empty($data->RedirectUri)) {
    $app_id = '1349371613270362'; 
    $app_secret = 'b11dda73d29ffef9f873c97b2c2ae68a';
    $redirect_uri = $data->RedirectUri; 

    // 1. 換取 Access Token
    $token_url = "https://graph.facebook.com/v18.0/oauth/access_token?client_id=" . $app_id . "&redirect_uri=" . urlencode($redirect_uri) . "&client_secret=" . $app_secret . "&code=" . $data->Code;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $token_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    $token_data = json_decode($response);

    if (isset($token_data->access_token)) {
        $access_token = $token_data->access_token;
        
        // 2. 拿 Token 換取 FB 用戶資料 (包含大頭貼)
        $profile_url = "https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=" . $access_token;
        $ch2 = curl_init();
        curl_setopt($ch2, CURLOPT_URL, $profile_url);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        $profile_response = curl_exec($ch2);
        curl_close($ch2);
        $fb_user = json_decode($profile_response);

        if (isset($fb_user->id)) {
            $fb_id = $fb_user->id;
            $name = $fb_user->name ?? 'Facebook User';
            $email = $fb_user->email ?? ($fb_id . '@facebook.com'); // 如果 FB 沒給 email 的備案
            $avatar = $fb_user->picture->data->url ?? '';

            // 檢查資料庫是否已有此人
            $stmt = $conn->prepare("SELECT * FROM `Member` WHERE `facebook_id` = ? OR `Account` = ? OR `Email` = ?");
            $stmt->bind_param("sss", $fb_id, $email, $email);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows > 0) {
                // ✅ 情境 A：帳號已存在 -> 直接登入
                $user = $result->fetch_assoc();
                if (empty($user['facebook_id'])) {
                    $upd = $conn->prepare("UPDATE `Member` SET `facebook_id` = ? WHERE `Account` = ?");
                    $upd->bind_param("ss", $fb_id, $user['Account']);
                    $upd->execute(); $upd->close();
                }
                respond_facebook_login_success($conn, "🎉 Facebook 登入成功！", ["id" => $user['Account'], "email" => $user['Email'], "nickname" => $user['Name'], "avatar" => $user['Avatar'], "role" => $user['Role'] ?? 'user']);
            } else {
                // 🆕 情境 B：帳號不存在 -> 自動註冊並登入
                $account = $email;
                $random_password = password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT);
                $ins = $conn->prepare("INSERT INTO `Member` (`Account`, `Password`, `Email`, `Name`, `Avatar`, `facebook_id`) VALUES (?, ?, ?, ?, ?, ?)");
                $ins->bind_param("ssssss", $account, $random_password, $email, $name, $avatar, $fb_id);
                if ($ins->execute()) {
                    respond_facebook_login_success($conn, "🎉 帳號建立完成，Facebook 登入成功！", ["id" => $account, "email" => $email, "nickname" => $name, "avatar" => $avatar, "role" => 'user']);
                } else {
                    echo json_encode(["status" => "error", "message" => "自動註冊失敗：" . $conn->error]);
                }
                $ins->close();
            }
            $stmt->close();
        } else { echo json_encode(["status" => "error", "message" => "無法取得 FB 用戶資料"]); }
    } else { echo json_encode(["status" => "error", "message" => "FB 授權驗證失敗"]); }
} else { echo json_encode(["status" => "error", "message" => "缺少授權碼或回調網址"]); }
$conn->close();
?>
