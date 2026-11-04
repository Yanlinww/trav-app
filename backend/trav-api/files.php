<?php
/** 個人檔案入口：讀取、上傳及刪除照片。上傳使用 multipart/form-data。 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/db_connect.php';
$actions = ['get' => 'files_get', 'upload' => 'files_upload', 'delete' => 'files_delete'];
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
    $type = $_POST['type'] ?? 'photos'; // 前端使用 photos／journeys／saved；此處提供預設值，未實作類型白名單。

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
        
        // 時間戳與隨機數降低撞名機率，並替換原名特殊字元；未在此檢查內容格式或副檔名白名單。
        $filename = time() . '_' . rand(1000, 9999) . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", basename($file["name"]));
        $target_file = $target_dir . $filename;
        
        // 移動檔案
        if (move_uploaded_file($file["tmp_name"], $target_file)) {
            $file_url = "/backend/" . $target_file;
            
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

/** 刪除指定帳號的旅遊照片；Account 依本站現有流程由前端提供，不等同登入憑證驗證。 */
function files_delete(mysqli $conn): void {
    require_once __DIR__ . '/itinerary/api_helpers.php';
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('請使用 POST 刪除照片', 405);

    $data = read_json_body();
    $account = is_string($data->Account ?? null) ? trim($data->Account) : '';
    $fileId = filter_var($data->File_ID ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($account === '' || $fileId === false) api_error('缺少有效的帳號或照片編號', 400);

    $conn->begin_transaction();
    try {
        // 鎖定符合帳號及 photos 類型的照片，不接受前端傳入任意檔案路徑。
        $find = $conn->prepare("SELECT File_URL FROM UserFiles WHERE File_ID = ? AND Account = ? AND Tab_Type = 'photos' FOR UPDATE");
        $find->bind_param('is', $fileId, $account);
        $find->execute();
        $photo = $find->get_result()->fetch_assoc();
        $find->close();
        if (!$photo) {
            $conn->rollback();
            $conn->close();
            api_error('找不到可刪除的照片，或照片不屬於此帳號', 404);
        }

        $delete = $conn->prepare("DELETE FROM UserFiles WHERE File_ID = ? AND Account = ? AND Tab_Type = 'photos'");
        $delete->bind_param('is', $fileId, $account);
        $delete->execute();
        if ($delete->affected_rows !== 1) throw new RuntimeException('照片紀錄未刪除');
        $delete->close();
        $conn->commit();
    } catch (Throwable $error) {
        $conn->rollback();
        error_log('Photo deletion failed: ' . $error->getMessage());
        $conn->close();
        api_error('刪除照片失敗，請稍後再試', 500);
    }

    // 紀錄成功移除後才清理本機檔案；清理失敗不把已成功的相簿刪除誤報為失敗。
    try {
        files_remove_local_photo($conn, (string)$photo['File_URL']);
    } catch (Throwable $error) {
        error_log('Photo cleanup failed: ' . $error->getMessage());
    }
    $conn->close();
    api_json(['status' => 'success', 'message' => '照片已刪除', 'fileId' => $fileId]);
}

/** 只清理此服務 uploads/photos 內的檔案；外部網址、共用紀錄及目錄外路徑不刪。 */
function files_remove_local_photo(mysqli $conn, string $url): void {
    if (str_starts_with($url, '/backend/uploads/photos/')) {
        $relative = substr($url, strlen('/backend/'));
    } elseif (str_starts_with($url, '/uploads/photos/')) {
        $relative = ltrim($url, '/');
    } else {
        return;
    }

    $base = realpath(__DIR__ . '/uploads/photos');
    $path = realpath(__DIR__ . '/' . $relative);
    if ($base === false || $path === false || !is_file($path) || !str_starts_with($path, $base . DIRECTORY_SEPARATOR)) return;

    // 同一張本機照片仍被其他相簿紀錄引用時，保留實體檔案。
    $canonicalUrl = '/backend/' . $relative;
    $legacyUrl = '/' . $relative;
    $shared = $conn->prepare('SELECT 1 FROM UserFiles WHERE File_URL IN (?, ?) LIMIT 1');
    $shared->bind_param('ss', $canonicalUrl, $legacyUrl);
    $shared->execute();
    $inUse = $shared->get_result()->num_rows > 0;
    $shared->close();
    // 權限或檔案競爭造成的警告只寫日誌，避免混入 JSON 讓前端誤判刪除失敗。
    if (!$inUse && !@unlink($path)) error_log('Unable to remove deleted photo file');
}
