<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once '../../db_connect.php';
require_once '../api_helpers.php';
$data = read_json_body();

$conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Reservation` (
  `Reservation_ID` INT AUTO_INCREMENT PRIMARY KEY, `Itinerary_ID` INT NOT NULL, `Item_ID` INT NULL, `Account` VARCHAR(100) NOT NULL,
  `Type` VARCHAR(30) NOT NULL DEFAULT 'other', `Title` VARCHAR(200) NOT NULL, `Event_Date` DATE NULL,
  `Reference_No` VARCHAR(100) NULL, `Link` VARCHAR(500) NULL, `Screenshot_URL` VARCHAR(500) NULL, `Notes` TEXT NULL, `Created_At` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`Itinerary_ID`, `Event_Date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$screenshotColumn = $conn->query("SHOW COLUMNS FROM `Itinerary_Reservation` LIKE 'Screenshot_URL'");
if ($screenshotColumn && $screenshotColumn->num_rows === 0) {
  try { $conn->query("ALTER TABLE `Itinerary_Reservation` ADD COLUMN `Screenshot_URL` VARCHAR(500) NULL"); } catch (Throwable $ignored) {}
}
$itemColumn = $conn->query("SHOW COLUMNS FROM `Itinerary_Reservation` LIKE 'Item_ID'");
if ($itemColumn && $itemColumn->num_rows === 0) {
  try { $conn->query("ALTER TABLE `Itinerary_Reservation` ADD COLUMN `Item_ID` INT NULL"); } catch (Throwable $ignored) {}
}

$title = trim((string)($data->Title ?? ''));
$account = trim((string)($data->Account ?? ''));
$type = trim((string)($data->Type ?? 'other')) ?: 'other';
$eventDate = !empty($data->Event_Date) ? $data->Event_Date : null;
$referenceNo = trim((string)($data->Reference_No ?? ''));
$link = trim((string)($data->Link ?? ''));
$notes = trim((string)($data->Notes ?? ''));
$itemId = (int)($data->Item_ID ?? 0);
if (empty($data->Itinerary_ID) || $account === '' || $title === '') { api_error('缺少行程 ID、帳號或預訂名稱', 400); }
require_itinerary_access($conn, (int)$data->Itinerary_ID, $account);

$stmt = $conn->prepare('INSERT INTO Itinerary_Reservation (Itinerary_ID, Item_ID, Account, Type, Title, Event_Date, Reference_No, Link, Notes) VALUES (?, NULLIF(?, 0), ?, ?, NULLIF(?, \'\'), NULLIF(?, \'\'), NULLIF(?, \'\'), NULLIF(?, \'\'), NULLIF(?, \'\'))');
$stmt->bind_param('iisssssss', $data->Itinerary_ID, $itemId, $account, $type, $title, $eventDate, $referenceNo, $link, $notes);
$ok = $stmt->execute(); $reservationId = $conn->insert_id; $stmt->close(); $conn->close();
echo json_encode($ok ? ['status' => 'success', 'Reservation_ID' => $reservationId] : ['status' => 'error', 'message' => '新增預訂失敗'], JSON_UNESCAPED_UNICODE);
?>
