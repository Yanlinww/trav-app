<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../db_connect.php';
require_once '../itinerary/api_helpers.php';
require_once '../destinations/public_itinerary_cache.php';
require_once 'admin_helpers.php';

$data = read_json_body();
$account = trim((string)($data->Account ?? ''));
$itineraryId = (int)($data->Itinerary_ID ?? 0);
$reportId = isset($data->Report_ID) ? (int)$data->Report_ID : null;
$action = trim((string)($data->Action ?? ''));
$note = trim((string)($data->Moderation_Note ?? ''));

require_admin_access($conn, $account);

if ($itineraryId <= 0) api_error('缺少公開行程資料。', 400);
if (!in_array($action, ['hide', 'restore'], true)) api_error('請選擇有效的公開狀態操作。', 422);
if ($note === '') api_error('請填寫管理備註。', 422);
if (mb_strlen($note) > 1000) api_error('管理備註最多 1000 字。', 422);

try {
    $lookup = $conn->prepare('SELECT Is_Public, Public_Moderation_Status FROM Itinerary WHERE Itinerary_ID = ? LIMIT 1');
    if (!$lookup) throw new RuntimeException('無法讀取公開行程。');
    $lookup->bind_param('i', $itineraryId);
    if (!$lookup->execute() || !($itinerary = $lookup->get_result()->fetch_assoc())) {
        $lookup->close();
        api_error('找不到此行程。', 404);
    }
    $lookup->close();

    if ($action === 'hide') {
        if ((int)$itinerary['Is_Public'] !== 1) api_error('此行程目前不是公開狀態。', 409);
        $statement = $conn->prepare("UPDATE Itinerary SET Is_Public = 0, Public_Moderation_Status = 'hidden', Public_Moderation_Note = ?, Public_Moderated_By = ?, Public_Moderated_At = CURRENT_TIMESTAMP WHERE Itinerary_ID = ?");
        $message = '公開行程已下架。';
    } else {
        if (($itinerary['Public_Moderation_Status'] ?? 'active') !== 'hidden') api_error('此行程不是由管理員下架，無法直接恢復公開。', 409);
        $statement = $conn->prepare("UPDATE Itinerary SET Is_Public = 1, Public_Moderation_Status = 'active', Public_Moderation_Note = ?, Public_Moderated_By = ?, Public_Moderated_At = CURRENT_TIMESTAMP, Public_Updated_At = CURRENT_TIMESTAMP WHERE Itinerary_ID = ?");
        $message = '公開行程已恢復。';
    }
    if (!$statement) throw new RuntimeException('無法更新公開狀態。');
    $statement->bind_param('ssi', $note, $account, $itineraryId);
    if (!$statement->execute()) {
        $statement->close();
        throw new RuntimeException('無法更新公開狀態。');
    }
    $statement->close();
    record_public_itinerary_moderation_event($conn, $itineraryId, $reportId && $reportId > 0 ? $reportId : null, $action === 'hide' ? 'public_hidden' : 'public_restored', $note, $account);
    $conn->close();
    invalidate_public_itinerary_cache();
    api_json(['status' => 'success', 'message' => $message]);
} catch (Throwable $error) {
    $conn->close();
    api_error($error->getMessage(), 500);
}
