<?php
/**
 * ============================================================================
 * 模組：社群動態牆共用函式庫 (Community Helpers)
 * 提供 JSON 回應、參數處理、資料表建立、貼文與留言查詢及前端資料格式轉換。
 * 本檔由 community.php 載入；發文、互動等 action 分派與寫入流程放在入口檔。
 * 建議閱讀：回應與輸入工具 → 資料表定義 → 單筆資料工具 → 批次貼文查詢。
 * 除載入時設定錯誤處理外，函式須由呼叫端執行才會查詢或修改資料庫結構。
 * ============================================================================
 */

// 執行階段例外交由下方 handler 統一回應 JSON；本檔仍必須先通過 PHP 語法解析。
ini_set('display_errors', '0');
ini_set('html_errors', '0');

/**
 * 統一的 JSON 回傳介面，並設定 HTTP 狀態碼
 * $payload 是要編碼的資料，$statusCode 預設為成功狀態 200。
 * JSON_UNESCAPED_UNICODE 保留中文字，避免轉成 Unicode 跳脫表示。
 * exit 會結束請求，因此入口呼叫它後不會再繼續輸出其他資料。
 * 此函式沒有自行設定 Content-Type，回應標頭須由入口／其他共用設定負責。
 */
function community_json_response($payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit();
}

// 未處理的執行階段例外回傳 HTTP 500 與 JSON 錯誤內容。
set_exception_handler(function (Throwable $error): void {
    community_json_response([
        'status' => 'error',
        'message' => $error->getMessage(),
    ], 500);
});

/**
 * 讀取前端傳來的 JSON Request Body
 * php://input 是原始請求內容，不是 $_POST 中已解析的表單欄位。
 * json_decode 不傳 true，因此 JSON 物件以 $data->欄位 存取。
 * 空內容、解析失敗或非物件資料都回傳空物件；此處不主動回 HTTP 400。
 */
function community_read_json(): object
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return (object) [];
    }

    $data = json_decode($raw);
    return is_object($data) ? $data : (object) [];
}

/**
 * 白名單檢查：限制貼文類型只能是 旅遊足跡(footprint)、提問(question)、揪團(group)
 * 回傳布林值供入口決定是否拒絕請求；本函式本身不輸出錯誤。
 * in_array 的 true 要求嚴格比對，不能用其他型別的值混過檢查。
 */
function community_allowed_post_type(string $type): bool
{
    return in_array($type, ['footprint', 'question', 'group'], true);
}

/**
 * 智慧獲取請求參數：優先找 JSON Body，找不到再找 GET 或 POST
 * 優先序：JSON 物件 → URL 查詢參數 → 表單參數 → $fallback。
 * isset 與 ?? 將 null 視為未提供，但 0、false、空字串仍會保留。
 * 此處只找值，不做型別、長度或權限驗證，呼叫端仍須檢查內容。
 */
function community_get_request_value(object $data, string $key, $fallback = null)
{
    if (isset($data->$key)) {
        return $data->$key;
    }

    return $_GET[$key] ?? $_POST[$key] ?? $fallback;
}

/**
 * 動態參數綁定：配合 IN (?, ?, ?) 等數量會改變的查詢。
 * $types 每個字元對應一個值：s=字串、i=整數；數量須與 SQL 的 ? 一致。
 * &$params 及迴圈中的 &$value 建立參照，符合 bind_param 的參數要求。
 * 例如 types='sii'、params=['viewer', 3, 8]，會轉成 bind_param('sii', ...)。
 * ...$refs 是實際的 PHP 參數展開語法，和用來省略實作的佔位文字不同。
 */
function community_bind_params(mysqli_stmt $stmt, string $types, array &$params): void
{
    // bind_param 需要參照參數，建立參照陣列後再展開傳入。
    $refs = [];
    foreach ($params as $key => &$value) {
        $refs[$key] = &$value;
    }

    array_unshift($refs, $types);
    $stmt->bind_param(...$refs);
}

/**
 * ============================================================================
 * 資料庫結構自動確保函式 (Auto Schema Migration)
 * 定義五張表：貼文、圖片、標籤、留言、互動；以 Post_ID 連結相關資料。
 * CREATE TABLE IF NOT EXISTS 只在表不存在時建立，不會替既有表補齊缺少欄位。
 * 下方 ALTER 會轉換既有表的字元集與排序規則，呼叫本函式會實際執行 DDL。
 * 入口目前在發文流程呼叫；一般載入此檔案不會自動呼叫本函式。
 * utf8mb4 可儲存 Emoji；utf8mb4_0900_ai_ci 仍需資料庫版本支援。
 * ============================================================================
 */
