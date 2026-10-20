<?php
/**
 * ============================================================================
 * API 模組：個人記帳 (Itinerary_Expense)
 * 功能：列出、新增、修改及刪除行程中的個人花費。
 * 請求格式：Content-Type: application/json
 * ============================================================================
 */

// 載入資料庫連線設定檔
require_once __DIR__ . '/../db_connect.php';
// 載入自訂的 API 輔助函式庫 (包含 api_error, api_json, read_json_body 等)
require_once __DIR__ . '/api_helpers.php';

// 【防呆與資安】限制這支 API 的請求方法為 POST；行程擁有者關係由下方共用函式檢查
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_error('只允許 POST 請求', 405);
}

/**
 * ============================================================================
 * 共用函式：驗證並過濾前端傳來的新增/修改表單資料
 * 為什麼要獨立寫出來？因為 Create 和 Update 都會用到，寫在一起可以避免程式碼重複 (DRY 原則)
 * ============================================================================
 */
function expense_input(object $data): array {
    // 1. 抓取資料並去除前後多餘空白 (trim)
    $title = trim((string)($data->Title ?? ''));
    // 2. 使用 filter_var 驗證金額格式；SQL 參數另由預處理綁定
    $amount = filter_var($data->Amount ?? null, FILTER_VALIDATE_FLOAT);
    // 3. 抓取類別，如果前端沒傳預設就是 'other'
    $category = trim((string)($data->Category ?? 'other'));
    $location = trim((string)($data->Location ?? ''));

    // 【嚴格防呆校驗】
    if ($title === '' || mb_strlen($title) > 255) {
        api_error('請輸入名稱，且不能超過 255 個字');
    }
    // is_finite 檢查是否為合理的有限數字，排除 Infinity 等異常值
    if ($amount === false || !is_finite($amount) ||$amount <= 0) {
        api_error('金額格式錯誤，必須是大於 0 的數字');
    }
    // 白名單機制：限制類別只能是陣列裡的這幾種，防範資料庫被寫入亂碼
    if (!in_array($category, ['food', 'hotel', 'transport', 'ticket', 'shopping', 'other'], true)) {
        api_error('無效的消費類別');
    }
    if ($location !== '' && mb_strlen($location) > 100) {
        api_error('地點名稱過長，最多 100 個字');
    }

    // 回傳通過上述欄位檢查的資料，後續仍需綁定 SQL 參數
    return [$title,$amount, $category,$location];
}

/**
 * ============================================================================
 * 功能 1：列出該行程的所有記帳紀錄 (List)
 * ============================================================================
 */
function list_personal_expenses(mysqli $conn, object$data): void {
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    $account = trim((string)($data->Account ?? ''));

    // 【權限驗證】呼叫輔助函式，確認傳入 Account 是該行程的擁有者
    require_itinerary_access($conn, $itineraryId,$account);

    // 準備 SQL 查詢：撈出該行程底下的所有花費，並按照建立時間與 ID 倒序排列 (最新的在最上面)
    $stmt =$conn->prepare('SELECT Expense_ID, Title, Amount, Category, Location, Created_At FROM Itinerary_Expense WHERE Itinerary_ID = ? ORDER BY Created_At DESC, Expense_ID DESC');
    if (!$stmt) api_error('資料庫查詢準備失敗：無法讀取記帳資料', 500);

    // 綁定參數：'i' 代表整數 (Integer)
    $stmt->bind_param('i',$itineraryId);
    if (!$stmt->execute()) api_error('資料庫執行失敗：無法讀取記帳資料', 500);

    $expenses = [];
    $result =$stmt->get_result(); // 取得查詢結果集

    // 使用 while 迴圈一筆一筆抓出來，打包成前端好讀的關聯陣列 (Associative Array)
    while ($row = $result->fetch_assoc()) {$expenses[] = [
            'id'       => (int)$row['Expense_ID'],
            'title'    => $row['Title'],
            'amount'   => (float)$row['Amount'], // 確保吐給前端的是數字型態
            'category' => $row['Category'],
            'location' => $row['Location'],
            'date'     => $row['Created_At'],
        ];
    }
    $stmt->close();

    // 回傳成功狀態與資料陣列給前端
    api_json(['status' => 'success', 'data' => $expenses]);
}

