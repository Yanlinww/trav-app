<?php
/**
 * 共用 API 工具：JSON 回應、錯誤處理、請求讀取與行程／子資料關係檢查。
 * 這是供其他 PHP require_once 載入的函式庫，本身沒有 action 路由。
 * 除了 itinerary 模組，其他引用此檔案的後端模組也會使用這些工具。
 */
// 設定跨來源請求（CORS）及 JSON 回應格式，供載入此檔案的入口共用。
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// 瀏覽器預檢請求只需回應允許資訊，不執行功能或 SQL。
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

/**
 * 共用工具：回傳 JSON 並結束請求
 * 輸入：payload（回應陣列）、status（HTTP 狀態碼，預設 200）。
 * 保留中文字與斜線，再 exit；呼叫後不會繼續執行下面的程式。
 */
function api_json(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

/**
 * 共用工具：回傳統一錯誤
 * 輸入：message、status（HTTP 狀態碼，預設 400）。
 * 透過 api_json 回傳 {status: error, message: ...}，並結束請求。
 */
function api_error(string $message, int $status = 400): void {
    api_json(['status' => 'error', 'message' => $message], $status);
}

/**
 * 共用工具：讀取前端 JSON
 * 從 php://input 讀取 POST 內容，解碼成物件供 $data->欄位 使用。
 * 只接受 JSON 物件；無效 JSON、陣列或其他型別會回 HTTP 400。
 */
function read_json_body(): object {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', false);
    if (!is_object($data)) api_error('請提供有效的 JSON 請求內容', 400);
    return $data;
}

/**
 * 共用工具：檢查行程與帳號的關係
 * 輸入：資料庫連線、itineraryId、account；符合擁有者或成員就繼續。
 * 資料不足回 400，查無符合關係回 403，SQL 準備失敗回 500。
 * 此處比對傳入 Account 的資料關係，不負責驗證登入身分。
 */
function require_itinerary_access(mysqli $conn, int $itineraryId, string $account): void {
    if ($itineraryId <= 0 || trim($account) === '') api_error('缺少行程 ID 或帳號', 400);
    $stmt = $conn->prepare(
        'SELECT 1 FROM Itinerary i LEFT JOIN Itinerary_Members m ON m.Itinerary_ID = i.Itinerary_ID AND m.Account = ?
         WHERE i.Itinerary_ID = ? AND (i.Account = ? OR m.Account IS NOT NULL) LIMIT 1'
    );
    if (!$stmt) api_error('權限檢查失敗', 500);
    $stmt->bind_param('sis', $account, $itineraryId, $account);
    if (!$stmt->execute() || !$stmt->get_result()->fetch_row()) {
        $stmt->close();
        api_error('無權限存取此行程', 403);
    }
    $stmt->close();
}

/**
 * 共用工具：從子資料查回行程並檢查關係
 * 輸入：table、idColumn、resourceId、account；只允許下方白名單中的表與欄位。
 * 一般資料沿父層找到行程；分攤會先找到費用，再遞迴檢查費用所屬行程。
 * 回傳直接父層 ID：分攤回 Expense_ID，其他表回 Itinerary_ID。
 */
function require_resource_access(mysqli $conn, string $table, string $idColumn, int $resourceId, string $account): int {
    // 表名／欄位不能使用 ? 綁定，因此只接受寫死的白名單組合。
    $allowedTables = [
        'Itinerary_Expense' => ['Expense_ID', 'Itinerary_ID'],
        'Itinerary_Expense_Share' => ['Share_ID', 'Expense_ID'],
        'Itinerary_Reservation' => ['Reservation_ID', 'Itinerary_ID'],
        'Itinerary_Note' => ['Note_ID', 'Itinerary_ID'],
    ];
    if (!isset($allowedTables[$table]) || $allowedTables[$table][0] !== $idColumn || $resourceId <= 0 || trim($account) === '') {
        api_error('缺少必要權限資料', 400);
    }
    [$safeIdColumn, $parentColumn] = $allowedTables[$table];
    $stmt = $conn->prepare("SELECT {$parentColumn} FROM {$table} WHERE {$safeIdColumn} = ? LIMIT 1");
    if (!$stmt) api_error('權限檢查失敗', 500);
    $stmt->bind_param('i', $resourceId);
    if (!$stmt->execute() || !($row = $stmt->get_result()->fetch_assoc())) {
        $stmt->close();
        api_error('找不到要操作的資料', 404);
    }
    $stmt->close();
    $parentId = (int)$row[$parentColumn];
    // 分攤的直接父層是費用，必須多查一層才能找到行程。
    if ($table === 'Itinerary_Expense_Share') {
        require_resource_access($conn, 'Itinerary_Expense', 'Expense_ID', $parentId, $account);
    } else {
        require_itinerary_access($conn, $parentId, $account);
    }
    return $parentId;
}
