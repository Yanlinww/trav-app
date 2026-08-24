ALTER TABLE `Member`
    ADD COLUMN `Role` VARCHAR(20) NOT NULL DEFAULT 'user';

ALTER TABLE `Member`
    ADD INDEX `idx_member_role` (`Role`);
