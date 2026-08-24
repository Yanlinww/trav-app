ALTER TABLE `Itinerary`
  ADD COLUMN `Public_Location` VARCHAR(150) NULL,
  ADD COLUMN `Like_Count` INT NOT NULL DEFAULT 0,
  ADD COLUMN `View_Count` INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS `Public_Itinerary_Like` (
  `Itinerary_ID` INT NOT NULL,
  `Account` VARCHAR(100) NOT NULL,
  `Created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Itinerary_ID`, `Account`),
  INDEX `idx_public_itinerary_like_account` (`Account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Public_Itinerary_View` (
  `Itinerary_ID` INT NOT NULL,
  `Viewer_Key` VARCHAR(150) NOT NULL,
  `Viewed_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Itinerary_ID`, `Viewer_Key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
