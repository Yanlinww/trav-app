<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

function api_json(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

function api_error(string $message, int $status = 400): void {
    api_json(['status' => 'error', 'message' => $message], $status);
}

function read_json_body(): object {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', false);
    if (!is_object($data)) api_error('請提供有效的 JSON 請求內容', 400);
    return $data;
}

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

function require_resource_access(mysqli $conn, string $table, string $idColumn, int $resourceId, string $account): int {
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
    if ($table === 'Itinerary_Expense_Share') {
        require_resource_access($conn, 'Itinerary_Expense', 'Expense_ID', $parentId, $account);
    } else {
        require_itinerary_access($conn, $parentId, $account);
    }
    return $parentId;
}
