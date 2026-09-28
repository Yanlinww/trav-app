<?php
/**
 * 社群功能入口：貼文列表、熱門標籤、留言、發文、互動及新增留言。
 * 網址格式：/community/community.php?action=posts|topics|comments|create|reaction|comment。
 * 讀取使用 GET，寫入使用 POST；只有 create 接受圖片 multipart/form-data。
 * 共用查詢、格式化及回應函式保留在 community_helpers.php。
 */
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/community_helpers.php';

/**
 * posts（GET）：依分類、關鍵字及查看者帳號取得貼文；保留批次讀取標籤與圖片的流程。
 * 原端點：get_posts.php；保留原輸入欄位與 JSON 回應格式。
 */
function community_list_posts(mysqli $conn): void
{
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

    $postIds = [];
    while ($row = $result->fetch_assoc()) {
        $postIds[] = (int) $row['Post_ID'];
    }

    $stmt->close();
    $posts = community_fetch_posts_by_ids($conn, $postIds, $currentUser);
    $conn->close();

    // 呼叫 Helper 的 JSON 回傳函式
    community_json_response([
        "status" => "success",
        "data" => array_values($posts)
    ]);
}

/**
 * topics（GET）：讀取熱門標籤及其貼文數量。
 * 原端點：get_topics.php；保留原輸入欄位與 JSON 回應格式。
 */
function community_list_topics(mysqli $conn): void
{
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
}

/**
 * comments（GET）：依 postId 讀取單篇貼文的留言；原本由展開留言時另行載入。
 * 原端點：get_comments.php；保留原輸入欄位與 JSON 回應格式。
 */
function community_list_comments(mysqli $conn): void
{
    $postId = (int) ($_GET['postId'] ?? 0);
    if ($postId <= 0) {
        community_json_response(['status' => 'error', 'message' => '缺少貼文編號。'], 422);
    }

    $postStmt = $conn->prepare("SELECT 1 FROM `Community_Post` WHERE `Post_ID` = ? AND `Status` = 'active' LIMIT 1");
    if (!$postStmt) {
        community_json_response(['status' => 'error', 'message' => '無法讀取貼文。'], 500);
    }
    $postStmt->bind_param('i', $postId);
    $postStmt->execute();
    $postExists = $postStmt->get_result()->fetch_row();
    $postStmt->close();

    if (!$postExists) {
        community_json_response(['status' => 'error', 'message' => '找不到此貼文。'], 404);
    }

    $comments = community_fetch_comments($conn, $postId);
    $conn->close();

    community_json_response([
        'status' => 'success',
        'data' => $comments,
    ]);
}

/**
 * create（POST）：建立貼文、標籤及選填圖片；同時接受 JSON 與 multipart/form-data。
 * 原端點：create_post.php；保留原輸入欄位與 JSON 回應格式。
 */
function community_create_post(mysqli $conn): void
{
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
}

/**
 * reaction（POST）：切換貼文的 like 或 save；按讚時保留通知原作者的流程。
 * 原端點：toggle_reaction.php；保留原輸入欄位與 JSON 回應格式。
 */
function community_toggle_reaction(mysqli $conn): void
{
    $data = json_decode(file_get_contents("php://input"));
    $account = $data->Account ?? '';
    $postId = $data->Post_ID ?? 0;
    $reactionType = $data->Reaction_Type ?? ''; // 'like' 或 'save'

    if ($account && $postId && $reactionType) {
        // 檢查目前狀態
        $check = $conn->prepare("SELECT 1 FROM Community_Reaction WHERE Post_ID = ? AND Account = ? AND Reaction_Type = ?");
        $check->bind_param("iss", $postId, $account, $reactionType);
        $check->execute();
        $exists = $check->get_result()->num_rows > 0;
        $check->close();

        $active = false;
        if ($exists) {
            $del = $conn->prepare("DELETE FROM Community_Reaction WHERE Post_ID = ? AND Account = ? AND Reaction_Type = ?");
            $del->bind_param("iss", $postId, $account, $reactionType);
            $del->execute();
            $active = false;
        } else {
            $ins = $conn->prepare("INSERT INTO Community_Reaction (Post_ID, Account, Reaction_Type) VALUES (?, ?, ?)");
            $ins->bind_param("iss", $postId, $account, $reactionType);
            $ins->execute();
            $active = true;

            // 🌟 【新增】按讚成功時，發通知給原作者 (不能通知自己) 🌟
            if ($reactionType === 'like') {
                $getPost = $conn->prepare("SELECT Account FROM Community_Post WHERE Post_ID = ?");
                $getPost->bind_param("i", $postId);
                $getPost->execute();
                $postOwner = $getPost->get_result()->fetch_assoc()['Account'] ?? '';
                $getPost->close();

                if ($postOwner && $postOwner !== $account) {
                    $msg = "喜歡你的貼文";
                    $notif = $conn->prepare("INSERT INTO Notifications (Account, Sender_Account, Type, Reference_ID, Message) VALUES (?, ?, 'like', ?, ?)");
                    $notif->bind_param("ssss", $postOwner, $account, $postId, $msg);
                    $notif->execute();
                }
            }
        }

        $count = $conn->prepare("SELECT COUNT(*) as c FROM Community_Reaction WHERE Post_ID = ? AND Reaction_Type = 'like'");
        $count->bind_param("i", $postId);
        $count->execute();
        $likes = $count->get_result()->fetch_assoc()['c'];

        echo json_encode(["status" => "success", "data" => ["active" => $active, "likes" => $likes]]);
    } else {
        echo json_encode(["status" => "error", "message" => "缺少參數"]);
    }
}

