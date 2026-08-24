<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../db_connect.php';
require_once '../itinerary/api_helpers.php';
require_once 'schema.php';
$data = read_json_body();
$account = trim((string)($data->Account ?? ''));
if ($account === '') api_error('請先登入後再管理公開行程。', 401);

$stmt = $conn->prepare(
    "SELECT i.Itinerary_ID, i.Title, i.Start_Date, i.End_Date, i.Transport, i.Cover_Image, i.Is_Public,
            i.Public_Title, i.Public_Cover_Image, i.Public_Description, i.Public_Location, COUNT(ii.Item_ID) AS Item_Count, MAX(ii.Day_Number) AS Day_Count,
            (SELECT GROUP_CONCAT(pt.Tag ORDER BY pt.Tag SEPARATOR '|')
               FROM Public_Itinerary_Tag pt
              WHERE pt.Itinerary_ID = i.Itinerary_ID) AS Tags
     FROM Itinerary i
     LEFT JOIN Itinerary_Item ii ON ii.Itinerary_ID = i.Itinerary_ID
     WHERE i.Account = ?
     GROUP BY i.Itinerary_ID
     ORDER BY i.Start_Date DESC, i.Itinerary_ID DESC"
);
if (!$stmt) api_error('無法取得你的行程。', 500);
$stmt->bind_param('s', $account);
if (!$stmt->execute()) api_error('無法取得你的行程。', 500);

$result = $stmt->get_result();
$itineraries = [];
while ($row = $result->fetch_assoc()) {
    $itineraries[] = [
        'id' => (string)$row['Itinerary_ID'],
        'title' => $row['Title'],
        'startDate' => $row['Start_Date'],
        'endDate' => $row['End_Date'],
        'transport' => $row['Transport'],
        'coverImage' => $row['Cover_Image'],
        'isPublic' => (bool)$row['Is_Public'],
        'publicTitle' => $row['Public_Title'],
        'publicCoverImage' => $row['Public_Cover_Image'],
        'publicDescription' => $row['Public_Description'],
        'publicLocation' => $row['Public_Location'],
        'tags' => $row['Tags'] ? explode('|', $row['Tags']) : [],
        'itemCount' => (int)$row['Item_Count'],
        'dayCount' => max((int)$row['Day_Count'], 1),
    ];
}

$stmt->close();
$conn->close();
api_json(['status' => 'success', 'data' => $itineraries]);
