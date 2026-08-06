<?php
// 處理 CORS 跨網域請求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { 
    http_response_code(200); 
    exit(); 
}

require_once '../db_connect.php';
require_once 'community_helpers.php'; // 🌟 引入夥伴寫好的超強函式庫

// 確保資料表存在
community_ensure_tables($conn);

// 接收前端參數
$type = $_GET['type'] ?? 'all';
$search = $_GET['search'] ?? '';
$currentUser = $_GET['Account'] ?? '';

// 基礎 SQL，我們只要撈出符合條件的 Post_ID 就好
$sql = "
    SELECT DISTINCT p.Post_ID, p.Created_At
    FROM Community_Post p
    LEFT JOIN Community_Post_Tag t ON p.Post_ID = t.Post_ID
    JOIN Member m ON p.Account = m.Account
    WHERE p.Status = 'active'
";

$types = "";
$params = [];

// 處理分類過濾
if ($type !== 'all') {
    $sql .= " AND p.Post_Type = ?";
    $types .= "s";
    $params[] = $type;
}

// 處理關鍵字搜尋
if (!empty($search)) {
    $sql .= " AND (p.Content LIKE ? OR p.Title LIKE ? OR p.Location_Name LIKE ? OR t.Tag_Name LIKE ? OR m.Name LIKE ?)";
    $searchParam = "%" . $search . "%";
    $types .= str_repeat("s", 5);
    array_push($params, $searchParam, $searchParam, $searchParam, $searchParam, $searchParam);
}

$sql .= " ORDER BY p.Created_At DESC";

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    // 使用 Helper 綁定參數
    community_bind_params($stmt, $types, $params);
}
$stmt->execute();
$result = $stmt->get_result();

$posts = [];
while ($row = $result->fetch_assoc()) {
    // 🌟 呼叫夥伴寫好的格式化函式，把貼文細節 (包含作者、標籤、圖片、留言) 一次完美撈出來！
    $postData = community_fetch_single_post($conn, $row['Post_ID'], $currentUser);
    if ($postData) {
        $posts[] = $postData;
    }
}

$stmt->close();
$conn->close();

// 呼叫 Helper 的 JSON 回傳函式
community_json_response([
    "status" => "success",
    "data" => array_values($posts)
]);
?>