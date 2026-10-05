-- Remove the item note, reservation, link, and screenshot fields.
ALTER TABLE `Itinerary_Item`
  DROP COLUMN `Content`,
  DROP COLUMN `Reservation_No`,
  DROP COLUMN `Link`,
  DROP COLUMN `Screenshot_URL`;
