<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200); exit();
}

require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID)) {
    // 依據天數與排序權重進行升冪排序 (ASC)
    $stmt = $conn->prepare("SELECT * FROM `Itinerary_Item` WHERE `Itinerary_ID` = ? ORDER BY `Day_Number` ASC, `Sort_Order` ASC");
    $stmt->bind_param("i", $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = [
            "id" => (string)$row['Item_ID'],
            "dayNumber" => (int)$row['Day_Number'],
            "type" => $row['Item_Type'],
            "title" => $row['Title'],
            "startTime" => $row['Start_Time'] ? substr($row['Start_Time'], 0, 5) : "",
            "endTime" => $row['End_Time'] ? substr($row['End_Time'], 0, 5) : "",
            "sortOrder" => (int)$row['Sort_Order']
        ];
    }
    
    echo json_encode(["status" => "success", "data" => $items], JSON_UNESCAPED_UNICODE);
    $stmt->close();
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "缺少行程ID"], JSON_UNESCAPED_UNICODE);
}
$conn->close();
?>