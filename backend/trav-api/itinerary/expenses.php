<?php
/**
 * 記帳與分帳：費用列表、新增、修改、刪除及分攤結清。
 * 呼叫：POST /itinerary/expenses.php?action=功能名稱，參數放在 JSON 物件。
 * 主要資料表：Itinerary_Expense（費用）、Itinerary_Expense_Share（每人的分攤）。
 * 閱讀順序：先看底部 $handlers 找功能，再看對應函式中的輸入、SQL 與回應。
 */
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/api_helpers.php';

/**
 * 共用工具：確保分攤表存在
 * 供費用 list、create、update、delete 呼叫，不是獨立 action。
 * CREATE TABLE IF NOT EXISTS 只在表不存在時建立，不會改寫既有分攤資料。
 */
function expenses_ensure_tables(mysqli $conn): void {
    $conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Expense_Share` (`Share_ID` INT AUTO_INCREMENT PRIMARY KEY, `Expense_ID` INT NOT NULL, `Participant_Name` VARCHAR(100) NOT NULL, `Share_Amount` DECIMAL(12,2) NOT NULL DEFAULT 0, `Is_Settled` TINYINT(1) NOT NULL DEFAULT 0, INDEX (`Expense_ID`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

/**
 * 讀取記帳與分攤明細
 * action=list｜輸入：Itinerary_ID、Account；先檢查擁有者／成員關係。
 * 費用依建立時間由新到舊排列，再逐筆查詢該費用的分攤紀錄。
 * 回傳：status、data（費用陣列），每筆包含 shares 和結清狀態。
 */
function expenses_get_expenses(mysqli $conn, object $data): void {
    expenses_ensure_tables($conn);

    if (!empty($data->Itinerary_ID)) {
        require_itinerary_access($conn, (int)$data->Itinerary_ID, trim((string)($data->Account ?? '')));
        $stmt = $conn->prepare("SELECT * FROM `Itinerary_Expense` WHERE `Itinerary_ID` = ? ORDER BY `Created_At` DESC");
        $stmt->bind_param("i", $data->Itinerary_ID);
        $stmt->execute();
        $result = $stmt->get_result();

        $expenses = [];
        while ($row = $result->fetch_assoc()) {
            // 每筆費用再查自己的分攤紀錄，組成下面的 shares 陣列。
            $share_stmt = $conn->prepare("SELECT `Share_ID`, `Participant_Name`, `Share_Amount`, `Is_Settled` FROM `Itinerary_Expense_Share` WHERE `Expense_ID` = ? ORDER BY `Share_ID` ASC");
            $share_stmt->bind_param("i", $row['Expense_ID']);
            $share_stmt->execute();
            $share_result = $share_stmt->get_result();
            $shares = [];
            while ($share = $share_result->fetch_assoc()) {
                $shares[] = [
                    "id" => $share['Share_ID'],
                    "participant" => $share['Participant_Name'],
                    "amount" => $share['Share_Amount'],
                    "isSettled" => (bool)$share['Is_Settled']
                ];
            }
            $share_stmt->close();

            // 資料庫欄位改成前端命名，狀態欄位轉布林值。
            $expenses[] = [
                "id" => $row['Expense_ID'],
                "title" => $row['Title'],
                "amount" => $row['Amount'],
                "currency" => $row['Currency'],
                "category" => $row['Category'],
                "location" => $row['Location'],
                "payer" => $row['Payer'],
                "isSplit" => (bool)$row['Is_Split'],
                "type" => $row['Type'],
                "date" => $row['Created_At'],
                "shares" => $shares
            ];
        }
        echo json_encode(["status" => "success", "data" => $expenses]);
        $stmt->close();
    } else {
        api_error("缺少行程ID", 400);
    }
}

/**
 * 新增一筆費用
 * action=create｜輸入：Itinerary_ID、Account、Title、Amount。
 * 另使用 Currency、Category、Location、Payer、IsSplit、Type；分攤資料為 SplitShares。
 * 先寫費用主檔，再依需要寫分攤紀錄；回傳 status、message、Expense_ID。
 */
function expenses_create_expense(mysqli $conn, object $data): void {
    expenses_ensure_tables($conn);

    if (!empty($data->Itinerary_ID) && !empty($data->Title) && isset($data->Amount)) {
        require_itinerary_access($conn, (int)$data->Itinerary_ID, trim((string)($data->Account ?? '')));
        $is_split = $data->IsSplit ? 1 : 0;

        $stmt = $conn->prepare("INSERT INTO `Itinerary_Expense` (`Itinerary_ID`, `Title`, `Amount`, `Currency`, `Category`, `Location`, `Payer`, `Is_Split`, `Type`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isdssssis",
            $data->Itinerary_ID, $data->Title, $data->Amount, $data->Currency,
            $data->Category, $data->Location, $data->Payer, $is_split, $data->Type
        );

        if ($stmt->execute()) {
            $expense_id = $conn->insert_id;
            // SplitShares 為「參與者名稱 → 分攤金額」，此處逐人建立分攤列。
            if ($is_split && isset($data->SplitShares)) {
                $share_stmt = $conn->prepare("INSERT INTO `Itinerary_Expense_Share` (`Expense_ID`, `Participant_Name`, `Share_Amount`) VALUES (?, ?, ?)");
                foreach ((array)$data->SplitShares as $participant => $share_amount) {
                    $share_amount = (float)$share_amount;
                    $share_stmt->bind_param("isd", $expense_id, $participant, $share_amount);
                    $share_stmt->execute();
                }
                $share_stmt->close();
            }
            echo json_encode(["status" => "success", "message" => "記帳成功", "Expense_ID" => $expense_id]);
        } else {
            echo json_encode(["status" => "error", "message" => "資料庫寫入失敗：" . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
    }
}

/**
 * 修改費用及分攤金額
 * action=update｜輸入：Expense_ID、Account、Title、Amount。
 * ShareAmounts 可省略；格式為 [{Share_ID, Amount}]，只更新這筆費用所屬的分攤。
 * 由費用 ID 找到行程檢查存取關係；回傳 status。
 */
function expenses_update_expense(mysqli $conn, object $data): void {
    expenses_ensure_tables($conn);

    if (!empty($data->Expense_ID) && !empty($data->Title) && isset($data->Amount)) {
        require_resource_access($conn, 'Itinerary_Expense', 'Expense_ID', (int)$data->Expense_ID, trim((string)($data->Account ?? '')));
        $stmt = $conn->prepare("UPDATE `Itinerary_Expense` SET `Title` = ?, `Amount` = ? WHERE `Expense_ID` = ?");
        $stmt->bind_param("sdi", $data->Title, $data->Amount, $data->Expense_ID);

        if ($stmt->execute()) {
            // 只修改送來的分攤金額；WHERE 同時限制 Share_ID 與 Expense_ID。
            if (isset($data->ShareAmounts) && is_array($data->ShareAmounts)) {
                $share_stmt = $conn->prepare("UPDATE `Itinerary_Expense_Share` SET `Share_Amount` = ? WHERE `Share_ID` = ? AND `Expense_ID` = ?");
                foreach ($data->ShareAmounts as $share) {
                    if (isset($share->Share_ID) && isset($share->Amount)) {
                        $share_amount = (float)$share->Amount;
                        $share_id = (int)$share->Share_ID;
                        $expense_id = (int)$data->Expense_ID;
                        $share_stmt->bind_param("dii", $share_amount, $share_id, $expense_id);
                        $share_stmt->execute();
                    }
                }
                $share_stmt->close();
            }
            echo json_encode(["status" => "success"]);
        }
        else { echo json_encode(["status" => "error", "message" => "更新失敗"]); }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "資料不完整"]);
    }
}

/**
 * 刪除費用及其分攤
 * action=delete｜輸入：Expense_ID、Account。
 * 先檢查費用所屬行程的存取關係，再刪分攤紀錄，最後刪費用主檔。
 * 回傳：status；這段依序執行兩個 DELETE，沒有包在交易中。
 */
function expenses_delete_expense(mysqli $conn, object $data): void {
    expenses_ensure_tables($conn);

    if (!empty($data->Expense_ID)) {
        require_resource_access($conn, 'Itinerary_Expense', 'Expense_ID', (int)$data->Expense_ID, trim((string)($data->Account ?? '')));
        // 先清掉這筆費用的分攤，再刪費用本身。
        $share_stmt = $conn->prepare("DELETE FROM `Itinerary_Expense_Share` WHERE `Expense_ID` = ?");
        $share_stmt->bind_param("i", $data->Expense_ID);
        $share_stmt->execute();
        $share_stmt->close();

        $stmt = $conn->prepare("DELETE FROM `Itinerary_Expense` WHERE `Expense_ID` = ?");
        $stmt->bind_param("i", $data->Expense_ID);

        if ($stmt->execute()) { echo json_encode(["status" => "success"]); }
        else { echo json_encode(["status" => "error", "message" => "刪除失敗"]); }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少Expense_ID"]);
    }
}

/**
 * 切換分攤的結清狀態
 * action=update_share｜輸入：Share_ID、Account、Is_Settled。
 * 沿 Share_ID → Expense_ID → Itinerary_ID 檢查關係，再將結清狀態存為 1／0。
 * 回傳：status；缺少分攤資料為 HTTP 422，寫入失敗為 HTTP 500。
 */
function expenses_update_expense_share(mysqli $conn, object $data): void {
    if (empty($data->Share_ID) || !isset($data->Is_Settled)) {
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => '缺少分帳資料'], JSON_UNESCAPED_UNICODE);
        exit();
    }
    require_resource_access($conn, 'Itinerary_Expense_Share', 'Share_ID', (int)$data->Share_ID, trim((string)($data->Account ?? '')));

    $settled = $data->Is_Settled ? 1 : 0;
    $stmt = $conn->prepare('UPDATE `Itinerary_Expense_Share` SET `Is_Settled` = ? WHERE `Share_ID` = ?');
    $stmt->bind_param('ii', $settled, $data->Share_ID);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success'], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => '更新結清狀態失敗'], JSON_UNESCAPED_UNICODE);
    }
    $stmt->close();
}

// ===== 請求入口與功能分派：所有功能共用這一段 =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST 請求', 405);
// 左側是網址的 action，右側是上方要執行的函式；只允許清單中的操作。
$handlers = [
    'list' => 'expenses_get_expenses', // 讀取記帳與分攤明細
    'create' => 'expenses_create_expense', // 新增一筆費用
    'update' => 'expenses_update_expense', // 修改費用及分攤金額
    'delete' => 'expenses_delete_expense', // 刪除費用及其分攤
    'update_share' => 'expenses_update_expense_share', // 切換分攤的結清狀態
];
// 例如 ?action=list；這是網址參數，即使 HTTP 方法是 POST 也用 $_GET 取得。
$action = $_GET['action'] ?? '';
if (!is_string($action) || !isset($handlers[$action])) api_error('無效的操作', 400);
// JSON 參數轉成物件，交給被選中的功能函式處理。
$data = read_json_body();
// 呼叫對應函式；回傳後關閉資料庫連線（若函式已 exit，則不會走到下方）。
$handlers[$action]($conn, $data);
$conn->close();
