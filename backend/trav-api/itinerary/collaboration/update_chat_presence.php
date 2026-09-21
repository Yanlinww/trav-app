<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../db_connect.php';
require_once '../api_helpers.php';
$data = read_json_body();

$account = trim((string)($data->Account ?? ''));
if (empty($data->Itinerary_ID) || $account === '') {
    echo json_encode(['status' => 'error', 'message' => '參數錯誤']);
    $conn->close();
    exit();
}

require_itinerary_access($conn, (int)$data->Itinerary_ID, $account);

// 寫入 Itinerary_Members 的 Chat_Last_Seen 欄位
$stmt = $conn->prepare('INSERT INTO Itinerary_Members (Itinerary_ID, Account, Chat_Last_Seen) VALUES (?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE Chat_Last_Seen = CURRENT_TIMESTAMP');
$stmt->bind_param('is', $data->Itinerary_ID, $account);
$ok = $stmt->execute();

$stmt->close();
$conn->close();
echo json_encode($ok ? ['status' => 'success'] : ['status' => 'error', 'message' => '更新失敗']);
?>