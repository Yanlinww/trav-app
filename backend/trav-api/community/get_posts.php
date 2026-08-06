<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once '../db_connect.php'; // 根據你的資料夾結構引入連線檔

// 接收前端參數
$type = $_GET['type'] ?? 'all';
$search = $_GET['search'] ?? '';
$currentUser = $_GET['Account'] ?? '';

// 基礎 SQL
$sql = "
    SELECT 
        p.*, 
        m.Name AS AuthorName, 
        m.Avatar AS AuthorAvatar,
        (SELECT COUNT(*) FROM PostReactions pr WHERE pr.Post_ID = p.Post_ID AND pr.Reaction_Type = 'like') AS LikeCount,
        (SELECT COUNT(*) FROM PostReactions pr WHERE pr.Post_ID = p.Post_ID AND pr.Reaction_Type = 'save' AND pr.Account = ?) AS IsSavedByUser,
        (SELECT COUNT(*) FROM PostReactions pr WHERE pr.Post_ID = p.Post_ID AND pr.Reaction_Type = 'like' AND pr.Account = ?) AS IsLikedByUser
    FROM Posts p
    JOIN Member m ON p.Account = m.Account
    WHERE 1=1
";

$types = str_repeat("s", 2);
$params = [$currentUser, $currentUser];

// 處理分類過濾
if ($type !== 'all') {
    $sql .= " AND p.Post_Type = ?";
    $types .= "s";
    $params[] = $type;
}

// 處理關鍵字搜尋
if (!empty($search)) {
    $sql .= " AND (p.Content LIKE ? OR p.Title LIKE ? OR p.Location_Name LIKE ? OR p.Tags LIKE ? OR m.Name LIKE ?)";
    $searchParam = "%" . $search . "%";
    $types .= str_repeat("s", 5);
    array_push($params, $searchParam, $searchParam, $searchParam, $searchParam, $searchParam);
}

$sql .= " ORDER BY p.Created_At DESC";

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$posts = [];
while ($row = $result->fetch_assoc()) {
    
    $time_ago = date("Y-m-d H:i", strtotime($row['Created_At']));

    $posts[] = [
        "id" => (int)$row['Post_ID'],
        "type" => $row['Post_Type'],
        "title" => $row['Title'],
        "content" => $row['Content'],
        "location" => $row['Location_Name'],
        "time" => $time_ago,
        "author" => [
            "account" => $row['Account'], // 🌟 就是這裡！新增了 account 欄位
            "name" => $row['AuthorName'] ?? 'Unknown',
            "avatar" => $row['AuthorAvatar'] ?? ''
        ],
        "tags" => !empty($row['Tags']) ? array_filter(explode(",", $row['Tags'])) : [],
        "images" => !empty($row['Image_URL']) ? [$row['Image_URL']] : [],
        "likes" => (int)$row['LikeCount'],
        "commentCount" => 0, 
        "liked" => $row['IsLikedByUser'] > 0,
        "saved" => $row['IsSavedByUser'] > 0,
        "comments" => [] 
    ];
}

echo json_encode(["status" => "success", "data" => $posts], JSON_UNESCAPED_UNICODE);
$stmt->close();
$conn->close();
?>