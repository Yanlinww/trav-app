<?php
/** 
 * =========================================================================
 * 帳號驗證中心 (Auth API)
 * 負責處理：一般登入、一般註冊、Google 快速登入、Facebook 快速登入
 * =========================================================================
 */

// -------------------------------------------------------------------------
// 1. CORS 跨域設定與環境準備
// 前後端直接使用不同連接埠時屬不同來源；經 /backend 代理呼叫則是瀏覽器同源請求。
// -------------------------------------------------------------------------
header('Access-Control-Allow-Origin: *'); // 允許任何前端網域來呼叫這支 API
header('Access-Control-Allow-Methods: POST, GET, OPTIONS'); // 向瀏覽器宣告方法；本檔只攔 OPTIONS，未強制其餘請求為 POST。
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With'); // 允許前端帶來的標頭
header('Content-Type: application/json; charset=utf-8'); // 告訴前端：我回傳的資料格式是 JSON，且支援中文

// 跨來源 JSON 等非簡單請求會先送 OPTIONS 預檢；不是每個 POST 都會預檢。
// 這裡我們直接回傳 200 (OK)，讓前端可以順利發送真正的 POST 請求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// 載入資料庫連線設定 (這樣才能使用 $conn 變數來操作 MySQL)
require_once __DIR__ . '/db_connect.php'; 

// -------------------------------------------------------------------------
// 2. 路由分發器 (Router) - 決定現在要做什麼動作
// -------------------------------------------------------------------------
// 固定 action 與函式對照，避免任意指定函式；白名單本身不是登入或呼叫權限驗證。
$actions = [
    'login' => 'auth_login',       // 呼叫 auth_login 函數
    'register' => 'auth_register', // 呼叫 auth_register 函數
    'google' => 'auth_google',     // 呼叫 auth_google 函數
    'facebook' => 'auth_facebook'  // 呼叫 auth_facebook 函數
];

// 取得網址列上的 ?action=XXX 參數 (例如：auth.php?action=login)
$action =$_GET['action'] ?? '';

// 如果 action 不在我們的白名單內，就擋下來並報錯 (HTTP 狀態碼 400 Bad Request)
if (!isset($actions[$action])) { 
    http_response_code(400); 
    echo json_encode(['status' => 'error', 'message' => '無效的帳號操作'], JSON_UNESCAPED_UNICODE); 
    exit(); 
}

// 根據 action 執行對應的 PHP 函數，並把資料庫連線 ($conn) 傳進去
$actions[$action]($conn);


// -------------------------------------------------------------------------
// 功能 A：一般帳號密碼登入
// -------------------------------------------------------------------------
function auth_login(mysqli $conn): void {
    // 讀取前端用 POST 傳過來的 JSON 資料，並轉換成 PHP 物件
    $data = json_decode(file_get_contents("php://input"));

    // 檢查帳號和密碼是否有填寫
    if (!empty($data->Account) && !empty($data->Password)) {
        $account =$data->Account;
        $password =$data->Password;

        // 【安全重點】準備 SQL 語句。使用 `?` 佔位符可以防止「SQL 注入攻擊 (SQL Injection)」
        $stmt =$conn->prepare("SELECT * FROM `Member` WHERE `Account` = ?");
        // 把 $account 變數綁定到 `?` 的位置 ("s" 代表字串 String)
        $stmt->bind_param("s", $account);$stmt->execute();
        $result =$stmt->get_result(); // 取得查詢結果

        // 如果在資料庫有找到這個帳號 (筆數 > 0)
        if ($result->num_rows > 0) {
            $user =$result->fetch_assoc(); // 將資料庫的一筆資料轉成 PHP 陣列
            
            // 【安全重點】密碼驗證：前端傳來的明碼 (例如 "1234")，與資料庫裡的亂碼 (Hash) 進行比對
            if (password_verify($password,$user['Password'])) {
                // 比對成功只回傳會員資料；此處沒有建立 PHP session 或本站登入權杖。
                echo json_encode([
                    "status" => "success",
                    "message" => "登入成功！歡迎回來 TRAVMADE！",
                    "user" => [
                        "id" => $user['Account'],        // 把 Account 當作前端的 user.id
                        "email" => $user['Email'],
                        "nickname" => $user['Name'],
                        "avatar" => $user['Avatar'],
                        "role" => $user['Role'] ?? 'user'
                    ]
                ], JSON_UNESCAPED_UNICODE);
            } else {
                // 密碼錯誤
                echo json_encode(["status" => "error", "message" => "密碼輸入錯誤喔，請再確認一次！"], JSON_UNESCAPED_UNICODE);
            }
        } else {
            // 找不到這個帳號
            echo json_encode(["status" => "error", "message" => "找不到此帳號，請確認輸入或先去註冊！"], JSON_UNESCAPED_UNICODE);
        }
        $stmt->close(); // 關閉查詢釋放資源
    } else {
        echo json_encode(["status" => "error", "message" => "請確實填寫帳號與密碼！"], JSON_UNESCAPED_UNICODE);
    }
    $conn->close();
}