function community_ensure_tables(mysqli $conn): void
{
    // 保留完整欄位、主鍵與索引定義；省略文字不能當成可執行的 SQL。
    $queries = [
        // 貼文主表：保存作者、內容與狀態；複合索引支援類型及建立時間的查詢。
        "CREATE TABLE IF NOT EXISTS `Community_Post` (
            `Post_ID` INT NOT NULL AUTO_INCREMENT,
            `Account` VARCHAR(50) NOT NULL,
            `Post_Type` VARCHAR(20) NOT NULL DEFAULT 'footprint',
            `Title` VARCHAR(120) NULL,
            `Content` TEXT NOT NULL,
            `Location_Name` VARCHAR(100) NULL,
            `Location_Coordinates` VARCHAR(100) NULL,
            `Itinerary_ID` VARCHAR(50) NULL,
            `Status` VARCHAR(20) NOT NULL DEFAULT 'active',
            `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `Updated_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`Post_ID`),
            INDEX `idx_community_post_account` (`Account`),
            INDEX `idx_community_post_type_created` (`Post_Type`, `Created_At`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",

        // 一篇貼文可有多張圖；Sort_Order 控制圖片顯示順序，Image_ID 用來打破同序平手。
        "CREATE TABLE IF NOT EXISTS `Community_Post_Image` (
            `Image_ID` INT NOT NULL AUTO_INCREMENT,
            `Post_ID` INT NOT NULL,
            `Image_URL` VARCHAR(255) NOT NULL,
            `Sort_Order` INT NOT NULL DEFAULT 0,
            `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`Image_ID`),
            INDEX `idx_community_image_post` (`Post_ID`, `Sort_Order`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",

        // 複合主鍵避免同一貼文重複儲存相同標籤；標籤索引用於搜尋相關貼文。
        "CREATE TABLE IF NOT EXISTS `Community_Post_Tag` (
            `Post_ID` INT NOT NULL,
            `Tag_Name` VARCHAR(40) NOT NULL,
            PRIMARY KEY (`Post_ID`, `Tag_Name`),
            INDEX `idx_community_tag_name` (`Tag_Name`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",

        // Parent_Comment_ID 為回覆對象，null 表示頂層留言；樹狀顯示由前端依此組合。
        "CREATE TABLE IF NOT EXISTS `Community_Comment` (
            `Comment_ID` INT NOT NULL AUTO_INCREMENT,
            `Post_ID` INT NOT NULL,
            `Account` VARCHAR(50) NOT NULL,
            `Parent_Comment_ID` INT NULL,
            `Content` TEXT NOT NULL,
            `Status` VARCHAR(20) NOT NULL DEFAULT 'active',
            `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `Updated_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`Comment_ID`),
            INDEX `idx_community_comment_post` (`Post_ID`, `Created_At`),
            INDEX `idx_community_comment_account` (`Account`),
            INDEX `idx_community_comment_parent` (`Parent_Comment_ID`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",

        // 主鍵包含互動種類，讓同一帳號可同時對貼文按讚與收藏，但各自不可重複。
        "CREATE TABLE IF NOT EXISTS `Community_Reaction` (
            `Post_ID` INT NOT NULL,
            `Account` VARCHAR(50) NOT NULL,
            `Reaction_Type` VARCHAR(20) NOT NULL,
            `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`Post_ID`, `Account`, `Reaction_Type`),
            INDEX `idx_community_reaction_account` (`Account`, `Reaction_Type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",
    ];

    // 逐一執行完整 SQL；失敗時交由例外處理回應，並非整批包在單一交易中。
    foreach ($queries as $query) {
        if (!$conn->query($query)) {
            throw new RuntimeException($conn->error);
        }
    }

    foreach (['Community_Post', 'Community_Post_Image', 'Community_Post_Tag', 'Community_Comment', 'Community_Reaction'] as $table) {
        $conn->query("ALTER TABLE `{$table}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
    }
}

/**
 * 取得發文者的基本資料 (名稱與大頭貼)
 * 帳號為空直接回 null，不送出查詢；查無會員也以 null 表示。
 * 只讀取三個公開顯示欄位，不把整份會員資料回傳給呼叫端。
 */
