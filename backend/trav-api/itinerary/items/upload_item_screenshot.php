<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../db_connect.php';

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

// 副檔名檢查
$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
    echo json_encode(['status' => 'error', 'message' => '只允許 JPG, PNG 或 WEBP 格式']);
    $conn->close();
    exit();
}

// 確保上傳資料夾存在 (維持你原本的 reservations 資料夾，或是改成 items 也可以)
$uploadDir = '../uploads/reservations/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$filename = 'item_' . $itemId . '_' . time() . '.' . $extension;
$targetPath = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    echo json_encode(['status' => 'error', 'message' => '檔案儲存失敗']);
    $conn->close();
    exit();
}

// 組合圖片網址 (請確認這裡的 Port 是 8080 還是你的實際 Port)
$imageUrl = 'http://localhost:8080/uploads/reservations/' . $filename;

// 寫入 Itinerary_Item 資料表
$stmt = $conn->prepare('UPDATE Itinerary_Item SET Screenshot_URL = ? WHERE Item_ID = ?');
$stmt->bind_param('si', $imageUrl, $itemId);
$ok = $stmt->execute();
$stmt->close();
$conn->close();

echo json_encode($ok ? ['status' => 'success', 'screenshotUrl' => $imageUrl] : ['status' => 'error', 'message' => '資料庫更新失敗'], JSON_UNESCAPED_UNICODE);
?>