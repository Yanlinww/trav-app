<?php
require_once '../db_connect.php';
require_once 'community_helpers.php';

community_ensure_tables($conn);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    community_json_response(["status" => "error", "message" => "只支援 POST"], 405);
}

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$isMultipart = stripos($contentType, 'multipart/form-data') !== false;
$data = $isMultipart ? (object) $_POST : community_read_json();

$account = trim((string) community_get_request_value($data, 'Account', ''));
$postType = trim((string) community_get_request_value($data, 'Post_Type', 'footprint'));
$title = trim((string) community_get_request_value($data, 'Title', ''));
$content = trim((string) community_get_request_value($data, 'Content', ''));
$location = trim((string) community_get_request_value($data, 'Location_Name', ''));
$coordinates = trim((string) community_get_request_value($data, 'Location_Coordinates', ''));
$tagsInput = community_get_request_value($data, 'Tags', []);
$tags = community_normalize_tags($tagsInput);

if (!community_allowed_post_type($postType)) {
    community_json_response(["status" => "error", "message" => "不支援的動態分類"], 400);
}

if ($account === '' || $content === '') {
    community_json_response(["status" => "error", "message" => "缺少帳號或貼文內容"], 400);
}

$member = community_get_member_by_account($conn, $account);
if (!$member) {
    community_json_response(["status" => "error", "message" => "找不到會員資料，請先登入"], 401);
}

$titleValue = $title !== '' ? $title : null;
$locationValue = $location !== '' ? $location : null;
$coordinatesValue = $coordinates !== '' ? $coordinates : null;

$conn->begin_transaction();

try {
    $stmt = $conn->prepare(
        "INSERT INTO `Community_Post` (`Account`, `Post_Type`, `Title`, `Content`, `Location_Name`, `Location_Coordinates`)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("ssssss", $account, $postType, $titleValue, $content, $locationValue, $coordinatesValue);
    $stmt->execute();
    $postId = (int) $conn->insert_id;
    $stmt->close();

    if (!empty($tags)) {
        $tagStmt = $conn->prepare("INSERT IGNORE INTO `Community_Post_Tag` (`Post_ID`, `Tag_Name`) VALUES (?, ?)");
        foreach ($tags as $tag) {
            $tagStmt->bind_param("is", $postId, $tag);
            $tagStmt->execute();
        }
        $tagStmt->close();
    }

    if ($isMultipart && isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
        if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException('圖片上傳失敗');
        }

        if ($_FILES['image']['size'] > 5 * 1024 * 1024) {
            throw new RuntimeException('圖片不可超過 5MB');
        }

        $mime = mime_content_type($_FILES['image']['tmp_name']);
        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
        ];

        if (!isset($extensions[$mime])) {
            throw new RuntimeException('只允許 JPG、PNG、WEBP、GIF 圖片');
        }

        $uploadDir = dirname(__DIR__) . '/uploads/community';
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
            throw new RuntimeException('無法建立圖片資料夾');
        }

        $fileName = 'community_' . $postId . '_' . time() . '.' . $extensions[$mime];
        $targetPath = $uploadDir . '/' . $fileName;

        if (!move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
            throw new RuntimeException('無法儲存圖片');
        }

        $imageUrl = 'uploads/community/' . $fileName;
        $sortOrder = 0;
        $imageStmt = $conn->prepare("INSERT INTO `Community_Post_Image` (`Post_ID`, `Image_URL`, `Sort_Order`) VALUES (?, ?, ?)");
        $imageStmt->bind_param("isi", $postId, $imageUrl, $sortOrder);
        $imageStmt->execute();
        $imageStmt->close();
    }

    $conn->commit();

    $post = community_fetch_single_post($conn, $postId, $account);
    community_json_response([
        "status" => "success",
        "message" => "貼文已發布",
        "data" => $post,
    ]);
} catch (Throwable $error) {
    $conn->rollback();
    community_json_response([
        "status" => "error",
        "message" => $error->getMessage(),
    ], 500);
}

?>
