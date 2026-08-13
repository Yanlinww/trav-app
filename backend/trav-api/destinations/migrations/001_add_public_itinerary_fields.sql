ALTER TABLE `Itinerary`
  ADD COLUMN `Is_Public` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `Copied_From_Itinerary_ID` INT NULL,
  ADD COLUMN `Copy_Count` INT NOT NULL DEFAULT 0,
  ADD COLUMN `Public_Title` VARCHAR(255) NULL,
  ADD COLUMN `Public_Cover_Image` TEXT NULL,
  ADD COLUMN `Public_Description` TEXT NULL,
  ADD INDEX `idx_itinerary_public_start` (`Is_Public`, `Start_Date`),
  ADD INDEX `idx_itinerary_copied_from` (`Copied_From_Itinerary_ID`);
