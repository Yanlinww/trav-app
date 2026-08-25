<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../db_connect.php';
require_once '../itinerary/api_helpers.php';
require_once 'admin_helpers.php';

$data = read_json_body();
$reportId = (int)($data->Report_ID ?? 0);
$status = trim((string)($data->Status ?? ''));
$adminNote = trim((string)($data->Admin_Note ?? ''));

$account = require_admin_access($conn);

if ($reportId <= 0) api_error('缺少要處理的檢舉案件。', 400);
if (!in_array($status, ['resolved', 'dismissed'], true)) api_error('請選擇有效的處理結果。', 422);
if ($adminNote === '') api_error('請填寫處理備註。', 422);
if (mb_strlen($adminNote) > 1000) api_error('處理備註最多 1000 字。', 422);

try {
    $exists = $conn->prepare('SELECT Itinerary_ID FROM Public_Itinerary_Report WHERE Report_ID = ? LIMIT 1');
    if (!$exists) throw new RuntimeException('無法讀取檢舉案件。');
    $exists->bind_param('i', $reportId);
    if (!$exists->execute() || !($report = $exists->get_result()->fetch_assoc())) {
        $exists->close();
        api_error('找不到此檢舉案件。', 404);
    }
    $exists->close();

    $statement = $conn->prepare(
        'UPDATE Public_Itinerary_Report
         SET Status = ?, Admin_Note = ?, Reviewed_By = ?, Reviewed_At = CURRENT_TIMESTAMP
         WHERE Report_ID = ?'
    );
    if (!$statement) throw new RuntimeException('無法更新檢舉案件。');
    $statement->bind_param('sssi', $status, $adminNote, $account, $reportId);
    if (!$statement->execute()) {
        $statement->close();
        throw new RuntimeException('無法更新檢舉案件。');
    }
    $statement->close();
    record_public_itinerary_moderation_event($conn, (int)$report['Itinerary_ID'], $reportId, $status === 'resolved' ? 'report_resolved' : 'report_dismissed', $adminNote, $account);
    $conn->close();

    api_json([
        'status' => 'success',
        'message' => $status === 'resolved' ? '案件已標記為已處理。' : '案件已標記為已駁回。',
    ]);
} catch (Throwable $error) {
    $conn->close();
    api_error($error->getMessage(), 500);
}
