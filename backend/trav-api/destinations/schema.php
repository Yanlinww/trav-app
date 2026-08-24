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
        "ALTER TABLE `Itinerary` ADD COLUMN `Like_Count` INT NOT NULL DEFAULT 0",
        "ALTER TABLE `Itinerary` ADD COLUMN `View_Count` INT NOT NULL DEFAULT 0",
        "ALTER TABLE `Itinerary` ADD INDEX `idx_itinerary_public_start` (`Is_Public`, `Start_Date`)",
        "ALTER TABLE `Itinerary` ADD INDEX `idx_itinerary_copied_from` (`Copied_From_Itinerary_ID`)",
        "ALTER TABLE `Itinerary_Item` ADD INDEX `idx_itinerary_item_public_lookup` (`Itinerary_ID`, `Day_Number`, `Sort_Order`)",
    ];

    foreach ($statements as $statement) {
        try { $conn->query($statement); } catch (Throwable $ignored) {}
    }

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
