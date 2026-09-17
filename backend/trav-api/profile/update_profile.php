<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once '../db_connect.php';

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
?>