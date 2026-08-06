<?php
require_once '../db_connect.php';
require_once 'community_helpers.php';

community_ensure_tables($conn);

$data = $_SERVER['REQUEST_METHOD'] === 'POST' ? community_read_json() : (object) [];

$account = trim((string) community_get_request_value($data, 'Account', ''));
$type = trim((string) community_get_request_value($data, 'type', 'all'));
$search = trim((string) community_get_request_value($data, 'search', ''));
$limit = (int) community_get_request_value($data, 'limit', 30);
$offset = (int) community_get_request_value($data, 'offset', 0);

if ($limit < 1 || $limit > 100) {
    $limit = 30;
}

if ($offset < 0) {
    $offset = 0;
}

$where = ["p.`Status` = 'active'"];
$params = [$account, $account];
$types = 'ss';

if ($type !== '' && $type !== 'all') {
    if (!community_allowed_post_type($type)) {
        community_json_response(['status' => 'error', 'message' => '不支援的動態分類'], 400);
    }
    $where[] = "p.`Post_Type` = ?";
    $params[] = $type;
    $types .= 's';
}

if ($search !== '') {
    $keyword = '%' . $search . '%';
    $where[] = "(p.`Title` LIKE ? OR p.`Content` LIKE ? OR p.`Location_Name` LIKE ? OR m.`Name` LIKE ? OR EXISTS (
        SELECT 1 FROM `Community_Post_Tag` t WHERE t.`Post_ID` = p.`Post_ID` AND t.`Tag_Name` LIKE ?
    ))";
    array_push($params, $keyword, $keyword, $keyword, $keyword, $keyword);
    $types .= 'sssss';
}

$whereSql = implode(' AND ', $where);

$sql = "SELECT p.*, m.`Account`, m.`Name`, m.`Avatar`,
            (SELECT COUNT(*) FROM `Community_Reaction` r WHERE r.`Post_ID` = p.`Post_ID` AND r.`Reaction_Type` = 'like') AS `Like_Count`,
            (SELECT COUNT(*) FROM `Community_Comment` c WHERE c.`Post_ID` = p.`Post_ID` AND c.`Status` = 'active') AS `Comment_Count`,
            EXISTS(SELECT 1 FROM `Community_Reaction` ur WHERE ur.`Post_ID` = p.`Post_ID` AND ur.`Account` = ? AND ur.`Reaction_Type` = 'like') AS `User_Liked`,
            EXISTS(SELECT 1 FROM `Community_Reaction` sr WHERE sr.`Post_ID` = p.`Post_ID` AND sr.`Account` = ? AND sr.`Reaction_Type` = 'save') AS `User_Saved`
        FROM `Community_Post` p
        INNER JOIN `Member` m ON m.`Account` = p.`Account`
        WHERE {$whereSql}
        ORDER BY p.`Created_At` DESC
        LIMIT ? OFFSET ?";

$params[] = $limit;
$params[] = $offset;
$types .= 'ii';

$stmt = $conn->prepare($sql);
community_bind_params($stmt, $types, $params);
$stmt->execute();
$result = $stmt->get_result();

$posts = [];
while ($row = $result->fetch_assoc()) {
    $posts[] = community_format_post($conn, $row);
}

$stmt->close();

community_json_response([
    'status' => 'success',
    'data' => $posts,
]);

?>
