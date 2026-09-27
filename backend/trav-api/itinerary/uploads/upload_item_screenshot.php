<?php
/**
 * 上傳細項預約截圖：接收圖片 → 儲存檔案 → 更新細項截圖網址。
 * 呼叫：POST /itinerary/uploads/upload_item_screenshot.php，不使用 action。
 * 輸入為 FormData：Item_ID、screenshot（檔案），不是 JSON。
 * 回傳：status、screenshotUrl；圖片實體存放於 API 根目錄 uploads/reservations/。
 */
require_once __DIR__ . '/../../db_connect.php';
require_once __DIR__ . '/../api_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST 請求', 405);

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
