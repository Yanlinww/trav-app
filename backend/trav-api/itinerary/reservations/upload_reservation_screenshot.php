<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once '../../db_connect.php';
require_once '../api_helpers.php';
$screenshotColumn = $conn->query("SHOW COLUMNS FROM `Itinerary_Reservation` LIKE 'Screenshot_URL'");
if ($screenshotColumn && $screenshotColumn->num_rows === 0) {
  try { $conn->query("ALTER TABLE `Itinerary_Reservation` ADD COLUMN `Screenshot_URL` VARCHAR(500) NULL"); } catch (Throwable $ignored) {}
}

$reservationId = (int)($_POST['Reservation_ID'] ?? 0);
$itineraryId = (int)($_POST['Itinerary_ID'] ?? 0);
$file = $_FILES['screenshot'] ?? null;
if (!$reservationId || !$itineraryId || !$file || $file['error'] !== UPLOAD_ERR_OK) {
  echo json_encode(['status' => 'error', 'message' => '缺少票券截圖']); $conn->close(); exit();
}
require_resource_access($conn, 'Itinerary_Reservation', 'Reservation_ID', $reservationId, trim((string)($_POST['Account'] ?? '')));
if ($file['size'] > 10 * 1024 * 1024) {
  echo json_encode(['status' => 'error', 'message' => '圖片大小不可超過 10MB']); $conn->close(); exit();
}
$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
  echo json_encode(['status' => 'error', 'message' => '僅支援 JPG、PNG、WEBP']); $conn->close(); exit();
}

$uploadDir = '../uploads/reservations/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
$filename = 'reservation_' . $reservationId . '_' . time() . '.' . $extension;
$targetPath = $uploadDir . $filename;
if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
  echo json_encode(['status' => 'error', 'message' => '圖片上傳失敗']); $conn->close(); exit();
}
$imageUrl = 'http://localhost:8080/uploads/reservations/' . $filename;
$stmt = $conn->prepare('UPDATE Itinerary_Reservation SET Screenshot_URL = ? WHERE Reservation_ID = ? AND Itinerary_ID = ?');
if (!$stmt) { echo json_encode(['status' => 'error', 'message' => '票券資料表尚未準備完成']); $conn->close(); exit(); }
$stmt->bind_param('sii', $imageUrl, $reservationId, $itineraryId);
$ok = $stmt->execute(); $stmt->close(); $conn->close();
echo json_encode($ok ? ['status' => 'success', 'screenshotUrl' => $imageUrl] : ['status' => 'error', 'message' => '圖片資料更新失敗'], JSON_UNESCAPED_UNICODE);
?>
