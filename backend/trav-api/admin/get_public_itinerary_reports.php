<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../db_connect.php';
require_once '../itinerary/api_helpers.php';
require_once 'admin_helpers.php';

$data = read_json_body();
$account = trim((string)($data->Account ?? ''));
require_admin_access($conn, $account);

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
