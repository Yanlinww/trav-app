<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Account)) {
    $account = $data->Account;
    $ig = $data->instagram ?? '';
    $tw = $data->twitter ?? '';
    $xhs = $data->xiaohongshu ?? '';
    $tk = $data->tiktok ?? '';
    $yt = $data->youtube ?? '';
    $fb = $data->facebook ?? '';

    // 檢查這個帳號是否已經有紀錄
    $stmt = $conn->prepare("SELECT Account FROM MemberSocialLinks WHERE Account = ?");
    $stmt->bind_param("s", $account);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // 更新現有紀錄
        $update = $conn->prepare("UPDATE MemberSocialLinks SET instagram=?, twitter=?, xiaohongshu=?, tiktok=?, youtube=?, facebook=? WHERE Account=?");
        $update->bind_param("sssssss", $ig, $tw, $xhs, $tk, $yt, $fb, $account);
        $update->execute();
    } else {
        // 新增第一筆紀錄
        $insert = $conn->prepare("INSERT INTO MemberSocialLinks (Account, instagram, twitter, xiaohongshu, tiktok, youtube, facebook) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $insert->bind_param("sssssss", $account, $ig, $tw, $xhs, $tk, $yt, $fb);
        $insert->execute();
    }

    echo json_encode(["status" => "success", "message" => "社群連結已更新！"]);
} else {
    echo json_encode(["status" => "error", "message" => "缺少帳號資訊"]);
}
$conn->close();
?>