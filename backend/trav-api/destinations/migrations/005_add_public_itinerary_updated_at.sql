ALTER TABLE `Itinerary`
  ADD COLUMN `Public_Updated_At` DATETIME NULL,
  ADD INDEX `idx_itinerary_public_updated` (`Is_Public`, `Public_Updated_At`);

UPDATE `Itinerary`
SET `Public_Updated_At` = COALESCE(`Public_Updated_At`, `Start_Date`)
WHERE `Is_Public` = 1;
