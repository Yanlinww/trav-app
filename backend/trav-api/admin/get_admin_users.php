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
