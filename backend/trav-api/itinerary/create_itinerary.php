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
    $coverImage = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop";

    // 【新增區塊】安全接收前端傳來的座標參數
    $dest_lat = isset($data->Dest_Lat) ? $data->Dest_Lat : null;
    $dest_lng = isset($data->Dest_Lng) ? $data->Dest_Lng : null;

    // 【修改區塊】擴充 INSERT 語法與 bind_param 數量 (從 ssssss 改為 ssssssdd)
    $stmt = $conn->prepare("INSERT INTO `Itinerary` (`Account`, `Title`, `Start_Date`, `End_Date`, `Transport`, `Cover_Image`, `Dest_Lat`, `Dest_Lng`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssssdd", $account, $title, $startDate, $endDate, $transport, $coverImage, $dest_lat, $dest_lng);
    
    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        
        echo json_encode([
            "status" => "success",
            "itinerary_id" => $new_id,
            "coverImage" => $coverImage
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "新增失敗: " . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少必填欄位"]);
}
$conn->close();
?>