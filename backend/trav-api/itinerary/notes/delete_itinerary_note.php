<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once '../../db_connect.php';
require_once '../api_helpers.php';
$data = read_json_body();
if (empty($data->Note_ID) || empty($data->Itinerary_ID)) { echo json_encode(['status' => 'error', 'message' => '缺少備忘錄 ID']); $conn->close(); exit(); }
require_resource_access($conn, 'Itinerary_Note', 'Note_ID', (int)$data->Note_ID, trim((string)($data->Account ?? '')));
$stmt = $conn->prepare('DELETE FROM Itinerary_Note WHERE Note_ID = ? AND Itinerary_ID = ?');
if (!$stmt) { echo json_encode(['status' => 'error', 'message' => '備忘錄資料表尚未準備完成']); $conn->close(); exit(); }
$stmt->bind_param('ii', $data->Note_ID, $data->Itinerary_ID); $ok = $stmt->execute(); $stmt->close(); $conn->close();
echo json_encode($ok ? ['status' => 'success'] : ['status' => 'error', 'message' => '刪除備忘錄失敗'], JSON_UNESCAPED_UNICODE);
?>
