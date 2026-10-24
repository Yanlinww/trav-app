<?php
/**
 * ============================================================================
 * API 模組：個人記帳 (Itinerary_Expense)
 * 功能：列出、新增、修改及刪除行程中的個人花費。
 * 請求格式：Content-Type: application/json
 * 閱讀順序：載入共用工具 → 檢查方法 → 下方 action 分派 → 對應處理函式。
 * list/create 使用 Itinerary_ID + Account；update/delete 使用 Expense_ID + Account。
 * create/update 另接收 Title、Amount、Category、Location；Location 可省略。
 * 本檔的函式宣告不會自行處理請求，真正的呼叫入口在檔案最下方。
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
 * 輸入：JSON 解碼後的物件；使用 ?? 為缺少或 null 的欄位提供預設值。
 * 回傳：[名稱字串、金額數字、分類代碼、地點字串]，呼叫端按相同順序解構。
 * 失敗：api_error 回傳 HTTP 400 並 exit，因此下方 SQL 不會繼續執行。
 * 此函式只驗證內容，不查行程權限，也不直接寫入資料庫。
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

    // mb_strlen 以字元計算長度，避免把中文字的 UTF-8 位元組數誤當字數。
    // || 代表「或」：名稱空白或超長，其中一個條件成立就拒絕。
    if ($title === '' || mb_strlen($title) > 255) {
        api_error('請輸入名稱，且不能超過 255 個字');
    }
    // filter_var 失敗會回傳 false，所以用 === false 區分它與數字 0。
    // is_finite 排除無限大等非有限數值，最後再限制金額必須大於 0。
    if ($amount === false || !is_finite($amount) ||$amount <= 0) {
        api_error('金額格式錯誤，必須是大於 0 的數字');
    }
    // 分類存英文代碼，中文顯示名稱由前端對照；第三參數 true 要求型別也相同。
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
 * 輸入：Itinerary_ID、Account；先驗證擁有者關係，再查指定行程的花費。
 * 回應：{status: 'success', data: [...]}；查不到花費時 data 為空陣列。
 * Account 是請求傳入的帳號；共用函式檢查資料關係，不等同驗證登入憑證。
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

    // ? 代表資料值的位置，bind_param 的 i 表示以整數綁定行程 ID。
    // SQL 結構與資料值分開傳送，不需要手動把行程 ID 拼進 SQL 字串。
    $stmt->bind_param('i',$itineraryId);
    if (!$stmt->execute()) api_error('資料庫執行失敗：無法讀取記帳資料', 500);

    $expenses = [];
    $result =$stmt->get_result(); // 取得查詢結果集

    // fetch_assoc 每次取得一列，以資料庫欄位名稱當 key；沒有下一列時結束迴圈。
    // 將 Expense_ID/Created_At 等欄位轉成前端使用的 id/date，避免前端依賴 SQL 欄名。
    // id 與 amount 顯式轉數字，讓 JSON 回傳數值而非資料庫驅動可能提供的字串。
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

    // close 釋放這次預處理查詢資源；api_json 輸出 JSON 後結束整個請求。
    // 因為 api_json 會 exit，這裡不會再往下進入其他操作。
    api_json(['status' => 'success', 'data' => $expenses]);
}

/**
 * ============================================================================
 * 功能 2：新增一筆記帳 (Create)
 * 先檢查行程擁有者，再驗證表單；兩項皆通過才執行 INSERT。
 * 回應中的 Expense_ID 是資料庫自動產生的主鍵，前端可在重讀清單後使用。
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

    // isdss 對應五個 ?：i=行程整數、s=名稱字串、d=金額數字、s=分類、s=地點。
    // 型別順序必須與 INSERT 欄位及傳入變數一致，不能任意交換。
    $stmt->bind_param('isdss', $itineraryId, $title, $amount, $category, $location);
    if (!$stmt->execute()) api_error('無法新增花費', 500);
    // 在新增成功後取得這條連線最近一次 INSERT 的自動遞增 ID。
    $expenseId = $conn->insert_id;
    $stmt->close();
    api_json(['status' => 'success', 'Expense_ID' => $expenseId]);
}

/**
 * 修改既有花費：接收 Expense_ID、Account 及完整的四個表單欄位。
 * require_resource_access 先查這筆花費屬於哪個行程，再核對該行程擁有者。
 * 這樣不必相信前端額外傳來的行程 ID，也不能只靠知道花費 ID 就更新。
 * 使用同一份 expense_input 規則；這是整份表單更新，不是只修改有傳入的欄位。
 * 回應：{status: 'success'}；前端再呼叫 list 取得最新清單。
 */
function update_personal_expense(mysqli $conn, object $data): void {
    $expenseId = (int)($data->Expense_ID ?? 0);
    $account = trim((string)($data->Account ?? ''));
    require_resource_access($conn, 'Itinerary_Expense', 'Expense_ID', $expenseId, $account);
    [$title, $amount, $category, $location] = expense_input($data);

    $stmt = $conn->prepare('UPDATE Itinerary_Expense SET Title = ?, Amount = ?, Category = ?, Location = ? WHERE Expense_ID = ?');
    if (!$stmt) api_error('無法修改花費', 500);
    // sdssi 依序是名稱、金額、分類、地點、花費 ID；最後一項對應 WHERE 條件。
    $stmt->bind_param('sdssi', $title, $amount, $category, $location, $expenseId);
    if (!$stmt->execute()) api_error('無法修改花費', 500);
    $stmt->close();
    api_json(['status' => 'success']);
}

/**
 * 刪除既有花費：只需要 Expense_ID 與 Account，不需要名稱或金額。
 * 先由共用工具檢查資料存在及擁有者關係，再按主鍵刪除指定一筆。
 * DELETE 會移除紀錄，沒有在此保留軟刪除狀態；確認視窗由前端處理。
 * 回應：{status: 'success'}；若關係檢查失敗，會在執行 DELETE 前結束請求。
 */
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

// URL 的 action 決定要做哪一件事，例如 expenses.php?action=list。
// 這張固定對照表只允許呼叫列出的函式，不能讓輸入直接指定任意 PHP 函式。
$handlers = [
    'list' => 'list_personal_expenses',
    'create' => 'create_personal_expense',
    'update' => 'update_personal_expense',
    'delete' => 'delete_personal_expense',
];
$action = $_GET['action'] ?? '';
// is_string 也會擋下 action[]=list 這類陣列參數，避免拿陣列當對照表索引。
if (!is_string($action) || !isset($handlers[$action])) api_error('無效的記帳操作', 400);
// action 放在網址，表單內容放在 JSON body；兩者來源不同，不要混在一起。
$data = read_json_body();
// 例如 action=list 時，相當於 list_personal_expenses($conn, $data)。
$handlers[$action]($conn, $data);
