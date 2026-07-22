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
?>