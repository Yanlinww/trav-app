<?php

function ensure_admin_schema(mysqli $conn): void {
    try {
        $conn->query("ALTER TABLE `Member` ADD COLUMN `Role` VARCHAR(20) NOT NULL DEFAULT 'user'");
    } catch (Throwable $ignored) {}

    try {
        $conn->query("ALTER TABLE `Member` ADD INDEX `idx_member_role` (`Role`)");
    } catch (Throwable $ignored) {}

    try {
        $conn->query("UPDATE `Member` SET `Role` = 'user' WHERE `Role` IS NULL OR `Role` = ''");
    } catch (Throwable $ignored) {}
}
