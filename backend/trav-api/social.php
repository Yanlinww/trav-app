<?php
/** 個人社交入口：公開個人資料、社群連結、追蹤切換與追蹤／粉絲名單。 */

// ==========================================
// 1. CORS 跨域設定 (讓 Next.js 前端可以順利打 API)
// ==========================================
header('Access-Control-Allow-Origin: *'); // 允許所有網域呼叫這支 API (開發期通常設 *)
header('Access-Control-Allow-Methods: POST, OPTIONS'); // 允許的 HTTP 請求方法
header('Access-Control-Allow-Headers: Content-Type'); // 目前由 JSON 傳遞帳號資料
header('Content-Type: application/json; charset=utf-8'); // 告訴前端：我回傳的格式是 JSON，並且支援中文 (utf-8)

// 取得前端傳來的 action 參數 (例如：?action=links)
$action =$_GET['action'] ?? '';

// 跨來源 JSON 請求可能先送 OPTIONS 預檢，這裡回 200；追蹤兩個 action 另行強制 POST。
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// ==========================================
// 2. 引入必要檔案與 API 路由設定
// ==========================================
require_once __DIR__ . '/db_connect.php'; // 引入資料庫連線 ($conn)
require_once __DIR__ . '/itinerary/api_helpers.php'; // 引入共用的輔助函數 (例如 api_error)

// 定義這支 API 支援哪些功能 (白名單)
$actions = [
    'profile' => 'social_profile',       // 讀取公開個人資料
    'links' => 'social_links',           // 讀取社群連結
    'update_links' => 'social_update_links', // 更新社群連結
    'toggle_follow' => 'social_toggle_follow', // 追蹤或取消追蹤
    'follow_list' => 'social_follow_list' // 粉絲與追蹤中名單
];

// 如果前端傳來的 action 不在白名單內，就擋下來並報錯
if (!isset($actions[$action])) api_error('無效的個人社交操作', 400);

// 執行對應的函數 (把資料庫連線 $conn 傳進去)
$actions[$action]($conn);


