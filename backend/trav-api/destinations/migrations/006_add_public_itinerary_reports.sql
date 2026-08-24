CREATE TABLE IF NOT EXISTS `Public_Itinerary_Report` (
    `Report_ID` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Itinerary_ID` INT NOT NULL,
    `Reporter_Account` VARCHAR(100) NOT NULL,
    `Reason` VARCHAR(50) NOT NULL,
    `Details` VARCHAR(500) NULL,
    `Status` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `Created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Updated_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`Report_ID`),
    UNIQUE KEY `uq_public_itinerary_reporter` (`Itinerary_ID`, `Reporter_Account`),
    INDEX `idx_public_itinerary_report_status` (`Status`, `Created_At`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
