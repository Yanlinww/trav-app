<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Account)) {
    $stmt = $conn->prepare("SELECT * FROM MemberSocialLinks WHERE Account = ?");
    $stmt->bind_param("s", $data->Account);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(["status" => "success", "data" => $result->fetch_assoc()]);
    } else {
        // 如果沒有資料，回傳空的結構避免前端報錯
        echo json_encode(["status" => "success", "data" => ["instagram"=>"", "twitter"=>"", "xiaohongshu"=>"", "tiktok"=>"", "youtube"=>"", "facebook"=>""]]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "缺少帳號資訊"]);
}
$conn->close();
?>