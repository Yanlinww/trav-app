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

$account = trim((string)($data->Account ?? ''));
if (empty($data->Itinerary_ID) || $account === '') {
  echo json_encode(['status' => 'error', 'message' => '缺少在線資料']);
  $conn->close(); exit();
}
require_itinerary_access($conn, (int)$data->Itinerary_ID, $account);

$stmt = $conn->prepare('INSERT INTO Itinerary_Chat_Presence (Itinerary_ID, Account) VALUES (?, ?) ON DUPLICATE KEY UPDATE Last_Seen = CURRENT_TIMESTAMP');
$stmt->bind_param('is', $data->Itinerary_ID, $account);
$ok = $stmt->execute();
$stmt->close();
$conn->close();
echo json_encode($ok ? ['status' => 'success'] : ['status' => 'error', 'message' => '在線狀態更新失敗']);
?>
