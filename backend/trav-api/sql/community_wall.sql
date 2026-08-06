CREATE TABLE IF NOT EXISTS `Community_Post` (
    `Post_ID` INT NOT NULL AUTO_INCREMENT,
    `Account` VARCHAR(50) NOT NULL,
    `Post_Type` VARCHAR(20) NOT NULL DEFAULT 'footprint',
    `Title` VARCHAR(120) NULL,
    `Content` TEXT NOT NULL,
    `Location_Name` VARCHAR(100) NULL,
    `Location_Coordinates` VARCHAR(100) NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Updated_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`Post_ID`),
    INDEX `idx_community_post_account` (`Account`),
    INDEX `idx_community_post_type_created` (`Post_Type`, `Created_At`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `Community_Post_Image` (
    `Image_ID` INT NOT NULL AUTO_INCREMENT,
    `Post_ID` INT NOT NULL,
    `Image_URL` VARCHAR(255) NOT NULL,
    `Sort_Order` INT NOT NULL DEFAULT 0,
    `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`Image_ID`),
    INDEX `idx_community_image_post` (`Post_ID`, `Sort_Order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `Community_Post_Tag` (
    `Post_ID` INT NOT NULL,
    `Tag_Name` VARCHAR(40) NOT NULL,
    PRIMARY KEY (`Post_ID`, `Tag_Name`),
    INDEX `idx_community_tag_name` (`Tag_Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `Community_Comment` (
    `Comment_ID` INT NOT NULL AUTO_INCREMENT,
    `Post_ID` INT NOT NULL,
    `Account` VARCHAR(50) NOT NULL,
    `Parent_Comment_ID` INT NULL,
    `Content` TEXT NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Updated_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`Comment_ID`),
    INDEX `idx_community_comment_post` (`Post_ID`, `Created_At`),
    INDEX `idx_community_comment_account` (`Account`),
    INDEX `idx_community_comment_parent` (`Parent_Comment_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `Community_Reaction` (
    `Post_ID` INT NOT NULL,
    `Account` VARCHAR(50) NOT NULL,
    `Reaction_Type` VARCHAR(20) NOT NULL,
    `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`Post_ID`, `Account`, `Reaction_Type`),
    INDEX `idx_community_reaction_account` (`Account`, `Reaction_Type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
