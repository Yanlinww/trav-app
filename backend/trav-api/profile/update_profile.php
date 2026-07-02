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

// 確保有收到主鍵 (Account) 才能進行更新
if (!empty($data->Account) && !empty($data->Name)) {
    $account = $data->Account;
    $name = $data->Name;
    // 若沒有上傳新頭像，則接收 null
    $avatar = isset($data->Avatar) ? $data->Avatar : null;

    // 執行更新指令
    $stmt = $conn->prepare("UPDATE `Member` SET `Name` = ?, `Avatar` = ? WHERE `Account` = ?");
    $stmt->bind_param("sss", $name, $avatar, $account);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "票務資訊更新成功"]);
    } else {
        echo json_encode(["status" => "error", "message" => "資料庫更新失敗：" . $stmt->error]);
    }
    
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要欄位(帳號或名稱)"]);
}

$conn->close();
?>