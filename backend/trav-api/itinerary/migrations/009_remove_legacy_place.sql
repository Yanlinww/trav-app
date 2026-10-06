-- Remove the unused shared Place table and its empty link from itinerary items.
ALTER TABLE `Itinerary_Item` DROP FOREIGN KEY `fk_itinerary_item_place`;
ALTER TABLE `Itinerary_Item` DROP COLUMN `Place_ID`;
DROP TABLE `Place`;
