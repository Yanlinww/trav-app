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
$reactionType = trim((string) community_get_request_value($data, 'Reaction_Type', 'like'));

if (!in_array($reactionType, ['like', 'save'], true)) {
    community_json_response(["status" => "error", "message" => "不支援的互動類型"], 400);
}

if ($account === '' || $postId <= 0) {
    community_json_response(["status" => "error", "message" => "缺少帳號或貼文"], 400);
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

$checkStmt = $conn->prepare(
    "SELECT `Post_ID` FROM `Community_Reaction`
     WHERE `Post_ID` = ? AND `Account` = ? AND `Reaction_Type` = ?
     LIMIT 1"
);
$checkStmt->bind_param("iss", $postId, $account, $reactionType);
$checkStmt->execute();
$exists = $checkStmt->get_result()->num_rows > 0;
$checkStmt->close();

if ($exists) {
    $stmt = $conn->prepare(
        "DELETE FROM `Community_Reaction`
         WHERE `Post_ID` = ? AND `Account` = ? AND `Reaction_Type` = ?"
    );
    $stmt->bind_param("iss", $postId, $account, $reactionType);
    $stmt->execute();
    $stmt->close();
    $active = false;
} else {
    $stmt = $conn->prepare(
        "INSERT INTO `Community_Reaction` (`Post_ID`, `Account`, `Reaction_Type`)
         VALUES (?, ?, ?)"
    );
    $stmt->bind_param("iss", $postId, $account, $reactionType);
    $stmt->execute();
    $stmt->close();
    $active = true;
}

$countStmt = $conn->prepare(
    "SELECT
        SUM(CASE WHEN `Reaction_Type` = 'like' THEN 1 ELSE 0 END) AS `Like_Count`,
        SUM(CASE WHEN `Reaction_Type` = 'save' THEN 1 ELSE 0 END) AS `Save_Count`
     FROM `Community_Reaction`
     WHERE `Post_ID` = ?"
);
$countStmt->bind_param("i", $postId);
$countStmt->execute();
$counts = $countStmt->get_result()->fetch_assoc();
$countStmt->close();

community_json_response([
    "status" => "success",
    "data" => [
        "active" => $active,
        "reactionType" => $reactionType,
        "likes" => (int) ($counts['Like_Count'] ?? 0),
        "saves" => (int) ($counts['Save_Count'] ?? 0),
    ],
]);

?>
