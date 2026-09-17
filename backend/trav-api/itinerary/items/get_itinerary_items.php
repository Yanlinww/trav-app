<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200); exit();
}

require_once '../../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID)) {
    // 使用 LEFT JOIN 串接全新的 Place 總表
    $sql = "
        SELECT 
            i.*, 
            p.Name AS Place_Name, 
            p.Latitude AS Place_Lat, 
            p.Longitude AS Place_Lng,
            p.Category AS Place_Category
        FROM `Itinerary_Item` i
        LEFT JOIN `Place` p ON i.Place_ID = p.Place_ID
        WHERE i.`Itinerary_ID` = ? 
        ORDER BY i.`Day_Number` ASC, i.`Sort_Order` ASC
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = [
            "id" => (string)$row['Item_ID'],
            "placeId" => $row['Place_ID'] ? (int)$row['Place_ID'] : null,
            "dayNumber" => (int)$row['Day_Number'],
            // 優先使用 Place 表的分類，若為空則用 Item 表的 Item_Type
            "type" => $row['Place_Category'] ?? $row['Item_Type'],
            // 優先使用 Place 表的地點名稱，若為空則用自訂的 Title
            "title" => $row['Place_Name'] ?? $row['Title'],
            "startTime" => $row['Start_Time'] ? substr($row['Start_Time'], 0, 5) : "",
            "endTime" => $row['End_Time'] ? substr($row['End_Time'], 0, 5) : "",
            "sortOrder" => (int)$row['Sort_Order'],
            // 優先使用 Place 表的精準座標，若為自訂行程則使用 Item 表的座標
            "Latitude" => $row['Place_Lat'] ?? $row['Latitude'],
            "Longitude" => $row['Place_Lng'] ?? $row['Longitude']
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