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

// 檢查是否收到檔案與必要參數 (注意：FormData 傳遞的文字會放在 $_POST，檔案在 $_FILES)
if (isset($_FILES['cover_image']) && !empty($_POST['Itinerary_ID']) && !empty($_POST['Account'])) {
    
    $itinerary_id = $_POST['Itinerary_ID'];
    $account = $_POST['Account'];
    $file = $_FILES['cover_image'];

    // 1. 權限驗證：確保這個行程是該使用者的
    $check_stmt = $conn->prepare("SELECT `Itinerary_ID` FROM `Itinerary` WHERE `Itinerary_ID` = ? AND `Account` = ?");
    $check_stmt->bind_param("is", $itinerary_id, $account);
    $check_stmt->execute();
    if ($check_stmt->get_result()->num_rows === 0) {
        echo json_encode(["status" => "error", "message" => "無權限修改此行程。"]);
        exit();
    }
    $check_stmt->close();

    // 2. 建立上傳目錄 (若不存在則自動建立)
    $upload_dir = '../uploads/covers/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }

    // 3. 處理檔案名稱 (使用時間戳記避免檔名重複)
    $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    // 允許的副檔名防呆
    $allowed_ext = ['jpg', 'jpeg', 'png', 'webp'];
    if (!in_array(strtolower($file_extension), $allowed_ext)) {
        echo json_encode(["status" => "error", "message" => "僅允許上傳 JPG, PNG 或 WEBP 格式。"]);
        exit();
    }

    $new_filename = "cover_" . $itinerary_id . "_" . time() . "." . $file_extension;
    $target_path = $upload_dir . $new_filename;

    // 4. 將檔案從暫存區移動到目標資料夾
    if (move_uploaded_file($file['tmp_name'], $target_path)) {
        
        // 5. 組合對外網址 (依據你的 Docker 伺服器 Port 8080)
        $image_url = "http://localhost:8080/uploads/covers/" . $new_filename;

        // 6. 更新資料庫
        $update_stmt = $conn->prepare("UPDATE `Itinerary` SET `Cover_Image` = ? WHERE `Itinerary_ID` = ?");
        $update_stmt->bind_param("si", $image_url, $itinerary_id);
        
        if ($update_stmt->execute()) {
            echo json_encode([
                "status" => "success", 
                "message" => "圖片更新成功",
                "new_image_url" => $image_url
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "資料庫更新失敗。"]);
        }
        $update_stmt->close();

    } else {
        echo json_encode(["status" => "error", "message" => "實體檔案寫入伺服器失敗。"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "缺少圖片檔案或必要參數。"]);
}

$conn->close();
?>