<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

// 引入資料庫連線 (請確保路徑正確)
require_once '../db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->Itinerary_ID)) {
    // 透過 LEFT JOIN 將行程表/關聯表與真正的會員主表 (Member) 連接
    $stmt = $conn->prepare("
        SELECT 
            i.Account AS user_id, 
            u.Name AS real_name, 
            u.Avatar AS avatar_url, 
            'Owner' AS role 
        FROM Itinerary i
        LEFT JOIN Member u ON i.Account = u.Account
        WHERE i.Itinerary_ID = ?
        
        UNION
        
        SELECT 
            m.Account AS user_id, 
            u.Name AS real_name, 
            u.Avatar AS avatar_url, 
            'Member' AS role 
        FROM Itinerary_Members m
        LEFT JOIN Member u ON m.Account = u.Account
        WHERE m.Itinerary_ID = ?
    ");
    
    $stmt->bind_param("ii", $data->Itinerary_ID, $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $members = [];
    while ($row = $result->fetch_assoc()) {
        $members[] = [
            "id" => $row['user_id'],
            // 防呆：若 Member 表中未填寫 Name，則退回顯示 Account
            "name" => !empty($row['real_name']) ? $row['real_name'] : $row['user_id'], 
            "role" => $row['role'],
            "avatar" => $row['avatar_url'] // 將 Member 表中的 Avatar 封裝進 JSON 回傳給前端
        ];
    }
    echo json_encode(["status" => "success", "data" => $members]);
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少行程ID"]);
}

$conn->close();
?>