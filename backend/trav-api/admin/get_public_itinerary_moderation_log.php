<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../db_connect.php';
require_once '../itinerary/api_helpers.php';
require_once 'admin_helpers.php';

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
