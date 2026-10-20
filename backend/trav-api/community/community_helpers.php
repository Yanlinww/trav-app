<?php
/** 
 * ============================================================================
 * 模組：社群動態牆共用函式庫 (Community Helpers)
 * 功能：處理貼文 CRUD、留言、按讚、資料庫自動遷移、以及高效能的關聯資料撈取。
 * ============================================================================
 */

// 關閉原生錯誤輸出，統一由下方的 Exception Handler 攔截並轉成 JSON 回傳給前端
ini_set('display_errors', '0');
ini_set('html_errors', '0');

/**
 * 統一的 JSON 回傳介面，並設定 HTTP 狀態碼
 */
function community_json_response($payload, int$statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * 全域例外攔截器 (Exception Handler)
 * 只要程式拋出 throw new Exception，就會被這裡接住，並回傳 500 Error 給前端，避免畫面噴出醜陋的 PHP 報錯
 */
set_exception_handler(function (Throwable $error): void {
    community_json_response([
        'status' => 'error',
        'message' => $error->getMessage(),
    ], 500);
});

/**
 * 讀取前端傳來的 JSON Request Body
 */
function community_read_json(): object {
    $raw = file_get_contents('php://input');
    if (!$raw) return (object) [];
    $data = json_decode($raw);
    return is_object($data) ?$data : (object) [];
}

/**
 * 白名單檢查：限制貼文類型只能是 旅遊足跡(footprint)、提問(question)、揪團(group)
 */
function community_allowed_post_type(string $type): bool {
    return in_array($type, ['footprint', 'question', 'group'], true);
}

/**
 * 智慧獲取請求參數：優先找 JSON Body，找不到再找 GET 或 POST
 */
function community_get_request_value(object $data, string $key,$fallback = null) {
    if (isset($data->$key)) return $data->$key;
    return $_GET[$key] ?? $_POST[$key] ?? $fallback;
}

/**
 * 💡【高階技巧：動態綁定參數 Dynamic Bind Param】
 * 解決 mysqli_stmt 不支援直接傳入不定長度陣列的問題 (例如 WHERE ID IN (?, ?, ?))
 */
function community_bind_params(mysqli_stmt $stmt, string$types, array &$params): void {$refs = [];
    // MySQLi 要求 bind_param 必須使用「參照傳遞 (Reference &$value)」
    foreach ($params as$key => &$value) {$refs[$key] = &$value;
    }
    // 把型別字串 (例如 'ssiii') 塞到陣列的第一個位置
    array_unshift($refs,$types);
    // 用 ... 解構陣列傳入
    $stmt->bind_param(...$refs);
}

/**
 * ============================================================================
 * 資料庫結構自動確保函式 (Auto Schema Migration)
 * ============================================================================
 */
function community_ensure_tables(mysqli $conn): void {
    // 建立社群所需的 5 張核心資料表：貼文、圖片、標籤、留言、表情符號(按讚)
    $queries = [
        "CREATE TABLE IF NOT EXISTS `Community_Post` ( ...省略... ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",
        "CREATE TABLE IF NOT EXISTS `Community_Post_Image` ( ...省略... ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",
        "CREATE TABLE IF NOT EXISTS `Community_Post_Tag` ( ...省略... ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",
        "CREATE TABLE IF NOT EXISTS `Community_Comment` ( ...省略... ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",
        "CREATE TABLE IF NOT EXISTS `Community_Reaction` ( ...省略... ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",
    ];

    // 實作已在原始碼中，此處重點是確保編碼為 utf8mb4，這樣才能存 Emoji 表情符號！(例如 🌍✈️❤️)
    foreach ($queries as$query) {
        if (!$conn->query($query)) throw new RuntimeException($conn->error);
    }

    foreach (['Community_Post', 'Community_Post_Image', 'Community_Post_Tag', 'Community_Comment', 'Community_Reaction'] as $table) {$conn->query("ALTER TABLE `{$table}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
    }
}

/**
 * 取得發文者的基本資料 (名稱與大頭貼)
 */
function community_get_member_by_account(mysqli $conn, ?string $account): ?array { ... }

/**
 * 標籤正規化 (Tag Normalization)
 * 作用：清理前端傳來的 tag，去掉多餘的 # 字號、空白，限制最多 8 個標籤、每個標籤最長 40 字元
 */
function community_normalize_tags($tags): array { ... }

/**
 * 轉換成「相對時間」(例如：剛剛、5 分鐘前、2 小時前) 讓社群介面更人性化
 */
function community_time_ago(?string $datetime): string { ... }

/**
 * 處理網址，判斷是外部圖片、Base64 圖片，還是本機的相對路徑圖片
 */
function community_public_url(?string $path): ?string { ... }
function community_avatar_url(?string $path): string { ... }

/**
 * 單筆貼文的附屬資料撈取 (標籤、圖片、留言)
 */
function community_fetch_tags(mysqli $conn, int$postId): array { ... }
function community_fetch_images(mysqli $conn, int$postId): array { ... }
function community_fetch_comments(mysqli $conn, int$postId): array { ... }

/**
 * 將資料庫撈出來的單一 Row 格式化為前端 React 好懂的關聯陣列
 */
function community_format_post(mysqli $conn, array$row): array { ... }

/**
 * ============================================================================
 * 🌟【核心效能亮點：批次撈取貼文 (解決 N+1 Query)】
 * ============================================================================
 */
function community_fetch_posts_by_ids(mysqli $conn, array $postIds, string$viewerAccount = ''): array {
    // 1. 過濾 ID 陣列，確保裡面都是乾淨不重複的整數
    $postIds = array_values(array_unique(array_filter(array_map('intval',$postIds))));
    if (count($postIds) === 0) return [];

    // 2. 準備動態 IN 語句。如果有 3 篇貼文，就會產生 "?, ?, ?"
    $placeholders = implode(',', array_fill(0, count($postIds), '?'));
    $types = 'ss' . str_repeat('i', count($postIds));
    $params = array_merge([$viewerAccount, $viewerAccount],$postIds);

    // 3. 撈取【主要貼文資料】，並用 SubQuery 計算按讚數與留言數，以及檢查自己有沒有按讚/收藏
    $stmt =$conn->prepare(
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
    community_bind_params($stmt,$types, $params);$stmt->execute();
    $result =$stmt->get_result();

    $postsById = [];
    while ($row =$result->fetch_assoc()) {
        $postId = (int)$row['Post_ID'];
        // 先把基礎資料存進 Dictionary (以 Post_ID 為 Key)
        $postsById[$postId] = [ ...基礎資料格式化... ];
    }
    $stmt->close();

    // 💡【解決 N+1 Query 的關鍵作法】
    // ❌ 錯誤作法：跑 for 迴圈，針對每一篇貼文去資料庫下 SELECT 圖片。如果有 10 篇貼文，就會多出 10 次資料庫連線。
    // ✅ 正確作法：直接用 IN (?, ?, ?) 一次把這 10 篇貼文「所有」的圖片撈出來，再用 PHP 分發給對應的貼文。

    // 4. 批次撈取【標籤】
    $tagStmt =$conn->prepare("SELECT `Post_ID`, `Tag_Name` FROM `Community_Post_Tag` WHERE `Post_ID` IN ({$placeholders}) ORDER BY `Post_ID`, `Tag_Name`");
    community_bind_params($tagStmt, str_repeat('i', count($postIds)), $postIds);$tagStmt->execute();
    $tagResult =$tagStmt->get_result();
    while ($tag =$tagResult->fetch_assoc()) {
        if (isset($postsById[$tag['Post_ID']])) {$postsById[$tag['Post_ID']]['tags'][] =$tag['Tag_Name']; // 分發給對應的貼文
        }
    }
    $tagStmt->close();

    // 5. 批次撈取【圖片】
    $imageStmt =$conn->prepare("SELECT `Post_ID`, `Image_URL` FROM `Community_Post_Image` WHERE `Post_ID` IN ({$placeholders}) ORDER BY `Post_ID`, `Sort_Order`, `Image_ID`");
    community_bind_params($imageStmt, str_repeat('i', count($postIds)), $postIds);$imageStmt->execute();
    $imageResult =$imageStmt->get_result();
    while ($image =$imageResult->fetch_assoc()) {
        if (isset($postsById[$image['Post_ID']])) {$postsById[$image['Post_ID']]['images'][] = community_public_url($image['Image_URL']);
        }
    }
    $imageStmt->close();

    // 回傳乾淨的陣列列表
    return array_values($postsById);
}

/**
 * 撈取單一貼文詳細資料 (通常用於點進貼文詳細頁面時)
 */
function community_fetch_single_post(mysqli $conn, int $postId, string$viewerAccount = ''): ?array { ... }
?>