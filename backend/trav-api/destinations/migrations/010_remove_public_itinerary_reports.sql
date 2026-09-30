-- One-time removal of the public itinerary reporting and moderation feature.
-- Existing hidden itineraries keep Is_Public = 0 after the moderation columns are removed.
DROP TABLE IF EXISTS `Public_Itinerary_Moderation_Log`;
DROP TABLE IF EXISTS `Public_Itinerary_Report`;

ALTER TABLE `Itinerary`
    DROP INDEX `idx_itinerary_public_moderation`,
    DROP COLUMN `Public_Moderation_Status`,
    DROP COLUMN `Public_Moderation_Note`,
    DROP COLUMN `Public_Moderated_By`,
    DROP COLUMN `Public_Moderated_At`;
