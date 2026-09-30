-- Keep personal expenses and remove shared-expense records and columns.
DROP TABLE IF EXISTS `Itinerary_Expense_Share`;
DELETE FROM `Itinerary_Expense` WHERE `Type` <> 'personal' OR `Is_Split` <> 0;
ALTER TABLE `Itinerary_Expense`
  DROP COLUMN `Payer`,
  DROP COLUMN `Is_Split`,
  DROP COLUMN `Type`;
