<?php
// 跨網域設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 載入資料庫連線 (請確保路徑正確，若找不到檔案會報錯)
require_once '../db_connect.php'; 
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
?>