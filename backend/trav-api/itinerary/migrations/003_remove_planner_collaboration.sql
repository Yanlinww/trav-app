-- Keep each owner's luggage list before removing shared-itinerary membership.
CREATE TABLE IF NOT EXISTS `Itinerary_Luggage` (
  `Itinerary_ID` INT NOT NULL,
  `Account` VARCHAR(100) NOT NULL,
  `Luggage_Data` LONGTEXT NULL,
  `Updated_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Itinerary_ID`, `Account`),
  INDEX `idx_itinerary_luggage_account` (`Account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Itinerary_Luggage` (`Itinerary_ID`, `Account`, `Luggage_Data`)
SELECT m.`Itinerary_ID`, m.`Account`, m.`Luggage_Data`
FROM `Itinerary_Members` m
JOIN `Itinerary` i ON i.`Itinerary_ID` = m.`Itinerary_ID` AND i.`Account` = m.`Account`
WHERE m.`Luggage_Data` IS NOT NULL
ON DUPLICATE KEY UPDATE `Luggage_Data` = VALUES(`Luggage_Data`);

DROP TABLE IF EXISTS `Itinerary_Chat_Message`;
DROP TABLE `Itinerary_Members`;
ALTER TABLE `Itinerary` DROP COLUMN `Invite_Code`;
