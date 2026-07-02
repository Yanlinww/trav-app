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

if (!empty($data->Account) && !empty($data->Title) && !empty($data->StartDate) && !empty($data->EndDate)) {
    
    $account = $data->Account;
    $title = $data->Title;
    $startDate = $data->StartDate;
    $endDate = $data->EndDate;
    $transport = $data->Transport ?? 'train';
    // 預設給予一張極簡風格的封面圖
    $coverImage = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop"; 

    $stmt = $conn->prepare("INSERT INTO `Itinerary` (`Account`, `Title`, `Start_Date`, `End_Date`, `Transport`, `Cover_Image`) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssss", $account, $title, $startDate, $endDate, $transport, $coverImage);

    if ($stmt->execute()) {
        $new_id = $conn->insert_id; // 取得剛剛生成的 Itinerary_ID
        
        echo json_encode([
            "status" => "success",
            "itinerary_id" => $new_id,
            "coverImage" => $coverImage
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "資料庫寫入失敗：" . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "資料傳遞不完整，缺少必要欄位。"]);
}
$conn->close();
?>