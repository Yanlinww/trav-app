<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200); exit();
}

require_once '../../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

function normalize_time_value($value) {
    if ($value === null || trim((string)$value) === '') return null;
    $value = trim((string)$value);
    if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/', $value)) return false;
    return substr($value, 0, 5);
}

if (!empty($data->Itinerary_ID) && !empty($data->Title) && !empty($data->Day_Number)) {
    $itinerary_id = $data->Itinerary_ID;
    $day_number = $data->Day_Number;
    $title = $data->Title;
    $start_time = normalize_time_value($data->StartTime ?? null);
    $end_time = normalize_time_value($data->EndTime ?? null);
    if ($start_time === false || $end_time === false) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "時間格式不正確，請使用 HH:mm。"]);
        exit();
    }
    if ($start_time !== null && $end_time !== null && $end_time === $start_time) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "開始與結束時間不能相同。"]);
        exit();
    }
    
    // 【新增】接收座標資料
    $lat = isset($data->Latitude) ? $data->Latitude : null;
    $lng = isset($data->Longitude) ? $data->Longitude : null;
    
    $item_type = 'attraction'; 

    $sort_stmt = $conn->prepare("SELECT MAX(`Sort_Order`) as MaxSort FROM `Itinerary_Item` WHERE `Itinerary_ID` = ? AND `Day_Number` = ?");
    $sort_stmt->bind_param("ii", $itinerary_id, $day_number);
    $sort_stmt->execute();
    $sort_result = $sort_stmt->get_result()->fetch_assoc();
    $new_sort_order = ($sort_result['MaxSort'] !== null) ? $sort_result['MaxSort'] + 1 : 0;
    $sort_stmt->close();

    // 【修改】擴充寫入 Latitude 與 Longitude
    $stmt = $conn->prepare("INSERT INTO `Itinerary_Item` (`Itinerary_ID`, `Day_Number`, `Item_Type`, `Title`, `Start_Time`, `End_Time`, `Sort_Order`, `Latitude`, `Longitude`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    // 【修改】綁定參數數量從 iissssi 變更為 iissssidd
    $stmt->bind_param("iissssidd", $itinerary_id, $day_number, $item_type, $title, $start_time, $end_time, $new_sort_order, $lat, $lng);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "新增成功"]);
    } else {
        echo json_encode(["status" => "error", "message" => "新增失敗: " . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少必填參數"]);
}
$conn->close();
?>
