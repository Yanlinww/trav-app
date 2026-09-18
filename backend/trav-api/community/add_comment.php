<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once '../db_connect.php';
require_once 'community_helpers.php'; // 引入共用函式庫來組裝新留言

$data = json_decode(file_get_contents("php://input"));
$account = $data->Account ?? '';
$postId = $data->Post_ID ?? 0;
$content = $data->Content ?? '';
$parentId = $data->Parent_Comment_ID ?? null;

if ($account && $postId && $content) {
    // 1. 新增留言
    $stmt = $conn->prepare("INSERT INTO Community_Comment (Post_ID, Account, Parent_Comment_ID, Content) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("isis", $postId, $account, $parentId, $content);
    $stmt->execute();
    $commentId = $stmt->insert_id;
    $stmt->close();

    // 🌟 2. 【新增】判斷要發通知給誰 🌟
    // 先抓出貼文的擁有者
    $getPost = $conn->prepare("SELECT Account FROM Community_Post WHERE Post_ID = ?");
    $getPost->bind_param("i", $postId);
    $getPost->execute();
    $postOwner = $getPost->get_result()->fetch_assoc()['Account'] ?? '';
    $getPost->close();

    $targetAccount = $postOwner;
    $msg = "在你的貼文底下留言";
    
    // 如果有 Parent_ID，代表是「回覆」，則通知對象改成留言的主人
    if ($parentId) {
        $getParent = $conn->prepare("SELECT Account FROM Community_Comment WHERE Comment_ID = ?");
        $getParent->bind_param("i", $parentId);
        $getParent->execute();
        $parentOwner = $getParent->get_result()->fetch_assoc()['Account'] ?? '';
        $getParent->close();
        
        if ($parentOwner) {
            $targetAccount = $parentOwner;
            $msg = "回覆了你的留言";
        }
    }

    // 發送通知 (不能通知自己)
    if ($targetAccount && $targetAccount !== $account) {
        $notif = $conn->prepare("INSERT INTO Notifications (Account, Sender_Account, Type, Reference_ID, Message) VALUES (?, ?, 'comment', ?, ?)");
        $notif->bind_param("ssss", $targetAccount, $account, $postId, $msg);
        $notif->execute();
    }

    // 3. 抓取剛建立的這筆留言資料回傳給前端
    $stmt = $conn->prepare("
        SELECT c.*, m.Name, m.Avatar 
        FROM Community_Comment c 
        JOIN Member m ON c.Account = m.Account 
        WHERE c.Comment_ID = ?
    ");
    $stmt->bind_param("i", $commentId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    
    $newComment = [
        'id' => (int) $row['Comment_ID'],
        'parentId' => $row['Parent_Comment_ID'] ? (int) $row['Parent_Comment_ID'] : null,
        'account' => $row['Account'],
        'author' => $row['Name'] ?: $row['Account'],
        'avatar' => community_avatar_url($row['Avatar'] ?? ''),
        'content' => $row['Content'],
        'createdAt' => $row['Created_At'],
        'time' => '剛剛',
    ];

    echo json_encode(["status" => "success", "data" => $newComment]);
} else {
    echo json_encode(["status" => "error", "message" => "缺少參數"]);
}
?>
