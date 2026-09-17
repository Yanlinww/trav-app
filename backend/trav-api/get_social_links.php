<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Account)) {
    // 改為從 Member 表撈取 Link_ 開頭的社群欄位
    $stmt = $conn->prepare("SELECT Link_Instagram, Link_Twitter, Link_Xiaohongshu, Link_Tiktok, Link_Youtube, Link_Facebook FROM Member WHERE Account = ?");
    $stmt->bind_param("s", $data->Account);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        
        // 為了不讓前端報錯，回傳給前端時把 key 轉回原本的小寫無前綴格式
        $formattedData = [
            "instagram" => $row['Link_Instagram'] ?? "",
            "twitter" => $row['Link_Twitter'] ?? "",
            "xiaohongshu" => $row['Link_Xiaohongshu'] ?? "",
            "tiktok" => $row['Link_Tiktok'] ?? "",
            "youtube" => $row['Link_Youtube'] ?? "",
            "facebook" => $row['Link_Facebook'] ?? ""
        ];
        
        echo json_encode(["status" => "success", "data" => $formattedData]);
    } else {
        // 如果連會員都找不到的防呆處理
        echo json_encode(["status" => "success", "data" => ["instagram"=>"", "twitter"=>"", "xiaohongshu"=>"", "tiktok"=>"", "youtube"=>"", "facebook"=>""]]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少帳號資訊"]);
}
$conn->close();
?>