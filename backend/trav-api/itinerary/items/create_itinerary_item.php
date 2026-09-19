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

function normalize_time_value($value) {
    if ($value === null \vert{}\vert{} trim((string)$value) === '') return null;
    $value = trim((string)$value);
    if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/',$value)) return false;
    return substr($value, 0, 5);
}

if (!empty($data->Itinerary_ID) && !empty($data->Title) && !empty($data->Day_Number)) {
    $itinerary_id =$data->Itinerary_ID;
    $day_number =$data->Day_Number;
    $title =$data->Title;
    $start_time = normalize_time_value($data->StartTime ?? null);
    $end_time = normalize_time_value($data->EndTime ?? null);
    
    if ($start_time === false \vert{}\vert{}$end_time === false) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "時間格式錯誤"]);
        exit();
    }
    if ($start_time !== null &&$end_time !== null && $end_time ===$start_time) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "結束時間不可等於開始時間"]);
        exit();
    }
    
    $place_id = (isset($data->Place_ID) && $data->Place_ID !== '') ? (int)$data->Place_ID : null;
    $item_type = isset($data->Item_Type) ? $data->Item_Type : 'custom';$lat = isset($data->Latitude) ?$data->Latitude : null;
    $lng = isset($data->Longitude) ?$data->Longitude : null;
    
    // 🌟 新增：讀取 4 個新擴充的欄位 (若前端沒傳則預設為 null)
    $content = isset($data->Content) ?$data->Content : null;
    $reservation_no = isset($data->Reservation_No) ?$data->Reservation_No : null;
    $link = isset($data->Link) ?$data->Link : null;
    $screenshot_url = isset($data->Screenshot_URL) ?$data->Screenshot_URL : null;

    $sort_stmt =$conn->prepare("SELECT MAX(`Sort_Order`) as MaxSort FROM `Itinerary_Item` WHERE `Itinerary_ID` = ? AND `Day_Number` = ?");
    $sort_stmt->bind_param("ii", $itinerary_id,$day_number);
    $sort_stmt->execute();$sort_result = $sort_stmt->get_result()->fetch_assoc();$new_sort_order = ($sort_result['MaxSort'] !== null) ?$sort_result['MaxSort'] + 1 : 0;
    $sort_stmt->close();

    // 🌟 更新 SQL：將 4 個新欄位寫入資料庫
    $stmt =$conn->prepare("INSERT INTO `Itinerary_Item` (`Itinerary_ID`, `Day_Number`, `Item_Type`, `Place_ID`, `Title`, `Start_Time`, `End_Time`, `Sort_Order`, `Latitude`, `Longitude`, `Content`, `Reservation_No`, `Link`, `Screenshot_URL`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $stmt->bind_param("iisisssiddssss", $itinerary_id,$day_number, $item_type,$place_id, $title,$start_time, $end_time,$new_sort_order, $lat,$lng, $content,$reservation_no, $link,$screenshot_url);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "建立成功", "Item_ID" => $conn->insert_id]);
    } else {
        echo json_encode(["status" => "error", "message" => "建立失敗: " . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要參數"]);
}
$conn->close();
?>