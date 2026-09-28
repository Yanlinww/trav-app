# 公開行程 PHP 端點整理

`backend/trav-api/destinations/` 的 9 支單功能 API 已整合到 `public_itineraries.php`，前端 4 個頁面的 14 處呼叫已更新。舊單功能網址已移除。

保留的支援檔案：`schema.php` 提供公開行程資料的正規化與資料表升級函式；`public_itinerary_cache.php` 提供 60 秒快取及失效處理；`migrations/run.php` 是僅供命令列執行的資料庫升級入口。`migrations/*.sql` 也沒有搬動。

## 新舊操作對照

所有功能使用 POST，JSON 物件仍放在 request body；`action` 放在網址 query。

| 舊端點 | 新 action | 功能與主要輸入 | 主要回傳 |
| --- | --- | --- | --- |
| `get_public_itineraries.php` | `list` | 搜尋、標籤、交通、天數、地點、排序、作者、收藏篩選；可傳 `Account` | `status`、`data`（公開行程陣列） |
| `get_public_itinerary_preview.php` | `preview` | `Itinerary_ID` | `status`、`data`（公開資料與每日細項） |
| `get_publishable_itineraries.php` | `mine` | `Account` | `status`、`data`（帳號擁有的行程） |
| `save_public_itinerary.php` | `publish` | `Itinerary_ID`、`Account`、`Is_Public` 及公開標題、封面、簡介、地點、標籤 | `status`、`message` |
| `record_public_itinerary_view.php` | `view` | `Itinerary_ID`、`Viewer_Key` | `status`、`viewCount` 等原回傳欄位 |
| `toggle_public_itinerary_like.php` | `like` | `Itinerary_ID`、`Account` | `status`、`isLiked`、`likeCount` |
| `toggle_public_itinerary_save.php` | `bookmark` | `Itinerary_ID`、`Account` | `status`、`isSaved` |
| `copy_public_itinerary.php` | `copy` | `Itinerary_ID`、`Account`；`Title` 可選 | `status`、新行程 ID 等原回傳欄位 |
| `create_public_itinerary_report.php` | `report` | `Itinerary_ID`、`Account`、`Reason`；`Details` 可選 | `status`、`message` |

公開列表仍先讀檔案快取；命中時不建立資料庫連線。發布、瀏覽、按讚、收藏、複製及檢舉的原有交易、計數與快取失效位置保留。`schema.php` 只提供函式，不在每次 API 請求執行資料表升級。

## 驗證與範圍

- 新入口通過 PHP 容器的 `php -l`。
- 新舊網址在 11 組實際 HTTP 請求中狀態碼與 JSON 內容一致，包含公開列表、篩選後列表、有效／無效預覽，以及各寫入操作的無效輸入。
- 這次未對真實帳號執行發布、瀏覽計數、按讚、收藏、複製或檢舉的成功寫入端對端測試。

資料來源：`backend/trav-api/destinations/public_itineraries.php`、保留的支援檔、4 個前端呼叫頁面，以及合併前後的 HTTP 比對結果。
