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
