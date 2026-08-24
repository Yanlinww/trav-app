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
$itineraryId = (int)($data->Itinerary_ID ?? 0);
$viewerKey = trim((string)($data->Viewer_Key ?? ''));
if ($itineraryId <= 0 || $viewerKey === '' || mb_strlen($viewerKey) > 150) api_error('瀏覽資料格式錯誤。', 422);

$conn->begin_transaction();
try {
    $itinerary = $conn->prepare('SELECT View_Count FROM Itinerary WHERE Itinerary_ID = ? AND Is_Public = 1 FOR UPDATE');
    if (!$itinerary) throw new RuntimeException('無法讀取公開行程。');
    $itinerary->bind_param('i', $itineraryId);
    $itinerary->execute();
    if (!$itinerary->get_result()->fetch_assoc()) throw new RuntimeException('找不到此公開行程。');
    $itinerary->close();

    $insert = $conn->prepare('INSERT IGNORE INTO Public_Itinerary_View (Itinerary_ID, Viewer_Key) VALUES (?, ?)');
    if (!$insert) throw new RuntimeException('無法記錄瀏覽。');
    $insert->bind_param('is', $itineraryId, $viewerKey);
    if (!$insert->execute()) throw new RuntimeException('無法記錄瀏覽。');
    $isNewView = $insert->affected_rows === 1;
    $insert->close();

    if ($isNewView) {
        $update = $conn->prepare('UPDATE Itinerary SET View_Count = View_Count + 1 WHERE Itinerary_ID = ?');
        if (!$update) throw new RuntimeException('無法更新瀏覽數。');
        $update->bind_param('i', $itineraryId);
        $update->execute();
        $update->close();
    }

    $count = $conn->prepare('SELECT View_Count FROM Itinerary WHERE Itinerary_ID = ?');
    if (!$count) throw new RuntimeException('無法讀取瀏覽數。');
    $count->bind_param('i', $itineraryId);
    $count->execute();
    $viewCount = (int)($count->get_result()->fetch_assoc()['View_Count'] ?? 0);
    $count->close();

    $conn->commit();
    $conn->close();
    if ($isNewView) invalidate_public_itinerary_cache();
    api_json(['status' => 'success', 'counted' => $isNewView, 'viewCount' => $viewCount]);
} catch (Throwable $error) {
    $conn->rollback();
    $conn->close();
    api_error($error->getMessage(), 500);
}
