<?php
/**
 * 行程主檔：列表、建立、修改、刪除、釘選、公開設定與旅行風格。
 * 呼叫：POST /itinerary/core.php?action=功能名稱，參數放在 JSON 物件。
 * 主要資料表：Itinerary；公開設定也會清除目的地快取。
 * 閱讀順序：先看底部 $handlers 找功能，再看對應函式中的輸入、SQL 與回應。
 */
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/api_helpers.php';

/**
 * 行程列表
 * action=list｜輸入：Account；Viewer_Account 可省略。
 * 查詢 Account 擁有的行程；本人查看不限制公開狀態，其他查看者只看公開行程。
 * 回傳：status、data（行程卡片陣列）；日期轉成 YYYY/MM/DD。
 */
function core_get_itineraries(mysqli $conn, object $data): void {
    if (!empty($data->Account)) {
        $account = $data->Account;
        // Account 是被查看的帳號；Viewer_Account 是目前查看者的帳號。
        $viewerAccount = $data->Viewer_Account ?? '';

        // 相同帳號代表本人查看，用於決定是否限制公開行程。
        $isOwner = ($account === $viewerAccount);

        $sql = "SELECT i.* FROM Itinerary i WHERE i.Account = ?";

        // 其他查看者只讀取公開行程。
        if (!$isOwner) {
            $sql .= " AND i.Is_Public = 1 ";
        }

        $sql .= " ORDER BY i.Start_Date ASC";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $account);
        $stmt->execute();
        $result = $stmt->get_result();

        $itineraries = [];
        while ($row = $result->fetch_assoc()) {
            $itineraries[] = [
                "id" => $row['Itinerary_ID'],
                "title" => $row['Title'],
                // 將資料庫的 YYYY-MM-DD 轉為前端預期的 YYYY/MM/DD
                "startDate" => str_replace('-', '/', $row['Start_Date']),
                "endDate" => str_replace('-', '/', $row['End_Date']),
                "transport" => $row['Transport'],
                "coverImage" => $row['Cover_Image'] ?: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800&auto=format&fit=crop",
                "isPinned" => (bool)$row['Is_Pinned'],
                // 公開狀態轉為布林值，供前端顯示公開／私密圖示。
                "isPublic" => (bool)($row['Is_Public'] ?? 0),
                // 擁有者帳號供前端判斷並顯示 Owner／Member。
                "Account" => $row['Account']
            ];
        }

        echo json_encode(["status" => "success", "data" => $itineraries]);
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少會員帳號標識"]);
    }
}

/**
 * 行程主檔
 * action=detail｜輸入：Itinerary_ID、Account。
 * SQL 同時比對行程 ID 與擁有者帳號，取得名稱、日期、封面和目的地座標。
 * 回傳：status、data（單一行程物件）；日期保留 YYYY-MM-DD。
 */
