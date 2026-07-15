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

if (!empty($data->Itinerary_ID) && !empty($data->Title) && !empty($data->StartDate) && !empty($data->EndDate)) {
    $stmt = $conn->prepare("UPDATE `Itinerary` SET `Title` = ?, `Start_Date` = ?, `End_Date` = ? WHERE `Itinerary_ID` = ?");
    $stmt->bind_param("sssi", $data->Title, $data->StartDate, $data->EndDate, $data->Itinerary_ID);

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