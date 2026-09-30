-- The member travel-preference fields have no active API storage flow.
ALTER TABLE `Member`
  DROP COLUMN `Budget_Level`,
  DROP COLUMN `Travel_Style`,
  DROP COLUMN `Main_Transport`;
