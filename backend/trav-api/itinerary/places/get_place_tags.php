<?php
require_once '../../db_connect.php';
require_once '../api_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST 請求', 405);
$data = read_json_body();
$itineraryId = (int)($data->Itinerary_ID ?? 0);
$account = trim((string)($data->Account ?? ''));
$placeIds = is_array($data->PlaceIds ?? null) ? $data->PlaceIds : [];
require_itinerary_access($conn, $itineraryId, $account);

$placeIds = array_values(array_filter(array_map(static fn($id) => trim((string)$id), $placeIds), static fn($id) => $id !== ''));
if (!$placeIds) api_json(['status' => 'success', 'data' => []]);

$placeholders = implode(',', array_fill(0, count($placeIds), '?'));
$types = 'i' . str_repeat('s', count($placeIds));
$params = array_merge([$itineraryId], $placeIds);
$stmt = $conn->prepare("SELECT p.Google_Place_ID, t.Tag FROM Itinerary_Places p INNER JOIN Itinerary_Place_Tags t ON t.Place_ID = p.Place_ID WHERE p.Itinerary_ID = ? AND p.Google_Place_ID IN ($placeholders)");
if (!$stmt) api_error('讀取地點標籤失敗', 500);
$bindArgs = [$types];
foreach ($params as $key => &$value) $bindArgs[] = &$value;
call_user_func_array([$stmt, 'bind_param'], $bindArgs);
if (!$stmt->execute()) api_error('讀取地點標籤失敗', 500);
$result = $stmt->get_result();
$tags = [];
while ($row = $result->fetch_assoc()) {
    $tags[$row['Google_Place_ID']][] = $row['Tag'];
}
$stmt->close();
api_json(['status' => 'success', 'data' => $tags]);
