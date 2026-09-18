<?php
require_once '../db_connect.php';
require_once 'community_helpers.php';

$stmt = $conn->prepare(
    "SELECT t.`Tag_Name`, COUNT(*) AS `Post_Count`
     FROM `Community_Post_Tag` t
     INNER JOIN `Community_Post` p ON p.`Post_ID` = t.`Post_ID`
     WHERE p.`Status` = 'active'
     GROUP BY t.`Tag_Name`
     ORDER BY `Post_Count` DESC, t.`Tag_Name` ASC
     LIMIT 10"
);
$stmt->execute();
$result = $stmt->get_result();

$topics = [];
while ($row = $result->fetch_assoc()) {
    $topics[] = [
        "tag" => $row['Tag_Name'],
        "count" => (int) $row['Post_Count'],
    ];
}

$stmt->close();

community_json_response([
    "status" => "success",
    "data" => $topics,
]);

?>
