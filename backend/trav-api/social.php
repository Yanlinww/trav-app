<?php
/** 個人社交入口：公開個人資料、社群連結與追蹤。 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');
$action = $_GET['action'] ?? '';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code($action === 'toggle_follow' ? 204 : 200); exit(); }

require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/itinerary/api_helpers.php';
require_once __DIR__ . '/auth/auth_session_helpers.php';

$actions = ['profile' => 'social_profile', 'links' => 'social_links', 'update_links' => 'social_update_links', 'toggle_follow' => 'social_toggle_follow'];
if (!isset($actions[$action])) api_error('無效的個人社交操作', 400);
$actions[$action]($conn);

/** get_user_profile 原本的操作內容。 */
function social_profile(mysqli $conn): void {
    // 🌟 自動建表防呆機制
    $conn->query("CREATE TABLE IF NOT EXISTS `User_Follows` (
        `Follow_ID` INT AUTO_INCREMENT PRIMARY KEY,
        `Follower_Account` VARCHAR(50) NOT NULL COMMENT '按下追蹤的人',
        `Target_Account` VARCHAR(50) NOT NULL COMMENT '被追蹤的對象',
        `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_follow` (`Follower_Account`, `Target_Account`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci");

    $data = json_decode(file_get_contents("php://input"));

    $account = $data->Account ?? '';
    $viewerAccount = get_authenticated_account($conn) ?? '';

    if (!empty($account)) {
        $stmt = $conn->prepare("SELECT Account, Name, Avatar FROM Member WHERE Account = ?");
        $stmt->bind_param("s", $account);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            $stmt->close(); // 關閉連線

            // 取得粉絲數
            $stmtFollowers = $conn->prepare("SELECT COUNT(*) as count FROM User_Follows WHERE Target_Account = ?");
            $stmtFollowers->bind_param("s", $account);
            $stmtFollowers->execute();
            $followersCount = $stmtFollowers->get_result()->fetch_assoc()['count'];
            $stmtFollowers->close();

            // 取得追蹤中
            $stmtFollowing = $conn->prepare("SELECT COUNT(*) as count FROM User_Follows WHERE Follower_Account = ?");
            $stmtFollowing->bind_param("s", $account);
            $stmtFollowing->execute();
            $followingCount = $stmtFollowing->get_result()->fetch_assoc()['count'];
            $stmtFollowing->close();

            // 判斷登入者是否已追蹤
            $isFollowing = false;
            if (!empty($viewerAccount)) {
                $stmtCheck = $conn->prepare("SELECT 1 FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?");
                $stmtCheck->bind_param("ss", $viewerAccount, $account);
                $stmtCheck->execute();
                $isFollowing = $stmtCheck->get_result()->num_rows > 0;
                $stmtCheck->close();
            }

            echo json_encode([
                "status" => "success", 
                "data" => [
                    "account" => $user['Account'],
                    "name" => $user['Name'],
                    "avatar" => $user['Avatar'],
                    "followersCount" => (int)$followersCount,
                    "followingCount" => (int)$followingCount,
                    "isFollowing" => $isFollowing
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

/** get_social_links 原本的操作內容。 */
function social_links(mysqli $conn): void {
    $data = json_decode(file_get_contents("php://input"));

    if (!empty($data->Account)) {
        // 改為從 Member 表撈取 Link_ 開頭的社群欄位
        $stmt = $conn->prepare("SELECT Link_Instagram, Link_Twitter, Link_Xiaohongshu, Link_Tiktok, Link_Youtube, Link_Facebook FROM Member WHERE Account = ?");
        $stmt->bind_param("s", $data->Account);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            
            // 為了不讓前端報錯，回傳給前端時把 key 轉回原本的小寫無前綴格式
            $formattedData = [
                "instagram" => $row['Link_Instagram'] ?? "",
                "twitter" => $row['Link_Twitter'] ?? "",
                "xiaohongshu" => $row['Link_Xiaohongshu'] ?? "",
                "tiktok" => $row['Link_Tiktok'] ?? "",
                "youtube" => $row['Link_Youtube'] ?? "",
                "facebook" => $row['Link_Facebook'] ?? ""
            ];
            
            echo json_encode(["status" => "success", "data" => $formattedData]);
        } else {
            // 如果連會員都找不到的防呆處理
            echo json_encode(["status" => "success", "data" => ["instagram"=>"", "twitter"=>"", "xiaohongshu"=>"", "tiktok"=>"", "youtube"=>"", "facebook"=>""]]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少帳號資訊"]);
    }
    $conn->close();
}

/** update_social_links 原本的操作內容。 */
function social_update_links(mysqli $conn): void {
    $data = json_decode(file_get_contents("php://input"));

    if (!empty($data->Account)) {
        $account = $data->Account;
        $ig = $data->instagram ?? '';
        $tw = $data->twitter ?? '';
        $xhs = $data->xiaohongshu ?? '';
        $tk = $data->tiktok ?? '';
        $yt = $data->youtube ?? '';
        $fb = $data->facebook ?? '';

        // 因為已經合併進 Member 表，我們不需要再判斷 INSERT 還是 UPDATE，一律 UPDATE 即可！
        $update = $conn->prepare("UPDATE Member SET Link_Instagram=?, Link_Twitter=?, Link_Xiaohongshu=?, Link_Tiktok=?, Link_Youtube=?, Link_Facebook=? WHERE Account=?");
        $update->bind_param("sssssss", $ig, $tw, $xhs, $tk, $yt, $fb, $account);
        
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

/** toggle_follow 原本的操作內容。 */
function social_toggle_follow(mysqli $conn): void {
    // 自動建表防呆機制
    $conn->query("CREATE TABLE IF NOT EXISTS `User_Follows` (
        `Follow_ID` INT AUTO_INCREMENT PRIMARY KEY,
        `Follower_Account` VARCHAR(50) NOT NULL COMMENT '按下追蹤的人',
        `Target_Account` VARCHAR(50) NOT NULL COMMENT '被追蹤的對象',
        `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_follow` (`Follower_Account`, `Target_Account`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci");

    $data = read_json_body();
    // 追蹤者只能由有效登入權杖取得，絕不可相信前端傳來的帳號。
    $follower = require_authenticated_account($conn);
    $target = trim((string)($data->Target_Account ?? ''));

    if ($target === '') {
        api_error('缺少要追蹤的旅行者。', 422);
    }
    if ($follower === $target) {
        api_error('不能追蹤自己。', 422);
    }

    $targetExists = $conn->prepare('SELECT 1 FROM Member WHERE Account = ? LIMIT 1');
    if (!$targetExists) api_error('帳號檢查失敗。', 500);
    $targetExists->bind_param('s', $target);
    if (!$targetExists->execute() || !$targetExists->get_result()->fetch_row()) {
        $targetExists->close();
        api_error('找不到此旅行者。', 404);
    }
    $targetExists->close();

    $stmt = $conn->prepare("SELECT 1 FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?");
    if (!$stmt) api_error('追蹤狀態檢查失敗。', 500);
    $stmt->bind_param("ss", $follower, $target);
    $stmt->execute();
    $isFollowing = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    if ($isFollowing) {
        $del = $conn->prepare("DELETE FROM User_Follows WHERE Follower_Account = ? AND Target_Account = ?");
        if (!$del) api_error('取消追蹤失敗。', 500);
        $del->bind_param("ss", $follower, $target);
        $del->execute();
        $del->close();
        $status = false;
    } else {
        $ins = $conn->prepare("INSERT INTO User_Follows (Follower_Account, Target_Account) VALUES (?, ?)");
        if (!$ins) api_error('建立追蹤失敗。', 500);
        $ins->bind_param("ss", $follower, $target);
        $ins->execute();
        $ins->close();
        $status = true;

        // 寫入追蹤通知給對方
        $notifMsg = "開始追蹤你了";
        $notif = $conn->prepare("INSERT INTO Notifications (Account, Sender_Account, Type, Message) VALUES (?, ?, 'follow', ?)");
        if ($notif) {
            $notif->bind_param("sss", $target, $follower, $notifMsg);
            $notif->execute();
            $notif->close();
        }
    }

    $countStmt = $conn->prepare("SELECT COUNT(*) as count FROM User_Follows WHERE Target_Account = ?");
    if (!$countStmt) api_error('追蹤數量讀取失敗。', 500);
    $countStmt->bind_param("s", $target);
    $countStmt->execute();
    $followersCount = $countStmt->get_result()->fetch_assoc()['count'];
    $countStmt->close();

    $conn->close();
    api_json(["status" => "success", "isFollowing" => $status, "followersCount" => (int)$followersCount]);
}
