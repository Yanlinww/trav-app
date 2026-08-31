<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php';
$data = json_decode(file_get_contents("php://input"));
$account = $data->Account ?? '';

if (!empty($account)) {
    $stmt = $conn->prepare("UPDATE Notifications SET Is_Read = 1 WHERE Account = ? AND Is_Read = 0");
    $stmt->bind_param("s", $account);
    
    if($stmt->execute()){
        echo json_encode(["status" => "success", "message" => "已全部標記為已讀"]);
    } else {
        echo json_encode(["status" => "error", "message" => "更新失敗"]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少帳號參數"]);
}
$conn->close();
?>