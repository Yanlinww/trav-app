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

if (!empty($data->Account)) {
    $account = $data->Account;
    // 🌟 新增：取得來看這個頁面的人是誰 (如果是自己的 Planner 頁面，這個值會等於 $account)
    $viewerAccount = $data->Viewer_Account ?? ''; 
    
    // 🌟 判斷是否為本人觀看
    $isOwner = ($account === $viewerAccount);

    // 準備基礎 SQL (⚠️ 注意：這裡把 OR 條件用括號包起來了)
    $sql = "
    SELECT i.* 
    FROM Itinerary i 
    LEFT JOIN Itinerary_Members m ON i.Itinerary_ID = m.Itinerary_ID 
    WHERE (i.Account = ? OR m.Account = ?) 
    ";

    // 🌟 如果不是本人，就多加一個限制條件：只能看公開的！
    if (!$isOwner) {
        $sql .= " AND i.Is_Public = 1 ";
    }

    // 依據釘選狀態優先排序，再依出發日期近到遠排序
    $sql .= " GROUP BY i.Itinerary_ID ORDER BY i.Start_Date ASC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $account, $account);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $itineraries = [];
    while ($row = $result->fetch_assoc()) {
        $itineraries[] = [
            "id" => $row['Itinerary_ID'],
            "title" => $row['Title'],
            // 將資料庫的 YYYY-MM-DD 轉為前端預期的 YYYY/MM/DD
            "startDate" => str_replace('-', '/', $row['Start_Date']),
            "endDate" => str_replace('-', '/', $row['End_Date']),
            "transport" => $row['Transport'],
            "coverImage" => $row['Cover_Image'] ?: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800&auto=format&fit=crop",
            "isPinned" => (bool)$row['Is_Pinned'],
            // 🌟 回傳這個行程是公開還是私密給前端 (前端卡片顯示圖示需要用到)
            "isPublic" => (bool)($row['Is_Public'] ?? 0),
            // 🌟 回傳 Owner 帳號，讓前端可以顯示 Owner / Member 標籤
            "Account" => $row['Account'] 
        ];
    }
    
    echo json_encode(["status" => "success", "data" => $itineraries]);
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "缺少會員帳號標識"]);
}
$conn->close();
?>