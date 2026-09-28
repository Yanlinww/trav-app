<?php
/** 個人檔案入口：讀取清單及上傳照片。上傳使用 multipart/form-data。 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/db_connect.php';
$actions = ['get' => 'files_get', 'upload' => 'files_upload'];
$action = $_GET['action'] ?? '';
if (!isset($actions[$action])) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => '無效的檔案操作'], JSON_UNESCAPED_UNICODE); exit(); }
$actions[$action]($conn);

/** get_user_files 原本的操作內容。 */
function files_get(mysqli $conn): void {
    $data = json_decode(file_get_contents("php://input"));

    if (!empty($data->Account) && !empty($data->Tab_Type)) {
        // 依據帳號與分頁類型，撈出所有檔案，並依照上傳時間由新到舊排序
        $stmt = $conn->prepare("SELECT * FROM `UserFiles` WHERE `Account` = ? AND `Tab_Type` = ? ORDER BY `Upload_Time` DESC");
        $stmt->bind_param("ss", $data->Account, $data->Tab_Type);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $files = [];
        while($row = $result->fetch_assoc()) {
            $files[] = $row;
        }
        
        echo json_encode([
            "status" => "success", 
            "data" => $files
        ]);
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少查詢參數"]);
    }
    $conn->close();
}

/** upload_photo 原本的操作內容。 */
function files_upload(mysqli $conn): void {
    // 接收表單傳來的文字資料
    $account = $_POST['Account'] ?? '';
    $type = $_POST['type'] ?? 'photos'; // photos, journeys, 或 saved

    // 檢查帳號是否為空
    if (empty($account)) {
        echo json_encode(["status" => "error", "message" => "遺失使用者帳號資訊。"]);
        exit();
    }

    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['file'];
        
        // 設定儲存資料夾
        $target_dir = "uploads/" . $type . "/";
        if (!is_dir($target_dir)) {
            mkdir($target_dir, 0777, true);
        }
        
        // 重新命名檔案避免重複
        $filename = time() . '_' . rand(1000, 9999) . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", basename($file["name"]));
        $target_file = $target_dir . $filename;
        
        // 移動檔案
        if (move_uploaded_file($file["tmp_name"], $target_file)) {
            $file_url = "http://localhost:8080/" . $target_file;
            
            // 🌟 核心新增：將檔案資訊寫入資料庫 🌟
            $stmt = $conn->prepare("INSERT INTO `UserFiles` (`Account`, `Tab_Type`, `File_URL`) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $account, $type, $file_url);
            
            if ($stmt->execute()) {
                echo json_encode([
                    "status" => "success", 
                    "message" => "上傳並成功寫入資料庫！",
                    "url" => $file_url
                ]);
            } else {
                echo json_encode(["status" => "error", "message" => "檔案已上傳，但資料庫寫入失敗：" . $conn->error]);
            }
            $stmt->close();
            
        } else {
            echo json_encode(["status" => "error", "message" => "檔案移動失敗，請檢查伺服器權限。"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "沒有接收到檔案，或檔案過大。"]);
    }

    $conn->close();
}
