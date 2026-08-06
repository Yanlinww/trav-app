<?php
require_once '../db_connect.php';
require_once 'community_helpers.php';

community_ensure_tables($conn);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    community_json_response(["status" => "error", "message" => "只支援 POST"], 405);
}

$data = community_read_json();

$account = trim((string) community_get_request_value($data, 'Account', ''));
$postId = (int) community_get_request_value($data, 'Post_ID', 0);
$content = trim((string) community_get_request_value($data, 'Content', ''));
$parentIdValue = community_get_request_value($data, 'Parent_Comment_ID', null);
$parentId = $parentIdValue ? (int) $parentIdValue : null;

if ($account === '' || $postId <= 0 || $content === '') {
    community_json_response(["status" => "error", "message" => "缺少帳號、貼文或留言內容"], 400);
}

$member = community_get_member_by_account($conn, $account);
if (!$member) {
    community_json_response(["status" => "error", "message" => "找不到會員資料，請先登入"], 401);
}

$postStmt = $conn->prepare("SELECT `Post_ID` FROM `Community_Post` WHERE `Post_ID` = ? AND `Status` = 'active' LIMIT 1");
$postStmt->bind_param("i", $postId);
$postStmt->execute();
$postExists = $postStmt->get_result()->num_rows > 0;
$postStmt->close();

if (!$postExists) {
    community_json_response(["status" => "error", "message" => "找不到貼文"], 404);
}

if ($parentId !== null) {
    $parentStmt = $conn->prepare("SELECT `Comment_ID` FROM `Community_Comment` WHERE `Comment_ID` = ? AND `Post_ID` = ? AND `Status` = 'active' LIMIT 1");
    $parentStmt->bind_param("ii", $parentId, $postId);
    $parentStmt->execute();
    $parentExists = $parentStmt->get_result()->num_rows > 0;
    $parentStmt->close();

    if (!$parentExists) {
        community_json_response(["status" => "error", "message" => "找不到要回覆的留言"], 404);
    }
}

$stmt = $conn->prepare(
    "INSERT INTO `Community_Comment` (`Post_ID`, `Account`, `Parent_Comment_ID`, `Content`)
     VALUES (?, ?, ?, ?)"
);
$stmt->bind_param("isis", $postId, $account, $parentId, $content);

if (!$stmt->execute()) {
    community_json_response(["status" => "error", "message" => "留言失敗：" . $stmt->error], 500);
}

$commentId = (int) $conn->insert_id;
$stmt->close();

$commentStmt = $conn->prepare(
    "SELECT c.`Comment_ID`, c.`Parent_Comment_ID`, c.`Content`, c.`Created_At`, m.`Account`, m.`Name`, m.`Avatar`
     FROM `Community_Comment` c
     INNER JOIN `Member` m ON m.`Account` = c.`Account`
     WHERE c.`Comment_ID` = ?
     LIMIT 1"
);
$commentStmt->bind_param("i", $commentId);
$commentStmt->execute();
$row = $commentStmt->get_result()->fetch_assoc();
$commentStmt->close();

$comment = [
    'id' => (int) $row['Comment_ID'],
    'parentId' => $row['Parent_Comment_ID'] ? (int) $row['Parent_Comment_ID'] : null,
    'author' => $row['Name'] ?: $row['Account'],
    'account' => $row['Account'],
    'avatar' => community_public_url($row['Avatar'] ?? '') ?: '',
    'content' => $row['Content'],
    'createdAt' => $row['Created_At'],
    'time' => community_time_ago($row['Created_At']),
];

community_json_response([
    "status" => "success",
    "message" => "留言已送出",
    "data" => $comment,
]);

?>
