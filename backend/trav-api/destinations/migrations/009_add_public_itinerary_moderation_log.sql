CREATE TABLE IF NOT EXISTS `Public_Itinerary_Moderation_Log` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
