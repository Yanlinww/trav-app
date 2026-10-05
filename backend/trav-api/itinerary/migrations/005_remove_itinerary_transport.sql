-- Remove the trip-level transport preference. Item types and expense categories remain separate.
ALTER TABLE `Itinerary` DROP COLUMN `Transport`;
