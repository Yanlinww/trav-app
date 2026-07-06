<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200); exit();
}

require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID) && !empty($data->Title) && !empty($data->Day_Number)) {
    $itinerary_id = $data->Itinerary_ID;
    $day_number = $data->Day_Number;
    $title = $data->Title;
    $start_time = !empty($data->StartTime) ? $data->StartTime : null;
    $end_time = !empty($data->EndTime) ? $data->EndTime : null;
    $item_type = 'attraction'; // 預設類別，未來可擴充讓使用者選

    // 運作機制：自動計算排序權重 (找出該天數目前最大的 Sort_Order，加 1 成為新卡片的順序)
    $sort_stmt = $conn->prepare("SELECT MAX(`Sort_Order`) as MaxSort FROM `Itinerary_Item` WHERE `Itinerary_ID` = ? AND `Day_Number` = ?");
    $sort_stmt->bind_param("ii", $itinerary_id, $day_number);
    $sort_stmt->execute();
    $sort_result = $sort_stmt->get_result()->fetch_assoc();
    $new_sort_order = ($sort_result['MaxSort'] !== null) ? $sort_result['MaxSort'] + 1 : 0;
    $sort_stmt->close();

    // 寫入資料
    $stmt = $conn->prepare("INSERT INTO `Itinerary_Item` (`Itinerary_ID`, `Day_Number`, `Item_Type`, `Title`, `Start_Time`, `End_Time`, `Sort_Order`) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("iissssi", $itinerary_id, $day_number, $item_type, $title, $start_time, $end_time, $new_sort_order);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "行程項目已建立"]);
    } else {
        echo json_encode(["status" => "error", "message" => "資料庫寫入失敗：" . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "標題不可為空。"]);
}
$conn->close();
?>