// -------------------------------------------------------------------------
// 功能 B：一般帳號註冊
// -------------------------------------------------------------------------
function auth_register(mysqli $conn): void {$data = json_decode(file_get_contents("php://input"));

    if (!empty($data->Account) && !empty($data->Password)) {
        $account =$data->Account;
        $email =$data->Email ?? '';
        $name =$data->Name ?? '';
        $gender =$data->Gender ?? '';
        
        // password_hash 產生含鹽值的單向雜湊，不是可解密的密文；登入時由 password_verify 比對。
        // 不儲存明碼，但弱密碼仍可能被猜測，不能將雜湊描述成絕對無法還原或破解。
        $password_hashed = password_hash($data->Password, PASSWORD_DEFAULT);

        // 使用 `?` 佔位符準備寫入資料
        $stmt =$conn->prepare("INSERT INTO `Member` (`Account`, `Password`, `Email`, `Name`, `Gender`) VALUES (?, ?, ?, ?, ?)");
        // "sssss" 代表有 5 個 String 參數要綁定
        $stmt->bind_param("sssss", $account, $password_hashed,$email, $name,$gender);

        // 執行寫入動作
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "🎉 恭喜！帳號註冊成功！"], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(["status" => "error", "message" => "註冊失敗，可能是該帳號或信箱已經被註冊過了。"], JSON_UNESCAPED_UNICODE);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "請確實填寫帳號與密碼！"], JSON_UNESCAPED_UNICODE);
    }
    $conn->close();
}


// -------------------------------------------------------------------------
// 第三方登入共用輔助函數 (減少重複的程式碼)
// -------------------------------------------------------------------------
function respond_social_login_success(string $message, array$user): void {
    // 專門負責在第三方登入成功時，把正確的 JSON 格式回傳給前端
    echo json_encode([
        "status" => "success", 
        "message" => $message, 
        "user" => $user
    ], JSON_UNESCAPED_UNICODE);
}


// -------------------------------------------------------------------------
// 功能 C：Google 快速登入 (前端給 Token，後端去驗證)
// -------------------------------------------------------------------------
function auth_google(mysqli $conn): void {$data = json_decode(file_get_contents("php://input"));

    if (!empty($data->AccessToken)) {
        $token =$data->AccessToken; // 前端 Google 登入後拿到的那串 Token
        
        // 1. 使用 cURL (PHP 的網路請求工具) 帶著 Token 去向 Google 的伺服器要資料
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://www.googleapis.com/oauth2/v3/userinfo");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        // Bearer Token 用於向 Google 取得授權的會員資料，不是本站後續 API 的登入憑證。
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer " . $token]);
        $response = curl_exec($ch);
        curl_close($ch);
        
        $g_user = json_decode($response); // 解析 Google 回傳的 JSON

        // 如果 Google 有成功回傳 sub (Google 帳號的唯一 ID)
        if (isset($g_user->sub)) {
            $g_id =$g_user->sub; 
            $email =$g_user->email ?? '';
            $name =$g_user->name ?? 'Google User';
            $avatar =$g_user->picture ?? '';
            
            // 2. 去我們的 MySQL 資料庫尋找：這個 Google ID 或這個信箱，是不是已經註冊過了？
            $stmt =$conn->prepare("SELECT * FROM `Member` WHERE `google_id` = ? OR `Account` = ? OR `Email` = ?");
            $stmt->bind_param("sss", $g_id,$email, $email);$stmt->execute();
            $result =$stmt->get_result();
            
            if ($result->num_rows > 0) {
                // 🔹 情境 A：老朋友 (帳號已存在) -> 直接讓他登入
                $user =$result->fetch_assoc();
                
                // 如果他以前是用一般註冊，這是第一次按 Google 登入，我們順便幫他把 google_id 綁定存進去
                if (empty($user['google_id'])) {
                    $upd =$conn->prepare("UPDATE `Member` SET `google_id` = ? WHERE `Account` = ?");
                    $upd->bind_param("ss", $g_id,$user['Account']);
                    $upd->execute();$upd->close();
                }
                
                // 呼叫輔助函數，回傳成功訊息給前端
                respond_social_login_success("🎉 Google 登入成功！", [
                    "id" => $user['Account'], 
                    "email" => $user['Email'], 
                    "nickname" => $user['Name'], 
                    "avatar" => $user['Avatar'], 
                    "role" => $user['Role'] ?? 'user'
                ]);
            } else {
                // 🔹 情境 B：新朋友 (帳號不存在) -> 系統自動幫他註冊
                $account =$email; // 將他的 Google Email 直接當作我們的登入帳號 (Account)
                // 產生 8 個隨機位元組、轉為 16 字元十六進位字串後做雜湊；不將這組密碼回傳給前端。
                $random_password = password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT); 
                
                $ins =$conn->prepare("INSERT INTO `Member` (`Account`, `Password`, `Email`, `Name`, `Avatar`, `google_id`) VALUES (?, ?, ?, ?, ?, ?)");
                $ins->bind_param("ssssss", $account,$random_password, $email,$name, $avatar,$g_id);
                
                if ($ins->execute()) {
                    // 自動註冊成功，立刻讓他登入
                    respond_social_login_success("🎉 帳號建立完成，Google 登入成功！", [
                        "id" => $account, 
                        "email" => $email, 
                        "nickname" => $name, 
                        "avatar" => $avatar, 
                        "role" => 'user'
                    ]);
                } else {
                    echo json_encode(["status" => "error", "message" => "自動註冊失敗：" . $conn->error]);
                }
                $ins->close();
            }
            $stmt->close();
        } else { 
            echo json_encode(["status" => "error", "message" => "無法取得 Google 用戶資料"]); 
        }
    } else { 
        echo json_encode(["status" => "error", "message" => "缺少授權碼"]); 
    }
    $conn->close();
}


