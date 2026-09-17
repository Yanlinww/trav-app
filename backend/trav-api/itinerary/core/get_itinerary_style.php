<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../../db_connect.php';
$data = json_decode(file_get_contents('php://input'));

if (empty($data->Itinerary_ID)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => '缺少行程ID'], JSON_UNESCAPED_UNICODE);
    exit();
}

// 直接從主檔 Itinerary 表的 Style 欄位撈取，不再查詢獨立的 Itinerary_Style 表
$stmt = $conn->prepare('SELECT `Style` FROM `Itinerary` WHERE `Itinerary_ID` = ?');
$stmt->bind_param('i', $data->Itinerary_ID);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();
$stmt->close();

// 若主表剛好沒填，預設回傳 '自助旅行'
$style = !empty($result['Style']) ? $result['Style'] : '自助旅行';

echo json_encode(['status' => 'success', 'style' => $style], JSON_UNESCAPED_UNICODE);

$conn->close();
?>