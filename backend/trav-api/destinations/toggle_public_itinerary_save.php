<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../db_connect.php';
require_once '../itinerary/api_helpers.php';
require_once 'public_itinerary_cache.php';

$data = read_json_body();
$account = trim((string)($data->Account ?? ''));
$itineraryId = (int)($data->Itinerary_ID ?? 0);
if ($account === '' || $itineraryId <= 0) api_error('請先登入後再收藏。', 401);

$conn->begin_transaction();
try {
    $itinerary = $conn->prepare('SELECT 1 FROM Itinerary WHERE Itinerary_ID = ? AND Is_Public = 1 FOR UPDATE');
    if (!$itinerary) throw new RuntimeException('無法讀取公開行程。');
    $itinerary->bind_param('i', $itineraryId);
    $itinerary->execute();
    if (!$itinerary->get_result()->fetch_row()) throw new RuntimeException('找不到此公開行程。');
    $itinerary->close();

    $insert = $conn->prepare('INSERT IGNORE INTO Public_Itinerary_Save (Itinerary_ID, Account) VALUES (?, ?)');
    if (!$insert) throw new RuntimeException('無法更新收藏。');
    $insert->bind_param('is', $itineraryId, $account);
    if (!$insert->execute()) throw new RuntimeException('無法更新收藏。');
    $isSaved = $insert->affected_rows === 1;
    $insert->close();

    if (!$isSaved) {
        $remove = $conn->prepare('DELETE FROM Public_Itinerary_Save WHERE Itinerary_ID = ? AND Account = ?');
        if (!$remove) throw new RuntimeException('無法取消收藏。');
        $remove->bind_param('is', $itineraryId, $account);
        if (!$remove->execute()) throw new RuntimeException('無法取消收藏。');
        $remove->close();
    }

    $conn->commit();
    $conn->close();
    invalidate_public_itinerary_cache();
    api_json(['status' => 'success', 'isSaved' => $isSaved]);
} catch (Throwable $error) {
    $conn->rollback();
    $conn->close();
    api_error($error->getMessage(), 500);
}
