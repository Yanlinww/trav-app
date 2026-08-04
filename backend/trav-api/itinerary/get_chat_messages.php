<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
require_once 'api_helpers.php';
$data = read_json_body();

$conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Chat_Message` (
  `Message_ID` INT AUTO_INCREMENT PRIMARY KEY,
  `Itinerary_ID` INT NOT NULL,
  `Account` VARCHAR(100) NOT NULL,
  `Message` TEXT NOT NULL,
  `Created_At` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`Itinerary_ID`, `Message_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if (empty($data->Itinerary_ID)) {
  api_error('缺少行程 ID', 400);
}
require_itinerary_access($conn, (int)$data->Itinerary_ID, trim((string)($data->Account ?? '')));

$stmt = $conn->prepare("SELECT c.Message_ID, c.Account, c.Message, c.Created_At, COALESCE(m.Name, c.Account) AS Display_Name, m.Avatar
  FROM Itinerary_Chat_Message c LEFT JOIN Member m ON c.Account = m.Account
  WHERE c.Itinerary_ID = ? ORDER BY c.Message_ID DESC LIMIT 100");
$stmt->bind_param('i', $data->Itinerary_ID);
$stmt->execute();
$result = $stmt->get_result();
$messages = [];
while ($row = $result->fetch_assoc()) {
  $messages[] = [
    'id' => (int)$row['Message_ID'],
    'account' => $row['Account'],
    'name' => $row['Display_Name'],
    'avatar' => $row['Avatar'],
    'message' => $row['Message'],
    'createdAt' => $row['Created_At'],
  ];
}
$stmt->close();
$conn->close();
echo json_encode(['status' => 'success', 'data' => array_reverse($messages)], JSON_UNESCAPED_UNICODE);
?>
