<?php

ini_set('display_errors', '0');
ini_set('html_errors', '0');

function community_json_response($payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit();
}

set_exception_handler(function (Throwable $error): void {
    community_json_response([
        'status' => 'error',
        'message' => $error->getMessage(),
    ], 500);
});

function community_read_json(): object
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return (object) [];
    }

    $data = json_decode($raw);
    return is_object($data) ? $data : (object) [];
}

function community_allowed_post_type(string $type): bool
{
    return in_array($type, ['footprint', 'question', 'group'], true);
}

function community_get_request_value(object $data, string $key, $fallback = null)
{
    if (isset($data->$key)) {
        return $data->$key;
    }

    return $_GET[$key] ?? $_POST[$key] ?? $fallback;
}

function community_bind_params(mysqli_stmt $stmt, string $types, array &$params): void
{
    $refs = [];
    foreach ($params as $key => &$value) {
        $refs[$key] = &$value;
    }

    array_unshift($refs, $types);
    $stmt->bind_param(...$refs);
}

function community_ensure_tables(mysqli $conn): void
{
    $queries = [
        "CREATE TABLE IF NOT EXISTS `Community_Post` (
            `Post_ID` INT NOT NULL AUTO_INCREMENT,
            `Account` VARCHAR(50) NOT NULL,
            `Post_Type` VARCHAR(20) NOT NULL DEFAULT 'footprint',
            `Title` VARCHAR(120) NULL,
            `Content` TEXT NOT NULL,
            `Location_Name` VARCHAR(100) NULL,
            `Location_Coordinates` VARCHAR(100) NULL,
            `Status` VARCHAR(20) NOT NULL DEFAULT 'active',
            `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `Updated_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`Post_ID`),
            INDEX `idx_community_post_account` (`Account`),
            INDEX `idx_community_post_type_created` (`Post_Type`, `Created_At`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",

        "CREATE TABLE IF NOT EXISTS `Community_Post_Image` (
            `Image_ID` INT NOT NULL AUTO_INCREMENT,
            `Post_ID` INT NOT NULL,
            `Image_URL` VARCHAR(255) NOT NULL,
            `Sort_Order` INT NOT NULL DEFAULT 0,
            `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`Image_ID`),
            INDEX `idx_community_image_post` (`Post_ID`, `Sort_Order`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",

        "CREATE TABLE IF NOT EXISTS `Community_Post_Tag` (
            `Post_ID` INT NOT NULL,
            `Tag_Name` VARCHAR(40) NOT NULL,
            PRIMARY KEY (`Post_ID`, `Tag_Name`),
            INDEX `idx_community_tag_name` (`Tag_Name`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",

        "CREATE TABLE IF NOT EXISTS `Community_Comment` (
            `Comment_ID` INT NOT NULL AUTO_INCREMENT,
            `Post_ID` INT NOT NULL,
            `Account` VARCHAR(50) NOT NULL,
            `Parent_Comment_ID` INT NULL,
            `Content` TEXT NOT NULL,
            `Status` VARCHAR(20) NOT NULL DEFAULT 'active',
            `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `Updated_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`Comment_ID`),
            INDEX `idx_community_comment_post` (`Post_ID`, `Created_At`),
            INDEX `idx_community_comment_account` (`Account`),
            INDEX `idx_community_comment_parent` (`Parent_Comment_ID`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",

        "CREATE TABLE IF NOT EXISTS `Community_Reaction` (
            `Post_ID` INT NOT NULL,
            `Account` VARCHAR(50) NOT NULL,
            `Reaction_Type` VARCHAR(20) NOT NULL,
            `Created_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`Post_ID`, `Account`, `Reaction_Type`),
            INDEX `idx_community_reaction_account` (`Account`, `Reaction_Type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci",
    ];

    foreach ($queries as $query) {
        if (!$conn->query($query)) {
            throw new RuntimeException($conn->error);
        }
    }

    foreach (['Community_Post', 'Community_Post_Image', 'Community_Post_Tag', 'Community_Comment', 'Community_Reaction'] as $table) {
        $conn->query("ALTER TABLE `{$table}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
    }
}

function community_get_member_by_account(mysqli $conn, ?string $account): ?array
{
    if (!$account) {
        return null;
    }

    $stmt = $conn->prepare("SELECT `Account`, `Name`, `Avatar` FROM `Member` WHERE `Account` = ? LIMIT 1");
    $stmt->bind_param('s', $account);
    $stmt->execute();
    $member = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $member ?: null;
}

function community_normalize_tags($tags): array
{
    if (is_string($tags)) {
        $decoded = json_decode($tags, true);
        $tags = is_array($decoded) ? $decoded : preg_split('/[,，#\s]+/u', $tags);
    }

    if (!is_array($tags)) {
        return [];
    }

    $normalized = [];
    foreach ($tags as $tag) {
        $clean = trim((string) $tag);
        $clean = preg_replace('/^#+/u', '', $clean);
        $clean = function_exists('mb_substr') ? mb_substr($clean, 0, 40) : substr($clean, 0, 120);

        if ($clean !== '' && !in_array($clean, $normalized, true)) {
            $normalized[] = $clean;
        }

        if (count($normalized) >= 8) {
            break;
        }
    }

    return $normalized;
}

