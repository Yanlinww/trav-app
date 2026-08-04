<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../db_connect.php';
$data = json_decode(file_get_contents('php://input'));

if (empty($data->Itinerary_ID)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => '缺少行程ID'], JSON_UNESCAPED_UNICODE);
    exit();
}

$conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Style` (`Itinerary_ID` INT NOT NULL PRIMARY KEY, `Style` VARCHAR(50) NOT NULL DEFAULT '自助旅行') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$stmt = $conn->prepare('SELECT `Style` FROM `Itinerary_Style` WHERE `Itinerary_ID` = ?');
$stmt->bind_param('i', $data->Itinerary_ID);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();

echo json_encode(['status' => 'success', 'style' => $result['Style'] ?? '自助旅行'], JSON_UNESCAPED_UNICODE);
$stmt->close();
$conn->close();
?>
