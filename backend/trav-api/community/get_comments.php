<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

require_once '../db_connect.php';
require_once 'community_helpers.php';

$postId = (int) ($_GET['postId'] ?? 0);
if ($postId <= 0) {
    community_json_response(['status' => 'error', 'message' => '缺少貼文編號。'], 422);
}

$postStmt = $conn->prepare("SELECT 1 FROM `Community_Post` WHERE `Post_ID` = ? AND `Status` = 'active' LIMIT 1");
if (!$postStmt) {
    community_json_response(['status' => 'error', 'message' => '無法讀取貼文。'], 500);
}
$postStmt->bind_param('i', $postId);
$postStmt->execute();
$postExists = $postStmt->get_result()->fetch_row();
$postStmt->close();

if (!$postExists) {
    community_json_response(['status' => 'error', 'message' => '找不到此貼文。'], 404);
}

$comments = community_fetch_comments($conn, $postId);
$conn->close();

community_json_response([
    'status' => 'success',
    'data' => $comments,
]);
