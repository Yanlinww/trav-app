<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 載入資料庫連線
require_once 'db_connect.php';

// 接收表單傳來的文字資料
$account = $_POST['Account'] ?? '';
$type = $_POST['type'] ?? 'photos'; // photos, journeys, 或 saved

// 檢查帳號是否為空
if (empty($account)) {
    echo json_encode(["status" => "error", "message" => "遺失使用者帳號資訊。"]);
    exit();
}

if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['file'];
    
    // 設定儲存資料夾
    $target_dir = "uploads/" . $type . "/";
    if (!is_dir($target_dir)) {
        mkdir($target_dir, 0777, true);
    }
    
    // 重新命名檔案避免重複
    $filename = time() . '_' . rand(1000, 9999) . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", basename($file["name"]));
    $target_file = $target_dir . $filename;
    
    // 移動檔案
    if (move_uploaded_file($file["tmp_name"], $target_file)) {
        $file_url = "http://localhost:8080/" . $target_file;
        
        // 🌟 核心新增：將檔案資訊寫入資料庫 🌟
        $stmt = $conn->prepare("INSERT INTO `UserFiles` (`Account`, `Tab_Type`, `File_URL`) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $account, $type, $file_url);
        
        if ($stmt->execute()) {
            echo json_encode([
                "status" => "success", 
                "message" => "上傳並成功寫入資料庫！",
                "url" => $file_url
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "檔案已上傳，但資料庫寫入失敗：" . $conn->error]);
        }
        $stmt->close();
        
    } else {
        echo json_encode(["status" => "error", "message" => "檔案移動失敗，請檢查伺服器權限。"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "沒有接收到檔案，或檔案過大。"]);
}

$conn->close();
?>