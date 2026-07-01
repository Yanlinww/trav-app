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

if (!empty($data->Account)) {
    $account = $data->Account;
    
    // 依據釘選狀態優先排序，再依出發日期近到遠排序
    $stmt = $conn->prepare("SELECT * FROM `Itinerary` WHERE `Account` = ? ORDER BY `Is_Pinned` DESC, `Start_Date` ASC");
    $stmt->bind_param("s", $account);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $itineraries = [];
    while ($row = $result->fetch_assoc()) {
        $itineraries[] = [
            "id" => $row['Itinerary_ID'],
            "title" => $row['Title'],
            // 將資料庫的 YYYY-MM-DD 轉為前端預期的 YYYY/MM/DD
            "startDate" => str_replace('-', '/', $row['Start_Date']),
            "endDate" => str_replace('-', '/', $row['End_Date']),
            "transport" => $row['Transport'],
            "coverImage" => $row['Cover_Image'] ?: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800&auto=format&fit=crop",
            "isPinned" => (bool)$row['Is_Pinned']
        ];
    }
    
    echo json_encode(["status" => "success", "data" => $itineraries]);
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少會員帳號標識"]);
}
$conn->close();
?>