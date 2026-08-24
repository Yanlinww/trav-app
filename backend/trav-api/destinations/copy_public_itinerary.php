<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../db_connect.php';
require_once '../itinerary/api_helpers.php';
require_once 'schema.php';
require_once 'public_itinerary_cache.php';

$data = read_json_body();
$sourceId = (int)($data->Itinerary_ID ?? 0);
$account = trim((string)($data->Account ?? ''));
if ($sourceId <= 0 || $account === '') api_error('缺少行程或使用者資料', 400);

$sourceStmt = $conn->prepare('SELECT Itinerary_ID, Title, Start_Date, End_Date, Transport, Cover_Image, Dest_Lat, Dest_Lng FROM Itinerary WHERE Itinerary_ID = ? AND Is_Public = 1 LIMIT 1');
if (!$sourceStmt) api_error('無法讀取公開行程', 500);
$sourceStmt->bind_param('i', $sourceId);
$sourceStmt->execute();
$source = $sourceStmt->get_result()->fetch_assoc();
$sourceStmt->close();
if (!$source) api_error('找不到可複製的公開行程', 404);

$conn->begin_transaction();
try {
    $title = trim((string)($data->Title ?? '')) ?: $source['Title'] . '（複製）';
    $insertItinerary = $conn->prepare('INSERT INTO Itinerary (Account, Title, Start_Date, End_Date, Transport, Cover_Image, Dest_Lat, Dest_Lng, Is_Public, Copied_From_Itinerary_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)');
    if (!$insertItinerary) throw new Exception('建立新行程失敗');
    $insertItinerary->bind_param('ssssssddi', $account, $title, $source['Start_Date'], $source['End_Date'], $source['Transport'], $source['Cover_Image'], $source['Dest_Lat'], $source['Dest_Lng'], $sourceId);
    if (!$insertItinerary->execute()) throw new Exception('建立新行程失敗');
    $newItineraryId = $conn->insert_id;
    $insertItinerary->close();

    $copyItems = $conn->prepare('INSERT INTO Itinerary_Item (Itinerary_ID, Day_Number, Item_Type, Title, Start_Time, End_Time, Sort_Order, Latitude, Longitude) SELECT ?, Day_Number, Item_Type, Title, Start_Time, End_Time, Sort_Order, Latitude, Longitude FROM Itinerary_Item WHERE Itinerary_ID = ? ORDER BY Day_Number, Sort_Order');
    if (!$copyItems) throw new Exception('複製行程地點失敗');
    $copyItems->bind_param('ii', $newItineraryId, $sourceId);
    if (!$copyItems->execute()) throw new Exception('複製行程地點失敗');
    $copyItems->close();

    $incrementCopyCount = $conn->prepare('UPDATE Itinerary SET Copy_Count = Copy_Count + 1 WHERE Itinerary_ID = ?');
    if (!$incrementCopyCount) throw new Exception('更新複製次數失敗');
    $incrementCopyCount->bind_param('i', $sourceId);
    if (!$incrementCopyCount->execute()) throw new Exception('更新複製次數失敗');
    $incrementCopyCount->close();

    $conn->commit();
    $conn->close();
    invalidate_public_itinerary_cache();
    api_json(['status' => 'success', 'itineraryId' => (string)$newItineraryId]);
} catch (Throwable $error) {
    $conn->rollback();
    $conn->close();
    api_error($error->getMessage(), 500);
}
