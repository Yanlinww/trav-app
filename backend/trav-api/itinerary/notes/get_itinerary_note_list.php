<?php
header('Access-Control-Allow-Origin: *'); header('Access-Control-Allow-Methods: POST, OPTIONS'); header('Access-Control-Allow-Headers: Content-Type'); header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once '../../db_connect.php';
require_once '../api_helpers.php';
$data = read_json_body();
$conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Note` (`Note_ID` INT AUTO_INCREMENT PRIMARY KEY, `Itinerary_ID` INT NOT NULL, `Title` VARCHAR(150) NOT NULL, `Content` TEXT NULL, `Updated_By` VARCHAR(100) NULL, `Updated_At` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX (`Itinerary_ID`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
require_itinerary_access($conn, (int)($data->Itinerary_ID ?? 0), trim((string)($data->Account ?? '')));
$stmt = $conn->prepare('SELECT Note_ID, Title, Content, Updated_By, Updated_At FROM Itinerary_Note WHERE Itinerary_ID = ? ORDER BY Note_ID ASC');
$stmt->bind_param('i', $data->Itinerary_ID); $stmt->execute(); $result = $stmt->get_result(); $notes = [];
while ($row = $result->fetch_assoc()) $notes[] = ['id' => (int)$row['Note_ID'], 'title' => $row['Title'], 'content' => $row['Content'] ?? '', 'updatedBy' => $row['Updated_By'] ?? '', 'updatedAt' => $row['Updated_At']];
$stmt->close(); $conn->close(); echo json_encode(['status' => 'success', 'data' => $notes], JSON_UNESCAPED_UNICODE);
?>
