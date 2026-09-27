<?php
/**
 * 共用行程：旅伴列表、聊天訊息與在線心跳。
 * 呼叫：POST /itinerary/collaboration.php?action=功能名稱，參數放在 JSON 物件。
 * 主要資料表：Itinerary、Itinerary_Members、Member、Itinerary_Chat_Message。
 * 閱讀順序：先看底部 $handlers 找功能，再看對應函式中的輸入、SQL 與回應。
 */
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/api_helpers.php';

/**
 * 共用工具：確保聊天訊息表存在
 * 供 messages、send 呼叫，不是獨立 action。
 * 表不存在時才建立，用 Itinerary_ID、Message_ID 索引支援行程聊天查詢。
 */
function collaboration_ensure_tables(mysqli $conn): void {
    $conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Chat_Message` (
      `Message_ID` INT AUTO_INCREMENT PRIMARY KEY,
      `Itinerary_ID` INT NOT NULL,
      `Account` VARCHAR(100) NOT NULL,
      `Message` TEXT NOT NULL,
      `Created_At` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (`Itinerary_ID`, `Message_ID`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

/**
 * 讀取旅伴列表
 * action=members｜輸入：Itinerary_ID、Account；先檢查擁有者／成員關係。
 * UNION 合併擁有者與成員，再連接 Member 取得姓名與頭像。
 * 回傳：status、data；每筆含 id、name、role、avatar，沒有姓名時用帳號代替。
 */
function collaboration_get_itinerary_members(mysqli $conn, object $data): void {
    if (!empty($data->Itinerary_ID)) {
        require_itinerary_access($conn, (int)$data->Itinerary_ID, trim((string)($data->Account ?? '')));
        // 上半段取擁有者，下半段取成員；各自連接 Member 取得姓名與頭像。
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
        api_error("缺少行程ID", 400);
    }
}

/**
 * 讀取聊天紀錄
 * action=messages｜輸入：Itinerary_ID、Account。
 * 先取最新 100 筆，再反轉為由舊到新的順序，供聊天畫面顯示。
 * 回傳：status、data；每筆含訊息 ID、發送者、姓名、頭像、內容與建立時間。
 */
function collaboration_get_chat_messages(mysqli $conn, object $data): void {
    collaboration_ensure_tables($conn);

    if (empty($data->Itinerary_ID)) {
      api_error('缺少行程 ID', 400);
    }
    require_itinerary_access($conn, (int)$data->Itinerary_ID, trim((string)($data->Account ?? '')));

    $stmt = $conn->prepare("SELECT c.Message_ID, c.Account, c.Message, c.Created_At, COALESCE(m.Name, c.Account) AS Display_Name, m.Avatar
      FROM Itinerary_Chat_Message c LEFT JOIN Member m ON c.Account = m.Account
      WHERE c.Itinerary_ID = ? ORDER BY c.Message_ID DESC LIMIT 100");
    $stmt->bind_param('i', $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result();
    $messages = [];
    while ($row = $result->fetch_assoc()) {
      $messages[] = [
        'id' => (int)$row['Message_ID'],
        'account' => $row['Account'],
        'name' => $row['Display_Name'],
        'avatar' => $row['Avatar'],
        'message' => $row['Message'],
        'createdAt' => $row['Created_At'],
      ];
    }
    $stmt->close();

    // SQL 由新到舊取最近 100 筆；畫面需要由舊到新，因此反轉陣列。
    echo json_encode(['status' => 'success', 'data' => array_reverse($messages)], JSON_UNESCAPED_UNICODE);
}

/**
 * 傳送聊天訊息
 * action=send｜輸入：Itinerary_ID、Account、Message。
 * 去除訊息前後空白；不可空白，最多 120 個 UTF-8 字元，再檢查行程存取關係。
 * 寫入 Itinerary_Chat_Message；回傳 status，失敗時附 message。
 */
function collaboration_send_chat_message(mysqli $conn, object $data): void {
    collaboration_ensure_tables($conn);

    $message = trim((string)($data->Message ?? ''));
    $account = trim((string)($data->Account ?? ''));
    if (empty($data->Itinerary_ID) || $account === '' || $message === '') {
      api_error('缺少行程 ID、帳號或訊息內容', 400);
    }
    // 使用字元數計算，避免把中文的多個位元組當成多個字。
    if (mb_strlen($message, 'UTF-8') > 120) {
      api_error('訊息最多可輸入 120 字', 400);
    }
    require_itinerary_access($conn, (int)$data->Itinerary_ID, $account);

    $stmt = $conn->prepare('INSERT INTO Itinerary_Chat_Message (Itinerary_ID, Account, Message) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $data->Itinerary_ID, $account, $message);
    $ok = $stmt->execute();
    $stmt->close();

    echo json_encode($ok ? ['status' => 'success'] : ['status' => 'error', 'message' => '訊息傳送失敗'], JSON_UNESCAPED_UNICODE);
}

/**
 * 讀取旅伴最後活躍時間
 * action=presence｜輸入：Itinerary_ID、Account。
 * 讀取成員的 Chat_Last_Seen，轉成 Unix 時間戳記（秒），不直接判定在線與否。
 * 回傳：status、data（帳號 → 時間）；在線判斷由前端處理。
 */
function collaboration_get_chat_presence(mysqli $conn, object $data): void {
    if (empty($data->Itinerary_ID)) {
        api_error('缺少行程 ID', 400);
    }

    require_itinerary_access($conn, (int)$data->Itinerary_ID, trim((string)($data->Account ?? '')));

    // 最後活躍時間轉成 Unix 秒數，讓前端與現在時間比較。
    $stmt = $conn->prepare('SELECT Account, UNIX_TIMESTAMP(Chat_Last_Seen) AS Last_Seen FROM Itinerary_Members WHERE Itinerary_ID = ? AND Chat_Last_Seen IS NOT NULL');
    $stmt->bind_param('i', $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result();

    $presence = [];
    while ($row = $result->fetch_assoc()) {
        $presence[$row['Account']] = (int)$row['Last_Seen'];
    }

    $stmt->close();

    echo json_encode(['status' => 'success', 'data' => $presence]);
}

/**
 * 更新自己的聊天心跳
 * action=update_presence｜輸入：Itinerary_ID、Account。
 * 將該帳號的 Chat_Last_Seen 設為資料庫現在時間；沒有成員列時會建立一列。
 * 只更新活躍時間，不傳送聊天訊息。回傳 status。
 */
function collaboration_update_chat_presence(mysqli $conn, object $data): void {
    $account = trim((string)($data->Account ?? ''));
    if (empty($data->Itinerary_ID) || $account === '') {
        echo json_encode(['status' => 'error', 'message' => '參數錯誤']);

        exit();
    }

    require_itinerary_access($conn, (int)$data->Itinerary_ID, $account);

    // UPSERT：不存在就新增，存在就只更新 Chat_Last_Seen。
    $stmt = $conn->prepare('INSERT INTO Itinerary_Members (Itinerary_ID, Account, Chat_Last_Seen) VALUES (?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE Chat_Last_Seen = CURRENT_TIMESTAMP');
    $stmt->bind_param('is', $data->Itinerary_ID, $account);
    $ok = $stmt->execute();

    $stmt->close();

    echo json_encode($ok ? ['status' => 'success'] : ['status' => 'error', 'message' => '更新失敗']);
}

// ===== 請求入口與功能分派：所有功能共用這一段 =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST 請求', 405);
// 左側是網址的 action，右側是上方要執行的函式；只允許清單中的操作。
$handlers = [
    'members' => 'collaboration_get_itinerary_members', // 讀取旅伴列表
    'messages' => 'collaboration_get_chat_messages', // 讀取聊天紀錄
    'send' => 'collaboration_send_chat_message', // 傳送聊天訊息
    'presence' => 'collaboration_get_chat_presence', // 讀取旅伴最後活躍時間
    'update_presence' => 'collaboration_update_chat_presence', // 更新自己的聊天心跳
];
// 例如 ?action=list；這是網址參數，即使 HTTP 方法是 POST 也用 $_GET 取得。
$action = $_GET['action'] ?? '';
if (!is_string($action) || !isset($handlers[$action])) api_error('無效的操作', 400);
// JSON 參數轉成物件，交給被選中的功能函式處理。
$data = read_json_body();
// 呼叫對應函式；回傳後關閉資料庫連線（若函式已 exit，則不會走到下方）。
$handlers[$action]($conn, $data);
$conn->close();
