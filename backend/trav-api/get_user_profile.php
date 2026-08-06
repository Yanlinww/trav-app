<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Account)) {
    $stmt = $conn->prepare("SELECT Account, Name, Avatar FROM Member WHERE Account = ?");
    $stmt->bind_param("s", $data->Account);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        echo json_encode([
            "status" => "success", 
            "data" => [
                "account" => $user['Account'],
                "name" => $user['Name'],
                "avatar" => $user['Avatar']
            ]
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "找不到此使用者"]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少帳號參數"]);
}
$conn->close();
?>