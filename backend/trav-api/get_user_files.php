<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Account) && !empty($data->Tab_Type)) {
    // 依據帳號與分頁類型，撈出所有檔案，並依照上傳時間由新到舊排序
    $stmt = $conn->prepare("SELECT * FROM `UserFiles` WHERE `Account` = ? AND `Tab_Type` = ? ORDER BY `Upload_Time` DESC");
    $stmt->bind_param("ss", $data->Account, $data->Tab_Type);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $files = [];
    while($row = $result->fetch_assoc()) {
        $files[] = $row;
    }
    
    echo json_encode([
        "status" => "success", 
        "data" => $files
    ]);
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少查詢參數"]);
}
$conn->close();
?>