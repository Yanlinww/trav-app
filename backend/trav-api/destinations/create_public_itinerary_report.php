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
$reason = trim((string)($data->Reason ?? ''));
$details = trim((string)($data->Details ?? ''));
$allowedReasons = ['不當內容', '詐騙或不實資訊', '侵犯權利', '其他'];

if ($account === '') api_error('請先登入後再檢舉。', 401);
if ($itineraryId <= 0) api_error('缺少公開行程資料。', 400);
if (!in_array($reason, $allowedReasons, true)) api_error('請選擇有效的檢舉原因。', 422);
if (mb_strlen($details) > 500) api_error('補充說明最多 500 字。', 422);

try {
    $itinerary = $conn->prepare('SELECT Account FROM Itinerary WHERE Itinerary_ID = ? AND Is_Public = 1 LIMIT 1');
    if (!$itinerary) throw new RuntimeException('無法讀取公開行程。');
    $itinerary->bind_param('i', $itineraryId);
    if (!$itinerary->execute()) throw new RuntimeException('無法讀取公開行程。');
    $row = $itinerary->get_result()->fetch_assoc();
    $itinerary->close();

    if (!$row) api_error('找不到此公開行程。', 404);
    if ((string)$row['Account'] === $account) api_error('不能檢舉自己的公開行程。', 403);

    $statement = $conn->prepare(
        "INSERT INTO Public_Itinerary_Report (Itinerary_ID, Reporter_Account, Reason, Details, Status)
         VALUES (?, ?, ?, NULLIF(?, ''), 'pending')
         ON DUPLICATE KEY UPDATE Reason = VALUES(Reason), Details = VALUES(Details), Status = 'pending',
             Admin_Note = NULL, Reviewed_By = NULL, Reviewed_At = NULL, Updated_At = CURRENT_TIMESTAMP"
    );
    if (!$statement) throw new RuntimeException('無法送出檢舉。');
    $statement->bind_param('isss', $itineraryId, $account, $reason, $details);
    if (!$statement->execute()) throw new RuntimeException('無法送出檢舉。');
    $statement->close();
    $conn->close();
    invalidate_public_itinerary_cache();

    api_json(['status' => 'success', 'message' => '已收到你的檢舉，我們會盡快確認。']);
} catch (Throwable $error) {
    $conn->close();
    api_error($error->getMessage(), 500);
}
