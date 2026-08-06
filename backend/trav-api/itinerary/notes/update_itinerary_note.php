<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../../db_connect.php';
require_once '../api_helpers.php';
$data = read_json_body();

$conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Note` (`Note_ID` INT AUTO_INCREMENT PRIMARY KEY, `Itinerary_ID` INT NOT NULL, `Title` VARCHAR(150) NOT NULL, `Content` TEXT NULL, `Updated_By` VARCHAR(100) NULL, `Updated_At` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX (`Itinerary_ID`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$noteId = (int)($data->Note_ID ?? 0);
$itineraryId = (int)($data->Itinerary_ID ?? 0);
$title = trim((string)($data->Title ?? ''));
$content = (string)($data->Content ?? '');
$account = trim((string)($data->Account ?? ''));

if ($noteId <= 0 || $itineraryId <= 0 || $title === '' || $account === '') {
  echo json_encode(['status' => 'error', 'message' => '備忘錄資料不完整'], JSON_UNESCAPED_UNICODE);
  $conn->close();
  exit();
}
require_resource_access($conn, 'Itinerary_Note', 'Note_ID', $noteId, $account);

$stmt = $conn->prepare('UPDATE Itinerary_Note SET Title = ?, Content = ?, Updated_By = ?, Updated_At = CURRENT_TIMESTAMP WHERE Note_ID = ? AND Itinerary_ID = ?');
if (!$stmt) {
  echo json_encode(['status' => 'error', 'message' => '無法準備備忘錄更新'], JSON_UNESCAPED_UNICODE);
  $conn->close();
  exit();
}

$stmt->bind_param('sssii', $title, $content, $account, $noteId, $itineraryId);
$ok = $stmt->execute();
$stmt->close();
$conn->close();

echo json_encode($ok ? ['status' => 'success'] : ['status' => 'error', 'message' => '備忘錄更新失敗'], JSON_UNESCAPED_UNICODE);
?>
