<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
require_once 'api_helpers.php';
$data = read_json_body();

$conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Chat_Presence` (
  `Itinerary_ID` INT NOT NULL,
  `Account` VARCHAR(100) NOT NULL,
  `Last_Seen` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Itinerary_ID`, `Account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if (empty($data->Itinerary_ID)) {
  api_error('缺少行程 ID', 400);
}
require_itinerary_access($conn, (int)$data->Itinerary_ID, trim((string)($data->Account ?? '')));

$stmt = $conn->prepare('SELECT Account, UNIX_TIMESTAMP(Last_Seen) AS Last_Seen FROM Itinerary_Chat_Presence WHERE Itinerary_ID = ?');
$stmt->bind_param('i', $data->Itinerary_ID);
$stmt->execute();
$result = $stmt->get_result();
$presence = [];
while ($row = $result->fetch_assoc()) {
  $presence[$row['Account']] = (int)$row['Last_Seen'];
}
$stmt->close();
$conn->close();
echo json_encode(['status' => 'success', 'data' => $presence]);
?>
