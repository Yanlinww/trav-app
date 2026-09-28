<?php
/** 管理後台單一入口：報表、使用者、檢舉與公開行程審核。 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../itinerary/api_helpers.php';
require_once __DIR__ . '/../destinations/public_itinerary_cache.php';
require_once __DIR__ . '/admin_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST 請求', 405);

$actions = [
    'dashboard_stats' => 'admin_dashboard_stats',
    'users' => 'admin_users',
    'moderation_log' => 'admin_moderation_log',
    'reports' => 'admin_reports',
    'update_report' => 'admin_update_report',
    'update_visibility' => 'admin_update_visibility',
];
$route = $_GET['action'] ?? '';
if (!isset($actions[$route])) api_error('無效的管理操作', 400);

// 每個函式保留原端點的參數檢查、權限檢查、SQL 與回應格式。
$actions[$route]($conn);

/** get_admin_dashboard_stats 原本的操作內容。 */
function admin_dashboard_stats(mysqli $conn): void {
    require_admin_access($conn);

    try {
        $result = $conn->query(
            "SELECT
                (SELECT COUNT(*) FROM Public_Itinerary_Report WHERE Status = 'pending') AS Pending_Count,
                (SELECT COUNT(*) FROM Public_Itinerary_Report WHERE Created_At >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)) AS Reports_This_Week,
                (SELECT COUNT(*) FROM Public_Itinerary_Report WHERE Status IN ('resolved', 'dismissed') AND Reviewed_At >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)) AS Processed_This_Week,
                (SELECT COUNT(*) FROM Itinerary WHERE Is_Public = 0 AND Public_Moderation_Status = 'hidden') AS Hidden_Itineraries"
        );
        if (!$result || !($stats = $result->fetch_assoc())) {
            api_error('無法讀取管理統計資料。', 500);
        }

        $reportsThisWeek = (int)$stats['Reports_This_Week'];
        $processedThisWeek = (int)$stats['Processed_This_Week'];
        $completionRate = $reportsThisWeek > 0 ? (int)round(($processedThisWeek / $reportsThisWeek) * 100) : 0;
        $conn->close();

        api_json([
            'status' => 'success',
            'data' => [
                'pendingCount' => (int)$stats['Pending_Count'],
                'reportsThisWeek' => $reportsThisWeek,
                'processedThisWeek' => $processedThisWeek,
                'completionRateThisWeek' => $completionRate,
                'hiddenItineraries' => (int)$stats['Hidden_Itineraries'],
            ],
        ]);
    } catch (Throwable $error) {
        $conn->close();
        error_log('Admin dashboard stats query failed: ' . $error->getMessage());
        api_error('無法讀取管理統計資料。', 500);
    }
}

/** get_admin_users 原本的操作內容。 */
function admin_users(mysqli $conn): void {
    require_admin_access($conn);

    try {
        $statement = $conn->prepare(
            "SELECT m.Account, COALESCE(NULLIF(m.Name, ''), m.Account) AS Member_Name, m.Avatar, COALESCE(NULLIF(m.Role, ''), 'user') AS Role,
                    COUNT(DISTINCT CASE WHEN i.Is_Public = 1 THEN i.Itinerary_ID END) AS Public_Itinerary_Count,
                    COUNT(DISTINCT r.Report_ID) AS Report_Count,
                    COUNT(DISTINCT CASE WHEN i.Public_Moderation_Status = 'hidden' THEN i.Itinerary_ID END) AS Hidden_Itinerary_Count
             FROM Member m
             LEFT JOIN Itinerary i ON i.Account COLLATE utf8mb4_unicode_ci = m.Account COLLATE utf8mb4_unicode_ci
             LEFT JOIN Public_Itinerary_Report r ON r.Itinerary_ID = i.Itinerary_ID
             GROUP BY m.Account, m.Name, m.Avatar, m.Role
             ORDER BY Report_Count DESC, Hidden_Itinerary_Count DESC, Public_Itinerary_Count DESC, m.Account ASC
             LIMIT 200"
        );
        if (!$statement || !$statement->execute()) {
            if ($statement) $statement->close();
            api_error('無法讀取使用者管理清單。', 500);
        }

        $users = [];
        $result = $statement->get_result();
        while ($row = $result->fetch_assoc()) {
            $users[] = [
                'account' => $row['Account'],
                'name' => $row['Member_Name'],
                'avatar' => $row['Avatar'] ?? '',
                'role' => $row['Role'],
                'publicItineraryCount' => (int)$row['Public_Itinerary_Count'],
                'reportCount' => (int)$row['Report_Count'],
                'hiddenItineraryCount' => (int)$row['Hidden_Itinerary_Count'],
            ];
        }
        $statement->close();
        $conn->close();
        api_json(['status' => 'success', 'data' => $users]);
    } catch (Throwable $error) {
        $conn->close();
        error_log('Admin user list query failed: ' . $error->getMessage());
        api_error('無法讀取使用者管理清單。', 500);
    }
}

