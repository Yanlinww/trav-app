<?php
/** 
 * ============================================================================
 * 模組：公開行程的歷史資料表初始化與地點字串處理工具
 * 功能：
 * 1. 保留舊版建表／補欄位函式；目前程式沒有呼叫它，require 本檔不會執行 DDL。
 * 2. 清洗並標準化使用者輸入的「旅遊地點」字串。
 * ============================================================================
 */

/**
 * ============================================================================
 * 舊版資料庫初始化函式，只有明確呼叫才會執行 ALTER／UPDATE／CREATE。
 * 不先查欄位是否存在，而是嘗試執行 SQL；例外會被忽略，不能以正常返回判定結構已完整。
 * 這份定義仍建立舊 Like／Save 表；目前按讚與收藏使用 Public_Itinerary_Interaction，不能當作現行完整 migration。
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
        // 索引可支援公開狀態與日期條件；實際是否使用及效益須依資料量與查詢計畫判斷。
        "ALTER TABLE `Itinerary` ADD INDEX `idx_itinerary_public_start` (`Is_Public`, `Start_Date`)",
        "ALTER TABLE `Itinerary` ADD INDEX `idx_itinerary_public_updated` (`Is_Public`, `Public_Updated_At`)",
        // 為了快速抓出該行程每一天有哪些景點所建的索引
        "ALTER TABLE `Itinerary_Item` ADD INDEX `idx_itinerary_item_public_lookup` (`Itinerary_ID`, `Day_Number`, `Sort_Order`)",
    ];

    // 迴圈執行所有的 ALTER 語法
    foreach ($statements as$statement) {
        // 已有欄位／索引會報重複錯誤；此 catch 也會忽略權限、SQL 等其他例外。
        // 因此可繼續嘗試下一句，但不保證每句都成功，也不會修正既有欄位型別。
        try { $conn->query($statement); } catch (Throwable $ignored) {}
    }

    // 2. 歷史資料修復：如果有行程已經公開了，但沒有「公開時間」，就拿它的「出發日期」來墊檔
    try {
        $conn->query("UPDATE `Itinerary` SET `Public_Updated_At` = COALESCE(`Public_Updated_At`, `Start_Date`) WHERE `Is_Public` = 1 AND `Public_Updated_At` IS NULL");
    } catch (Throwable $ignored) {}

    // 3. 保留歷史 Like／Save 表設定；現行 like／save／view 均使用共用互動表。
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
        
        // 瀏覽已整合至 Public_Itinerary_Interaction，不再建立獨立瀏覽表。
        // 既有資料庫的結構更新由 destinations/migrations/unify_public_views.php 明確執行。
        
        // 建立【收藏紀錄表】
        // 舊版收藏結構；目前 bookmark action 不讀寫此表。CREATE IF NOT EXISTS 不會修改已有表。
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
