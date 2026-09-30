<?php
/** 個人社交入口：公開個人資料與社群連結。 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
$action = $_GET['action'] ?? '';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/itinerary/api_helpers.php';

$actions = ['profile' => 'social_profile', 'links' => 'social_links', 'update_links' => 'social_update_links'];
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

            echo json_encode([
                "status" => "success", 
                "data" => [
                    "account" => $user['Account'],
                    "name" => $user['Name'],
                    "avatar" => $user['Avatar'],
                    "followersCount" => (int)$followersCount,
                    "followingCount" => (int)$followingCount
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
