<?php
/** 
 * ============================================================================
 * 快取模組：公開行程快取機制 (Public Itinerary Cache)
 * 功能：將首頁或社群公開的行程暫存在伺服器的硬碟中，減少資料庫 (MySQL) 的查詢壓力。
 * ============================================================================
 */

// 定義快取的存活時間 (TTL - Time To Live)。60 秒代表資料庫更新後，前端最多只會看到 60 秒的舊資料。
const PUBLIC_ITINERARY_CACHE_TTL_SECONDS = 60;

/**
 * 取得或建立快取資料夾
 */
function public_itinerary_cache_directory(): string {
    // 使用作業系統預設的暫存目錄 (例如 Linux 的 /tmp)，並在裡面建一個我們專屬的資料夾
    $directory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'travmate-public-itinerary-cache';
    
    // 如果資料夾不存在，就自動建立它。0775 是給予適當的讀寫權限
    if (!is_dir($directory)) {
        @mkdir($directory, 0775, true);
    }
    return $directory;
}

/**
 * 讀取快取資料
 * @param string $key 快取的鍵值 (通常是資料的名稱或 ID)
 * @return array|null 如果快取有效回傳陣列資料，如果過期或不存在則回傳 null
 */
function public_itinerary_cache_read(string $key): ?array {
    $path = public_itinerary_cache_directory() . DIRECTORY_SEPARATOR . $key . '.json';
    
    // 防呆檢查 1：檔案不存在
    // 防呆檢查 2：判斷檔案的最後修改時間 (filemtime) 是否已經超過我們設定的 60 秒 (time() - 60)
    if (!is_file($path) || filemtime($path) < time() - PUBLIC_ITINERARY_CACHE_TTL_SECONDS) {
        return null; // 快取已失效，回傳 null 請後端重新去撈資料庫
    }
    
    // 讀取 JSON 檔案內容，並轉換為 PHP 關聯陣列
    $payload = json_decode((string)@file_get_contents($path), true);
    return is_array($payload) ? $payload : null;
}

/**
 * 寫入快取資料 (使用「原子寫入 Atomic Write」高階技巧)
 * @param string $key 快取的鍵值
 * @param array $payload 要快取的資料陣列
 */
function public_itinerary_cache_write(string $key, array $payload): void {
    $directory = public_itinerary_cache_directory();
    $target = $directory . DIRECTORY_SEPARATOR . $key . '.json'; // 最終要儲存的目標檔名
    
    // 💡【效能與防錯亮點：Atomic Write (原子寫入)】
    // 為什麼不直接寫入目標檔案？
    // 如果直接寫入，當檔案寫到一半 (例如只寫了 50%)，剛好有另一個使用者進來讀取，他就會讀到壞掉的 JSON！
    // 所以這裡先產生一個隨機名稱的「暫存檔 (tempnam)」。
    $temporary = tempnam($directory, 'public-itinerary-');
    if ($temporary === false) return;
    
    // 將資料轉成 JSON 並寫入「暫存檔」。LOCK_EX 代表寫入時鎖定檔案，防止其他人同時寫這支暫存檔。
    if (file_put_contents($temporary, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) {
        // 寫完之後，瞬間把暫存檔「重新命名 (rename)」成目標檔名。
        // 在作業系統底層，rename 是一個「原子操作 (瞬間完成)」，這樣就能保證使用者永遠只會讀到完整的 JSON 檔案！
        @rename($temporary, $target);
    }
    
    // 如果因為某些原因 rename 失敗，把殘留的暫存檔刪除 (unlink)，保持伺服器乾淨
    if (is_file($temporary)) {
        @unlink($temporary);
    }
}

/**
 * 清除所有快取 (Invalidate Cache)
 * 適用時機：當管理員強制作廢快取，或系統發生重大更新時呼叫
 */
function invalidate_public_itinerary_cache(): void {
    // glob 函式會找出目錄下所有符合 *.json 規則的檔案路徑
    foreach (glob(public_itinerary_cache_directory() . DIRECTORY_SEPARATOR . '*.json') ?: [] as $path) {
        @unlink($path); // 將它們一一刪除
    }
}