function community_get_member_by_account(mysqli $conn, ?string $account): ?array
{
    if (!$account) {
        return null;
    }

    $stmt = $conn->prepare("SELECT `Account`, `Name`, `Avatar` FROM `Member` WHERE `Account` = ? LIMIT 1");
    $stmt->bind_param('s', $account);
    $stmt->execute();
    $member = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $member ?: null;
}

/**
 * 標籤正規化 (Tag Normalization)
 * 作用：清理前端傳來的 tag，去掉多餘的 # 字號、空白，限制最多 8 個標籤、每個標籤最長 40 字元
 * 支援陣列、JSON 陣列字串，或以逗號、#、空白分隔的一般字串。
 * 先 trim 再去掉開頭 #，去重後保留原順序；不會額外合併大小寫。
 * 有 mb_substr 時按 40 字元截斷；缺少擴充時退回 120 位元組，兩者不完全等價。
 */
function community_normalize_tags($tags): array
{
    if (is_string($tags)) {
        // 先嘗試解析 '["台北","旅行"]'；不是陣列格式時再按分隔符切字串。
        $decoded = json_decode($tags, true);
        $tags = is_array($decoded) ? $decoded : preg_split('/[,，#\s]+/u', $tags);
    }

    if (!is_array($tags)) {
        return [];
    }

    $normalized = [];
    foreach ($tags as $tag) {
        $clean = trim((string) $tag);
        $clean = preg_replace('/^#+/u', '', $clean);
        $clean = function_exists('mb_substr') ? mb_substr($clean, 0, 40) : substr($clean, 0, 120);

        // 只加入非空且尚未存在的值；達到八個後即停止處理剩下的輸入。
        if ($clean !== '' && !in_array($clean, $normalized, true)) {
            $normalized[] = $clean;
        }

        if (count($normalized) >= 8) {
            break;
        }
    }

    return $normalized;
}

/**
 * 轉換成「相對時間」(例如：剛剛、5 分鐘前、2 小時前) 讓社群介面更人性化
 * strtotime 解析失敗時保留原字串；有效時間以伺服器目前時間計算秒差。
 * 一週內依秒差顯示分鐘／小時／天，一週以上顯示 YYYY/MM/DD。
 * 日期解析與輸出依 PHP 時區設定；此函式沒有自行指定時區。
 */
function community_time_ago(?string $datetime): string
{
    if (!$datetime) {
        return '';
    }

    $timestamp = strtotime($datetime);
    if (!$timestamp) {
        return $datetime;
    }

    $diff = time() - $timestamp;
    if ($diff < 60) {
        return '剛剛';
    }
    if ($diff < 3600) {
        return floor($diff / 60) . ' 分鐘前';
    }
    if ($diff < 86400) {
        return floor($diff / 3600) . ' 小時前';
    }
    if ($diff < 604800) {
        return floor($diff / 86400) . ' 天前';
    }

    return date('Y/m/d', $timestamp);
}

/**
 * 處理網址，判斷是外部圖片、Base64 圖片，還是本機的相對路徑圖片
 * 空來源回 null；data:image 與 http/https 網址原樣保留。
 * 其餘內容去除開頭斜線，再接上同源的 /backend/ 前綴，交由前端代理轉送。
 * 這是顯示用的來源轉換，不會讀檔、上傳圖片或驗證網址是否可連線。
 */
function community_public_url(?string $path): ?string
{
    if (!$path) {
        return null;
    }

    if (preg_match('/^data:image\//i', $path)) {
        return $path;
    }

    if (preg_match('/^https?:\/\//i', $path)) {
        return $path;
    }

    return '/backend/' . ltrim($path, '/');
}

/**
 * 頭像專用轉換：與一般圖片不同，data URL 在此回空字串以減少列表回應大小。
 * 空字串供前端顯示姓名首字等備用樣式；不會在這裡搬移或刪除原頭像資料。
 */
function community_avatar_url(?string $path): string
{
    // 會員頭像若以 data URL 儲存，會在每一則貼文與留言中重複傳送數 MB 資料。
    // 動態牆先使用姓名首字，直到既有頭像遷移為實際檔案 URL。
    if (!$path || preg_match('/^data:image\//i', $path)) {
        return '';
    }

    return community_public_url($path) ?: '';
}

