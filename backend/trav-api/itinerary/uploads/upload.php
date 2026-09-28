<?php
/** 行程圖片上傳：封面與細項預約截圖共用入口。請求為 FormData。 */
require_once __DIR__ . '/../../db_connect.php';
require_once __DIR__ . '/../api_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST 請求', 405);

$actions = ['cover' => 'upload_itinerary_cover', 'screenshot' => 'upload_item_screenshot'];
$action = $_GET['action'] ?? '';
if (!isset($actions[$action])) api_error('無效的上傳操作', 400);
$actions[$action]($conn);

/** upload_cover_image 原本的檢查、儲存與回應。 */
function upload_itinerary_cover(mysqli $conn): void {
    // 檢查是否收到檔案與必要參數 (注意：FormData 傳遞的文字會放在 $_POST，檔案在 $_FILES)
    if (isset($_FILES['cover_image']) && !empty($_POST['Itinerary_ID']) && !empty($_POST['Account'])) {

        $itinerary_id = $_POST['Itinerary_ID'];
        $account = $_POST['Account'];
        $file = $_FILES['cover_image'];

        // PHP 上傳狀態與 10 MiB 大小限制先檢查，通過後才處理檔案。
        if ($file['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(["status" => "error", "message" => "圖片上傳未完成，請再試一次。"]);
            exit();
        }
        if ($file['size'] > 10 * 1024 * 1024) {
            echo json_encode(["status" => "error", "message" => "圖片最佳化後仍超過 10MB，請換一張較小的圖片。"]);
            exit();
        }

        // 1. 權限驗證：確保這個行程是該使用者的
        $check_stmt = $conn->prepare("SELECT `Itinerary_ID` FROM `Itinerary` WHERE `Itinerary_ID` = ? AND `Account` = ?");
        $check_stmt->bind_param("is", $itinerary_id, $account);
        $check_stmt->execute();
        if ($check_stmt->get_result()->num_rows === 0) {
            echo json_encode(["status" => "error", "message" => "無權限修改此行程。"]);
            exit();
        }
        $check_stmt->close();

        // 2. 實體圖片存於 trav-api/uploads/covers/；這不是存放 PHP 的 itinerary/uploads/。
        $upload_dir = dirname(__DIR__, 2) . '/uploads/covers/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        // 3. 檢查副檔名與圖片內容，再用行程 ID＋秒級時間戳記組合檔名。
        $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        // 允許的副檔名防呆
        $allowed_ext = ['jpg', 'jpeg', 'png', 'webp'];
        if (!in_array(strtolower($file_extension), $allowed_ext)) {
            echo json_encode(["status" => "error", "message" => "僅允許上傳 JPG, PNG 或 WEBP 格式。"]);
            exit();
        }
        // 除了副檔名，也確認暫存檔能被辨識為圖片。
        if (@getimagesize($file['tmp_name']) === false) {
            echo json_encode(["status" => "error", "message" => "無法辨識圖片檔案，請重新選擇圖片。"]);
            exit();
        }

        $new_filename = "cover_" . $itinerary_id . "_" . time() . "." . $file_extension;
        $target_path = $upload_dir . $new_filename;

        // 4. 將檔案從暫存區移動到目標資料夾
        if (move_uploaded_file($file['tmp_name'], $target_path)) {

            // 5. 組合對外網址 (依據你的 Docker 伺服器 Port 8080)
            $image_url = "http://localhost:8080/uploads/covers/" . $new_filename;

            // 6. Itinerary.Cover_Image 只存圖片網址；實體圖片已寫入上面的目錄。
            $update_stmt = $conn->prepare("UPDATE `Itinerary` SET `Cover_Image` = ? WHERE `Itinerary_ID` = ?");
            $update_stmt->bind_param("si", $image_url, $itinerary_id);

            if ($update_stmt->execute()) {
                echo json_encode([
                    "status" => "success",
                    "message" => "圖片更新成功",
                    "new_image_url" => $image_url
                ]);
            } else {
                echo json_encode(["status" => "error", "message" => "資料庫更新失敗。"]);
            }
            $update_stmt->close();

        } else {
            echo json_encode(["status" => "error", "message" => "實體檔案寫入伺服器失敗。"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "缺少圖片檔案或必要參數。"]);
    }

    $conn->close();
}

/** upload_item_screenshot 原本的檢查、儲存與回應。 */
function upload_item_screenshot(mysqli $conn): void {
    // 接收表單傳來的 Item_ID 與圖片檔案
    $itemId = (int)($_POST['Item_ID'] ?? 0);
    $file = $_FILES['screenshot'] ?? null;

    if (!$itemId || !$file || $file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['status' => 'error', 'message' => '缺少必要的檔案或 Item_ID']);
        $conn->close();
        exit();
    }

    // 檔案大小限制 (10MB)
    if ($file['size'] > 10 * 1024 * 1024) {
        echo json_encode(['status' => 'error', 'message' => '檔案不能超過 10MB']);
        $conn->close();
        exit();
    }

    // 副檔名白名單；目前這個入口沒有使用 getimagesize 檢查圖片內容。
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
        echo json_encode(['status' => 'error', 'message' => '只允許 JPG, PNG 或 WEBP 格式']);
        $conn->close();
        exit();
    }

    // 實體截圖存於 trav-api/uploads/reservations/，對應下方公開圖片網址。
    $uploadDir = dirname(__DIR__, 2) . '/uploads/reservations/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // 用細項 ID＋秒級時間戳記組合檔名，再將 PHP 暫存檔搬到上傳目錄。
    $filename = 'item_' . $itemId . '_' . time() . '.' . $extension;
    $targetPath = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        echo json_encode(['status' => 'error', 'message' => '檔案儲存失敗']);
        $conn->close();
        exit();
    }

    // 目前公開網址使用本機 Docker 的 localhost:8080。
    $imageUrl = 'http://localhost:8080/uploads/reservations/' . $filename;

    // Itinerary_Item.Screenshot_URL 存網址；此入口依 Item_ID 更新細項。
    $stmt = $conn->prepare('UPDATE Itinerary_Item SET Screenshot_URL = ? WHERE Item_ID = ?');
    $stmt->bind_param('si', $imageUrl, $itemId);
    $ok = $stmt->execute();
    $stmt->close();
    $conn->close();

    echo json_encode($ok ? ['status' => 'success', 'screenshotUrl' => $imageUrl] : ['status' => 'error', 'message' => '資料庫更新失敗'], JSON_UNESCAPED_UNICODE);
}
