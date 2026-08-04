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

function normalize_time_value($value) {
    if ($value === null || trim((string)$value) === '') return null;
    $value = trim((string)$value);
    if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/', $value)) return false;
    return substr($value, 0, 5);
}

if (!empty($data->Item_ID)) {
    $start = normalize_time_value($data->StartTime ?? null);
    $end = normalize_time_value($data->EndTime ?? null);
    if ($start === false || $end === false) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "時間格式不正確，請使用 HH:mm。"]);
        exit();
    }
    if ($start !== null && $end !== null && $end === $start) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "開始與結束時間不能相同。"]);
        exit();
    }
    
    $stmt = $conn->prepare("UPDATE `Itinerary_Item` SET `Start_Time` = ?, `End_Time` = ? WHERE `Item_ID` = ?");
    $stmt->bind_param("ssi", $start, $end, $data->Item_ID);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "更新失敗：" . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
}
$conn->close();
?>
