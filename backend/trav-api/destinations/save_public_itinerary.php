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
$account = trim((string)($data->Account ?? ''));
$itineraryId = (int)($data->Itinerary_ID ?? 0);
$isPublic = !empty($data->Is_Public) ? 1 : 0;
$publicTitle = trim((string)($data->Public_Title ?? ''));
$publicCoverImage = trim((string)($data->Public_Cover_Image ?? ''));
$publicDescription = trim((string)($data->Public_Description ?? ''));
$rawTags = $data->Tags ?? [];

if ($account === '' || $itineraryId <= 0) api_error('缺少行程或使用者資料。', 400);
if (!is_array($rawTags)) api_error('標籤格式錯誤。', 422);
if (mb_strlen($publicTitle) > 255) api_error('公開標題最多 255 個字。', 422);
if (mb_strlen($publicCoverImage) > 2000) api_error('封面連結過長。', 422);
if (mb_strlen($publicDescription) > 1000) api_error('行程簡介最多 1000 個字。', 422);

$tags = normalize_public_itinerary_tags($rawTags);
$submittedTags = [];
foreach ($rawTags as $tag) {
    if (is_string($tag) && trim($tag) !== '') $submittedTags[trim($tag)] = true;
}
if (count($submittedTags) > 5) api_error('最多選擇 5 個標籤。', 422);
if (count($tags) !== count($submittedTags)) api_error('包含不支援的標籤。', 422);

$conn->begin_transaction();
try {
    $ownerCheck = $conn->prepare('SELECT 1 FROM Itinerary WHERE Itinerary_ID = ? AND Account = ? LIMIT 1');
    if (!$ownerCheck) throw new RuntimeException('無法確認行程權限。');
    $ownerCheck->bind_param('is', $itineraryId, $account);
    $ownerCheck->execute();
    $exists = (bool)$ownerCheck->get_result()->fetch_row();
    $ownerCheck->close();
    if (!$exists) throw new RuntimeException('找不到可管理的行程。');

    $stmt = $conn->prepare(
        'UPDATE Itinerary
         SET Is_Public = ?, Public_Title = NULLIF(?, \'\'), Public_Cover_Image = NULLIF(?, \'\'), Public_Description = NULLIF(?, \'\')
         WHERE Itinerary_ID = ? AND Account = ?'
    );
    if (!$stmt) throw new RuntimeException('無法儲存公開設定。');
    $stmt->bind_param('isssis', $isPublic, $publicTitle, $publicCoverImage, $publicDescription, $itineraryId, $account);
    if (!$stmt->execute()) throw new RuntimeException('無法儲存公開設定。');
    $stmt->close();

    $deleteTags = $conn->prepare('DELETE FROM Public_Itinerary_Tag WHERE Itinerary_ID = ?');
    if (!$deleteTags) throw new RuntimeException('無法更新行程標籤。');
    $deleteTags->bind_param('i', $itineraryId);
    if (!$deleteTags->execute()) throw new RuntimeException('無法更新行程標籤。');
    $deleteTags->close();

    if (count($tags) > 0) {
        $insertTag = $conn->prepare('INSERT INTO Public_Itinerary_Tag (Itinerary_ID, Tag) VALUES (?, ?)');
        if (!$insertTag) throw new RuntimeException('無法儲存行程標籤。');
        foreach ($tags as $tag) {
            $insertTag->bind_param('is', $itineraryId, $tag);
            if (!$insertTag->execute()) throw new RuntimeException('無法儲存行程標籤。');
        }
        $insertTag->close();
    }

    $conn->commit();
} catch (Throwable $error) {
    $conn->rollback();
    $conn->close();
    api_error($error->getMessage(), 500);
}

$conn->close();
api_json(['status' => 'success', 'message' => $isPublic ? '公開行程已儲存。' : '公開行程已下架。']);
