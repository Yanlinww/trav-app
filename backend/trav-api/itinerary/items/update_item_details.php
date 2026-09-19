<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { 
    http_response_code(200); 
    exit(); 
}

require_once '../../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Item_ID)) {
    $itemId = (int)$data->Item_ID;
    
    // 取得前端傳來的新資料
    $content = isset($data->Content) ?$data->Content : null;
    $reservationNo = isset($data->Reservation_No) ?$data->Reservation_No : null;
    $link = isset($data->Link) ?$data->Link : null;
    $screenshotUrl = isset($data->Screenshot_URL) ?$data->Screenshot_URL : null;

    // 更新到行程細項表
    $stmt =$conn->prepare("UPDATE `Itinerary_Item` SET `Content` = ?, `Reservation_No` = ?, `Link` = ?, `Screenshot_URL` = ? WHERE `Item_ID` = ?");
    $stmt->bind_param("ssssi", $content, $reservationNo,$link, $screenshotUrl,$itemId);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "詳細資訊更新成功！"]);
    } else {
        echo json_encode(["status" => "error", "message" => "更新失敗: " . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少 Item_ID 參數"]);
}
$conn->close();
?>