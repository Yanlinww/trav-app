<?php
/**
 * 個人設定功能入口：基本資料、密碼與社群帳號綁定。
 * 呼叫：POST /profile/profile.php?action=功能名稱。
 * 更新頭像使用 FormData；其餘功能使用 JSON 物件。
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../db_connect.php';

/**
 * action=update：更新會員暱稱；若有 Avatar 檔案則一併儲存頭像。
 * 原端點：update_profile.php；保留原本輸入欄位與 JSON 回應格式。
 */
function profile_update_details(mysqli $conn): void
{
    // 接收 FormData 傳來的文字資料
    $account = $_POST['Account'] ?? '';
    $name = $_POST['Name'] ?? '';

    if (empty($account) || empty($name)) {
        echo json_encode(["status" => "error", "message" => "缺少必要參數"]);
        exit();
    }

    $avatarUrl = null;

    // 處理大頭貼檔案上傳
    if (isset($_FILES['Avatar']) && $_FILES['Avatar']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['Avatar'];
        
        // 設定儲存路徑為上一層的 uploads/avatars/
        $target_dir = "../uploads/avatars/";
        if (!is_dir($target_dir)) {
            mkdir($target_dir, 0777, true);
        }
        
        // 取得副檔名並建立唯一檔名
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'avatar_' . md5($account . time()) . '.' . $ext;
        $target_file = $target_dir . $filename;
        
        // 將檔案移動到指定資料夾
        if (move_uploaded_file($file["tmp_name"], $target_file)) {
            $avatarUrl = "http://localhost:8080/uploads/avatars/" . $filename;
        }
    }

    // 更新資料庫
    if ($avatarUrl) {
        // 如果有上傳新大頭貼，就連大頭貼網址一起更新
        $stmt = $conn->prepare("UPDATE `Member` SET `Name` = ?, `Avatar` = ? WHERE `Account` = ?");
        $stmt->bind_param("sss", $name, $avatarUrl, $account);
    } else {
        // 如果沒有上傳新照片，只更新名字
        $stmt = $conn->prepare("UPDATE `Member` SET `Name` = ? WHERE `Account` = ?");
        $stmt->bind_param("ss", $name, $account);
    }

    if ($stmt->execute()) {
        echo json_encode([
            "status" => "success", 
            "message" => "個人資料更新成功！",
            "avatarUrl" => $avatarUrl // 將新網址回傳給前端更新畫面
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "更新失敗：" . $conn->error]);
    }

    $stmt->close();
    $conn->close();
}

/**
 * action=password：核對舊密碼，雜湊新密碼後更新 Member。
 * 原端點：update_password.php；保留原本輸入欄位與 JSON 回應格式。
 */
function profile_update_password(mysqli $conn): void
{
    $data = json_decode(file_get_contents("php://input"));

    if (!empty($data->Account) && !empty($data->OldPassword) && !empty($data->NewPassword)) {
        $account = $data->Account;
        $oldPassword = $data->OldPassword;
        $newPassword = $data->NewPassword;

        // 1. 先用帳號把舊密碼撈出來比對
        $stmt = $conn->prepare("SELECT `Password` FROM `Member` WHERE `Account` = ?");
        $stmt->bind_param("s", $account);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            
            // 2. 驗證舊密碼是否正確
            if (password_verify($oldPassword, $user['Password'])) {
                
                // 3. 舊密碼正確，將新密碼進行雜湊加密
                $newPasswordHashed = password_hash($newPassword, PASSWORD_DEFAULT);
                
                // 4. 寫入新密碼
                $updateStmt = $conn->prepare("UPDATE `Member` SET `Password` = ? WHERE `Account` = ?");
                $updateStmt->bind_param("ss", $newPasswordHashed, $account);

                if ($updateStmt->execute()) {
                    echo json_encode(["status" => "success", "message" => "密碼更新成功！"]);
                } else {
                    echo json_encode(["status" => "error", "message" => "資料庫更新失敗：" . $updateStmt->error]);
                }
                $updateStmt->close();
                
            } else {
                echo json_encode(["status" => "error", "message" => "目前的舊密碼輸入錯誤！"]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "找不到此帳號！"]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少必要欄位！"]);
    }

    $conn->close();
}

/**
 * action=bindings：查詢 Google 和 Facebook 是否已綁定。
 * 原端點：get_social_bindings.php；保留原本輸入欄位與 JSON 回應格式。
 */
function profile_get_social_bindings(mysqli $conn): void
{
    $data = json_decode(file_get_contents("php://input"));

    if (!empty($data->Account)) {
        // 只查詢 Google 和 Facebook 的綁定狀態
        $stmt = $conn->prepare("SELECT `google_id`, `facebook_id` FROM `Member` WHERE `Account` = ?");
        
        if (!$stmt) {
            echo json_encode(["status" => "error", "message" => "資料庫查詢準備失敗：" . $conn->error]);
            exit();
        }

        $stmt->bind_param("s", $data->Account);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            echo json_encode([
                "status" => "success",
                "bindings" => [
                    "google" => !empty($row['google_id']),
                    "facebook" => !empty($row['facebook_id'])
                ]
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "找不到此用戶"]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少帳號參數"]);
    }
    $conn->close();
}

/**
 * action=bind_google：向 Google 查驗 AccessToken 並寫入 google_id。
 * 原端點：bind_google.php；保留原本輸入欄位與 JSON 回應格式。
 */
function profile_bind_google(mysqli $conn): void
{
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
}

/**
 * action=bind_facebook：以 Facebook 授權 Code 換取使用者 ID 並寫入 facebook_id。
 * 原端點：bind_facebook.php；保留原本輸入欄位與 JSON 回應格式。
 */
function profile_bind_facebook(mysqli $conn): void
{
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
}

/**
 * action=bind_instagram：以 Instagram 授權 Code 換取 user_id 並寫入 instagram_id。
 * 原端點：bind_instagram.php；保留原本輸入欄位與 JSON 回應格式。
 */
function profile_bind_instagram(mysqli $conn): void
{
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
}

// 網址 action 對應上面的功能函式，只允許固定清單中的操作。
$handlers = [
    'update' => 'profile_update_details', // 更新會員暱稱；若有 Avatar 檔案則一併儲存頭像。
    'password' => 'profile_update_password', // 核對舊密碼，雜湊新密碼後更新 Member。
    'bindings' => 'profile_get_social_bindings', // 查詢 Google 和 Facebook 是否已綁定。
    'bind_google' => 'profile_bind_google', // 向 Google 查驗 AccessToken 並寫入 google_id。
    'bind_facebook' => 'profile_bind_facebook', // 以 Facebook 授權 Code 換取使用者 ID 並寫入 facebook_id。
    'bind_instagram' => 'profile_bind_instagram', // 以 Instagram 授權 Code 換取 user_id 並寫入 instagram_id。
];
if (!is_string($action) || !isset($handlers[$action])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => '無效的個人設定操作'], JSON_UNESCAPED_UNICODE);
    exit();
}
$handlers[$action]($conn);