function core_get_itinerary_detail(mysqli $conn, object $data): void {
    if (!empty($data->Itinerary_ID) && !empty($data->Account)) {
        $stmt = $conn->prepare("
            SELECT i.*
            FROM Itinerary i
            WHERE i.Itinerary_ID = ? AND i.Account = ?
        ");
        $stmt->bind_param("is", $data->Itinerary_ID, $data->Account);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();

        if ($result) {
            $itineraryData = [
                "id" => $result['Itinerary_ID'],
                "title" => $result['Title'],
                "startDate" => $result['Start_Date'],
                "endDate" => $result['End_Date'],
                "coverImage" => $result['Cover_Image'],
                "ownerAccount" => $result['Account'],
                // 目的地座標供前端地圖定位。
                "destLat" => $result['Dest_Lat'],
                "destLng" => $result['Dest_Lng']
            ];
            echo json_encode(["status" => "success", "data" => $itineraryData]);
        } else {
            echo json_encode(["status" => "error", "message" => "找不到行程或無權限存取"]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少行程ID或帳號"]);
    }
}

/**
 * 建立行程
 * action=create｜必填：Account、Title、StartDate、EndDate。
 * 選填：Transport（預設 train）、Dest_Lat、Dest_Lng；Account 寫入為擁有者。
 * 回傳：status、itinerary_id（新行程 ID）、coverImage（預設封面）。
 */
function core_create_itinerary(mysqli $conn, object $data): void {
    if (!empty($data->Account) && !empty($data->Title) && !empty($data->StartDate) && !empty($data->EndDate)) {
        $account = $data->Account;
        $title = $data->Title;
        $startDate = $data->StartDate;
        $endDate = $data->EndDate;
        $transport = $data->Transport ?? 'train';
        $coverImage = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop";

        // 沒有目的地座標時使用 null。
        $dest_lat = isset($data->Dest_Lat) ? $data->Dest_Lat : null;
        $dest_lng = isset($data->Dest_Lng) ? $data->Dest_Lng : null;

        // ? 是 SQL 參數位置；bind_param 依序綁定 6 個字串與 2 個座標數值。
        $stmt = $conn->prepare("INSERT INTO `Itinerary` (`Account`, `Title`, `Start_Date`, `End_Date`, `Transport`, `Cover_Image`, `Dest_Lat`, `Dest_Lng`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssssdd", $account, $title, $startDate, $endDate, $transport, $coverImage, $dest_lat, $dest_lng);

        if ($stmt->execute()) {
            $new_id = $conn->insert_id;

            echo json_encode([
                "status" => "success",
                "itinerary_id" => $new_id,
                "coverImage" => $coverImage
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "新增失敗: " . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少必填欄位"]);
    }
}

/**
 * 修改行程名稱與日期
 * action=update｜輸入：Itinerary_ID、Title、StartDate、EndDate。
 * 一次覆寫主檔的 Title、Start_Date、End_Date；這個函式依行程 ID 更新。
 * 回傳：status；失敗時附 message。
 */
function core_update_itinerary_info(mysqli $conn, object $data): void {
    if (!empty($data->Itinerary_ID) && !empty($data->Title) && !empty($data->StartDate) && !empty($data->EndDate)) {
        $stmt = $conn->prepare("UPDATE `Itinerary` SET `Title` = ?, `Start_Date` = ?, `End_Date` = ? WHERE `Itinerary_ID` = ?");
        $stmt->bind_param("sssi", $data->Title, $data->StartDate, $data->EndDate, $data->Itinerary_ID);

        if ($stmt->execute()) {
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => "更新失敗：" . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
    }
}

/**
 * 刪除自己的行程
 * action=delete｜輸入：Itinerary_ID、Account。
 * Account 等於擁有者時，先刪行李及費用，再刪行程主檔。
 */
function core_delete_itinerary(mysqli $conn, object $data): void {
    if (!empty($data->Itinerary_ID) && !empty($data->Account)) {
        // 先確認使用者是行程擁有者。
        $checkStmt = $conn->prepare("SELECT Account FROM Itinerary WHERE Itinerary_ID = ?");
        $checkStmt->bind_param("i", $data->Itinerary_ID);
        $checkStmt->execute();
        $result = $checkStmt->get_result()->fetch_assoc();
        $checkStmt->close();

        if ($result && $result['Account'] === $data->Account) {
            // (若資料庫未設定 ON DELETE CASCADE，需先手動刪除子表紀錄以免報錯)
            $conn->query("DELETE FROM Itinerary_Luggage WHERE Itinerary_ID = " . intval($data->Itinerary_ID));
            $conn->query("DELETE FROM Itinerary_Expense WHERE Itinerary_ID = " . intval($data->Itinerary_ID));

            $deleteStmt = $conn->prepare("DELETE FROM Itinerary WHERE Itinerary_ID = ?");
            $deleteStmt->bind_param("i", $data->Itinerary_ID);
            if ($deleteStmt->execute()) {
                echo json_encode(["status" => "success", "message" => "行程已徹底刪除"]);
            } else {
                echo json_encode(["status" => "error", "message" => "刪除失敗"]);
            }
            $deleteStmt->close();
        } else {
            echo json_encode(["status" => "error", "message" => "找不到行程或無權限存取"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "缺少必要參數"]);
    }
}

/**
 * 設定釘選
 * action=pin｜輸入：Itinerary_ID、Account、Is_Pinned。
 * 將 Is_Pinned 轉成 1／0；UPDATE 條件包含行程 ID 與擁有者帳號。
 * 回傳：status；目前以 SQL 執行成功判定，沒有檢查實際更新筆數。
 */
function core_pin_itinerary(mysqli $conn, object $data): void {
    if (!empty($data->Account) && !empty($data->Itinerary_ID) && isset($data->Is_Pinned)) {
        $is_pinned = $data->Is_Pinned ? 1 : 0;

        $stmt = $conn->prepare("UPDATE `Itinerary` SET `Is_Pinned` = ? WHERE `Itinerary_ID` = ? AND `Account` = ?");
        $stmt->bind_param("iis", $is_pinned, $data->Itinerary_ID, $data->Account);

        if ($stmt->execute()) {
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => "釘選更新失敗：" . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少必要欄位"]);
    }
}

/**
 * 設定公開／私密
 * action=visibility｜輸入：Itinerary_ID、Account、Is_Public。
 * 依傳入值設定 Is_Public；UPDATE 條件限擁有者，執行成功後清除公開行程快取。
 * 回傳：status、message；目前沒有檢查實際更新筆數。
 */
function core_toggle_itinerary_visibility(mysqli $conn, object $data): void {
    require_once __DIR__ . '/../destinations/public_itinerary_cache.php';
    if (!empty($data->Account) && !empty($data->Itinerary_ID) && isset($data->Is_Public)) {
        $account = $data->Account;
        $itineraryId = $data->Itinerary_ID;
        $isPublic = $data->Is_Public ? 1 : 0;

        // 只有行程的 Owner 可以更改隱私狀態
        $stmt = $conn->prepare("UPDATE Itinerary SET Is_Public = ? WHERE Itinerary_ID = ? AND Account = ?");
        $stmt->bind_param("iis", $isPublic, $itineraryId, $account);

        if ($stmt->execute()) {
            // 公開列表使用快取，狀態更新後讓後續查詢重新取得資料。
            invalidate_public_itinerary_cache();
            echo json_encode(["status" => "success", "message" => $isPublic ? "行程已設為公開" : "行程已設為私密"]);
        } else {
            echo json_encode(["status" => "error", "message" => "狀態更新失敗：" . $conn->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "缺少必要參數"]);
    }
}

/**
 * 讀取旅行風格
 * action=get_style｜輸入：Itinerary_ID。
 * 讀取 Itinerary.Style；沒有值或查不到主檔時，仍使用預設「自助旅行」。
 * 回傳：status、style。
 */
function core_get_itinerary_style(mysqli $conn, object $data): void {
    if (empty($data->Itinerary_ID)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => '缺少行程ID'], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // 直接從主檔 Itinerary 表的 Style 欄位撈取，不再查詢獨立的 Itinerary_Style 表
    $stmt = $conn->prepare('SELECT `Style` FROM `Itinerary` WHERE `Itinerary_ID` = ?');
    $stmt->bind_param('i', $data->Itinerary_ID);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // 若主表剛好沒填，預設回傳 '自助旅行'
    $style = !empty($result['Style']) ? $result['Style'] : '自助旅行';

    echo json_encode(['status' => 'success', 'style' => $style], JSON_UNESCAPED_UNICODE);
}

/**
 * 儲存旅行風格
 * action=update_style｜輸入：Itinerary_ID、Style。
 * Style 必須在下方 $allowed 清單中；驗證成功後更新 Itinerary.Style。
 * 回傳：status、style；無效風格為 HTTP 422，寫入失敗為 HTTP 500。
 */
function core_update_itinerary_style(mysqli $conn, object $data): void {
    $allowed = ['自助旅行', '親子旅行', '情侶旅行', '朋友出遊', '商務出差', '自訂'];

    if (empty($data->Itinerary_ID) || empty($data->Style) || !in_array($data->Style, $allowed, true)) {
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => '無效的行程風格'], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // 直接更新主檔 Itinerary 表的 Style 欄位
    $stmt = $conn->prepare('UPDATE `Itinerary` SET `Style` = ? WHERE `Itinerary_ID` = ?');
    $stmt->bind_param('si', $data->Style, $data->Itinerary_ID);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'style' => $data->Style], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => '儲存行程風格失敗'], JSON_UNESCAPED_UNICODE);
    }
    $stmt->close();
}

// ===== 請求入口與功能分派：所有功能共用這一段 =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_error('只允許 POST 請求', 405);
// 左側是網址的 action，右側是上方要執行的函式；只允許清單中的操作。
$handlers = [
    'list' => 'core_get_itineraries', // 行程列表
    'detail' => 'core_get_itinerary_detail', // 行程主檔
    'create' => 'core_create_itinerary', // 建立行程
    'update' => 'core_update_itinerary_info', // 修改行程名稱與日期
    'delete' => 'core_delete_itinerary', // 刪除自己的行程
    'pin' => 'core_pin_itinerary', // 設定釘選
    'visibility' => 'core_toggle_itinerary_visibility', // 設定公開／私密
    'get_style' => 'core_get_itinerary_style', // 讀取旅行風格
    'update_style' => 'core_update_itinerary_style', // 儲存旅行風格
];
// 例如 ?action=list；這是網址參數，即使 HTTP 方法是 POST 也用 $_GET 取得。
$action = $_GET['action'] ?? '';
if (!is_string($action) || !isset($handlers[$action])) api_error('無效的操作', 400);
// JSON 參數轉成物件，交給被選中的功能函式處理。
$data = read_json_body();
// 呼叫對應函式；回傳後關閉資料庫連線（若函式已 exit，則不會走到下方）。
$handlers[$action]($conn, $data);
$conn->close();