// -------------------------------------------------------------------------
// 功能 D：Facebook 快速登入 (前端給 Code，後端自己去換 Token 跟資料)
// -------------------------------------------------------------------------
function auth_facebook(mysqli $conn): void {$data = json_decode(file_get_contents("php://input"));

    if (!empty($data->Code) && !empty($data->RedirectUri)) {
        // ⚠️ 開發專題提醒：這些 ID 和 Secret 最好寫在 .env 設定檔，不要公開放在程式碼中
        $app_id = '1349371613270362';$app_secret = 'b11dda73d29ffef9f873c97b2c2ae68a';
        $redirect_uri =$data->RedirectUri; 

        // 1. 拿前端傳來的 Code，去跟 Facebook 伺服器換取「通行證 (Access Token)」
        $token_url = "https://graph.facebook.com/v18.0/oauth/access_token?client_id=" . $app_id . "&redirect_uri=" . urlencode($redirect_uri) . "&client_secret=" . $app_secret . "&code=" . $data->Code;
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL,$token_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);
        $token_data = json_decode($response);

        // 如果成功換到 Token
        if (isset($token_data->access_token)) {
            $access_token =$token_data->access_token;
            
            // 2. 拿著剛換到的 Token，去向 FB 索取用戶資料 (指定要大尺寸的 picture)
            $profile_url = "https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=" . $access_token;
            $ch2 = curl_init();
            curl_setopt($ch2, CURLOPT_URL,$profile_url);
            curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
            $profile_response = curl_exec($ch2);
            curl_close($ch2);
            $fb_user = json_decode($profile_response);

            // 如果成功拿到 FB 使用者資料
            if (isset($fb_user->id)) {
                $fb_id =$fb_user->id; // FB 的唯一識別碼
                $name =$fb_user->name ?? 'Facebook User';
                // FB 有時候不會給 Email(用戶沒綁定或隱私設定)，此時用 FB_ID 假造一個 Email 防呆
                $email = $fb_user->email ?? ($fb_id . '@facebook.com'); 
                $avatar =$fb_user->picture->data->url ?? '';

                // 3. 檢查我們資料庫是否已經有這個人了
                $stmt =$conn->prepare("SELECT * FROM `Member` WHERE `facebook_id` = ? OR `Account` = ? OR `Email` = ?");
                $stmt->bind_param("sss", $fb_id,$email, $email);$stmt->execute();
                $result =$stmt->get_result();

                if ($result->num_rows > 0) {
                    // 🔹 情境 A：老朋友 -> 直接登入
                    $user =$result->fetch_assoc();
                    
                    // 順便綁定 facebook_id
                    if (empty($user['facebook_id'])) {
                        $upd =$conn->prepare("UPDATE `Member` SET `facebook_id` = ? WHERE `Account` = ?");
                        $upd->bind_param("ss", $fb_id,$user['Account']);
                        $upd->execute();$upd->close();
                    }
                    respond_social_login_success("🎉 Facebook 登入成功！", [
                        "id" => $user['Account'], 
                        "email" => $user['Email'], 
                        "nickname" => $user['Name'], 
                        "avatar" => $user['Avatar'], 
                        "role" => $user['Role'] ?? 'user'
                    ]);
                } else {
                    // 🔹 情境 B：新朋友 -> 自動註冊並登入
                    $account =$email;
                    $random_password = password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT);
                    
                    $ins =$conn->prepare("INSERT INTO `Member` (`Account`, `Password`, `Email`, `Name`, `Avatar`, `facebook_id`) VALUES (?, ?, ?, ?, ?, ?)");
                    $ins->bind_param("ssssss", $account,$random_password, $email,$name, $avatar,$fb_id);
                    
                    if ($ins->execute()) {
                        respond_social_login_success("🎉 帳號建立完成，Facebook 登入成功！", [
                            "id" => $account, 
                            "email" => $email, 
                            "nickname" => $name, 
                            "avatar" => $avatar, 
                            "role" => 'user'
                        ]);
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
