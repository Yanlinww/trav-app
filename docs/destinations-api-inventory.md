# 公開行程 PHP 端點整理

`backend/trav-api/destinations/public_itineraries.php` 目前提供 8 個公開行程操作。

保留的支援檔案：`schema.php` 提供公開行程資料的正規化與資料表升級函式；`public_itinerary_cache.php` 提供 60 秒快取及失效處理；`migrations/run.php` 是僅供命令列執行的資料庫升級入口。

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

公開列表仍先讀檔案快取；命中時不建立資料庫連線。`schema.php` 只提供函式，不在每次 API 請求執行資料表升級。

## 驗證與範圍

- `public_itineraries.php` 通過 PHP 容器的 `php -l`。
- 公開列表 HTTP 請求回傳成功；前端通過 `npm run build`。
- 沒有用真實帳號執行發布、瀏覽計數、按讚、收藏或複製的成功寫入測試。

資料來源：`backend/trav-api/destinations/public_itineraries.php`、支援檔及本地 HTTP 回應。
