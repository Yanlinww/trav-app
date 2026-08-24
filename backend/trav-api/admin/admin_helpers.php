<?php

function require_admin_access(mysqli $conn, string $account): void {
    $account = trim($account);
    if ($account === '') api_error('請先登入後再使用管理功能。', 401);

    $statement = $conn->prepare('SELECT Role FROM Member WHERE Account = ? LIMIT 1');
    if (!$statement) api_error('管理員權限檢查失敗。', 500);
    $statement->bind_param('s', $account);
    if (!$statement->execute()) {
        $statement->close();
        api_error('管理員權限檢查失敗。', 500);
    }
    $member = $statement->get_result()->fetch_assoc();
    $statement->close();

    if (!$member || ($member['Role'] ?? 'user') !== 'admin') api_error('你沒有管理員權限。', 403);
}
