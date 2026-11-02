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
 * 固定台灣22縣市：與前端共用JSON清單，不接受任意文字或多地點組合。
 * 空字串代表選填，null代表非法值；相容臺／台及台中市、宜蘭縣等完整名稱。
 * 新竹與嘉義須選明確的縣或市，不自行猜測。
 */
function normalize_public_itinerary_location($rawLocation): ?string {
    if ($rawLocation === null) return '';
    if (!is_string($rawLocation)) return null;
    static $allowed = null;
    if ($allowed === null) {
        $groups = json_decode(file_get_contents(__DIR__ . '/taiwan_regions.json'), true, 512, JSON_THROW_ON_ERROR);
        $allowed = array_merge(...array_values($groups));
    }
    $clean = str_replace('臺', '台', trim($rawLocation));
    if ($clean === '' || in_array($clean, $allowed, true)) return $clean;
    $shortName = preg_replace('/[縣市]$/u', '', $clean);
    $cities = ['台北', '新北', '基隆', '桃園', '台中', '台南', '高雄'];
    $officialName = $shortName . (in_array($shortName, $cities, true) ? '市' : '縣');
    return !preg_match('/[縣市]$/u', $shortName) && $clean === $officialName && in_array($shortName, $allowed, true) ? $shortName : null;
}
