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

    // 因為已經合併進 Member 表，我們不需要再判斷 INSERT 還是 UPDATE，一律 UPDATE 即可！
    $update = $conn->prepare("UPDATE Member SET Link_Instagram=?, Link_Twitter=?, Link_Xiaohongshu=?, Link_Tiktok=?, Link_Youtube=?, Link_Facebook=? WHERE Account=?");
    $update->bind_param("sssssss", $ig, $tw, $xhs, $tk, $yt, $fb, $account);
    
    if ($update->execute()) {
        echo json_encode(["status" => "success", "message" => "社群連結已更新！"]);
    } else {
        echo json_encode(["status" => "error", "message" => "更新失敗：" . $conn->error]);
    }
    $update->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少帳號資訊"]);
}
$conn->close();
?>