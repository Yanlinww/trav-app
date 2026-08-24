<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php'; // 確保路徑對應到你的 db_connect.php
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
            echo json_encode(["status" => "success", "message" => "🎉 Google 登入成功！", "user" => ["id" => $user['Account'], "email" => $user['Email'], "nickname" => $user['Name'], "avatar" => $user['Avatar'], "role" => $user['Role'] ?? 'user']]);
        } else {
            // 🆕 情境 B：帳號不存在 -> 自動註冊並登入
            $account = $email; // 將 Email 作為帳號
            $random_password = password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT); // 隨機生成一組密碼
            
            $ins = $conn->prepare("INSERT INTO `Member` (`Account`, `Password`, `Email`, `Name`, `Avatar`, `google_id`) VALUES (?, ?, ?, ?, ?, ?)");
            $ins->bind_param("ssssss", $account, $random_password, $email, $name, $avatar, $g_id);
            
            if ($ins->execute()) {
                echo json_encode(["status" => "success", "message" => "🎉 帳號建立完成，Google 登入成功！", "user" => ["id" => $account, "email" => $email, "nickname" => $name, "avatar" => $avatar, "role" => 'user']]);
            } else {
                echo json_encode(["status" => "error", "message" => "自動註冊失敗：" . $conn->error]);
            }
            $ins->close();
        }
        $stmt->close();
    } else { echo json_encode(["status" => "error", "message" => "無法取得 Google 用戶資料"]); }
} else { echo json_encode(["status" => "error", "message" => "缺少授權碼"]); }
$conn->close();
?>
