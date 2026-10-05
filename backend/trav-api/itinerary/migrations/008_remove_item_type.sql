-- Remove the unused category field from itinerary items.
ALTER TABLE `Itinerary_Item`
  DROP COLUMN `Item_Type`;
