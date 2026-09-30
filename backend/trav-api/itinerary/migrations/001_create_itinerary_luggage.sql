CREATE TABLE IF NOT EXISTS `Itinerary_Luggage` (
  `Itinerary_ID` INT NOT NULL,
  `Account` VARCHAR(100) NOT NULL,
  `Luggage_Data` LONGTEXT NULL,
  `Updated_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Itinerary_ID`, `Account`),
  INDEX `idx_itinerary_luggage_account` (`Account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
