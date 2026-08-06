<?php
require_once '../../db_connect.php';
require_once '../api_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST 請求', 405);
$data = read_json_body();
$itineraryId = (int)($data->Itinerary_ID ?? 0);
$account = trim((string)($data->Account ?? ''));
$place = is_object($data->Place ?? null) ? $data->Place : null;
$allowedTags = ['單人友善', '寵物友善', '餐廳', '咖啡廳'];
$tags = is_array($data->Tags ?? null) ? array_values(array_unique(array_intersect($allowedTags, array_map('strval', $data->Tags)))) : [];

require_itinerary_access($conn, $itineraryId, $account);
if (!$place || trim((string)($place->GooglePlaceID ?? '')) === '' || trim((string)($place->Name ?? '')) === '') {
    api_error('缺少有效的地點資料', 400);
}

$googlePlaceId = trim((string)$place->GooglePlaceID);
$name = trim((string)$place->Name);
$address = trim((string)($place->Address ?? ''));
$lat = is_numeric($place->Latitude ?? null) ? (float)$place->Latitude : null;
$lng = is_numeric($place->Longitude ?? null) ? (float)$place->Longitude : null;
$placeData = json_encode($place, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$conn->begin_transaction();
try {
    $stmt = $conn->prepare('INSERT INTO Itinerary_Places (Itinerary_ID, Google_Place_ID, Name, Address, Latitude, Longitude, Place_Data) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE Name = VALUES(Name), Address = VALUES(Address), Latitude = VALUES(Latitude), Longitude = VALUES(Longitude), Place_Data = VALUES(Place_Data)');
    if (!$stmt) throw new Exception('建立地點資料失敗');
    $stmt->bind_param('isssdds', $itineraryId, $googlePlaceId, $name, $address, $lat, $lng, $placeData);
    if (!$stmt->execute()) throw new Exception('儲存地點資料失敗');
    $stmt->close();

    $stmt = $conn->prepare('SELECT Place_ID FROM Itinerary_Places WHERE Itinerary_ID = ? AND Google_Place_ID = ? LIMIT 1');
    $stmt->bind_param('is', $itineraryId, $googlePlaceId);
    $stmt->execute();
    $placeRow = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$placeRow) throw new Exception('找不到地點資料');
    $placeId = (int)$placeRow['Place_ID'];

    $stmt = $conn->prepare('DELETE FROM Itinerary_Place_Tags WHERE Place_ID = ?');
    $stmt->bind_param('i', $placeId);
    if (!$stmt->execute()) throw new Exception('清除地點標籤失敗');
    $stmt->close();

    if ($tags) {
        $stmt = $conn->prepare('INSERT INTO Itinerary_Place_Tags (Place_ID, Tag, Source, Confidence, Updated_By) VALUES (?, ?, \'user\', 1.000, ?)');
        foreach ($tags as $tag) {
            $stmt->bind_param('iss', $placeId, $tag, $account);
            if (!$stmt->execute()) throw new Exception('儲存地點標籤失敗');
        }
        $stmt->close();
    }
    $conn->commit();
    api_json(['status' => 'success', 'data' => ['GooglePlaceID' => $googlePlaceId, 'Tags' => $tags]]);
} catch (Throwable $error) {
    $conn->rollback();
    api_error($error->getMessage(), 500);
}
