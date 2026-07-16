<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID)) {
    // 撈取建立者 (Owner) 與 加入者 (Members)
    $stmt = $conn->prepare("
        SELECT Account AS user_id, 'Owner' as role FROM Itinerary WHERE Itinerary_ID = ?
        UNION
        SELECT Account AS user_id, 'Member' as role FROM Itinerary_Members WHERE Itinerary_ID = ?
    ");
    $stmt->bind_param("ii", $data->Itinerary_ID, $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $members = [];
    while ($row = $result->fetch_assoc()) {
        $members[] = [
            "id" => $row['user_id'],
            "name" => $row['user_id'], // 若資料庫有 User 表，可 JOIN 真實姓名，此處先用帳號代替
            "role" => $row['role']
        ];
    }
    echo json_encode(["status" => "success", "data" => $members]);
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少行程ID"]);
}
$conn->close();
?>