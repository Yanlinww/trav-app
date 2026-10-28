<?php
/**
 * 行程行李：每份行程只有一份清單，由行程擁有者讀取／儲存。
 * 呼叫：POST /itinerary/luggage.php?action=get 或 update，參數放在 JSON 物件。
 * 主要資料表：Itinerary_Luggage。
 * 閱讀順序：上方共用驗證 → 兩個功能函式 → 底部分派與 JSON 回應。
 */
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/api_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_error('只允許 POST 請求', 405);
}

// 共用入口：網址選操作，JSON 提供行程、帳號及要儲存的行李資料。
$action = $_GET['action'] ?? '';
if (!in_array($action, ['get', 'update'], true)) {
    api_error('無效的行李操作', 400);
}

$data = read_json_body();
if (empty($data->Itinerary_ID)) {
    api_error('缺少行程 ID', 400);
}
// 讀取不需要 LuggageData；儲存必須提供，避免缺欄位時覆寫資料。
if ($action === 'update' && !isset($data->LuggageData)) {
    api_error('缺少必要參數', 400);
}

$itineraryId = (int)$data->Itinerary_ID;
$account = trim((string)($data->Account ?? ''));
// Account 用來比對 Itinerary 的擁有者，不是 Itinerary_Luggage 的欄位。
// 即使行李 SQL 只使用行程 ID，仍要先確認傳入帳號與行程擁有者一致。
require_itinerary_access($conn, $itineraryId, $account);

/**
 * 讀取行程的行李清單
 * action=get｜帳號與行程的關係已在共用驗證區檢查。
 * 只以主鍵 Itinerary_ID 查詢，配合資料表每份行程一筆的設計。
 * 回傳陣列：status、data；data 是前端儲存的 JSON 字串，沒有資料時為 null。
 */
function get_luggage(mysqli $conn, int $itineraryId): array {
    $stmt = $conn->prepare('SELECT `Luggage_Data` FROM `Itinerary_Luggage` WHERE `Itinerary_ID` = ?');
    if (!$stmt) api_error('讀取行李失敗', 500);
    $stmt->bind_param('i', $itineraryId);
    if (!$stmt->execute()) api_error('讀取行李失敗', 500);
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return ['status' => 'success', 'data' => $result['Luggage_Data'] ?? null];
}

/**
 * 儲存行程的行李清單
 * action=update｜輸入：Itinerary_ID、Account、LuggageData（前端傳 JSON 字串）。
 * Account 已在共用入口檢查，不寫入行李表。
 * 沒有該行程的資料時新增；主鍵重複時更新原有清單，避免產生多筆資料。
 * SQL 只寫入 Itinerary_ID／Luggage_Data；若需自動更新時間，須由實際資料表定義負責。
 * 回傳陣列：status；失敗時附 message。此處不解析 LuggageData 的內層 JSON。
 */
function update_luggage(mysqli $conn, int $itineraryId, object $data): array {
    $stmt = $conn->prepare('INSERT INTO `Itinerary_Luggage` (`Itinerary_ID`, `Luggage_Data`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `Luggage_Data` = VALUES(`Luggage_Data`)');
    if (!$stmt) api_error('儲存失敗', 500);
    $stmt->bind_param('is', $itineraryId, $data->LuggageData);
    $saved = $stmt->execute();
    $stmt->close();

    return $saved ? ['status' => 'success'] : ['status' => 'error', 'message' => '儲存失敗'];
}

// 分派至讀取或儲存函式；取得回應陣列後統一關閉連線、輸出 JSON。
$payload = $action === 'get'
    ? get_luggage($conn, $itineraryId)
    : update_luggage($conn, $itineraryId, $data);
$conn->close();
api_json($payload);
