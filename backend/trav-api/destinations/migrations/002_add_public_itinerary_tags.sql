CREATE TABLE IF NOT EXISTS `Public_Itinerary_Tag` (
  `Itinerary_ID` INT NOT NULL,
  `Tag` VARCHAR(50) NOT NULL,
  `Created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Itinerary_ID`, `Tag`),
  INDEX `idx_public_itinerary_tag` (`Tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
