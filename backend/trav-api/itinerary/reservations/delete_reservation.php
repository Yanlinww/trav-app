<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once '../../db_connect.php';
require_once '../api_helpers.php';
$data = read_json_body();
if (empty($data->Reservation_ID)) { echo json_encode(['status' => 'error', 'message' => '缺少預訂 ID']); $conn->close(); exit(); }
require_resource_access($conn, 'Itinerary_Reservation', 'Reservation_ID', (int)$data->Reservation_ID, trim((string)($data->Account ?? '')));
$stmt = $conn->prepare('DELETE FROM Itinerary_Reservation WHERE Reservation_ID = ?');
$stmt->bind_param('i', $data->Reservation_ID);
$ok = $stmt->execute(); $stmt->close(); $conn->close();
echo json_encode($ok ? ['status' => 'success'] : ['status' => 'error', 'message' => '刪除預訂失敗'], JSON_UNESCAPED_UNICODE);
?>
