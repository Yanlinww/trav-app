CREATE TABLE IF NOT EXISTS `Itinerary_Places` (
  `Place_ID` BIGINT NOT NULL AUTO_INCREMENT,
  `Itinerary_ID` INT NOT NULL,
  `Google_Place_ID` VARCHAR(255) NOT NULL,
  `Name` VARCHAR(255) NOT NULL,
  `Address` VARCHAR(500) NULL,
  `Latitude` DECIMAL(10,7) NULL,
  `Longitude` DECIMAL(10,7) NULL,
  `Place_Data` LONGTEXT NULL,
  `Updated_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Place_ID`),
  UNIQUE KEY `uq_itinerary_google_place` (`Itinerary_ID`, `Google_Place_ID`),
  INDEX `idx_itinerary_places_itinerary` (`Itinerary_ID`),
  INDEX `idx_itinerary_places_google_id` (`Google_Place_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Itinerary_Place_Tags` (
  `Place_ID` BIGINT NOT NULL,
  `Tag` VARCHAR(50) NOT NULL,
  `Source` VARCHAR(30) NOT NULL DEFAULT 'user',
  `Confidence` DECIMAL(4,3) NULL,
  `Updated_By` VARCHAR(100) NULL,
  `Updated_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Place_ID`, `Tag`),
  INDEX `idx_place_tags_tag` (`Tag`),
  CONSTRAINT `fk_place_tags_place` FOREIGN KEY (`Place_ID`) REFERENCES `Itinerary_Places` (`Place_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