/**
 * 讀取單筆貼文的標籤，依名稱排序，回傳字串陣列；沒有標籤則為 []。
 * 供單筆詳細資料使用；大量貼文列表改走下方的批次查詢。
 */
function community_fetch_tags(mysqli $conn, int $postId): array
{
    $stmt = $conn->prepare("SELECT `Tag_Name` FROM `Community_Post_Tag` WHERE `Post_ID` = ? ORDER BY `Tag_Name` ASC");
    $stmt->bind_param('i', $postId);
    $stmt->execute();
    $result = $stmt->get_result();

    $tags = [];
    while ($row = $result->fetch_assoc()) {
        $tags[] = $row['Tag_Name'];
    }

    $stmt->close();
    return $tags;
}

/**
 * 讀取單筆貼文的圖片，按 Sort_Order、Image_ID 排序後回傳來源陣列。
 * 每筆來源經 community_public_url 轉換，保留前端可直接使用的網址格式。
 */
function community_fetch_images(mysqli $conn, int $postId): array
{
    $stmt = $conn->prepare("SELECT `Image_URL` FROM `Community_Post_Image` WHERE `Post_ID` = ? ORDER BY `Sort_Order` ASC, `Image_ID` ASC");
    $stmt->bind_param('i', $postId);
    $stmt->execute();
    $result = $stmt->get_result();

    $images = [];
    while ($row = $result->fetch_assoc()) {
        $images[] = community_public_url($row['Image_URL']);
    }

    $stmt->close();
    return $images;
}

/**
 * 讀取貼文內狀態為 active 的留言，JOIN Member 取得顯示名稱與頭像。
 * 結果是按建立時間排序的平面陣列，parentId 讓前端辨識留言之間的回覆關係。
 * INNER JOIN 只保留找得到對應會員的留言；不是另外查詢每位留言者。
 */
function community_fetch_comments(mysqli $conn, int $postId): array
{
    $stmt = $conn->prepare(
        "SELECT c.`Comment_ID`, c.`Parent_Comment_ID`, c.`Content`, c.`Created_At`, m.`Account`, m.`Name`, m.`Avatar`
         FROM `Community_Comment` c
         INNER JOIN `Member` m ON m.`Account` = c.`Account`
         WHERE c.`Post_ID` = ? AND c.`Status` = 'active'
         ORDER BY c.`Created_At` ASC"
    );
    $stmt->bind_param('i', $postId);
    $stmt->execute();
    $result = $stmt->get_result();

    $comments = [];
    while ($row = $result->fetch_assoc()) {
        $comments[] = [
            'id' => (int) $row['Comment_ID'],
            'parentId' => $row['Parent_Comment_ID'] ? (int) $row['Parent_Comment_ID'] : null,
            'account' => $row['Account'], // 提供作者識別與個人頁連結，不以顯示名稱當唯一識別。
            'author' => $row['Name'] ?: $row['Account'],
            'avatar' => community_avatar_url($row['Avatar'] ?? ''),
            'content' => $row['Content'],
            'createdAt' => $row['Created_At'],
            'time' => community_time_ago($row['Created_At']),
        ];
    }

    $stmt->close();
    return $comments;
}

/**
 * 將資料庫撈出來的單一 Row 格式化為前端 React 好懂的關聯陣列
 * 呼叫端須提供貼文、作者及查詢算出的互動欄位；數量轉整數、個人狀態轉布林值。
 * 此函式會再查標籤、圖片與留言，因此適合單筆詳情，不要在列表逐筆呼叫。
 * likes/commentCount 是總數，liked/saved 是該次查詢指定觀看者的狀態。
 */
function community_format_post(mysqli $conn, array $row): array
{
    $postId = (int) $row['Post_ID'];

    return [
        'id' => $postId,
        'type' => $row['Post_Type'],
        'title' => $row['Title'],
        'content' => $row['Content'],
        'location' => $row['Location_Name'],
        'locationCoordinates' => $row['Location_Coordinates'],
        'createdAt' => $row['Created_At'],
        'time' => community_time_ago($row['Created_At']),
        'author' => [
            'account' => $row['Account'],
            'name' => $row['Name'] ?: $row['Account'],
            'avatar' => community_avatar_url($row['Avatar'] ?? ''),
        ],
        'tags' => community_fetch_tags($conn, $postId),
        'images' => community_fetch_images($conn, $postId),
        'likes' => (int) ($row['Like_Count'] ?? 0),
        'commentCount' => (int) ($row['Comment_Count'] ?? 0),
        'liked' => (bool) ($row['User_Liked'] ?? 0),
        'saved' => (bool) ($row['User_Saved'] ?? 0),
        'comments' => community_fetch_comments($conn, $postId),
    ];
}

