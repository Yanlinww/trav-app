<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../db_connect.php';
$data = json_decode(file_get_contents('php://input'));

$itemId = isset($data->Item_ID) ? (int)$data->Item_ID : 0;
$lat = isset($data->Latitude) && is_numeric($data->Latitude) ? (float)$data->Latitude : null;
$lng = isset($data->Longitude) && is_numeric($data->Longitude) ? (float)$data->Longitude : null;
$title = isset($data->Title) ? trim((string)$data->Title) : '';

if ($itemId <= 0 || $lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid item or coordinate data'], JSON_UNESCAPED_UNICODE);
    $conn->close();
    exit();
}

if ($title !== '') {
    $stmt = $conn->prepare('UPDATE `Itinerary_Item` SET `Title` = ?, `Latitude` = ?, `Longitude` = ? WHERE `Item_ID` = ?');
    $stmt->bind_param('sddi', $title, $lat, $lng, $itemId);
} else {
    $stmt = $conn->prepare('UPDATE `Itinerary_Item` SET `Latitude` = ?, `Longitude` = ? WHERE `Item_ID` = ?');
    $stmt->bind_param('ddi', $lat, $lng, $itemId);
}

if ($stmt->execute()) {
    echo json_encode(['status' => 'success'], JSON_UNESCAPED_UNICODE);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to update item location'], JSON_UNESCAPED_UNICODE);
}

$stmt->close();
$conn->close();
?>
