<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../itinerary/api_helpers.php';
require_once 'schema.php';
require_once 'public_itinerary_cache.php';

$data = read_json_body();
$search = trim((string)($data->Search ?? ''));
$account = trim((string)($data->Account ?? ''));
$transport = trim((string)($data->Transport ?? ''));
$duration = (string)($data->Duration ?? 'all');
$savedOnly = !empty($data->Saved_Only);
$limit = min(max((int)($data->Limit ?? 24), 1), 48);
$tags = normalize_public_itinerary_tags($data->Tags ?? []);

if ($savedOnly && $account === '') api_error('請先登入後查看收藏。', 401);

$durationRanges = [
    '1-2' => [1, 2],
    '3-4' => [3, 4],
    '5+' => [5, 0],
];
[$durationMin, $durationMax] = $durationRanges[$duration] ?? [0, 0];
$searchLike = '%' . $search . '%';
$cacheKey = hash('sha256', json_encode([$account, $search, $tags, $transport, $duration, $savedOnly, $limit], JSON_UNESCAPED_UNICODE));
$cachedPayload = public_itinerary_cache_read($cacheKey);
if ($cachedPayload !== null) api_json($cachedPayload);

require_once '../db_connect.php';

$sql = "
  SELECT
    i.Itinerary_ID,
    COALESCE(NULLIF(i.Public_Title, ''), i.Title) AS Title,
    i.Start_Date,
    i.End_Date,
    i.Transport,
    COALESCE(NULLIF(i.Public_Cover_Image, ''), i.Cover_Image) AS Cover_Image,
    i.Public_Description, i.Public_Location, i.Copy_Count, i.Like_Count, i.View_Count,
    i.Account AS Owner_Account,
    COALESCE(NULLIF(m.Name, ''), i.Account) AS Owner_Name,
    m.Avatar AS Owner_Avatar,
    COUNT(ii.Item_ID) AS Item_Count,
    MAX(ii.Day_Number) AS Day_Count,
    (SELECT GROUP_CONCAT(pt.Tag ORDER BY pt.Tag SEPARATOR '|')
       FROM Public_Itinerary_Tag pt
      WHERE pt.Itinerary_ID = i.Itinerary_ID) AS Tags,
    EXISTS(
      SELECT 1 FROM Public_Itinerary_Like current_like
       WHERE current_like.Itinerary_ID = i.Itinerary_ID AND current_like.Account = ?
    ) AS Is_Liked,
    EXISTS(
      SELECT 1 FROM Public_Itinerary_Save current_save
       WHERE current_save.Itinerary_ID = i.Itinerary_ID AND current_save.Account = ?
    ) AS Is_Saved
  FROM Itinerary i
  LEFT JOIN Member m ON m.Account = i.Account
  LEFT JOIN Itinerary_Item ii ON ii.Itinerary_ID = i.Itinerary_ID
  WHERE i.Is_Public = 1
    AND (
      ? = ''
      OR COALESCE(NULLIF(i.Public_Title, ''), i.Title) LIKE ?
      OR COALESCE(i.Public_Location, '') LIKE ?
      OR EXISTS (
        SELECT 1 FROM Itinerary_Item search_item
         WHERE search_item.Itinerary_ID = i.Itinerary_ID
           AND search_item.Title LIKE ?
      )
    )
    AND (? = '' OR i.Transport = ?)
    AND (? = 0 OR DATEDIFF(i.End_Date, i.Start_Date) + 1 >= ?)
    AND (? = 0 OR DATEDIFF(i.End_Date, i.Start_Date) + 1 <= ?)
";

$types = 'ssssssssiiii';
$params = [$account, $account, $search, $searchLike, $searchLike, $searchLike, $transport, $transport, $durationMin, $durationMin, $durationMax, $durationMax];
if ($savedOnly) {
    $sql .= " AND EXISTS (SELECT 1 FROM Public_Itinerary_Save saved_filter WHERE saved_filter.Itinerary_ID = i.Itinerary_ID AND saved_filter.Account = ?)";
    $types .= 's';
    $params[] = $account;
}
foreach ($tags as $tag) {
    $sql .= " AND EXISTS (SELECT 1 FROM Public_Itinerary_Tag tag_filter WHERE tag_filter.Itinerary_ID = i.Itinerary_ID AND tag_filter.Tag = ?)";
    $types .= 's';
    $params[] = $tag;
}

$sql .= "
  GROUP BY i.Itinerary_ID
  ORDER BY i.Like_Count DESC, i.View_Count DESC, i.Copy_Count DESC, i.Start_Date DESC, i.Itinerary_ID DESC
  LIMIT ?
";
$types .= 'i';
$params[] = $limit;

$stmt = $conn->prepare($sql);
if (!$stmt) api_error('無法載入公開行程。', 500);
$stmt->bind_param($types, ...$params);
if (!$stmt->execute()) api_error('無法載入公開行程。', 500);

$result = $stmt->get_result();
$itineraries = [];
while ($row = $result->fetch_assoc()) {
    $itineraries[] = [
        'id' => (string)$row['Itinerary_ID'],
        'title' => $row['Title'],
        'startDate' => $row['Start_Date'],
        'endDate' => $row['End_Date'],
        'transport' => $row['Transport'],
        'coverImage' => $row['Cover_Image'] ?: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop',
        'description' => $row['Public_Description'],
        'location' => $row['Public_Location'],
        'tags' => $row['Tags'] ? explode('|', $row['Tags']) : [],
        'copyCount' => (int)$row['Copy_Count'],
        'likeCount' => (int)$row['Like_Count'],
        'viewCount' => (int)$row['View_Count'],
        'isLiked' => (bool)$row['Is_Liked'],
        'isSaved' => (bool)$row['Is_Saved'],
        'itemCount' => (int)$row['Item_Count'],
        'dayCount' => max((int)$row['Day_Count'], 1),
        'owner' => [
            'account' => $row['Owner_Account'],
            'name' => $row['Owner_Name'],
            'avatar' => $row['Owner_Avatar'],
        ],
    ];
}

$stmt->close();
$conn->close();
$payload = ['status' => 'success', 'data' => $itineraries];
public_itinerary_cache_write($cacheKey, $payload);
api_json($payload);
