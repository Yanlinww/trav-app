<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID)) {$sql = "
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
    $stmt->execute();$result = $stmt->get_result();$items = [];
    while ($row = $result->fetch_assoc()) {$items[] = [
            "id" => (string)$row['Item_ID'],
            "placeId" => $row['Place_ID'] ? (int)$row['Place_ID'] : null,
            "dayNumber" => (int)$row['Day_Number'],
            "type" => $row['Place_Category'] ?? $row['Item_Type'],
            "title" => $row['Place_Name'] ?? $row['Title'],
            "startTime" => $row['Start_Time'] ? substr($row['Start_Time'], 0, 5) : "",
            "endTime" => $row['End_Time'] ? substr($row['End_Time'], 0, 5) : "",
            "sortOrder" => (int)$row['Sort_Order'],
            "Latitude" => $row['Place_Lat'] ?? $row['Latitude'],
            "Longitude" => $row['Place_Lng'] ?? $row['Longitude'],
            // 🌟 新增：把 4 個新擴充的欄位也傳給前端
            "content" => $row['Content'],
            "reservationNo" => $row['Reservation_No'],
            "link" => $row['Link'],
            "screenshotUrl" => $row['Screenshot_URL']
        ];
    }
    
    echo json_encode(["status" => "success", "data" => $items], JSON_UNESCAPED_UNICODE);$stmt->close();
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "缺少行程 ID"], JSON_UNESCAPED_UNICODE);
}
$conn->close();
?>