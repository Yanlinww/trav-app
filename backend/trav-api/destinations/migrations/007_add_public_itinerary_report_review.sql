ALTER TABLE `Public_Itinerary_Report`
    ADD COLUMN `Admin_Note` VARCHAR(1000) NULL,
    ADD COLUMN `Reviewed_By` VARCHAR(100) NULL,
    ADD COLUMN `Reviewed_At` DATETIME NULL,
    ADD INDEX `idx_public_itinerary_report_review` (`Status`, `Updated_At`);
