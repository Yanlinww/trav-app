<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once '../db_connect.php';

$data = json_decode(file_get_contents("php://input"));
$account = $data->Account ?? '';
$postId = $data->Post_ID ?? 0;
$reactionType = $data->Reaction_Type ?? ''; // 'like' 或 'save'

if ($account && $postId && $reactionType) {
    // 檢查目前狀態
    $check = $conn->prepare("SELECT 1 FROM Community_Reaction WHERE Post_ID = ? AND Account = ? AND Reaction_Type = ?");
    $check->bind_param("iss", $postId, $account, $reactionType);
    $check->execute();
    $exists = $check->get_result()->num_rows > 0;
    $check->close();

    $active = false;
    if ($exists) {
        $del = $conn->prepare("DELETE FROM Community_Reaction WHERE Post_ID = ? AND Account = ? AND Reaction_Type = ?");
        $del->bind_param("iss", $postId, $account, $reactionType);
        $del->execute();
        $active = false;
    } else {
        $ins = $conn->prepare("INSERT INTO Community_Reaction (Post_ID, Account, Reaction_Type) VALUES (?, ?, ?)");
        $ins->bind_param("iss", $postId, $account, $reactionType);
        $ins->execute();
        $active = true;

        // 🌟 【新增】按讚成功時，發通知給原作者 (不能通知自己) 🌟
        if ($reactionType === 'like') {
            $getPost = $conn->prepare("SELECT Account FROM Community_Post WHERE Post_ID = ?");
            $getPost->bind_param("i", $postId);
            $getPost->execute();
            $postOwner = $getPost->get_result()->fetch_assoc()['Account'] ?? '';
            $getPost->close();

            if ($postOwner && $postOwner !== $account) {
                $msg = "喜歡你的貼文";
                $notif = $conn->prepare("INSERT INTO Notifications (Account, Sender_Account, Type, Reference_ID, Message) VALUES (?, ?, 'like', ?, ?)");
                $notif->bind_param("ssss", $postOwner, $account, $postId, $msg);
                $notif->execute();
            }
        }
    }

    $count = $conn->prepare("SELECT COUNT(*) as c FROM Community_Reaction WHERE Post_ID = ? AND Reaction_Type = 'like'");
    $count->bind_param("i", $postId);
    $count->execute();
    $likes = $count->get_result()->fetch_assoc()['c'];

    echo json_encode(["status" => "success", "data" => ["active" => $active, "likes" => $likes]]);
} else {
    echo json_encode(["status" => "error", "message" => "缺少參數"]);
}
?>