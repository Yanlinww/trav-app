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

$message = trim((string)($data->Message ?? ''));
$account = trim((string)($data->Account ?? ''));
if (empty($data->Itinerary_ID) || $account === '' || $message === '') {
  api_error('缺少行程 ID、帳號或訊息內容', 400);
}
require_itinerary_access($conn, (int)$data->Itinerary_ID, $account);

$stmt = $conn->prepare('INSERT INTO Itinerary_Chat_Message (Itinerary_ID, Account, Message) VALUES (?, ?, ?)');
$stmt->bind_param('iss', $data->Itinerary_ID, $account, $message);
$ok = $stmt->execute();
$stmt->close();
$conn->close();
echo json_encode($ok ? ['status' => 'success'] : ['status' => 'error', 'message' => '訊息傳送失敗'], JSON_UNESCAPED_UNICODE);
?>
