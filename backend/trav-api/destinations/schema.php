<?php
/** 
 * ============================================================================
 * 模組：公開行程資料表初始化與字串處理工具
 * 功能：
 * 1. 自動檢查並補齊資料庫針對「公開行程 (目的地)」所需的新欄位與關聯表。
 * 2. 清洗並標準化使用者輸入的「旅遊地點」字串。
 * ============================================================================
 */

/**
 * ============================================================================
 * 資料庫結構自動確保函式 (Auto Schema Migration)
 * 作用：當這支 API 被呼叫時，會自動檢查資料庫有沒有缺欄位。如果有缺，就自動幫你 CREATE 或 ALTER。
 * 好處：你在部屬到新伺服器，或是給教授看專題時，不用手動去 phpMyAdmin 慢慢加欄位。
 * ============================================================================
 */
function ensure_destinations_schema(mysqli $conn): void {
    // 1. 準備一系列的 ALTER TABLE 語法，幫原本的 Itinerary 表格擴充「社群功能」需要的欄位
    $statements = [
        // 是否公開、被複製次數
        "ALTER TABLE `Itinerary` ADD COLUMN `Is_Public` TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE `Itinerary` ADD COLUMN `Copy_Count` INT NOT NULL DEFAULT 0",
        // 公開時的展示資訊 (標題、封面圖、描述、地點、更新時間)
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Title` VARCHAR(255) NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Cover_Image` TEXT NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Description` TEXT NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Location` VARCHAR(150) NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Updated_At` DATETIME NULL",
        // 社群互動數據 (按讚數、瀏覽數)
        "ALTER TABLE `Itinerary` ADD COLUMN `Like_Count` INT NOT NULL DEFAULT 0",
        "ALTER TABLE `Itinerary` ADD COLUMN `View_Count` INT NOT NULL DEFAULT 0",
        
        // 💡【效能優化：建立索引 Index】
        // 因為首頁會大量撈取「已公開」且「最新更新」的行程，針對這些欄位建立索引，可以讓資料庫查詢速度快上百倍
        "ALTER TABLE `Itinerary` ADD INDEX `idx_itinerary_public_start` (`Is_Public`, `Start_Date`)",
        "ALTER TABLE `Itinerary` ADD INDEX `idx_itinerary_public_updated` (`Is_Public`, `Public_Updated_At`)",
        // 為了快速抓出該行程每一天有哪些景點所建的索引
        "ALTER TABLE `Itinerary_Item` ADD INDEX `idx_itinerary_item_public_lookup` (`Itinerary_ID`, `Day_Number`, `Sort_Order`)",
    ];

    // 迴圈執行所有的 ALTER 語法
    foreach ($statements as$statement) {
        // 💡【防錯機制】
        // 為什麼要用 try-catch 並且把錯誤吃掉 ($ignored)？
        // 因為如果這個欄位「已經存在」了，MySQL 會報錯。我們把錯誤吃掉，程式就不會死掉。
        // 這樣這支函式不管執行幾百次都是安全的 (冪等性)。
        try { $conn->query($statement); } catch (Throwable $ignored) {}
    }

    // 2. 歷史資料修復：如果有行程已經公開了，但沒有「公開時間」，就拿它的「出發日期」來墊檔
    try {
        $conn->query("UPDATE `Itinerary` SET `Public_Updated_At` = COALESCE(`Public_Updated_At`, `Start_Date`) WHERE `Is_Public` = 1 AND `Public_Updated_At` IS NULL");
    } catch (Throwable $ignored) {}

    // 3. 自動建立社群互動的三張附屬資料表：按讚、瀏覽紀錄、收藏
    try {
        // 建立【按讚紀錄表】
        // 複合主鍵 (PRIMARY KEY): 確保同一個 Account 對同一個 Itinerary 只能按一次讚
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `Public_Itinerary_Like` (
                `Itinerary_ID` INT NOT NULL,
                `Account` VARCHAR(100) NOT NULL,
                `Created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`Itinerary_ID`, `Account`),
                INDEX `idx_public_itinerary_like_account` (`Account`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        
        // 建立【瀏覽紀錄表】
        // 注意這裡用的是 Viewer_Key (可能是 IP + UserAgent 等組合)，因為訪客(沒登入)也能瀏覽，這樣才能計算不重複觀看數
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `Public_Itinerary_View` (
                `Itinerary_ID` INT NOT NULL,
                `Viewer_Key` VARCHAR(150) NOT NULL,
                `Viewed_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`Itinerary_ID`, `Viewer_Key`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        
        // 建立【收藏紀錄表】
        // 讓使用者可以把別人的公開行程收藏到自己的清單中
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `Public_Itinerary_Save` (
                `Itinerary_ID` INT NOT NULL,
                `Account` VARCHAR(100) NOT NULL,
                `Created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`Itinerary_ID`, `Account`),
                INDEX `idx_public_itinerary_save_account` (`Account`, `Created_At`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $ignored) {}
}

/**
 * ============================================================================
 * 字串清理函式：正規化公開行程的地點 (Normalize Location)
 * 作用：使用者輸入的旅遊地點可能很亂（例如：「臺北/宜蘭, 花蓮 > 台東」）
 * 此函式會把它清洗成乾淨統一的格式：「台北・宜蘭・花蓮・台東」
 * ============================================================================
 */
function normalize_public_itinerary_location($rawLocation): string {
    // 防呆：如果傳進來的不是字串，直接回傳空字串
    if (!is_string($rawLocation)) return '';

    // 1. 字元替換：統一將正體字的「臺」換成常用的「台」，並去除前後空白
    $cleanString = str_replace('臺', '台', trim($rawLocation));

    // 2. 切割字串：使用正則表達式 (Regular Expression)
    // 遇到 [・ | , ， 、 / ／ > ＞] 這些符號時，就把它切斷成陣列
    // /u 代表支援 UTF-8 (多位元組中文字)
    $parts = preg_split('/[・|,，、\/／>＞]+/u', $cleanString) ?: [];$locations = [];
    foreach ($parts as$part) {
        // 3. 去除多餘空白：把字串內部多個連續空白替換成一個單一空白
        $part = preg_replace('/\s+/u', ' ', trim($part));
        
        // 4. 去除重複：利用陣列的 Key 不能重複的特性，自動過濾掉重複的地點 (例如使用者打：台北,台北)
        if ($part !== '') {
            $locations[$part] = true;
        }
    }

    // 5. 組合結果：只取前 4 個地點 (避免畫面塞不下)，並用全形的「・」串接起來
    return implode('・', array_slice(array_keys($locations), 0, 4));
}