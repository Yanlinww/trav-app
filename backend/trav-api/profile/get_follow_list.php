<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../db_connect.php';
require_once __DIR__ . '/../itinerary/api_helpers.php';
require_once __DIR__ . '/../auth/auth_session_helpers.php';

function ensure_user_follows_table(mysqli $conn): void {
    $created = $conn->query("CREATE TABLE IF NOT EXISTS `User_Follows` (
        `Follow_ID` INT AUTO_INCREMENT PRIMARY KEY,
        `Follower_Account` VARCHAR(50) NOT NULL,
        `Target_Account` VARCHAR(50) NOT NULL,
        `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_follow` (`Follower_Account`, `Target_Account`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci");
    if (!$created) api_error('追蹤資料初始化失敗。', 500);
}

$data = read_json_body();
$viewerAccount = require_authenticated_account($conn);
$account = trim((string)($data->Account ?? ''));
$listType = trim((string)($data->List_Type ?? ''));

if ($account === '') api_error('缺少要查詢的帳號。', 422);
if (!in_array($listType, ['followers', 'following'], true)) api_error('無效的名單類型。', 422);

ensure_user_follows_table($conn);

$memberStatement = $conn->prepare('SELECT 1 FROM Member WHERE Account = ? LIMIT 1');
if (!$memberStatement) api_error('帳號檢查失敗。', 500);
$memberStatement->bind_param('s', $account);
if (!$memberStatement->execute() || !$memberStatement->get_result()->fetch_row()) {
    $memberStatement->close();
    api_error('找不到此旅行者。', 404);
}
$memberStatement->close();

$relatedAccountColumn = $listType === 'followers' ? 'f.Follower_Account' : 'f.Target_Account';
$ownerCondition = $listType === 'followers' ? 'f.Target_Account = ?' : 'f.Follower_Account = ?';
$statement = $conn->prepare(
    "SELECT m.Account, COALESCE(NULLIF(m.Name, ''), m.Account) AS Member_Name, m.Avatar, f.Created_At,
            EXISTS(SELECT 1 FROM User_Follows vf WHERE vf.Follower_Account = ? AND vf.Target_Account = m.Account) AS Is_Followed_By_Viewer
     FROM User_Follows f
     INNER JOIN Member m ON m.Account = {$relatedAccountColumn}
     WHERE {$ownerCondition}
     ORDER BY f.Created_At DESC, f.Follow_ID DESC
     LIMIT 100"
);
if (!$statement) api_error('無法讀取追蹤名單。', 500);
$statement->bind_param('ss', $viewerAccount, $account);
if (!$statement->execute()) {
    $statement->close();
    api_error('無法讀取追蹤名單。', 500);
}

$members = [];
$result = $statement->get_result();
while ($row = $result->fetch_assoc()) {
    $members[] = [
        'account' => $row['Account'],
        'name' => $row['Member_Name'],
        'avatar' => $row['Avatar'] ?? '',
        'createdAt' => $row['Created_At'],
        'isFollowedByViewer' => (bool)$row['Is_Followed_By_Viewer'],
    ];
}
$statement->close();
$conn->close();

api_json(['status' => 'success', 'data' => $members]);
