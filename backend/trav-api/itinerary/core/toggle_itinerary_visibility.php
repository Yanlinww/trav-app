<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once '../../db_connect.php';
$data = json_decode(file_get_contents("php://input"));
require_once '../../destinations/schema.php';

ensure_destinations_schema($conn);

if (!empty($data->Account) && !empty($data->Itinerary_ID) && isset($data->Is_Public)) {
    $account = $data->Account;
    $itineraryId = $data->Itinerary_ID;
    $isPublic = $data->Is_Public ? 1 : 0;

    // 只有行程的 Owner 可以更改隱私狀態
    $stmt = $conn->prepare("UPDATE Itinerary SET Is_Public = ? WHERE Itinerary_ID = ? AND Account = ?");
    $stmt->bind_param("iis", $isPublic, $itineraryId, $account);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => $isPublic ? "行程已設為公開" : "行程已設為私密"]);
    } else {
        echo json_encode(["status" => "error", "message" => "狀態更新失敗：" . $conn->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少必要參數"]);
}
$conn->close();
?>
