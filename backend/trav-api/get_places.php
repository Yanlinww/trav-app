<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db_connect.php';

// 接收前端傳來的參數 (例如: ?category=attraction & keyword=台北)
$category = isset($_GET['category']) ? $_GET['category'] : '';
$keyword = isset($_GET['keyword']) ? $_GET['keyword'] : '';

// 基本的 SQL 語法
$sql = "SELECT * FROM Place WHERE 1=1";
$params = [];
$types = "";

// 如果前端有指定類別 (attraction 或 restaurant)
if ($category !== '') {
    $sql .= " AND Category = ?";
    $params[] = $category;
    $types .= "s";
}

// 如果前端有輸入關鍵字搜尋 (搜尋地點名稱)
if ($keyword !== '') {
    $sql .= " AND Name LIKE ?";
    $params[] = "%" . $keyword . "%";
    $types .= "s";
}

// 依照 Place_ID 排序，越晚加入的在越前面 (可依需求調整)
$sql .= " ORDER BY Place_ID DESC";

$stmt = $conn->prepare($sql);

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

$places = [];
while ($row = $result->fetch_assoc()) {
    // 為了讓前端好處理，過濾掉 NULL 的欄位，保持 JSON 乾淨
    $places[] = array_filter($row, function($value) {
        return $value !== null;
    });
}

echo json_encode([
    "status" => "success",
    "count" => count($places),
    "data" => $places
]);

$stmt->close();
$conn->close();
?>