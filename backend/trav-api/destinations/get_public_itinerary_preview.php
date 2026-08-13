<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../db_connect.php';
require_once '../itinerary/api_helpers.php';
require_once 'schema.php';

ensure_destinations_schema($conn);
$data = read_json_body();
$itineraryId = (int)($data->Itinerary_ID ?? 0);
if ($itineraryId <= 0) api_error('缺少行程資料。', 400);

$itineraryStmt = $conn->prepare(
    'SELECT i.Itinerary_ID, COALESCE(NULLIF(i.Public_Title, \'\'), i.Title) AS Title,
            i.Start_Date, i.End_Date, i.Transport, COALESCE(NULLIF(i.Public_Cover_Image, \'\'), i.Cover_Image) AS Cover_Image,
            i.Public_Description, i.Copy_Count, i.Account AS Owner_Account,
            COALESCE(NULLIF(m.Name, \'\'), i.Account) AS Owner_Name, m.Avatar AS Owner_Avatar
            ,(SELECT GROUP_CONCAT(pt.Tag ORDER BY pt.Tag SEPARATOR \'|\')
                FROM Public_Itinerary_Tag pt
               WHERE pt.Itinerary_ID = i.Itinerary_ID) AS Tags
     FROM Itinerary i
     LEFT JOIN Member m ON m.Account = i.Account
     WHERE i.Itinerary_ID = ? AND i.Is_Public = 1
     LIMIT 1'
);
if (!$itineraryStmt) api_error('無法讀取公開行程。', 500);
$itineraryStmt->bind_param('i', $itineraryId);
if (!$itineraryStmt->execute()) api_error('無法讀取公開行程。', 500);
$itinerary = $itineraryStmt->get_result()->fetch_assoc();
$itineraryStmt->close();
if (!$itinerary) api_error('找不到此公開行程。', 404);

$itemsStmt = $conn->prepare(
    'SELECT Item_ID, Day_Number, Item_Type, Title, Start_Time, End_Time, Sort_Order, Latitude, Longitude
     FROM Itinerary_Item
     WHERE Itinerary_ID = ?
     ORDER BY Day_Number ASC, Sort_Order ASC, Item_ID ASC'
);
if (!$itemsStmt) api_error('無法讀取行程地點。', 500);
$itemsStmt->bind_param('i', $itineraryId);
if (!$itemsStmt->execute()) api_error('無法讀取行程地點。', 500);

$items = [];
$itemsResult = $itemsStmt->get_result();
while ($row = $itemsResult->fetch_assoc()) {
    $items[] = [
        'id' => (string)$row['Item_ID'],
        'dayNumber' => (int)$row['Day_Number'],
        'type' => $row['Item_Type'],
        'title' => $row['Title'],
        'startTime' => $row['Start_Time'] ? substr($row['Start_Time'], 0, 5) : '',
        'endTime' => $row['End_Time'] ? substr($row['End_Time'], 0, 5) : '',
        'sortOrder' => (int)$row['Sort_Order'],
        'latitude' => $row['Latitude'] === null ? null : (float)$row['Latitude'],
        'longitude' => $row['Longitude'] === null ? null : (float)$row['Longitude'],
    ];
}
$itemsStmt->close();
$conn->close();

api_json(['status' => 'success', 'data' => [
    'id' => (string)$itinerary['Itinerary_ID'],
    'title' => $itinerary['Title'],
    'startDate' => $itinerary['Start_Date'],
    'endDate' => $itinerary['End_Date'],
    'transport' => $itinerary['Transport'],
    'coverImage' => $itinerary['Cover_Image'],
    'description' => $itinerary['Public_Description'],
    'tags' => $itinerary['Tags'] ? explode('|', $itinerary['Tags']) : [],
    'copyCount' => (int)$itinerary['Copy_Count'],
    'owner' => [
        'account' => $itinerary['Owner_Account'],
        'name' => $itinerary['Owner_Name'],
        'avatar' => $itinerary['Owner_Avatar'],
    ],
    'items' => $items,
]]);
