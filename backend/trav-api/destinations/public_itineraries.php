<?php
/**
 * 公開行程功能入口：列表、預覽、發布、瀏覽、按讚、收藏及複製。
 * 呼叫：POST /destinations/public_itineraries.php?action=功能名稱，參數為 JSON 物件。
 * schema.php、public_itinerary_cache.php 與 migrations/run.php 各自保留原本用途。
 * 列表的快取命中路徑不開啟資料庫連線。
 */
require_once __DIR__ . '/../itinerary/api_helpers.php';
require_once __DIR__ . '/schema.php';
require_once __DIR__ . '/public_itinerary_cache.php';

/**
 * action=list：搜尋、篩選、排序公開行程；優先讀取快取，未命中才連資料庫。
 * 來源：get_public_itineraries.php；保留原本輸入欄位、交易與 JSON 回應格式。
 */
function destinations_list_public_itineraries(): void
{
    $data = read_json_body();
    $search = trim((string)($data->Search ?? ''));
    $account = trim((string)($data->Account ?? ''));
    $ownerAccount = trim((string)($data->Owner_Account ?? ''));
    $duration = (string)($data->Duration ?? 'all');
    $savedOnly = !empty($data->Saved_Only);
    $limit = min(max((int)($data->Limit ?? 24), 1), 48);
    $tags = normalize_public_itinerary_tags($data->Tags ?? []);
    $location = normalize_public_itinerary_location($data->Location ?? '');
    $sort = (string)($data->Sort ?? 'popular');
    if (!in_array($sort, ['popular', 'newest', 'copied'], true)) $sort = 'popular';

    if ($savedOnly && $account === '') api_error('請先登入後查看收藏。', 401);

    $durationRanges = [
        '1-2' => [1, 2],
        '3-4' => [3, 4],
        '5+' => [5, 0],
    ];
    [$durationMin, $durationMax] = $durationRanges[$duration] ?? [0, 0];
    $searchLike = '%' . $search . '%';
    $cacheKey = hash('sha256', json_encode([$account, $ownerAccount, $search, $tags, $duration, $location, $savedOnly, $sort, $limit], JSON_UNESCAPED_UNICODE));
    $cachedPayload = public_itinerary_cache_read($cacheKey);
    if ($cachedPayload !== null) api_json($cachedPayload);

    require_once __DIR__ . '/../db_connect.php';

    $sql = "
      SELECT
        i.Itinerary_ID,
        COALESCE(NULLIF(i.Public_Title, ''), i.Title) AS Title,
        i.Start_Date,
        i.End_Date,
        COALESCE(NULLIF(i.Public_Cover_Image, ''), i.Cover_Image) AS Cover_Image,
        i.Public_Description, i.Public_Location, i.Public_Updated_At, i.Copy_Count, i.Like_Count, i.View_Count,
        i.Account AS Owner_Account,
        COALESCE(NULLIF(m.Name, ''), i.Account) AS Owner_Name,
        m.Avatar AS Owner_Avatar,
        COUNT(ii.Item_ID) AS Item_Count,
        MAX(ii.Day_Number) AS Day_Count,
        (SELECT GROUP_CONCAT(pt.Tag ORDER BY pt.Tag SEPARATOR '|')
           FROM Public_Itinerary_Tag pt
          WHERE pt.Itinerary_ID = i.Itinerary_ID) AS Tags,
        EXISTS(
          SELECT 1 FROM Public_Itinerary_Interaction current_like
           WHERE current_like.Itinerary_ID = i.Itinerary_ID 
             AND current_like.Account = ? 
             AND current_like.Action_Type = 'like'
        ) AS Is_Liked,
        EXISTS(
          SELECT 1 FROM Public_Itinerary_Interaction current_save
           WHERE current_save.Itinerary_ID = i.Itinerary_ID 
             AND current_save.Account = ? 
             AND current_save.Action_Type = 'save'
        ) AS Is_Saved
      FROM Itinerary i
      LEFT JOIN Member m ON m.Account = i.Account
      LEFT JOIN Itinerary_Item ii ON ii.Itinerary_ID = i.Itinerary_ID
      WHERE i.Is_Public = 1
        AND (? = '' OR i.Account = ?)
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
        AND (? = '' OR i.Public_Location = ?)
        AND (? = 0 OR DATEDIFF(i.End_Date, i.Start_Date) + 1 >= ?)
        AND (? = 0 OR DATEDIFF(i.End_Date, i.Start_Date) + 1 <= ?)
    ";

    $types = 'ssssssssssiiii';
    $params = [$account, $account, $ownerAccount, $ownerAccount, $search, $searchLike, $searchLike, $searchLike, $location, $location, $durationMin, $durationMin, $durationMax, $durationMax];

    if ($savedOnly) {
        // 這裡也改成查詢新的 Interaction 總表，並指定 Action_Type = 'save'
        $sql .= " AND EXISTS (SELECT 1 FROM Public_Itinerary_Interaction saved_filter WHERE saved_filter.Itinerary_ID = i.Itinerary_ID AND saved_filter.Account = ? AND saved_filter.Action_Type = 'save')";
        $types .= 's';
        $params[] = $account;
    }

    foreach ($tags as $tag) {
        $sql .= " AND EXISTS (SELECT 1 FROM Public_Itinerary_Tag tag_filter WHERE tag_filter.Itinerary_ID = i.Itinerary_ID AND tag_filter.Tag = ?)";
        $types .= 's';
        $params[] = $tag;
    }

    $orderBy = [
        'popular' => 'i.Like_Count DESC, i.View_Count DESC, i.Copy_Count DESC, i.Public_Updated_At DESC, i.Itinerary_ID DESC',
        'newest' => 'i.Public_Updated_At DESC, i.Itinerary_ID DESC',
        'copied' => 'i.Copy_Count DESC, i.Like_Count DESC, i.View_Count DESC, i.Public_Updated_At DESC, i.Itinerary_ID DESC',
    ][$sort];

    $sql .= "
      GROUP BY i.Itinerary_ID
      ORDER BY {$orderBy}
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
            'coverImage' => $row['Cover_Image'] ?: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop',
            'description' => $row['Public_Description'],
            'location' => $row['Public_Location'],
            'tags' => $row['Tags'] ? explode('|', $row['Tags']) : [],
            'copyCount' => (int)$row['Copy_Count'],
            'likeCount' => (int)$row['Like_Count'],
            'viewCount' => (int)$row['View_Count'],
            'publishedAt' => $row['Public_Updated_At'],
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
}

