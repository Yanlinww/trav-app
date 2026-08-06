CREATE TABLE IF NOT EXISTS `Itinerary_Luggage` (
  `Itinerary_ID` INT NOT NULL,
  `Account` VARCHAR(100) NOT NULL,
  `Luggage_Data` LONGTEXT NULL,
  `Updated_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Itinerary_ID`, `Account`),
  INDEX `idx_itinerary_luggage_account` (`Account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 將既有共用資料保留給行程擁有者；其他旅伴第一次開啟時會建立自己的預設清單。
INSERT INTO `Itinerary_Luggage` (`Itinerary_ID`, `Account`, `Luggage_Data`)
SELECT i.`Itinerary_ID`, i.`Account`, i.`Luggage_Data`
FROM `Itinerary` i
WHERE i.`Account` IS NOT NULL
  AND i.`Account` <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM `Itinerary_Luggage` l
    WHERE l.`Itinerary_ID` = i.`Itinerary_ID`
      AND CONVERT(l.`Account` USING utf8mb4) = CONVERT(i.`Account` USING utf8mb4)
  );