/** get_public_itinerary_moderation_log 原本的操作內容。 */
function admin_moderation_log(mysqli $conn): void {
    require_admin_access($conn);

    try {
        $statement = $conn->prepare(
            "SELECT l.Log_ID, l.Itinerary_ID, l.Report_ID, l.Action, l.Note, l.Admin_Account, l.Created_At,
                    COALESCE(NULLIF(i.Public_Title, ''), NULLIF(i.Title, ''), '已刪除行程') AS Itinerary_Title,
                    i.Public_Location,
                    r.Reason AS Report_Reason
             FROM Public_Itinerary_Moderation_Log l
             LEFT JOIN Itinerary i ON i.Itinerary_ID = l.Itinerary_ID
             LEFT JOIN Public_Itinerary_Report r ON r.Report_ID = l.Report_ID
             ORDER BY l.Created_At DESC, l.Log_ID DESC
             LIMIT 200"
        );
        if (!$statement || !$statement->execute()) {
            if ($statement) $statement->close();
            api_error('無法讀取管理操作紀錄。', 500);
        }

        $records = [];
        $result = $statement->get_result();
        while ($row = $result->fetch_assoc()) {
            $records[] = [
                'id' => (string)$row['Log_ID'],
                'itineraryId' => (string)$row['Itinerary_ID'],
                'reportId' => $row['Report_ID'] === null ? '' : (string)$row['Report_ID'],
                'action' => $row['Action'],
                'note' => $row['Note'],
                'adminAccount' => $row['Admin_Account'],
                'createdAt' => $row['Created_At'],
                'itineraryTitle' => $row['Itinerary_Title'],
                'location' => $row['Public_Location'] ?? '',
                'reportReason' => $row['Report_Reason'] ?? '',
            ];
        }
        $statement->close();
        $conn->close();
        api_json(['status' => 'success', 'data' => $records]);
    } catch (Throwable $error) {
        $conn->close();
        error_log('Admin moderation log query failed: ' . $error->getMessage());
        api_error('無法讀取管理操作紀錄。', 500);
    }
}

