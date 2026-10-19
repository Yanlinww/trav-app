<?php
/** 個人社交入口：公開個人資料與社群連結。 */

// ==========================================
// 1. CORS 跨域設定 (讓 Next.js 前端可以順利打 API)
// ==========================================
header('Access-Control-Allow-Origin: *'); // 允許所有網域呼叫這支 API (開發期通常設 *)
header('Access-Control-Allow-Methods: POST, OPTIONS'); // 允許的 HTTP 請求方法
header('Access-Control-Allow-Headers: Content-Type'); // 允許前端傳送 Content-Type 標頭
header('Content-Type: application/json; charset=utf-8'); // 告訴前端：我回傳的格式是 JSON，並且支援中文 (utf-8)

// 取得前端傳來的 action 參數 (例如：?action=links)
$action =$_GET['action'] ?? '';

// 攔截 OPTIONS 預檢請求：瀏覽器在發 POST 前會先發 OPTIONS 檢查，這裡直接回傳 200 OK 讓它通過
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
    'update_links' => 'social_update_links' // 更新社群連結
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
        // 準備 SQL：只撈取帳號、名稱、大頭貼
        $stmt =$conn->prepare("SELECT Account, Name, Avatar FROM Member WHERE Account = ?");
        $stmt->bind_param("s", $account); // 把變數綁定到 ? 的位置 (防 SQL 隱碼攻擊)
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
                    "avatar" => $user['Avatar']
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
        // 準備 SQL：從會員表撈取那包 JSON (假設欄位名稱為 Social_Links，若是中文請自行替換)
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
        // JSON_UNESCAPED_UNICODE 確保網址裡如果有中文 (例如小紅書網址)，不會變成亂碼
        $json_string = json_encode($social_array, JSON_UNESCAPED_UNICODE);

        // 3. 準備 SQL：把這包壓縮好的字串，塞進單一欄位 `Social_Links` 裡
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