/**
 * ============================================================================
 * 🌟【核心效能亮點：批次撈取貼文 (解決 N+1 Query)】
 * 輸入：貼文 ID 陣列及觀看者帳號；空 ID 陣列直接回 []。
 * 主查詢一次取回多篇貼文與互動欄位，再各查一次標籤及圖片，合計三次主要查詢。
 * 每篇貼文以 ID 作為暫存 key，將後兩次查詢的結果分配到對應貼文。
 * 不預載留言內容，展開留言時由入口另行讀取；仍保留留言總數供列表顯示。
 * 查詢結果按建立時間與 ID 倒序，不保證與輸入 ID 陣列的排列一致。
 * ============================================================================
 */
function community_fetch_posts_by_ids(mysqli $conn, array $postIds, string $viewerAccount = ''): array
{
    // 正規化 ID 後，以同一批 ID 一次查主資料、一次查標籤、一次查圖片。
    $postIds = array_values(array_unique(array_filter(array_map('intval', $postIds))));
    if (count($postIds) === 0) {
        return [];
    }

    // 三個 ID 會產生 '?,?,?'；只拼接佔位符，真正的值交給參數綁定。
    $placeholders = implode(',', array_fill(0, count($postIds), '?'));
    // 前兩個 s 對應觀看者的按讚／收藏檢查，後面的 i 才對應 IN 中的貼文 ID。
    $types = 'ss' . str_repeat('i', count($postIds));
    $params = array_merge([$viewerAccount, $viewerAccount], $postIds);

    // COUNT 子查詢產生總數，EXISTS 產生觀看者狀態；仍在同一次 SQL 請求內執行。
    $stmt = $conn->prepare(
        "SELECT p.*, m.`Account`, m.`Name`, m.`Avatar`,
            (SELECT COUNT(*) FROM `Community_Reaction` r WHERE r.`Post_ID` = p.`Post_ID` AND r.`Reaction_Type` = 'like') AS `Like_Count`,
            (SELECT COUNT(*) FROM `Community_Comment` c WHERE c.`Post_ID` = p.`Post_ID` AND c.`Status` = 'active') AS `Comment_Count`,
            EXISTS(SELECT 1 FROM `Community_Reaction` ur WHERE ur.`Post_ID` = p.`Post_ID` AND ur.`Account` = ? AND ur.`Reaction_Type` = 'like') AS `User_Liked`,
            EXISTS(SELECT 1 FROM `Community_Reaction` sr WHERE sr.`Post_ID` = p.`Post_ID` AND sr.`Account` = ? AND sr.`Reaction_Type` = 'save') AS `User_Saved`
         FROM `Community_Post` p
         INNER JOIN `Member` m ON m.`Account` = p.`Account`
         WHERE p.`Post_ID` IN ({$placeholders}) AND p.`Status` = 'active'
         ORDER BY p.`Created_At` DESC, p.`Post_ID` DESC"
    );
    if (!$stmt) {
        throw new RuntimeException('無法讀取動態貼文。');
    }
    community_bind_params($stmt, $types, $params);
    $stmt->execute();
    $result = $stmt->get_result();

    // 例如 postsById[42] 保存 ID=42 的完整顯示資料，方便後續直接找到對應貼文。
    $postsById = [];
    while ($row = $result->fetch_assoc()) {
        $postId = (int) $row['Post_ID'];
        $postsById[$postId] = [
            'id' => $postId,
            'type' => $row['Post_Type'],
            'title' => $row['Title'],
            'content' => $row['Content'],
            'location' => $row['Location_Name'],
            'locationCoordinates' => $row['Location_Coordinates'],
            'createdAt' => $row['Created_At'],
            'time' => community_time_ago($row['Created_At']),
            'author' => [
                'account' => $row['Account'],
                'name' => $row['Name'] ?: $row['Account'],
                'avatar' => community_avatar_url($row['Avatar'] ?? ''),
            ],
            'tags' => [],
            'images' => [],
            'likes' => (int) ($row['Like_Count'] ?? 0),
            'commentCount' => (int) ($row['Comment_Count'] ?? 0),
            'liked' => (bool) ($row['User_Liked'] ?? 0),
            'saved' => (bool) ($row['User_Saved'] ?? 0),
            // 首頁不預載留言；展開時由 community.php?action=comments 載入。
            'comments' => [],
        ];
    }
    $stmt->close();

    // 標籤查詢只有貼文 ID，不需要觀看者，所以型別與參數另外建立。
    $tagStmt = $conn->prepare("SELECT `Post_ID`, `Tag_Name` FROM `Community_Post_Tag` WHERE `Post_ID` IN ({$placeholders}) ORDER BY `Post_ID`, `Tag_Name`");
    if (!$tagStmt) {
        throw new RuntimeException('無法讀取貼文標籤。');
    }
    // 維持批次查詢，避免隨貼文數量增加而逐筆查詢標籤。
    $tagTypes = str_repeat('i', count($postIds));
    $tagParams = $postIds;
    community_bind_params($tagStmt, $tagTypes, $tagParams);
    $tagStmt->execute();
    $tagResult = $tagStmt->get_result();
    while ($tag = $tagResult->fetch_assoc()) {
        $postId = (int) $tag['Post_ID'];
        if (isset($postsById[$postId])) {
            $postsById[$postId]['tags'][] = $tag['Tag_Name'];
        }
    }
    $tagStmt->close();

    $imageStmt = $conn->prepare("SELECT `Post_ID`, `Image_URL` FROM `Community_Post_Image` WHERE `Post_ID` IN ({$placeholders}) ORDER BY `Post_ID`, `Sort_Order`, `Image_ID`");
    if (!$imageStmt) {
        throw new RuntimeException('無法讀取貼文圖片。');
    }
    // 圖片依貼文 ID 分發回陣列，保留原始排序。
    $imageTypes = str_repeat('i', count($postIds));
    $imageParams = $postIds;
    community_bind_params($imageStmt, $imageTypes, $imageParams);
    $imageStmt->execute();
    $imageResult = $imageStmt->get_result();
    while ($image = $imageResult->fetch_assoc()) {
        $postId = (int) $image['Post_ID'];
        if (isset($postsById[$postId])) {
            $postsById[$postId]['images'][] = community_public_url($image['Image_URL']);
        }
    }
    $imageStmt->close();

    // 去掉暫存用的 ID key，讓 JSON 編碼為連續陣列，方便前端使用 map 顯示。
    return array_values($postsById);
}

