<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once '../db_connect.php';
require_once 'api_helpers.php';
$data = read_json_body();
$itemColumn = $conn->query("SHOW COLUMNS FROM `Itinerary_Reservation` LIKE 'Item_ID'");
if ($itemColumn && $itemColumn->num_rows === 0) {
  try { $conn->query("ALTER TABLE `Itinerary_Reservation` ADD COLUMN `Item_ID` INT NULL"); } catch (Throwable $ignored) {}
}

$id = (int)($data->Reservation_ID ?? 0);
$itineraryId = (int)($data->Itinerary_ID ?? 0);
$title = trim((string)($data->Title ?? ''));
$type = trim((string)($data->Type ?? 'other')) ?: 'other';
$eventDate = !empty($data->Event_Date) ? $data->Event_Date : null;
$referenceNo = trim((string)($data->Reference_No ?? ''));
$link = trim((string)($data->Link ?? ''));
$notes = trim((string)($data->Notes ?? ''));
$itemId = (int)($data->Item_ID ?? 0);
if (!$id || !$itineraryId || $title === '') { echo json_encode(['status' => 'error', 'message' => '請填寫預訂名稱']); $conn->close(); exit(); }
require_resource_access($conn, 'Itinerary_Reservation', 'Reservation_ID', $id, trim((string)($data->Account ?? '')));

$stmt = $conn->prepare("UPDATE Itinerary_Reservation SET Item_ID = NULLIF(?, 0), Type = ?, Title = ?, Event_Date = NULLIF(?, ''), Reference_No = NULLIF(?, ''), Link = NULLIF(?, ''), Notes = NULLIF(?, '') WHERE Reservation_ID = ? AND Itinerary_ID = ?");
$stmt->bind_param('issssssii', $itemId, $type, $title, $eventDate, $referenceNo, $link, $notes, $id, $itineraryId);
$ok = $stmt->execute(); $stmt->close(); $conn->close();
echo json_encode($ok ? ['status' => 'success'] : ['status' => 'error', 'message' => '更新預訂失敗'], JSON_UNESCAPED_UNICODE);
?>
