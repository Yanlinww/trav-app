<?php
/** 個人記帳：列出、新增、修改及刪除行程擁有者的花費。 */
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/api_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST 請求', 405);

/** 讀取並檢查表單欄位，避免把無效金額或過長文字寫進資料庫。 */
function expense_input(object $data): array {
    $title = trim((string)($data->Title ?? ''));
    $amount = filter_var($data->Amount ?? null, FILTER_VALIDATE_FLOAT);
    $currency = trim((string)($data->Currency ?? 'TWD'));
    $category = trim((string)($data->Category ?? 'other'));
    $location = trim((string)($data->Location ?? ''));

    if ($title === '' || mb_strlen($title) > 255) api_error('請輸入 255 字以內的名稱');
    if ($amount === false || !is_finite($amount) || $amount <= 0) api_error('金額必須大於 0');
    if (!in_array($currency, ['TWD', 'JPY', 'AED'], true)) api_error('無效的幣別');
    if (!in_array($category, ['food', 'hotel', 'transport', 'ticket', 'shopping', 'other'], true)) api_error('無效的類別');
    if (mb_strlen($location) > 100) api_error('地點最多 100 字');

    return [$title, $amount, $currency, $category, $location];
}

function list_personal_expenses(mysqli $conn, object $data): void {
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    $account = trim((string)($data->Account ?? ''));
    require_itinerary_access($conn, $itineraryId, $account);

    $stmt = $conn->prepare('SELECT Expense_ID, Title, Amount, Currency, Category, Location, Created_At FROM Itinerary_Expense WHERE Itinerary_ID = ? ORDER BY Created_At DESC, Expense_ID DESC');
    if (!$stmt) api_error('無法讀取記帳資料', 500);
    $stmt->bind_param('i', $itineraryId);
    if (!$stmt->execute()) api_error('無法讀取記帳資料', 500);

    $expenses = [];
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $expenses[] = [
            'id' => (int)$row['Expense_ID'],
            'title' => $row['Title'],
            'amount' => $row['Amount'],
            'currency' => $row['Currency'],
            'category' => $row['Category'],
            'location' => $row['Location'],
            'date' => $row['Created_At'],
        ];
    }
    $stmt->close();
    api_json(['status' => 'success', 'data' => $expenses]);
}

function create_personal_expense(mysqli $conn, object $data): void {
    $itineraryId = (int)($data->Itinerary_ID ?? 0);
    $account = trim((string)($data->Account ?? ''));
    require_itinerary_access($conn, $itineraryId, $account);
    [$title, $amount, $currency, $category, $location] = expense_input($data);

    $stmt = $conn->prepare('INSERT INTO Itinerary_Expense (Itinerary_ID, Title, Amount, Currency, Category, Location) VALUES (?, ?, ?, ?, ?, ?)');
    if (!$stmt) api_error('無法新增花費', 500);
    $stmt->bind_param('isdsss', $itineraryId, $title, $amount, $currency, $category, $location);
    if (!$stmt->execute()) api_error('無法新增花費', 500);
    $expenseId = $conn->insert_id;
    $stmt->close();
    api_json(['status' => 'success', 'Expense_ID' => $expenseId]);
}

function update_personal_expense(mysqli $conn, object $data): void {
    $expenseId = (int)($data->Expense_ID ?? 0);
    $account = trim((string)($data->Account ?? ''));
    require_resource_access($conn, 'Itinerary_Expense', 'Expense_ID', $expenseId, $account);
    [$title, $amount, $currency, $category, $location] = expense_input($data);

    $stmt = $conn->prepare('UPDATE Itinerary_Expense SET Title = ?, Amount = ?, Currency = ?, Category = ?, Location = ? WHERE Expense_ID = ?');
    if (!$stmt) api_error('無法修改花費', 500);
    $stmt->bind_param('sdsssi', $title, $amount, $currency, $category, $location, $expenseId);
    if (!$stmt->execute()) api_error('無法修改花費', 500);
    $stmt->close();
    api_json(['status' => 'success']);
}

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