/**
 * action=preview：讀取單一公開行程及每日地點，供公開預覽頁顯示。
 * 來源：get_public_itinerary_preview.php；保留原本輸入欄位、交易與 JSON 回應格式。
 */
function destinations_get_public_itinerary_preview(): void
{
    require_once __DIR__ . '/../db_connect.php';

    $data = read_json_body();
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    if ($itineraryId <= 0) api_error('缺少行程資料。', 400);

    $itineraryStmt = $conn->prepare(
        'SELECT i.Itinerary_ID, COALESCE(NULLIF(i.Public_Title, \'\'), i.Title) AS Title,
                i.Start_Date, i.End_Date, COALESCE(NULLIF(i.Public_Cover_Image, \'\'), i.Cover_Image) AS Cover_Image,
                i.Public_Description, i.Public_Location, i.Copy_Count, i.Like_Count, i.View_Count, i.Account AS Owner_Account,
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
        'SELECT Item_ID, Day_Number, Title, Start_Time, End_Time, Sort_Order, Latitude, Longitude
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
        'coverImage' => $itinerary['Cover_Image'],
        'description' => $itinerary['Public_Description'],
        'location' => $itinerary['Public_Location'],
        'tags' => $itinerary['Tags'] ? explode('|', $itinerary['Tags']) : [],
        'copyCount' => (int)$itinerary['Copy_Count'],
        'likeCount' => (int)$itinerary['Like_Count'],
        'viewCount' => (int)$itinerary['View_Count'],
        'owner' => [
            'account' => $itinerary['Owner_Account'],
            'name' => $itinerary['Owner_Name'],
            'avatar' => $itinerary['Owner_Avatar'],
        ],
        'items' => $items,
    ]]);
}

/**
 * action=mine：讀取指定帳號擁有、可管理公開設定的行程。
 * 來源：get_publishable_itineraries.php；保留原本輸入欄位、交易與 JSON 回應格式。
 */