/**
 * ============================================================================
 * 功能 2：新增一筆記帳 (Create)
 * ============================================================================
 */
function create_personal_expense(mysqli $conn, object$data): void {
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    $account = trim((string)($data->Account ?? ''));

    // 【權限驗證】確認傳入 Account 是該行程的擁有者
    require_itinerary_access($conn, $itineraryId,$account);

    // 呼叫我們剛剛寫的防呆函式，取得乾淨的表單資料 (使用 list / 解構賦值語法)
    [$title, $amount,$category, $location] = expense_input($data);

    // 準備新增語法 (預處理，防止 SQL 隱碼攻擊)
    $stmt =$conn->prepare('INSERT INTO Itinerary_Expense (Itinerary_ID, Title, Amount, Category, Location) VALUES (?, ?, ?, ?, ?)');
    if (!$stmt) api_error('資料庫語法錯誤：無法新增花費', 500);

    // 依序綁定行程 ID、名稱、金額、類別與地點，執行後回傳新花費 ID。
    $stmt->bind_param('isdss', $itineraryId, $title, $amount, $category, $location);
    if (!$stmt->execute()) api_error('無法新增花費', 500);
    $expenseId = $conn->insert_id;
    $stmt->close();
    api_json(['status' => 'success', 'Expense_ID' => $expenseId]);
}

/** 修改既有花費：先由花費 ID 查回行程並檢查擁有者，再驗證欄位及更新。 */
function update_personal_expense(mysqli $conn, object $data): void {
    $expenseId = (int)($data->Expense_ID ?? 0);
    $account = trim((string)($data->Account ?? ''));
    require_resource_access($conn, 'Itinerary_Expense', 'Expense_ID', $expenseId, $account);
    [$title, $amount, $category, $location] = expense_input($data);

    $stmt = $conn->prepare('UPDATE Itinerary_Expense SET Title = ?, Amount = ?, Category = ?, Location = ? WHERE Expense_ID = ?');
    if (!$stmt) api_error('無法修改花費', 500);
    $stmt->bind_param('sdssi', $title, $amount, $category, $location, $expenseId);
    if (!$stmt->execute()) api_error('無法修改花費', 500);
    $stmt->close();
    api_json(['status' => 'success']);
}

/** 刪除既有花費：通過所屬行程的擁有者關係檢查後才執行 DELETE。 */
function delete_personal_expense(mysqli $conn, object $data): void {
    $expenseId = (int)($data->Expense_ID ?? 0);
    $account = trim((string)($data->Account ?? ''));
    require_resource_access($conn, 'Itinerary_Expense', 'Expense_ID', $expenseId, $account);

    $stmt = $conn->prepare('DELETE FROM Itinerary_Expense WHERE Expense_ID = ?');
    if (!$stmt) api_error('無法刪除花費', 500);
    $stmt->bind_param('i', $expenseId);
    if (!$stmt->execute()) api_error('無法刪除花費', 500);
    $stmt->close();
    api_json(['status' => 'success']);
}

// 恢復前端使用的四個操作入口；拒絕未知 action，並統一讀取 JSON 請求。
$handlers = [
    'list' => 'list_personal_expenses',
    'create' => 'create_personal_expense',
    'update' => 'update_personal_expense',
    'delete' => 'delete_personal_expense',
];
$action = $_GET['action'] ?? '';
if (!is_string($action) || !isset($handlers[$action])) api_error('無效的記帳操作', 400);
$data = read_json_body();
$handlers[$action]($conn, $data);
