<?php
/** 帳號入口：密碼登入、註冊、Google 與 Facebook 登入。 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/db_connect.php';

$actions = ['login' => 'auth_login', 'register' => 'auth_register', 'google' => 'auth_google', 'facebook' => 'auth_facebook'];
$action = $_GET['action'] ?? '';
if (!isset($actions[$action])) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => '無效的帳號操作'], JSON_UNESCAPED_UNICODE); exit(); }
$actions[$action]($conn);

/** login 原本的操作內容。 */
function auth_login(mysqli $conn): void {
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
                
                echo json_encode([
                    "status" => "success",
                    "message" => "登入成功！歡迎回來 TRAVMADE！",
                    "user" => [
                        "id" => $user['Account'],
                        "email" => $user['Email'],
                        "nickname" => $user['Name'],
                        "avatar" => $user['Avatar'],
                        "role" => $user['Role'] ?? 'user'
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
}

/** register 原本的操作內容。 */
function auth_register(mysqli $conn): void {
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
}

function respond_google_login_success(string $message, array $user): void {
    echo json_encode(["status" => "success", "message" => $message, "user" => $user], JSON_UNESCAPED_UNICODE);
}


/** social_login_google 原本的操作內容。 */
function auth_google(mysqli $conn): void {
    $data = json_decode(file_get_contents("php://input"));


    if (!empty($data->AccessToken)) {
        $token = $data->AccessToken;
        
        // 透過 Token 向 Google 獲取用戶資料
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://www.googleapis.com/oauth2/v3/userinfo");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer " . $token]);
        $response = curl_exec($ch);
        curl_close($ch);
        $g_user = json_decode($response);

        if (isset($g_user->sub)) {
            $g_id = $g_user->sub;
            $email = $g_user->email ?? '';
            $name = $g_user->name ?? 'Google User';
            $avatar = $g_user->picture ?? '';
            
            // 檢查資料庫是否已有此人 (用 google_id 或 Email 判斷)
            $stmt = $conn->prepare("SELECT * FROM `Member` WHERE `google_id` = ? OR `Account` = ? OR `Email` = ?");
            $stmt->bind_param("sss", $g_id, $email, $email);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                // ✅ 情境 A：帳號已存在 -> 直接登入
                $user = $result->fetch_assoc();
                
                // 如果他是第一次用 Google 登入，順便幫他把 google_id 補上
                if (empty($user['google_id'])) {
                    $upd = $conn->prepare("UPDATE `Member` SET `google_id` = ? WHERE `Account` = ?");
                    $upd->bind_param("ss", $g_id, $user['Account']);
                    $upd->execute(); $upd->close();
                }
                respond_google_login_success("🎉 Google 登入成功！", ["id" => $user['Account'], "email" => $user['Email'], "nickname" => $user['Name'], "avatar" => $user['Avatar'], "role" => $user['Role'] ?? 'user']);
            } else {
                // 🆕 情境 B：帳號不存在 -> 自動註冊並登入
                $account = $email; // 將 Email 作為帳號
                $random_password = password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT); // 隨機生成一組密碼
                
                $ins = $conn->prepare("INSERT INTO `Member` (`Account`, `Password`, `Email`, `Name`, `Avatar`, `google_id`) VALUES (?, ?, ?, ?, ?, ?)");
                $ins->bind_param("ssssss", $account, $random_password, $email, $name, $avatar, $g_id);
                
                if ($ins->execute()) {
                    respond_google_login_success("🎉 帳號建立完成，Google 登入成功！", ["id" => $account, "email" => $email, "nickname" => $name, "avatar" => $avatar, "role" => 'user']);
                } else {
                    echo json_encode(["status" => "error", "message" => "自動註冊失敗：" . $conn->error]);
                }
                $ins->close();
            }
            $stmt->close();
        } else { echo json_encode(["status" => "error", "message" => "無法取得 Google 用戶資料"]); }
    } else { echo json_encode(["status" => "error", "message" => "缺少授權碼"]); }
    $conn->close();
}

function respond_facebook_login_success(string $message, array $user): void {
    echo json_encode(["status" => "success", "message" => $message, "user" => $user], JSON_UNESCAPED_UNICODE);
}


/** social_login_facebook 原本的操作內容。 */
function auth_facebook(mysqli $conn): void {
    $data = json_decode(file_get_contents("php://input"));


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
                    respond_facebook_login_success("🎉 Facebook 登入成功！", ["id" => $user['Account'], "email" => $user['Email'], "nickname" => $user['Name'], "avatar" => $user['Avatar'], "role" => $user['Role'] ?? 'user']);
                } else {
                    // 🆕 情境 B：帳號不存在 -> 自動註冊並登入
                    $account = $email;
                    $random_password = password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT);
                    $ins = $conn->prepare("INSERT INTO `Member` (`Account`, `Password`, `Email`, `Name`, `Avatar`, `facebook_id`) VALUES (?, ?, ?, ?, ?, ?)");
                    $ins->bind_param("ssssss", $account, $random_password, $email, $name, $avatar, $fb_id);
                    if ($ins->execute()) {
                        respond_facebook_login_success("🎉 帳號建立完成，Facebook 登入成功！", ["id" => $account, "email" => $email, "nickname" => $name, "avatar" => $avatar, "role" => 'user']);
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
}