/**
 * 撈取單一貼文詳細資料 (通常用於點進貼文詳細頁面時)
 * 入口也會在建立貼文後呼叫它，回傳可立即顯示的完整貼文資料。
 * 以 ID 查一篇 active 貼文，帶入觀看者兩次以計算 liked/saved。
 * 查到後交給 community_format_post 補標籤、圖片與留言；查無資料回 null。
 */
function community_fetch_single_post(mysqli $conn, int $postId, string $viewerAccount = ''): ?array
{
    $stmt = $conn->prepare(
        "SELECT p.*, m.`Account`, m.`Name`, m.`Avatar`,
            (SELECT COUNT(*) FROM `Community_Reaction` r WHERE r.`Post_ID` = p.`Post_ID` AND r.`Reaction_Type` = 'like') AS `Like_Count`,
            (SELECT COUNT(*) FROM `Community_Comment` c WHERE c.`Post_ID` = p.`Post_ID` AND c.`Status` = 'active') AS `Comment_Count`,
            EXISTS(SELECT 1 FROM `Community_Reaction` ur WHERE ur.`Post_ID` = p.`Post_ID` AND ur.`Account` = ? AND ur.`Reaction_Type` = 'like') AS `User_Liked`,
            EXISTS(SELECT 1 FROM `Community_Reaction` sr WHERE sr.`Post_ID` = p.`Post_ID` AND sr.`Account` = ? AND sr.`Reaction_Type` = 'save') AS `User_Saved`
         FROM `Community_Post` p
         INNER JOIN `Member` m ON m.`Account` = p.`Account`
         WHERE p.`Post_ID` = ? AND p.`Status` = 'active'
         LIMIT 1"
    );
    $stmt->bind_param('ssi', $viewerAccount, $viewerAccount, $postId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ? community_format_post($conn, $row) : null;
}