function community_time_ago(?string $datetime): string
{
    if (!$datetime) {
        return '';
    }

    $timestamp = strtotime($datetime);
    if (!$timestamp) {
        return $datetime;
    }

    $diff = time() - $timestamp;
    if ($diff < 60) {
        return '剛剛';
    }
    if ($diff < 3600) {
        return floor($diff / 60) . ' 分鐘前';
    }
    if ($diff < 86400) {
        return floor($diff / 3600) . ' 小時前';
    }
    if ($diff < 604800) {
        return floor($diff / 86400) . ' 天前';
    }

    return date('Y/m/d', $timestamp);
}

function community_public_url(?string $path): ?string
{
    if (!$path) {
        return null;
    }

    if (preg_match('/^data:image\//i', $path)) {
        return $path;
    }

    if (preg_match('/^https?:\/\//i', $path)) {
        return $path;
    }

    return 'http://localhost:8080/' . ltrim($path, '/');
}

function community_fetch_tags(mysqli $conn, int $postId): array
{
    $stmt = $conn->prepare("SELECT `Tag_Name` FROM `Community_Post_Tag` WHERE `Post_ID` = ? ORDER BY `Tag_Name` ASC");
    $stmt->bind_param('i', $postId);
    $stmt->execute();
    $result = $stmt->get_result();

    $tags = [];
    while ($row = $result->fetch_assoc()) {
        $tags[] = $row['Tag_Name'];
    }

    $stmt->close();
    return $tags;
}

function community_fetch_images(mysqli $conn, int $postId): array
{
    $stmt = $conn->prepare("SELECT `Image_URL` FROM `Community_Post_Image` WHERE `Post_ID` = ? ORDER BY `Sort_Order` ASC, `Image_ID` ASC");
    $stmt->bind_param('i', $postId);
    $stmt->execute();
    $result = $stmt->get_result();

    $images = [];
    while ($row = $result->fetch_assoc()) {
        $images[] = community_public_url($row['Image_URL']);
    }

    $stmt->close();
    return $images;
}

function community_fetch_comments(mysqli $conn, int $postId): array
{
    $stmt = $conn->prepare(
        "SELECT c.`Comment_ID`, c.`Parent_Comment_ID`, c.`Content`, c.`Created_At`, m.`Account`, m.`Name`, m.`Avatar`
         FROM `Community_Comment` c
         INNER JOIN `Member` m ON m.`Account` = c.`Account`
         WHERE c.`Post_ID` = ? AND c.`Status` = 'active'
         ORDER BY c.`Created_At` ASC"
    );
    $stmt->bind_param('i', $postId);
    $stmt->execute();
    $result = $stmt->get_result();

    $comments = [];
    while ($row = $result->fetch_assoc()) {
        $comments[] = [
            'id' => (int) $row['Comment_ID'],
            'parentId' => $row['Parent_Comment_ID'] ? (int) $row['Parent_Comment_ID'] : null,
            'author' => $row['Name'] ?: $row['Account'],
            'avatar' => community_public_url($row['Avatar'] ?? '') ?: '',
            'content' => $row['Content'],
            'createdAt' => $row['Created_At'],
            'time' => community_time_ago($row['Created_At']),
        ];
    }

    $stmt->close();
    return $comments;
}

function community_format_post(mysqli $conn, array $row): array
{
    $postId = (int) $row['Post_ID'];

    return [
        'id' => $postId,
        'type' => $row['Post_Type'],
        'title' => $row['Title'],
        'content' => $row['Content'],
        'location' => $row['Location_Name'],
        'locationCoordinates' => $row['Location_Coordinates'],
        'createdAt' => $row['Created_At'],
        'time' => community_time_ago($row['Created_At']),
        'author' => [
            'name' => $row['Name'] ?: $row['Account'],
            'avatar' => community_public_url($row['Avatar'] ?? '') ?: '',
        ],
        'tags' => community_fetch_tags($conn, $postId),
        'images' => community_fetch_images($conn, $postId),
        'likes' => (int) ($row['Like_Count'] ?? 0),
        'commentCount' => (int) ($row['Comment_Count'] ?? 0),
        'liked' => (bool) ($row['User_Liked'] ?? 0),
        'saved' => (bool) ($row['User_Saved'] ?? 0),
        'comments' => community_fetch_comments($conn, $postId),
    ];
}

function community_fetch_single_post(mysqli $conn, int $postId, string $viewerAccount = ''): ?array
{
    $stmt = $conn->prepare(
        "SELECT p.*, m.`Account`, m.`Name`, m.`Avatar`,
            (SELECT COUNT(*) FROM `Community_Reaction` r WHERE r.`Post_ID` = p.`Post_ID` AND r.`Reaction_Type` = 'like') AS `Like_Count`,
            (SELECT COUNT(*) FROM `Community_Comment` c WHERE c.`Post_ID` = p.`Post_ID` AND c.`Status` = 'active') AS `Comment_Count`,
            EXISTS(SELECT 1 FROM `Community_Reaction` ur WHERE ur.`Post_ID` = p.`Post_ID` AND ur.`Account` = ? AND ur.`Reaction_Type` = 'like') AS `User_Liked`,
            EXISTS(SELECT 1 FROM `Community_Reaction` sr WHERE sr.`Post_ID` = p.`Post_ID` AND sr.`Account` = ? AND sr.`Reaction_Type` = 'save') AS `User_Saved`
         FROM `Community_Post` p
         INNER JOIN `Member` m ON m.`Account` = p.`Account`
         WHERE p.`Post_ID` = ? AND p.`Status` = 'active'
         LIMIT 1"
    );
    $stmt->bind_param('ssi', $viewerAccount, $viewerAccount, $postId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ? community_format_post($conn, $row) : null;
}

?>
