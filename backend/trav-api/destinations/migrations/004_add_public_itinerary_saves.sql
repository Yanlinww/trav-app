CREATE TABLE IF NOT EXISTS `Public_Itinerary_Save` (
  `Itinerary_ID` INT NOT NULL,
  `Account` VARCHAR(100) NOT NULL,
  `Created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Itinerary_ID`, `Account`),
  INDEX `idx_public_itinerary_save_account` (`Account`, `Created_At`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
