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

function record_public_itinerary_moderation_event(mysqli $conn, int $itineraryId, ?int $reportId, string $action, string $note, string $account): void {
    $statement = $conn->prepare(
        'INSERT INTO Public_Itinerary_Moderation_Log (Itinerary_ID, Report_ID, Action, Note, Admin_Account)
         VALUES (?, ?, ?, ?, ?)'
    );
    if (!$statement) throw new RuntimeException('無法記錄管理處理紀錄。');
    $statement->bind_param('iisss', $itineraryId, $reportId, $action, $note, $account);
    if (!$statement->execute()) {
        $statement->close();
        throw new RuntimeException('無法記錄管理處理紀錄。');
    }
    $statement->close();
}