/**
 * comment（POST）：新增留言／回覆，通知貼文作者或被回覆者，並回傳新留言。
 * 原端點：add_comment.php；保留原輸入欄位與 JSON 回應格式。
 */
function community_add_comment(mysqli $conn): void
{
    $data = json_decode(file_get_contents("php://input"));
    $account = $data->Account ?? '';
    $postId = $data->Post_ID ?? 0;
    $content = $data->Content ?? '';
    $parentId = $data->Parent_Comment_ID ?? null;

    if ($account && $postId && $content) {
        // 1. 新增留言
        $stmt = $conn->prepare("INSERT INTO Community_Comment (Post_ID, Account, Parent_Comment_ID, Content) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isis", $postId, $account, $parentId, $content);
        $stmt->execute();
        $commentId = $stmt->insert_id;
        $stmt->close();

        // 🌟 2. 【新增】判斷要發通知給誰 🌟
        // 先抓出貼文的擁有者
        $getPost = $conn->prepare("SELECT Account FROM Community_Post WHERE Post_ID = ?");
        $getPost->bind_param("i", $postId);
        $getPost->execute();
        $postOwner = $getPost->get_result()->fetch_assoc()['Account'] ?? '';
        $getPost->close();

        $targetAccount = $postOwner;
        $msg = "在你的貼文底下留言";
        
        // 如果有 Parent_ID，代表是「回覆」，則通知對象改成留言的主人
        if ($parentId) {
            $getParent = $conn->prepare("SELECT Account FROM Community_Comment WHERE Comment_ID = ?");
            $getParent->bind_param("i", $parentId);
            $getParent->execute();
            $parentOwner = $getParent->get_result()->fetch_assoc()['Account'] ?? '';
            $getParent->close();
            
            if ($parentOwner) {
                $targetAccount = $parentOwner;
                $msg = "回覆了你的留言";
            }
        }

        // 發送通知 (不能通知自己)
        if ($targetAccount && $targetAccount !== $account) {
            $notif = $conn->prepare("INSERT INTO Notifications (Account, Sender_Account, Type, Reference_ID, Message) VALUES (?, ?, 'comment', ?, ?)");
            $notif->bind_param("ssss", $targetAccount, $account, $postId, $msg);
            $notif->execute();
        }

        // 3. 抓取剛建立的這筆留言資料回傳給前端
        $stmt = $conn->prepare("
            SELECT c.*, m.Name, m.Avatar 
            FROM Community_Comment c 
            JOIN Member m ON c.Account = m.Account 
            WHERE c.Comment_ID = ?
        ");
        $stmt->bind_param("i", $commentId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        
        $newComment = [
            'id' => (int) $row['Comment_ID'],
            'parentId' => $row['Parent_Comment_ID'] ? (int) $row['Parent_Comment_ID'] : null,
            'account' => $row['Account'],
            'author' => $row['Name'] ?: $row['Account'],
            'avatar' => community_avatar_url($row['Avatar'] ?? ''),
            'content' => $row['Content'],
            'createdAt' => $row['Created_At'],
            'time' => '剛剛',
        ];

        echo json_encode(["status" => "success", "data" => $newComment]);
    } else {
        echo json_encode(["status" => "error", "message" => "缺少參數"]);
    }
}

// 固定 action 白名單；以網址選擇功能，請求參數沿用原端點的 GET、JSON 或 FormData。
$handlers = [
    'posts' => 'community_list_posts', // 依分類、關鍵字及查看者帳號取得貼文；保留批次讀取標籤與圖片的流程。
    'topics' => 'community_list_topics', // 讀取熱門標籤及其貼文數量。
    'comments' => 'community_list_comments', // 依 postId 讀取單篇貼文的留言；原本由展開留言時另行載入。
    'create' => 'community_create_post', // 建立貼文、標籤及選填圖片；同時接受 JSON 與 multipart/form-data。
    'reaction' => 'community_toggle_reaction', // 切換貼文的 like 或 save；按讚時保留通知原作者的流程。
    'comment' => 'community_add_comment', // 新增留言／回覆，通知貼文作者或被回覆者，並回傳新留言。
];
$action = $_GET['action'] ?? '';
if (!is_string($action) || !isset($handlers[$action])) {
    community_json_response(['status' => 'error', 'message' => '無效的社群操作'], 400);
}
$handlers[$action]($conn);
$conn->close();
