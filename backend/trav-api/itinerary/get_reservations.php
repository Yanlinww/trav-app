<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
require_once 'api_helpers.php';
$data = read_json_body();

$conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Reservation` (
  `Reservation_ID` INT AUTO_INCREMENT PRIMARY KEY,
  `Itinerary_ID` INT NOT NULL,
  `Item_ID` INT NULL,
  `Account` VARCHAR(100) NOT NULL,
  `Type` VARCHAR(30) NOT NULL DEFAULT 'other',
  `Title` VARCHAR(200) NOT NULL,
  `Event_Date` DATE NULL,
  `Reference_No` VARCHAR(100) NULL,
  `Link` VARCHAR(500) NULL,
  `Screenshot_URL` VARCHAR(500) NULL,
  `Notes` TEXT NULL,
  `Created_At` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`Itinerary_ID`, `Event_Date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

require_itinerary_access($conn, (int)($data->Itinerary_ID ?? 0), trim((string)($data->Account ?? '')));
$stmt = $conn->prepare('SELECT Reservation_ID, Account, Item_ID, Type, Title, Event_Date, Reference_No, Link, Screenshot_URL, Notes FROM Itinerary_Reservation WHERE Itinerary_ID = ? ORDER BY Event_Date IS NULL, Event_Date ASC, Reservation_ID DESC');
if (!$stmt) { echo json_encode(['status' => 'error', 'message' => '預訂資料表尚未準備完成']); $conn->close(); exit(); }
$stmt->bind_param('i', $data->Itinerary_ID);
$stmt->execute();
$result = $stmt->get_result();
$reservations = [];
while ($row = $result->fetch_assoc()) {
  $reservations[] = [
    'id' => (int)$row['Reservation_ID'], 'account' => $row['Account'], 'itemId' => $row['Item_ID'], 'type' => $row['Type'],
    'title' => $row['Title'], 'eventDate' => $row['Event_Date'], 'referenceNo' => $row['Reference_No'], 'screenshotUrl' => $row['Screenshot_URL'],
    'link' => $row['Link'], 'notes' => $row['Notes'],
  ];
}
$stmt->close(); $conn->close();
echo json_encode(['status' => 'success', 'data' => $reservations], JSON_UNESCAPED_UNICODE);
?>
