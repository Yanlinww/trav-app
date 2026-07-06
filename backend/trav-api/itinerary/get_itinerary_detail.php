<?php
// 跨網域與 Header 設定 (對齊你專案的標準寫法)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// 處理 OPTIONS 預檢請求
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. 正確引入上一層的連線檔案
require_once '../db_connect.php';

$data = json_decode(file_get_contents("php://input"));

// 防呆機制：確認必要參數存在
if (!empty($data->Itinerary_ID) && !empty($data->Account)) {
    
    // 2. 使用 mysqli 預處理語法，並對齊正確的欄位名稱 (Itinerary_ID)
    $stmt = $conn->prepare("SELECT * FROM `Itinerary` WHERE `Itinerary_ID` = ? AND `Account` = ?");
    // 綁定參數 (i 代表整數, s 代表字串)
    $stmt->bind_param("is", $data->Itinerary_ID, $data->Account);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        
        // 3. 將資料庫的資料 Mapping 回前端預期的 JSON 格式
        echo json_encode([
            "status" => "success",
            "data" => [
                "id" => $row['Itinerary_ID'],
                "title" => $row['Title'],
                // 將日期格式從 YYYY-MM-DD 轉為 YYYY/MM/DD 保持與前端一致
                "startDate" => str_replace('-', '/', $row['Start_Date']),
                "endDate" => str_replace('-', '/', $row['End_Date']),
                "coverImage" => $row['Cover_Image'] ?: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop",
                "transport" => $row['Transport']
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "找不到該行程，或無存取權限。"], JSON_UNESCAPED_UNICODE);
    }
    
    $stmt->close();
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "參數不完整，缺少行程ID或帳號。"], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>