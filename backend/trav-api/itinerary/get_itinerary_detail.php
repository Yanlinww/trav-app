<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID) && !empty($data->Account)) {
    // 【修改核心】：聯集查詢 Itinerary 與 Itinerary_Members
    $stmt = $conn->prepare("
        SELECT i.* 
        FROM Itinerary i 
        LEFT JOIN Itinerary_Members m ON i.Itinerary_ID = m.Itinerary_ID 
        WHERE i.Itinerary_ID = ? AND (i.Account = ? OR m.Account = ?)
    ");
    $stmt->bind_param("iss", $data->Itinerary_ID, $data->Account, $data->Account);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    
    if ($result) {
        // 將資料庫欄位映射給前端
        $itineraryData = [
            "id" => $result['Itinerary_ID'],
            "title" => $result['Title'],
            "startDate" => $result['Start_Date'],
            "endDate" => $result['End_Date'],
            "coverImage" => $result['Cover_Image'],
            "ownerAccount" => $result['Account']
        ];
        echo json_encode(["status" => "success", "data" => $itineraryData]);
    } else {
        echo json_encode(["status" => "error", "message" => "找不到該行程，或無存取權限。"]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "資料不完整"]);
}
$conn->close();
?>