ALTER TABLE `Itinerary`
    ADD COLUMN `Public_Moderation_Status` VARCHAR(30) NOT NULL DEFAULT 'active',
    ADD COLUMN `Public_Moderation_Note` VARCHAR(1000) NULL,
    ADD COLUMN `Public_Moderated_By` VARCHAR(100) NULL,
    ADD COLUMN `Public_Moderated_At` DATETIME NULL,
    ADD INDEX `idx_itinerary_public_moderation` (`Public_Moderation_Status`, `Is_Public`);