/** get_public_itinerary_reports 原本的操作內容。 */
function admin_reports(mysqli $conn): void {
    require_admin_access($conn);

    try {
        $statement = $conn->prepare(
            "SELECT r.Report_ID, r.Reason, r.Details, r.Status, r.Admin_Note, r.Reviewed_By, r.Reviewed_At, r.Created_At, r.Updated_At,
                    r.Reporter_Account, COALESCE(NULLIF(reporter.Name, ''), r.Reporter_Account) AS Reporter_Name,
                    i.Itinerary_ID, COALESCE(NULLIF(i.Public_Title, ''), i.Title) AS Itinerary_Title,
                i.Public_Location, i.Is_Public, i.Public_Moderation_Status, i.Public_Moderation_Note, i.Public_Moderated_By, i.Public_Moderated_At, i.Account AS Owner_Account,
                    COALESCE(NULLIF(owner_member.Name, ''), i.Account) AS Owner_Name
             FROM Public_Itinerary_Report r
             INNER JOIN Itinerary i ON i.Itinerary_ID = r.Itinerary_ID
             LEFT JOIN Member reporter
                ON reporter.Account COLLATE utf8mb4_unicode_ci = r.Reporter_Account COLLATE utf8mb4_unicode_ci
             LEFT JOIN Member owner_member
                ON owner_member.Account COLLATE utf8mb4_unicode_ci = i.Account COLLATE utf8mb4_unicode_ci
             ORDER BY CASE WHEN r.Status = 'pending' THEN 0 ELSE 1 END, r.Updated_At DESC, r.Report_ID DESC
             LIMIT 100"
        );
        if (!$statement || !$statement->execute()) {
            if ($statement) $statement->close();
            api_error('無法讀取檢舉清單。', 500);
        }
    } catch (mysqli_sql_exception $exception) {
        error_log('Admin report list query failed: ' . $exception->getMessage());
        api_error('無法讀取檢舉清單。', 500);
    }

    $reports = [];
    $result = $statement->get_result();
    while ($row = $result->fetch_assoc()) {
        $reports[] = [
            'id' => (string)$row['Report_ID'],
            'reason' => $row['Reason'],
            'details' => $row['Details'] ?? '',
            'status' => $row['Status'],
            'adminNote' => $row['Admin_Note'] ?? '',
            'reviewedBy' => $row['Reviewed_By'] ?? '',
            'reviewedAt' => $row['Reviewed_At'] ?? '',
            'reportedAt' => $row['Created_At'],
            'updatedAt' => $row['Updated_At'],
            'reporter' => ['account' => $row['Reporter_Account'], 'name' => $row['Reporter_Name']],
            'itinerary' => [
                'id' => (string)$row['Itinerary_ID'],
                'title' => $row['Itinerary_Title'],
                'location' => $row['Public_Location'] ?? '',
                'isPublic' => (bool)$row['Is_Public'],
                'moderationStatus' => $row['Public_Moderation_Status'] ?? 'active',
                'moderationNote' => $row['Public_Moderation_Note'] ?? '',
                'moderatedBy' => $row['Public_Moderated_By'] ?? '',
                'moderatedAt' => $row['Public_Moderated_At'] ?? '',
                'ownerAccount' => $row['Owner_Account'],
                'ownerName' => $row['Owner_Name'],
            ],
        ];
    }
    $statement->close();

    $historyByItinerary = [];
    $historyResult = $conn->query(
        'SELECT Log_ID, Itinerary_ID, Report_ID, Action, Note, Admin_Account, Created_At
         FROM Public_Itinerary_Moderation_Log
         ORDER BY Created_At DESC, Log_ID DESC
         LIMIT 300'
    );
    while ($historyRow = $historyResult->fetch_assoc()) {
        $itineraryId = (string)$historyRow['Itinerary_ID'];
        $historyByItinerary[$itineraryId][] = [
            'id' => (string)$historyRow['Log_ID'],
            'reportId' => $historyRow['Report_ID'] === null ? '' : (string)$historyRow['Report_ID'],
            'action' => $historyRow['Action'],
            'note' => $historyRow['Note'],
            'adminAccount' => $historyRow['Admin_Account'],
            'createdAt' => $historyRow['Created_At'],
        ];
    }
    foreach ($reports as &$report) {
        $report['history'] = $historyByItinerary[$report['itinerary']['id']] ?? [];
    }
    unset($report);
    $conn->close();

    api_json(['status' => 'success', 'data' => $reports]);
}

/** update_public_itinerary_report 原本的操作內容。 */
function admin_update_report(mysqli $conn): void {
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
}

/** update_public_itinerary_visibility 原本的操作內容。 */
function admin_update_visibility(mysqli $conn): void {
    $data = read_json_body();
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    $reportId = isset($data->Report_ID) ? (int)$data->Report_ID : null;
    $action = trim((string)($data->Action ?? ''));
    $note = trim((string)($data->Moderation_Note ?? ''));

    $account = require_admin_access($conn);

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
}
