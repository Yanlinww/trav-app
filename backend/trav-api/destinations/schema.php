<?php

function ensure_destinations_schema(mysqli $conn): void {
    $statements = [
        "ALTER TABLE `Itinerary` ADD COLUMN `Is_Public` TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE `Itinerary` ADD COLUMN `Copied_From_Itinerary_ID` INT NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Copy_Count` INT NOT NULL DEFAULT 0",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Title` VARCHAR(255) NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Cover_Image` TEXT NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Description` TEXT NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Location` VARCHAR(150) NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Updated_At` DATETIME NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Moderation_Status` VARCHAR(30) NOT NULL DEFAULT 'active'",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Moderation_Note` VARCHAR(1000) NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Moderated_By` VARCHAR(100) NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Public_Moderated_At` DATETIME NULL",
        "ALTER TABLE `Itinerary` ADD COLUMN `Like_Count` INT NOT NULL DEFAULT 0",
        "ALTER TABLE `Itinerary` ADD COLUMN `View_Count` INT NOT NULL DEFAULT 0",
        "ALTER TABLE `Itinerary` ADD INDEX `idx_itinerary_public_start` (`Is_Public`, `Start_Date`)",
        "ALTER TABLE `Itinerary` ADD INDEX `idx_itinerary_public_updated` (`Is_Public`, `Public_Updated_At`)",
        "ALTER TABLE `Itinerary` ADD INDEX `idx_itinerary_copied_from` (`Copied_From_Itinerary_ID`)",
        "ALTER TABLE `Itinerary` ADD INDEX `idx_itinerary_public_moderation` (`Public_Moderation_Status`, `Is_Public`)",
        "ALTER TABLE `Itinerary_Item` ADD INDEX `idx_itinerary_item_public_lookup` (`Itinerary_ID`, `Day_Number`, `Sort_Order`)",
        "ALTER TABLE `Public_Itinerary_Report` ADD COLUMN `Admin_Note` VARCHAR(1000) NULL",
        "ALTER TABLE `Public_Itinerary_Report` ADD COLUMN `Reviewed_By` VARCHAR(100) NULL",
        "ALTER TABLE `Public_Itinerary_Report` ADD COLUMN `Reviewed_At` DATETIME NULL",
        "ALTER TABLE `Public_Itinerary_Report` ADD INDEX `idx_public_itinerary_report_review` (`Status`, `Updated_At`)",
    ];

    foreach ($statements as $statement) {
        try { $conn->query($statement); } catch (Throwable $ignored) {}
    }

    try {
        $conn->query("UPDATE `Itinerary` SET `Public_Updated_At` = COALESCE(`Public_Updated_At`, `Start_Date`) WHERE `Is_Public` = 1 AND `Public_Updated_At` IS NULL");
    } catch (Throwable $ignored) {}

    try {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `Public_Itinerary_Tag` (
                `Itinerary_ID` INT NOT NULL,
                `Tag` VARCHAR(50) NOT NULL,
                `Created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`Itinerary_ID`, `Tag`),
                INDEX `idx_public_itinerary_tag` (`Tag`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $ignored) {}

    try {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `Public_Itinerary_Like` (
                `Itinerary_ID` INT NOT NULL,
                `Account` VARCHAR(100) NOT NULL,
                `Created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`Itinerary_ID`, `Account`),
                INDEX `idx_public_itinerary_like_account` (`Account`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `Public_Itinerary_View` (
                `Itinerary_ID` INT NOT NULL,
                `Viewer_Key` VARCHAR(150) NOT NULL,
                `Viewed_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`Itinerary_ID`, `Viewer_Key`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `Public_Itinerary_Save` (
                `Itinerary_ID` INT NOT NULL,
                `Account` VARCHAR(100) NOT NULL,
                `Created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`Itinerary_ID`, `Account`),
                INDEX `idx_public_itinerary_save_account` (`Account`, `Created_At`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `Public_Itinerary_Report` (
                `Report_ID` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                `Itinerary_ID` INT NOT NULL,
                `Reporter_Account` VARCHAR(100) NOT NULL,
                `Reason` VARCHAR(50) NOT NULL,
                `Details` VARCHAR(500) NULL,
                `Status` VARCHAR(30) NOT NULL DEFAULT 'pending',
                `Admin_Note` VARCHAR(1000) NULL,
                `Reviewed_By` VARCHAR(100) NULL,
                `Reviewed_At` DATETIME NULL,
                `Created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `Updated_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`Report_ID`),
                UNIQUE KEY `uq_public_itinerary_reporter` (`Itinerary_ID`, `Reporter_Account`),
                INDEX `idx_public_itinerary_report_status` (`Status`, `Created_At`),
                INDEX `idx_public_itinerary_report_review` (`Status`, `Updated_At`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $ignored) {}

    try {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `Public_Itinerary_Moderation_Log` (
                `Log_ID` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                `Itinerary_ID` INT NOT NULL,
                `Report_ID` BIGINT UNSIGNED NULL,
                `Action` VARCHAR(50) NOT NULL,
                `Note` VARCHAR(1000) NOT NULL,
                `Admin_Account` VARCHAR(100) NOT NULL,
                `Created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`Log_ID`),
                INDEX `idx_public_itinerary_moderation_log_itinerary` (`Itinerary_ID`, `Created_At`),
                INDEX `idx_public_itinerary_moderation_log_report` (`Report_ID`, `Created_At`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $ignored) {}
}

function public_itinerary_tag_options(): array {
    return ['獨旅', '慢遊', '美食', '咖啡', '自然景點', '文化歷史', '親子', '寵物友善', '低預算'];
}

function normalize_public_itinerary_tags($rawTags): array {
    if (!is_array($rawTags)) return [];

    $allowed = array_flip(public_itinerary_tag_options());
    $tags = [];
    foreach ($rawTags as $tag) {
        if (!is_string($tag)) continue;
        $tag = trim($tag);
        if ($tag !== '' && isset($allowed[$tag])) $tags[$tag] = true;
    }

    return array_slice(array_keys($tags), 0, 5);
}

function normalize_public_itinerary_location($rawLocation): string {
    if (!is_string($rawLocation)) return '';

    $parts = preg_split('/[・|,，、\/／>＞]+/u', str_replace('臺', '台', trim($rawLocation))) ?: [];
    $locations = [];
    foreach ($parts as $part) {
        $part = preg_replace('/\s+/u', ' ', trim($part));
        if ($part !== '') $locations[$part] = true;
    }

    return implode('・', array_slice(array_keys($locations), 0, 4));
}
