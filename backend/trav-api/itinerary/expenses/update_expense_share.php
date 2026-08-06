<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../../db_connect.php';
require_once '../api_helpers.php';
$data = read_json_body();

if (empty($data->Share_ID) || !isset($data->Is_Settled)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => '缺少分帳資料'], JSON_UNESCAPED_UNICODE);
    exit();
}
require_resource_access($conn, 'Itinerary_Expense_Share', 'Share_ID', (int)$data->Share_ID, trim((string)($data->Account ?? '')));

$settled = $data->Is_Settled ? 1 : 0;
$stmt = $conn->prepare('UPDATE `Itinerary_Expense_Share` SET `Is_Settled` = ? WHERE `Share_ID` = ?');
$stmt->bind_param('ii', $settled, $data->Share_ID);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success'], JSON_UNESCAPED_UNICODE);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => '更新結清狀態失敗'], JSON_UNESCAPED_UNICODE);
}
$stmt->close();
$conn->close();
?>