function destinations_get_publishable_itineraries(): void
{
    require_once __DIR__ . '/../db_connect.php';

    $data = read_json_body();
    $account = trim((string)($data->Account ?? ''));
    if ($account === '') api_error('請先登入後再管理公開行程。', 401);

    $stmt = $conn->prepare(
        "SELECT i.Itinerary_ID, i.Title, i.Start_Date, i.End_Date, i.Cover_Image, i.Is_Public,
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
}

/**
 * action=publish：設定公開資訊與標籤，或將行程下架；成功後清除公開列表快取。
 * 來源：save_public_itinerary.php；保留原本輸入欄位、交易與 JSON 回應格式。
 */
function destinations_save_public_itinerary(): void
{
    require_once __DIR__ . '/../db_connect.php';

    $data = read_json_body();
    $account = trim((string)($data->Account ?? ''));
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    $isPublic = !empty($data->Is_Public) ? 1 : 0;
    $publicTitle = trim((string)($data->Public_Title ?? ''));
    $publicCoverImage = trim((string)($data->Public_Cover_Image ?? ''));
    $publicDescription = trim((string)($data->Public_Description ?? ''));
    $publicLocation = normalize_public_itinerary_location($data->Public_Location ?? '');
    $rawTags = $data->Tags ?? [];

    if ($account === '' || $itineraryId <= 0) api_error('缺少行程或使用者資料。', 400);
    if (!is_array($rawTags)) api_error('標籤格式錯誤。', 422);
    if (mb_strlen($publicTitle) > 255) api_error('公開標題最多 255 個字。', 422);
    if (mb_strlen($publicCoverImage) > 2000) api_error('封面連結過長。', 422);
    if (mb_strlen($publicDescription) > 1000) api_error('行程簡介最多 1000 個字。', 422);
    if (mb_strlen($publicLocation) > 150) api_error('公開地點標籤最多 150 個字。', 422);

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
             SET Is_Public = ?, Public_Title = NULLIF(?, \'\'), Public_Cover_Image = NULLIF(?, \'\'), Public_Description = NULLIF(?, \'\'), Public_Location = NULLIF(?, \'\'), Public_Updated_At = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE Public_Updated_At END
             WHERE Itinerary_ID = ? AND Account = ?'
        );
        if (!$stmt) throw new RuntimeException('無法儲存公開設定。');
        $stmt->bind_param('issssiis', $isPublic, $publicTitle, $publicCoverImage, $publicDescription, $publicLocation, $isPublic, $itineraryId, $account);
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
    invalidate_public_itinerary_cache();
    api_json(['status' => 'success', 'message' => $isPublic ? '公開行程已儲存。' : '公開行程已下架。']);
}

/**
 * action=view：以 Viewer_Key 去重後記錄瀏覽，必要時更新瀏覽數與快取。
 * 來源：record_public_itinerary_view.php；保留原本輸入欄位、交易與 JSON 回應格式。
 */
function destinations_record_public_itinerary_view(): void
{
    require_once __DIR__ . '/../db_connect.php';

    $data = read_json_body();
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    $viewerKey = trim((string)($data->Viewer_Key ?? ''));
    if ($itineraryId <= 0 || $viewerKey === '' || mb_strlen($viewerKey) > 150) api_error('瀏覽資料格式錯誤。', 422);

    $conn->begin_transaction();
    try {
        $itinerary = $conn->prepare('SELECT View_Count FROM Itinerary WHERE Itinerary_ID = ? AND Is_Public = 1 FOR UPDATE');
        if (!$itinerary) throw new RuntimeException('無法讀取公開行程。');
        $itinerary->bind_param('i', $itineraryId);
        $itinerary->execute();
        if (!$itinerary->get_result()->fetch_assoc()) throw new RuntimeException('找不到此公開行程。');
        $itinerary->close();

        $insert = $conn->prepare('INSERT IGNORE INTO Public_Itinerary_View (Itinerary_ID, Viewer_Key) VALUES (?, ?)');
        if (!$insert) throw new RuntimeException('無法記錄瀏覽。');
        $insert->bind_param('is', $itineraryId, $viewerKey);
        if (!$insert->execute()) throw new RuntimeException('無法記錄瀏覽。');
        $isNewView = $insert->affected_rows === 1;
        $insert->close();

        if ($isNewView) {
            $update = $conn->prepare('UPDATE Itinerary SET View_Count = View_Count + 1 WHERE Itinerary_ID = ?');
            if (!$update) throw new RuntimeException('無法更新瀏覽數。');
            $update->bind_param('i', $itineraryId);
            $update->execute();
            $update->close();
        }

        $count = $conn->prepare('SELECT View_Count FROM Itinerary WHERE Itinerary_ID = ?');
        if (!$count) throw new RuntimeException('無法讀取瀏覽數。');
        $count->bind_param('i', $itineraryId);
        $count->execute();
        $viewCount = (int)($count->get_result()->fetch_assoc()['View_Count'] ?? 0);
        $count->close();

        $conn->commit();
        $conn->close();
        if ($isNewView) invalidate_public_itinerary_cache();
        api_json(['status' => 'success', 'counted' => $isNewView, 'viewCount' => $viewCount]);
    } catch (Throwable $error) {
        $conn->rollback();
        $conn->close();
        api_error($error->getMessage(), 500);
    }
}

/**
 * action=like：切換公開行程按讚，更新按讚數及公開列表快取。
 * 來源：toggle_public_itinerary_like.php；保留原本輸入欄位、交易與 JSON 回應格式。
 */
function destinations_toggle_public_itinerary_like(): void
{
    require_once __DIR__ . '/../db_connect.php';

    $data = read_json_body();
    $account = trim((string)($data->Account ?? ''));
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    if ($account === '' || $itineraryId <= 0) api_error('請先登入後再按讚。', 401);

    $conn->begin_transaction();
    try {
        $itinerary = $conn->prepare('SELECT Like_Count FROM Itinerary WHERE Itinerary_ID = ? AND Is_Public = 1 FOR UPDATE');
        if (!$itinerary) throw new RuntimeException('無法讀取公開行程。');
        $itinerary->bind_param('i', $itineraryId);
        $itinerary->execute();
        if (!$itinerary->get_result()->fetch_assoc()) throw new RuntimeException('找不到此公開行程。');
        $itinerary->close();

        $insert = $conn->prepare('INSERT IGNORE INTO Public_Itinerary_Like (Itinerary_ID, Account) VALUES (?, ?)');
        if (!$insert) throw new RuntimeException('無法更新按讚。');
        $insert->bind_param('is', $itineraryId, $account);
        if (!$insert->execute()) throw new RuntimeException('無法更新按讚。');
        $isLiked = $insert->affected_rows === 1;
        $insert->close();

        if ($isLiked) {
            $update = $conn->prepare('UPDATE Itinerary SET Like_Count = Like_Count + 1 WHERE Itinerary_ID = ?');
        } else {
            $remove = $conn->prepare('DELETE FROM Public_Itinerary_Like WHERE Itinerary_ID = ? AND Account = ?');
            if (!$remove) throw new RuntimeException('無法取消按讚。');
            $remove->bind_param('is', $itineraryId, $account);
            $remove->execute();
            $remove->close();
            $update = $conn->prepare('UPDATE Itinerary SET Like_Count = GREATEST(Like_Count - 1, 0) WHERE Itinerary_ID = ?');
        }
        if (!$update) throw new RuntimeException('無法更新按讚數。');
        $update->bind_param('i', $itineraryId);
        $update->execute();
        $update->close();

        $count = $conn->prepare('SELECT Like_Count FROM Itinerary WHERE Itinerary_ID = ?');
        if (!$count) throw new RuntimeException('無法讀取按讚數。');
        $count->bind_param('i', $itineraryId);
        $count->execute();
        $likeCount = (int)($count->get_result()->fetch_assoc()['Like_Count'] ?? 0);
        $count->close();

        $conn->commit();
        $conn->close();
        invalidate_public_itinerary_cache();
        api_json(['status' => 'success', 'isLiked' => $isLiked, 'likeCount' => $likeCount]);
    } catch (Throwable $error) {
        $conn->rollback();
        $conn->close();
        api_error($error->getMessage(), 500);
    }
}

/**
 * action=bookmark：切換指定帳號對公開行程的收藏狀態並清除快取。
 * 來源：toggle_public_itinerary_save.php；保留原本輸入欄位、交易與 JSON 回應格式。
 */
function destinations_toggle_public_itinerary_save(): void
{
    require_once __DIR__ . '/../db_connect.php';

    $data = read_json_body();
    $account = trim((string)($data->Account ?? ''));
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    if ($account === '' || $itineraryId <= 0) api_error('請先登入後再收藏。', 401);

    $conn->begin_transaction();
    try {
        $itinerary = $conn->prepare('SELECT 1 FROM Itinerary WHERE Itinerary_ID = ? AND Is_Public = 1 FOR UPDATE');
        if (!$itinerary) throw new RuntimeException('無法讀取公開行程。');
        $itinerary->bind_param('i', $itineraryId);
        $itinerary->execute();
        if (!$itinerary->get_result()->fetch_row()) throw new RuntimeException('找不到此公開行程。');
        $itinerary->close();

        // 改為寫入 Public_Itinerary_Interaction 總表，並標記 Action_Type 為 'save'
        $insert = $conn->prepare("INSERT IGNORE INTO Public_Itinerary_Interaction (Itinerary_ID, Account, Action_Type) VALUES (?, ?, 'save')");
        if (!$insert) throw new RuntimeException('無法更新收藏。');
        $insert->bind_param('is', $itineraryId, $account);
        if (!$insert->execute()) throw new RuntimeException('無法更新收藏。');
        $isSaved = $insert->affected_rows === 1;
        $insert->close();

        if (!$isSaved) {
            // 若已經收藏過，則進行取消收藏 (刪除該筆 save 紀錄)
            $remove = $conn->prepare("DELETE FROM Public_Itinerary_Interaction WHERE Itinerary_ID = ? AND Account = ? AND Action_Type = 'save'");
            if (!$remove) throw new RuntimeException('無法取消收藏。');
            $remove->bind_param('is', $itineraryId, $account);
            if (!$remove->execute()) throw new RuntimeException('無法取消收藏。');
            $remove->close();
        }

        $conn->commit();
        $conn->close();
        invalidate_public_itinerary_cache();
        api_json(['status' => 'success', 'isSaved' => $isSaved]);
    } catch (Throwable $error) {
        $conn->rollback();
        $conn->close();
        api_error($error->getMessage(), 500);
    }
}

/**
 * action=copy：複製公開行程及其細項到指定帳號，更新複製次數。
 * 來源：copy_public_itinerary.php；保留原本輸入欄位、交易與 JSON 回應格式。
 */
function destinations_copy_public_itinerary(): void
{
    require_once __DIR__ . '/../db_connect.php';

    $data = read_json_body();
    $sourceId = (int)($data->Itinerary_ID ?? 0);
    $account = trim((string)($data->Account ?? ''));
    if ($sourceId <= 0 || $account === '') api_error('缺少行程或使用者資料', 400);

    $sourceStmt = $conn->prepare('SELECT Itinerary_ID, Title, Start_Date, End_Date, Cover_Image, Dest_Lat, Dest_Lng FROM Itinerary WHERE Itinerary_ID = ? AND Is_Public = 1 LIMIT 1');
    if (!$sourceStmt) api_error('無法讀取公開行程', 500);
    $sourceStmt->bind_param('i', $sourceId);
    $sourceStmt->execute();
    $source = $sourceStmt->get_result()->fetch_assoc();
    $sourceStmt->close();
    if (!$source) api_error('找不到可複製的公開行程', 404);

    $conn->begin_transaction();
    try {
        $title = trim((string)($data->Title ?? '')) ?: $source['Title'] . '（複製）';
        $insertItinerary = $conn->prepare('INSERT INTO Itinerary (Account, Title, Start_Date, End_Date, Cover_Image, Dest_Lat, Dest_Lng, Is_Public, Copied_From_Itinerary_ID) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)');
        if (!$insertItinerary) throw new Exception('建立新行程失敗');
        $insertItinerary->bind_param('sssssddi', $account, $title, $source['Start_Date'], $source['End_Date'], $source['Cover_Image'], $source['Dest_Lat'], $source['Dest_Lng'], $sourceId);
        if (!$insertItinerary->execute()) throw new Exception('建立新行程失敗');
        $newItineraryId = $conn->insert_id;
        $insertItinerary->close();

        $copyItems = $conn->prepare('INSERT INTO Itinerary_Item (Itinerary_ID, Day_Number, Title, Start_Time, End_Time, Sort_Order, Latitude, Longitude) SELECT ?, Day_Number, Title, Start_Time, End_Time, Sort_Order, Latitude, Longitude FROM Itinerary_Item WHERE Itinerary_ID = ? ORDER BY Day_Number, Sort_Order');
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
}

// 網址 action 對應上面的功能函式；固定白名單避免任意函式被呼叫。
$handlers = [
    'list' => 'destinations_list_public_itineraries', // 搜尋、篩選、排序公開行程；優先讀取快取，未命中才連資料庫。
    'preview' => 'destinations_get_public_itinerary_preview', // 讀取單一公開行程及每日地點，供公開預覽頁顯示。
    'mine' => 'destinations_get_publishable_itineraries', // 讀取指定帳號擁有、可管理公開設定的行程。
    'publish' => 'destinations_save_public_itinerary', // 設定公開資訊與標籤，或將行程下架；成功後清除公開列表快取。
    'view' => 'destinations_record_public_itinerary_view', // 以 Viewer_Key 去重後記錄瀏覽，必要時更新瀏覽數與快取。
    'like' => 'destinations_toggle_public_itinerary_like', // 切換公開行程按讚，更新按讚數及公開列表快取。
    'bookmark' => 'destinations_toggle_public_itinerary_save', // 切換指定帳號對公開行程的收藏狀態並清除快取。
    'copy' => 'destinations_copy_public_itinerary', // 複製公開行程及其細項到指定帳號，更新複製次數。
];
$action = $_GET['action'] ?? '';
if (!is_string($action) || !isset($handlers[$action])) api_error('無效的公開行程操作。', 400);
$handlers[$action]();