// ==========================================
// 功能 A：讀取會員基本資料 (公開個人頁面用)
// ==========================================
function social_profile(mysqli $conn): void {
    // 接收前端傳來的 JSON 格式資料 (例如：{ "Account": "test@gmail.com" })
    $data = json_decode(file_get_contents("php://input"));
    $account =$data->Account ?? '';

    if (!empty($account)) {
        // 暫以傳入的 Viewer_Account 顯示追蹤狀態；此欄位不是身分驗證。
        $viewer = trim((string)($data->Viewer_Account ?? ''));
        $stmt =$conn->prepare("SELECT m.Account, m.Name, m.Avatar,
            (SELECT COUNT(*) FROM User_Follows f WHERE f.Target_Account = m.Account) AS Followers_Count,
            (SELECT COUNT(*) FROM User_Follows f WHERE f.Follower_Account = m.Account) AS Following_Count,
            EXISTS(SELECT 1 FROM User_Follows f WHERE f.Follower_Account = ? AND f.Target_Account = m.Account) AS Is_Following
            FROM Member m WHERE m.Account = ?");
        $stmt->bind_param("ss", $viewer, $account);
        $stmt->execute();
        $result =$stmt->get_result();

        if ($result->num_rows > 0) {
            $user =$result->fetch_assoc(); // 將撈出來的資料轉成陣列
            $stmt->close();

            // 打包成 JSON 回傳給前端
            echo json_encode([
                "status" => "success", 
                "data" => [
                    "account" => $user['Account'],
                    "name" => $user['Name'],
                    "avatar" => $user['Avatar'],
                    "followersCount" => (int)$user['Followers_Count'],
                    "followingCount" => (int)$user['Following_Count'],
                    "isFollowing" => (bool)$user['Is_Following']
                ]
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "找不到此使用者"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "缺少帳號參數"]);
    }
    $conn->close();
}


// ==========================================
// 功能 B：讀取社群連結 (把資料庫的 JSON 解碼給前端)
// ==========================================
function social_links(mysqli $conn): void {$data = json_decode(file_get_contents("php://input"));

    if (!empty($data->Account)) {
        // 依 Account 讀取 Member.Social_Links 的 JSON 字串，沒有查詢其他 Link_* 欄位。
        $stmt =$conn->prepare("SELECT Social_Links FROM Member WHERE Account = ?");
        $stmt->bind_param("s", $data->Account);$stmt->execute();
        $result =$stmt->get_result();

        if ($result->num_rows > 0) {
            $row =$result->fetch_assoc();
            
            // 【關鍵點】解碼 JSON：把資料庫裡的字串轉回 PHP 陣列 (true 代表轉成關聯陣列)
            $social_data = !empty($row['Social_Links']) ? json_decode($row['Social_Links'], true) : [];
            
            // 重新整理資料格式，確保前端要求的 6 個欄位一定存在 (沒資料就給空字串 "")
            // "??" 是 PHP 的寫法，意思是「如果左邊不存在，就給右邊的預設值」
            $formattedData = [
                "instagram" => $social_data['instagram'] ?? "",
                "twitter" => $social_data['twitter'] ?? "",
                "xiaohongshu" => $social_data['xiaohongshu'] ?? "",
                "tiktok" => $social_data['tiktok'] ?? "",
                "youtube" => $social_data['youtube'] ?? "",
                "facebook" => $social_data['facebook'] ?? ""
            ];
            
            // 把整理好的乾淨資料回傳給前端
            echo json_encode(["status" => "success", "data" => $formattedData]);
        } else {
            // 如果連這個會員都找不到，給前端一組全空的資料，避免畫面壞掉
            echo json_encode(["status" => "success", "data" => ["instagram"=>"", "twitter"=>"", "xiaohongshu"=>"", "tiktok"=>"", "youtube"=>"", "facebook"=>""]]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少帳號資訊"]);
    }
    $conn->close();
}


// ==========================================
// 功能 C：更新社群連結 (把前端的 6 個網址打包成 JSON 存入資料庫)
// ==========================================
function social_update_links(mysqli $conn): void {$data = json_decode(file_get_contents("php://input"));

    if (!empty($data->Account)) {
        $account =$data->Account;
        
        // 1. 把前端傳過來的 6 個零散網址，收集起來裝進一個 PHP 陣列裡
        $social_array = [
            "instagram" => $data->instagram ?? '',
            "twitter" => $data->twitter ?? '',
            "xiaohongshu" => $data->xiaohongshu ?? '',
            "tiktok" => $data->tiktok ?? '',
            "youtube" => $data->youtube ?? '',
            "facebook" => $data->facebook ?? ''
        ];

        // 2. 【關鍵點】編碼 JSON：把剛才的陣列變成「一長串文字 (JSON 格式)」
        // JSON_UNESCAPED_UNICODE 保留中文字而不轉成 Unicode 跳脫表示；不負責驗證網址。
        $json_string = json_encode($social_array, JSON_UNESCAPED_UNICODE);

        // 3. 將 JSON 序列化字串寫入 Social_Links；這不是壓縮或加密，也未在此驗證登入憑證。
        $update =$conn->prepare("UPDATE Member SET Social_Links = ? WHERE Account = ?");
        $update->bind_param("ss", $json_string,$account); // "ss" 代表兩個參數都是字串 (String)
        
        if ($update->execute()) {
            echo json_encode(["status" => "success", "message" => "社群連結已更新！"]);
        } else {
            echo json_encode(["status" => "error", "message" => "更新失敗：" . $conn->error]);
        }
        $update->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少帳號資訊"]);
    }
    $conn->close();
}

/** 暫以請求中的 Follower_Account 切換追蹤；未啟用伺服器身分驗證。 */
function social_toggle_follow(mysqli $conn): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST', 405);
    $data = read_json_body();
    $follower = trim((string)($data->Follower_Account ?? ''));
    $target = trim((string)($data->Target_Account ?? ''));
    if ($follower === '' || strlen($follower) > 30 || $target === '' || strlen($target) > 30) {
        api_error('缺少有效的帳號', 422);
    }
    if ($target === $follower) api_error('不能追蹤自己', 422);

    $followerStmt = $conn->prepare('SELECT Account FROM Member WHERE Account = ?');
    $followerStmt->bind_param('s', $follower);
    $followerStmt->execute();
    $followerRow = $followerStmt->get_result()->fetch_assoc();
    $followerStmt->close();
    if (!$followerRow) api_error('找不到追蹤者帳號', 404);
    $follower = (string)$followerRow['Account'];

    $conn->begin_transaction();
    try {
        // 鎖定被追蹤會員，使同一目標的追蹤／取消追蹤依序處理。
        $member = $conn->prepare('SELECT Account FROM Member WHERE Account = ? FOR UPDATE');
        $member->bind_param('s', $target);
        $member->execute();
        $targetRow = $member->get_result()->fetch_assoc();
        $member->close();
        if (!$targetRow) {
            $conn->rollback();
            $conn->close();
            api_error('找不到此旅行者', 404);
        }
        // 使用資料庫中帳號的原始拼寫，避免大小寫不同時繞過「不能追蹤自己」。
        $target = (string)$targetRow['Account'];
        if ($target === $follower) {
            $conn->rollback();
            $conn->close();
            api_error('不能追蹤自己', 422);
        }

        $check = $conn->prepare('SELECT 1 FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?');
        $check->bind_param('ss', $follower, $target);
        $check->execute();
        $isFollowing = (bool)$check->get_result()->fetch_row();
        $check->close();

        if ($isFollowing) {
            $change = $conn->prepare('DELETE FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?');
        } else {
            $change = $conn->prepare('INSERT INTO User_Follows (Follower_Account, Target_Account) VALUES (?, ?)');
        }
        $change->bind_param('ss', $follower, $target);
        $change->execute();
        $change->close();
        $isFollowing = !$isFollowing;

        if ($isFollowing) {
            $message = '開始追蹤你了';
            $notification = $conn->prepare("INSERT INTO Notifications (Account, Sender_Account, Type, Message) VALUES (?, ?, 'follow', ?)");
            $notification->bind_param('sss', $target, $follower, $message);
            $notification->execute();
            $notification->close();
        }

        $count = $conn->prepare('SELECT COUNT(*) AS n FROM User_Follows WHERE Target_Account = ?');
        $count->bind_param('s', $target);
        $count->execute();
        $followersCount = (int)$count->get_result()->fetch_assoc()['n'];
        $count->close();
        $conn->commit();
        $conn->close();
        api_json(['status' => 'success', 'isFollowing' => $isFollowing, 'followersCount' => $followersCount]);
    } catch (Throwable $error) {
        $conn->rollback();
        $conn->close();
        api_error('更新追蹤狀態失敗', 500);
    }
}

/** 公開名單；可依傳入的 Viewer_Account 顯示追蹤狀態。 */
function social_follow_list(mysqli $conn): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST', 405);
    $data = read_json_body();
    $account = trim((string)($data->Account ?? ''));
    $listType = (string)($data->List_Type ?? '');
    if ($account === '' || !in_array($listType, ['followers', 'following'], true)) {
        api_error('無效的帳號或名單類型', 422);
    }
    $viewer = trim((string)($data->Viewer_Account ?? ''));
    $relatedColumn = $listType === 'followers' ? 'f.Follower_Account' : 'f.Target_Account';
    $ownerColumn = $listType === 'followers' ? 'f.Target_Account' : 'f.Follower_Account';
    $stmt = $conn->prepare(
        "SELECT m.Account, COALESCE(NULLIF(m.Name, ''), m.Account) AS Member_Name, m.Avatar, f.Created_At,
                EXISTS(SELECT 1 FROM User_Follows vf WHERE vf.Follower_Account = ? AND vf.Target_Account = m.Account) AS Is_Followed_By_Viewer
         FROM User_Follows f INNER JOIN Member m ON m.Account = {$relatedColumn}
         WHERE {$ownerColumn} = ? ORDER BY f.Created_At DESC, f.Follow_ID DESC LIMIT 100"
    );
    $stmt->bind_param('ss', $viewer, $account);
    $stmt->execute();
    $members = [];
    foreach ($stmt->get_result() as $row) {
        $members[] = [
            'account' => $row['Account'], 'name' => $row['Member_Name'],
            'avatar' => $row['Avatar'] ?? '', 'createdAt' => $row['Created_At'],
            'isFollowedByViewer' => (bool)$row['Is_Followed_By_Viewer']
        ];
    }
    $stmt->close();
    $conn->close();
    api_json(['status' => 'success', 'data' => $members]);
}
