<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../../db_connect.php';
$data = json_decode(file_get_contents('php://input'));
$allowed = ['自助旅行', '親子旅行', '情侶旅行', '朋友出遊', '商務出差', '自訂'];

if (empty($data->Itinerary_ID) || empty($data->Style) || !in_array($data->Style, $allowed, true)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => '無效的行程風格'], JSON_UNESCAPED_UNICODE);
    exit();
}

// 直接更新主檔 Itinerary 表的 Style 欄位
$stmt = $conn->prepare('UPDATE `Itinerary` SET `Style` = ? WHERE `Itinerary_ID` = ?');
$stmt->bind_param('si', $data->Style, $data->Itinerary_ID);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'style' => $data->Style], JSON_UNESCAPED_UNICODE);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => '儲存行程風格失敗'], JSON_UNESCAPED_UNICODE);
}
$stmt->close();
$conn->close();
?>