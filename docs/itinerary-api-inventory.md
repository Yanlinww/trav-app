# Itinerary PHP API 盤點

> 2026-09-30 更新：本文件記錄 9/28 的歷史盤點；其中旅伴、聊天、邀請碼、共用行程、舊行李資料表，以及記帳分攤與結清的端點及程式連結已失效。請以 [行程簡化紀錄](planner-simplification-2026-09-30.md) 與目前程式碼為準。

盤點日期：2026-09-28。範圍：合併前工作區 `backend/trav-api/itinerary` 的全部 PHP，以及專案內對這些端點和共用 helper 的引用。

以下第 1～13 節保留第一階段的靜態盤點快照；端點名稱和呼叫位置反映合併前狀態，PHP 來源連結已指向整合後的操作函式，不代表各端點已經通過實際 HTTP 或資料庫測試。後續實作進度與目前入口記錄於第 14～15 節。

## 1. 數量與範圍

| 分類 | 功能端點 | 內容 |
| --- | ---: | --- |
| core | 12 | 行程主檔、列表、邀請、公開狀態、封面、風格 |
| items | 9 | 行程細項、時間、地點、排序、筆記與截圖 |
| expenses | 5 | 記帳、分攤金額、結清狀態 |
| collaboration | 5 | 旅伴、聊天、在線狀態 |
| luggage | 2 | 個人行李清單 |
| places | 2 | Google 地點的行程內標籤 |
| 合計 | **35** | 另有 **1 個 `api_helpers.php`，共 36 個 PHP 檔案** |

- 請求格式：33 個 JSON 端點、2 個 multipart/form-data 上傳端點。
- 在前端找到 43 處直接呼叫，涉及 34 個端點、3 個頁面。
- `core/toggle_itinerary_visibility.php` 未找到目前專案中的直接前端呼叫；這不等於可以直接刪除，仍需確認外部呼叫與公開行程流程。
- 前端目前使用 `http://localhost:8080` 作為這些 PHP API 的來源。
- `destinations`、`admin`、`profile` 等 API 不納入本次功能合併範圍，但對 itinerary helper 的依賴有另外記錄。

## 2. 表格讀法與共通行為

- `*` 表示原始碼會檢查的必要欄位；不一定代表已驗證型別、數值範圍或內容格式。
- 「擁有者／成員」表示以請求傳入的 `Account` 查詢行程或成員關聯；本次查看的 itinerary 端點與 `db_connect.php` 未見登入 session helper 的引用，因此不能把這個關聯檢查視為已驗證登入身分。
- 「未見行程權限檢查」表示該端點本身未查詢擁有者或成員關聯，不是已測試的漏洞結論。
- 成功回應以下用 `S` 簡寫 `{"status":"success"}`；錯誤一般是 `{"status":"error","message":"…"}`，但 HTTP 狀態碼使用並不一致。
- 所有已找到的前端呼叫都是 POST；只有兩個 places 端點明確拒絕非 POST（405）。CORS 宣告的允許方法不等於 PHP 有強制檢查方法。
- 端點通常先自行處理 OPTIONS，回傳 200；places 則先引入會處理 OPTIONS 的 `db_connect.php`。`api_helpers.php` 雖寫有 OPTIONS 204，不能直接認定目前所有端點預檢都是 204。
- 多數舊端點以 `json_decode()` 讀取內容；使用 helper 的端點以 `read_json_body()` 要求 JSON 根節點必須是物件，不符則 400。

## 3. Core：12 個端點

| 原始端點（資料來源） | 用途 | JSON 輸入／表單 | 成功回應 | 目前權限與特殊行為 |
| --- | --- | --- | --- | --- |
| [get_itineraries.php](F:/trav-app/backend/trav-api/itinerary/core.php:17) | 行程列表 | `Account*`；`Viewer_Account` 可省略，預設空字串 | `S + data: 行程[]` | 查 Account 擁有或加入的行程；只有 Account 與 Viewer_Account 相同時不限制公開狀態，否則加 `Is_Public=1`；依開始日期排序 |
| [get_itinerary_detail.php](F:/trav-app/backend/trav-api/itinerary/core.php:78) | 行程主檔 | `Itinerary_ID*`、`Account*` | `S + data: 行程物件` | 擁有者或成員；查不到或不符權限回 error |
| [create_itinerary.php](F:/trav-app/backend/trav-api/itinerary/core.php:118) | 建立行程 | `Account*`、`Title*`、`StartDate*`、`EndDate*`；`Dest_Lat`、`Dest_Lng` 預設 null | `S + itinerary_id + coverImage` | Account 寫為擁有者；設定預設封面 |
| [update_itinerary_info.php](F:/trav-app/backend/trav-api/itinerary/core.php:158) | 更新名稱與日期 | `Itinerary_ID*`、`Title*`、`StartDate*`、`EndDate*` | `S` | 未見行程權限檢查；三個資訊欄位一起更新 |
| [delete_itinerary.php](F:/trav-app/backend/trav-api/itinerary/core.php:180) | 刪除／退出 | `Itinerary_ID*`、`Account*` | `S + message` | Account 等於擁有者：先刪成員與費用，再刪主檔；否則只刪該 Account 的成員關聯。兩種語意不能遺漏；程式未使用交易 |
| [pin_itinerary.php](F:/trav-app/backend/trav-api/itinerary/core.php:227) | 釘選設定 | `Itinerary_ID*`、`Account*`、`Is_Pinned*` | `S` | SQL 條件限擁有者；以 execute 成功判定，未確認實際更新筆數 |
| [toggle_itinerary_visibility.php](F:/trav-app/backend/trav-api/itinerary/core.php:251) | 設定公開／私密 | `Itinerary_ID*`、`Account*`、`Is_Public*` | `S + message` | SQL 條件限擁有者；成功後清除公開行程快取；未確認實際更新筆數。名稱為 toggle，但實際使用傳入值設定狀態 |
| [get_or_create_invite_code.php](F:/trav-app/backend/trav-api/itinerary/core.php:281) | 取得／建立邀請碼 | `Itinerary_ID*` | `S + code` | 未見行程權限檢查；即使名稱以 get 開頭，也可能寫入 Invite_Code；生成 6 碼英數 |
| [join_itinerary.php](F:/trav-app/backend/trav-api/itinerary/core.php:313) | 使用邀請碼加入 | `Invite_Code*`、`Account*` | `S + message` | 查邀請碼；擁有者不能加入自己的行程；使用 INSERT IGNORE，重複加入回 error |
| [update_cover_image.php](F:/trav-app/backend/trav-api/itinerary/uploads/upload.php:14) | 上傳封面 | **FormData**：`Itinerary_ID*`、`Account*`、檔案 `cover_image*` | `S + message + new_image_url` | 查擁有者；檔案最大 10 MiB，副檔名 jpg/jpeg/png/webp，另以 getimagesize 檢查；寫入實體圖片與 Cover_Image |

### Core 回傳欄位與相容性

- 列表 `data[]`：`id`、`title`、`startDate`、`endDate`、`coverImage`、`isPinned`、`isPublic`、`Account`。日期轉成 `YYYY/MM/DD`；兩個 is 欄位轉成布林。
- 詳情 `data`：`id`、`title`、`startDate`、`endDate`、`coverImage`、`ownerAccount`、`destLat`、`destLng`。日期維持資料庫的 `YYYY-MM-DD`。
- 新建 ID 的回傳鍵是 `itinerary_id`，與細項的 `Item_ID`、費用的 `Expense_ID` 不同。
- [個人頁面呼叫](F:/trav-app/app/profile/page.tsx:69)未傳 `Viewer_Account`；[Planner 列表呼叫](F:/trav-app/app/planner/page.tsx:84)有傳。這會造成目前公開篩選條件不同，合併時應先保留並另外決定是否調整。
- 封面目錄使用 `dirname(__DIR__, 2) . '/uploads/covers/'`，回傳 URL 使用 localhost:8080；搬移檔案會改變目錄計算基準。
- 刪除行程只明確刪除成員、費用與主檔；其他子資料是否被外鍵連動清除，本次未確認資料庫結構。

## 4. Items：9 個端點

| 原始端點（資料來源） | 用途 | JSON 輸入／表單 | 成功回應 | 目前權限與特殊行為 |
| --- | --- | --- | --- | --- |
| [get_itinerary_items.php](F:/trav-app/backend/trav-api/itinerary/items.php:30) | 讀取細項 | `Itinerary_ID*` | `S + data: 細項[]` | 未見行程權限檢查；JOIN Place；依 Day_Number、Sort_Order 排序；缺 ID 400 |
| [create_itinerary_item.php](F:/trav-app/backend/trav-api/itinerary/items.php:79) | 建立細項 | `Itinerary_ID*`、`Day_Number*`、`Title*`；`StartTime`、`EndTime`、`Place_ID`、`Latitude`、`Longitude` | 程式預期 `S + message + Item_ID` | 未見行程權限檢查；Sort_Order 為同日最大值 +1，首筆 0；時間錯誤／相同回 422 |
| [update_item_title.php](F:/trav-app/backend/trav-api/itinerary/items.php:136) | 修改標題 | `Item_ID*`、`Title*`（isset；可空字串） | `S` | 未見行程權限檢查；只更新 Title |
| [update_item_time.php](F:/trav-app/backend/trav-api/itinerary/items.php:158) | 修改起訖時間 | `Item_ID*`；`StartTime`、`EndTime` | `S` | 未見行程權限檢查；兩個時間一起更新；缺少、null、空字串皆轉 null；格式錯誤／起訖相同 422 |
| [update_item_location.php](F:/trav-app/backend/trav-api/itinerary/items.php:193) | 修改座標與選用標題 | `Item_ID*`（正整數）、`Latitude*`、`Longitude*`；`Title` | `S` | 未見行程權限檢查；座標須數值、緯度 -90～90、經度 -180～180；Title trim 後非空才更新；輸入錯誤 400、執行失敗 500 |
| [delete_itinerary_item.php](F:/trav-app/backend/trav-api/itinerary/items.php:262) | 刪除細項 | `Item_ID*` | `S` | 未見行程權限檢查 |
| [update_sort_order.php](F:/trav-app/backend/trav-api/itinerary/items.php:284) | 批次排序 | `updates*`：非空陣列，元素含 `id`、`sortOrder` | `S` | 未見行程權限檢查；id、sortOrder 轉整數，使用單一 CASE UPDATE；更新只涉及 Sort_Order |

### Items 回傳欄位與相容性

- 細項 `data[]`：`id`（字串）、`placeId`（整數或 null）、`dayNumber`（整數）、`title`、`startTime`、`endTime`、`sortOrder`（整數）、`Latitude`、`Longitude`。
- 時間讀取轉為 HH:mm，未設定回空字串；時間寫入接受 HH:mm 或 HH:mm:ss，再截成 HH:mm。未見禁止結束早於開始的檢查。
- 關聯 Place 存在時，回傳標題與座標優先採用 Place 欄位，再回退細項欄位；整合更新時要考慮讀取來源。
- 前端拖曳排序會另行呼叫時間更新；合併排序入口時不能遺漏這個流程，見 [排序與時間呼叫](F:/trav-app/app/planner/[id]/page.tsx:2368)。

## 5. Expenses：5 個端點

| 原始端點（資料來源） | 用途 | JSON 輸入 | 成功回應 | 目前權限與特殊行為 |
| --- | --- | --- | --- | --- |
| [get_expenses.php](F:/trav-app/backend/trav-api/itinerary/expenses.php:26) | 費用與分攤列表 | `Itinerary_ID*`、`Account*`（helper 檢查） | `S + data: 費用[]` | 擁有者／成員；依 Created_At DESC；每筆費用再查分攤 |
| [create_expense.php](F:/trav-app/backend/trav-api/itinerary/expenses.php:82) | 新增費用 | `Itinerary_ID*`、`Account*`、`Title*`、`Amount*`；另直接讀 `Currency`、`Category`、`Location`、`Payer`、`IsSplit`、`Type`；分攤使用 `SplitShares` | `S + message + Expense_ID` | 擁有者／成員；後半欄位未逐一驗證或給預設；IsSplit 真值且有 SplitShares 時寫入分攤表；未使用交易 |
| [update_expense.php](F:/trav-app/backend/trav-api/itinerary/expenses.php:123) | 修改費用與分攤金額 | `Expense_ID*`、`Account*`、`Title*`、`Amount*`；`ShareAmounts` 為 `[{Share_ID, Amount}]` | `S` | 由 Expense_ID 找行程再檢查擁有者／成員；只更新費用 Title、Amount 及提供的分攤金額；未使用交易 |
| [delete_expense.php](F:/trav-app/backend/trav-api/itinerary/expenses.php:161) | 刪除費用 | `Expense_ID*`、`Account*` | `S` | 由費用找行程檢查；先刪分攤，再刪費用；未使用交易 |
| [update_expense_share.php](F:/trav-app/backend/trav-api/itinerary/expenses.php:189) | 設定分攤結清狀態 | `Share_ID*`、`Account*`、`Is_Settled*` | `S` | 由 Share_ID → Expense_ID → Itinerary_ID 檢查擁有者／成員；不是只允許該分攤人操作；必要資料不足 422、執行失敗 500 |

### Expenses 回傳欄位與相容性

- 費用 `data[]`：`id`、`title`、`amount`、`currency`、`category`、`location`、`payer`、`isSplit`（布林）、`type`、`date`、`shares`。
- 分攤 `shares[]`：`id`、`participant`、`amount`、`isSettled`（布林）。金額與 ID 有些直接來自 mysqli 回傳，不能認定全部已轉成 number。
- `SplitShares` 是「參與者名稱 → 金額」物件；更新時 `ShareAmounts` 是陣列，不能混用。
- 前端新增 payload 還有 `SplitUsers`，但此 PHP 沒讀取該欄位；目前實際分攤寫入依 SplitShares。
- get/create/update/delete 四個端點會執行相同 `CREATE TABLE IF NOT EXISTS Itinerary_Expense_Share`，且在行程權限檢查前執行；讀取並非完全沒有資料庫初始化副作用。update_expense_share 沒有這段。
- 建立、更新與刪除涉及多次寫入，程式未檢查所有分攤子操作結果；應先記錄現狀，是否補交易另行列為後續修改。

## 6. Collaboration：5 個端點

| 原始端點（資料來源） | 用途 | JSON 輸入 | 成功回應 | 目前權限與特殊行為 |
| --- | --- | --- | --- | --- |
| [get_itinerary_members.php](F:/trav-app/backend/trav-api/itinerary/collaboration.php:33) | 取得旅伴 | `Itinerary_ID*`、`Account*` | `S + data: 成員[]` | 擁有者／成員；UNION 擁有者與成員；姓名空值回退帳號 |
| [get_chat_messages.php](F:/trav-app/backend/trav-api/itinerary/collaboration.php:86) | 取得聊天 | `Itinerary_ID*`、`Account*` | `S + data: 訊息[]` | 擁有者／成員；取最新 100 筆，再反轉為舊到新；請求內建表 |
| [send_chat_message.php](F:/trav-app/backend/trav-api/itinerary/collaboration.php:123) | 傳送訊息 | `Itinerary_ID*`、`Account*`、`Message*` | `S` | 擁有者／成員；Message trim 後不可空白，最多 120 個 UTF-8 字元；不符 400；請求內建表 |
| [get_chat_presence.php](F:/trav-app/backend/trav-api/itinerary/collaboration.php:151) | 取得在線時間 | `Itinerary_ID*`、`Account*` | `S + data: 帳號 → Unix 秒`；無資料時可能為 `[]` | 擁有者／成員；讀 Itinerary_Members.Chat_Last_Seen；不是直接回傳在線布林 |
| [update_chat_presence.php](F:/trav-app/backend/trav-api/itinerary/collaboration.php:180) | 更新心跳 | `Itinerary_ID*`、`Account*` | `S` | 擁有者／成員；UPSERT 成員關聯的 Chat_Last_Seen |

### Collaboration 回傳欄位與相容性

- 成員 `data[]`：`id`（帳號）、`name`、`role`（Owner / Member）、`avatar`。
- 訊息 `data[]`：`id`（整數）、`account`、`name`、`avatar`、`message`、`createdAt`。
- 在線資料不是成員列表；前端以最後時間距現在小於 45 秒判斷在線。
- 前端旅伴每 5 秒更新；聊天每 3 秒更新；心跳每 15 秒；費用面板也會呼叫成員 API。入口合併後應保留目前呼叫頻率與各自回傳契約。
- get_chat_messages、send_chat_message 都在權限檢查前執行 `CREATE TABLE IF NOT EXISTS Itinerary_Chat_Message`。
- 心跳允許擁有者通過後 UPSERT 成員關聯，可能讓擁有者也存在 Itinerary_Members。成員列表 UNION 的 role 不同，不能假設一定只出現一筆相同帳號；本次未檢查實際資料。

## 7. Luggage：2 個端點

| 原始端點（資料來源） | 用途 | JSON 輸入 | 成功回應 | 目前權限與特殊行為 |
| --- | --- | --- | --- | --- |
| [get_luggage.php](F:/trav-app/backend/trav-api/itinerary/luggage.php:41) | 取得個人行李 | `Itinerary_ID*`、`Account*` | `S + data: JSON 字串或 null` | 擁有者／成員；以 Itinerary_ID + Account 查 Itinerary_Members.Luggage_Data |
| [update_luggage.php](F:/trav-app/backend/trav-api/itinerary/luggage.php:58) | 儲存個人行李 | `Itinerary_ID*`、`Account*`、`LuggageData*`（前端送 JSON 字串） | `S` | 擁有者／成員；UPSERT 到該 Account 的成員資料；未驗證 LuggageData 內層 JSON 結構 |

- 行李是「每個行程、每個帳號各一份」，不是所有旅伴共用清單。
- 前端目前以 `JSON.parse(data.data)` 解析，再以 `JSON.stringify(categories)` 寫回；不能只在後端改為直接回陣列。
- 擁有者沒有成員關聯時，讀取回 null，儲存會建立關聯。
- 前端每 5 秒讀取，修改後延遲 1 秒儲存。

## 8. Places：2 個端點

| 原始端點（資料來源） | 用途 | JSON 輸入 | 成功回應 | 目前權限與特殊行為 |
| --- | --- | --- | --- | --- |
| [get_place_tags.php](F:/trav-app/backend/trav-api/itinerary/places.php:17) | 批次讀取地點標籤 | `Itinerary_ID*`、`Account*`；`PlaceIds` 為 Google Place ID 陣列 | `S + data: Google Place ID → 標籤[]`；無資料為 `[]` | 擁有者／成員；trim／濾空 ID；沒有有效 ID 直接回空資料；嚴格 POST |
| [update_place_tags.php](F:/trav-app/backend/trav-api/itinerary/places.php:53) | 更新地點與標籤 | `Itinerary_ID*`、`Account*`、`Place*` 物件，內含 `GooglePlaceID*`、`Name*`；選用 `Address`、`Latitude`、`Longitude`；`Tags` 陣列 | `S + data: {GooglePlaceID, Tags}` | 擁有者／成員；標籤限單人友善、寵物友善、餐廳、咖啡廳；濾掉不允許值並去重；嚴格 POST；使用交易 |

- 標籤隸屬「某個行程中的某個 Google 地點」，不是全站 Place 共用標籤。
- 更新會 UPSERT Itinerary_Places、刪除舊標籤，再重建 Itinerary_Place_Tags；整組取代，不是追加。
- Tags 未傳、非陣列、空陣列或全部不在允許清單內時，會清空目前標籤。
- Place.Address 預設空字串，非數值座標預設 null；整個 Place 物件還會存成 Place_Data。

## 9. 共用 helper 與跨模組依賴

[api_helpers.php](F:/trav-app/backend/trav-api/itinerary/api_helpers.php) 定義：

| 函式 | 行為 | 搬移時要保留的契約 |
| --- | --- | --- |
| api_json | 設 HTTP code、輸出 JSON、exit | 不是只回傳值；呼叫後停止執行 |
| api_error | 輸出 status=error、message，預設 400 | helper 的 400/403/404/500 與舊 echo 錯誤不同 |
| read_json_body | 從 php://input 讀 JSON 物件 | 陣列、無效 JSON、空內容都拒絕 |
| require_itinerary_access | 確認請求 Account 是擁有者或成員 | 缺 ID/Account 400；不符關聯 403 |
| require_resource_access | 白名單資源 → 父資源 → 行程的關聯檢查 | 支援 Expense、Expense_Share、Reservation、Note；找不到資源 404；Share 先查 Expense |

這個 helper 也會設定 CORS 和處理 OPTIONS，本身不是完全沒有副作用的函式庫。itinerary 內 expenses、collaboration、luggage、places 共 14 個端點使用它；core 和 items 共 21 個端點未引用它。

另外有 **17 個 itinerary 以外的 PHP 檔案引用這個 helper**。若將它搬到別處，需要保留相容轉接或同步更新引用；完整清單在文件末尾。

- [db_connect.php](F:/trav-app/backend/trav-api/db_connect.php) 也會設定 CORS、回應 Content-Type 與 OPTIONS，不能只把 header 重複視為各端點的問題。
- 公開設定另引用 [public_itinerary_cache.php](F:/trav-app/backend/trav-api/destinations/public_itinerary_cache.php)，其快取失效操作必須保留。
- 兩個 items 檔案都定義 `normalize_time_value()`；不能把原始腳本直接全部 require 進同一請求，否則可能函式重複宣告。
- 原始端點含頂層 SQL、echo、exit、conn->close；整合時需要拆成操作函式，不能只把檔案串接。

## 10. 根據盤點提出的下一步

本節是後續建議，不是本次已完成的修改。

1. 第一個試做選 luggage：只有兩個端點、同一資料表和權限檢查、同一前端面板，適合驗證統一入口方式。
2. 先採「入口合併，維持既有請求／回傳／更新語意」；新增 action 不同於立刻把所有更新合成一種部分更新。
3. 再依序 places → expenses → items → collaboration → core；費用多次寫入、聊天輪詢、邀請碼寫入與刪除／退出需要各自對照。
4. 封面與截圖可暫時維持獨立端點。若採 6 個 JSON 模組入口 + 2 個上傳入口 + 1 個 helper，會是 9 個 PHP；若再拆邀請、服務或共用函式，總數會增加。減少入口數與減少全部檔案數需分開計算。
5. 進入實作時才讀適用的 `node_modules/next/dist/docs/` 指南、修改前端呼叫並驗證。此輪未編寫 Next.js 或 PHP 程式。

合併前要帶著本文件驗證：行李個人隔離與字串格式、地點標籤清空、費用分攤與結清、細項缺欄位處理、拖曳時間更新、成員／訊息／在線回傳、擁有者刪除與成員退出、公開快取、邀請碼、兩種上傳。

## 11. 資料來源與驗證範圍

資料來源是本次實際讀取的 35 個端點（各表格已連到原始碼）、api_helpers.php、db_connect.php、前端呼叫及流程；Dockerfile／docker-compose.yml 僅用來確認專案的 PHP 8.2 Apache 設定與 API 根目錄映射。未使用外部文章推定目前契約。

- 已完成：逐檔閱讀、全專案端點／helper 引用搜尋、前端直接 URL 的程式化統計、盤點文件覆蓋率與來源連結檢查。
- 未完成：實際 HTTP 回傳、資料庫外鍵／資料內容、登入身分驗證實測、上傳實體位置、執行效能、php -l、前端建置。
- 此輪只新增 Markdown 文件，因此未啟動會建表或寫資料的 API，也未執行前端建置。

## 12. 前端呼叫位置

以下清單由目前前端原始碼直接 URL 引用產生；行號是本次盤點快照，後續修改可能變動。「未找到」只表示目前搜尋範圍內沒有直接 URL，不是判定可刪除。

| 端點 | 直接呼叫數 | 前端位置 |
| --- | ---: | --- |
| [/itinerary/collaboration/get_chat_messages.php](F:/trav-app/backend/trav-api/itinerary/collaboration.php:86) | 1 | [app/planner/[id]/page.tsx:328](F:/trav-app/app/planner/[id]/page.tsx:328) |
| [/itinerary/collaboration/get_chat_presence.php](F:/trav-app/backend/trav-api/itinerary/collaboration.php:151) | 2 | [app/planner/[id]/page.tsx:102](F:/trav-app/app/planner/[id]/page.tsx:102)<br>[app/planner/[id]/page.tsx:332](F:/trav-app/app/planner/[id]/page.tsx:332) |
| [/itinerary/collaboration/get_itinerary_members.php](F:/trav-app/backend/trav-api/itinerary/collaboration.php:33) | 3 | [app/planner/[id]/page.tsx:98](F:/trav-app/app/planner/[id]/page.tsx:98)<br>[app/planner/[id]/page.tsx:368](F:/trav-app/app/planner/[id]/page.tsx:368)<br>[app/planner/[id]/page.tsx:564](F:/trav-app/app/planner/[id]/page.tsx:564) |
| [/itinerary/collaboration/send_chat_message.php](F:/trav-app/backend/trav-api/itinerary/collaboration.php:123) | 1 | [app/planner/[id]/page.tsx:414](F:/trav-app/app/planner/[id]/page.tsx:414) |
| [/itinerary/collaboration/update_chat_presence.php](F:/trav-app/backend/trav-api/itinerary/collaboration.php:180) | 1 | [app/planner/[id]/page.tsx:389](F:/trav-app/app/planner/[id]/page.tsx:389) |
| [/itinerary/core/create_itinerary.php](F:/trav-app/backend/trav-api/itinerary/core.php:118) | 1 | [app/planner/page.tsx:229](F:/trav-app/app/planner/page.tsx:229) |
| [/itinerary/core/delete_itinerary.php](F:/trav-app/backend/trav-api/itinerary/core.php:180) | 1 | [app/planner/page.tsx:191](F:/trav-app/app/planner/page.tsx:191) |
| [/itinerary/core/get_itineraries.php](F:/trav-app/backend/trav-api/itinerary/core.php:17) | 2 | [app/planner/page.tsx:84](F:/trav-app/app/planner/page.tsx:84)<br>[app/profile/page.tsx:69](F:/trav-app/app/profile/page.tsx:69) |
| [/itinerary/core/get_itinerary_detail.php](F:/trav-app/backend/trav-api/itinerary/core.php:78) | 1 | [app/planner/[id]/page.tsx:2108](F:/trav-app/app/planner/[id]/page.tsx:2108) |
| [/itinerary/core/get_or_create_invite_code.php](F:/trav-app/backend/trav-api/itinerary/core.php:281) | 3 | [app/planner/page.tsx:114](F:/trav-app/app/planner/page.tsx:114)<br>[app/planner/[id]/page.tsx:190](F:/trav-app/app/planner/[id]/page.tsx:190)<br>[app/planner/[id]/page.tsx:612](F:/trav-app/app/planner/[id]/page.tsx:612) |
| [/itinerary/core/join_itinerary.php](F:/trav-app/backend/trav-api/itinerary/core.php:313) | 2 | [app/planner/page.tsx:167](F:/trav-app/app/planner/page.tsx:167)<br>[app/profile/page.tsx:174](F:/trav-app/app/profile/page.tsx:174) |
| [/itinerary/core/pin_itinerary.php](F:/trav-app/backend/trav-api/itinerary/core.php:227) | 1 | [app/planner/page.tsx:209](F:/trav-app/app/planner/page.tsx:209) |
| [/itinerary/core/toggle_itinerary_visibility.php](F:/trav-app/backend/trav-api/itinerary/core.php:251) | 0 | 未找到直接前端呼叫 |
| [/itinerary/core/update_cover_image.php](F:/trav-app/backend/trav-api/itinerary/uploads/upload.php:14) | 1 | [app/planner/[id]/page.tsx:2140](F:/trav-app/app/planner/[id]/page.tsx:2140) |
| [/itinerary/core/update_itinerary_info.php](F:/trav-app/backend/trav-api/itinerary/core.php:158) | 1 | [app/planner/[id]/page.tsx:2162](F:/trav-app/app/planner/[id]/page.tsx:2162) |
| [/itinerary/expenses/create_expense.php](F:/trav-app/backend/trav-api/itinerary/expenses.php:82) | 1 | [app/planner/[id]/page.tsx:705](F:/trav-app/app/planner/[id]/page.tsx:705) |
| [/itinerary/expenses/delete_expense.php](F:/trav-app/backend/trav-api/itinerary/expenses.php:161) | 1 | [app/planner/[id]/page.tsx:785](F:/trav-app/app/planner/[id]/page.tsx:785) |
| [/itinerary/expenses/get_expenses.php](F:/trav-app/backend/trav-api/itinerary/expenses.php:26) | 1 | [app/planner/[id]/page.tsx:552](F:/trav-app/app/planner/[id]/page.tsx:552) |
| [/itinerary/expenses/update_expense.php](F:/trav-app/backend/trav-api/itinerary/expenses.php:123) | 1 | [app/planner/[id]/page.tsx:753](F:/trav-app/app/planner/[id]/page.tsx:753) |
| [/itinerary/expenses/update_expense_share.php](F:/trav-app/backend/trav-api/itinerary/expenses.php:189) | 1 | [app/planner/[id]/page.tsx:729](F:/trav-app/app/planner/[id]/page.tsx:729) |
| [/itinerary/items/create_itinerary_item.php](F:/trav-app/backend/trav-api/itinerary/items.php:79) | 2 | [app/planner/[id]/page.tsx:2251](F:/trav-app/app/planner/[id]/page.tsx:2251)<br>[app/planner/[id]/page.tsx:2331](F:/trav-app/app/planner/[id]/page.tsx:2331) |
| [/itinerary/items/delete_itinerary_item.php](F:/trav-app/backend/trav-api/itinerary/items.php:262) | 1 | [app/planner/[id]/page.tsx:2324](F:/trav-app/app/planner/[id]/page.tsx:2324) |
| [/itinerary/items/get_itinerary_items.php](F:/trav-app/backend/trav-api/itinerary/items.php:30) | 1 | [app/planner/[id]/page.tsx:2077](F:/trav-app/app/planner/[id]/page.tsx:2077) |
| [/itinerary/items/update_item_location.php](F:/trav-app/backend/trav-api/itinerary/items.php:193) | 1 | [app/planner/[id]/page.tsx:1975](F:/trav-app/app/planner/[id]/page.tsx:1975) |
| [/itinerary/items/update_item_time.php](F:/trav-app/backend/trav-api/itinerary/items.php:158) | 2 | [app/planner/[id]/page.tsx:2306](F:/trav-app/app/planner/[id]/page.tsx:2306)<br>[app/planner/[id]/page.tsx:2371](F:/trav-app/app/planner/[id]/page.tsx:2371) |
| [/itinerary/items/update_item_title.php](F:/trav-app/backend/trav-api/itinerary/items.php:136) | 1 | [app/planner/[id]/page.tsx:2281](F:/trav-app/app/planner/[id]/page.tsx:2281) |
| [/itinerary/items/update_sort_order.php](F:/trav-app/backend/trav-api/itinerary/items.php:284) | 1 | [app/planner/[id]/page.tsx:2368](F:/trav-app/app/planner/[id]/page.tsx:2368) |
| [/itinerary/luggage/get_luggage.php](F:/trav-app/backend/trav-api/itinerary/luggage.php:41) | 1 | [app/planner/[id]/page.tsx:1169](F:/trav-app/app/planner/[id]/page.tsx:1169) |
| [/itinerary/luggage/update_luggage.php](F:/trav-app/backend/trav-api/itinerary/luggage.php:58) | 1 | [app/planner/[id]/page.tsx:1196](F:/trav-app/app/planner/[id]/page.tsx:1196) |
| [/itinerary/places/get_place_tags.php](F:/trav-app/backend/trav-api/itinerary/places.php:17) | 1 | [app/planner/[id]/page.tsx:1760](F:/trav-app/app/planner/[id]/page.tsx:1760) |
| [/itinerary/places/update_place_tags.php](F:/trav-app/backend/trav-api/itinerary/places.php:53) | 1 | [app/planner/[id]/page.tsx:1776](F:/trav-app/app/planner/[id]/page.tsx:1776) |

## 13. Helper 的外部引用（目前檔案）

| 外部 PHP（資料來源） | 引用行號 |
| --- | ---: |
| [backend/trav-api/destinations/public_itineraries.php](F:/trav-app/backend/trav-api/destinations/public_itineraries.php:8) | 8 |
| [backend/trav-api/social.php](F:/trav-app/backend/trav-api/social.php:11) | 11 |

## 14. Luggage 合併進度（2026-09-28）

行李的兩個舊端點已整合到 [luggage.php](F:/trav-app/backend/trav-api/itinerary/luggage.php)。此階段完成時 itinerary 為 34 個入口檔案 + 1 個 helper，共 35 個 PHP 檔案；新入口仍提供兩種操作。

| 操作 | 目前入口 | JSON 輸入 | 成功回應 | 前端位置 |
| --- | --- | --- | --- | --- |
| 讀取 | `POST /itinerary/luggage.php?action=get` | `Itinerary_ID`、`Account` | `status: success`、`data: JSON 字串或 null`（真正的 null） | [行李讀取](F:/trav-app/app/planner/[id]/page.tsx:1169) |
| 儲存 | `POST /itinerary/luggage.php?action=update` | `Itinerary_ID`、`Account`、`LuggageData`（JSON 字串） | `{"status":"success"}` | [行李儲存](F:/trav-app/app/planner/[id]/page.tsx:1196) |

- 兩個前端呼叫已更新，舊 `luggage/get_luggage.php`、`luggage/update_luggage.php` 已移除；舊網址不再提供相容轉接。
- 維持以行程 + 帳號隔離資料、原本的擁有者／成員關聯檢查、Luggage_Data 字串或 null 格式，以及成員關聯 UPSERT。
- 維持前端每 5 秒刷新、修改後延遲 1 秒儲存及原本 JSON.parse／JSON.stringify。
- 新入口使用固定 action 清單；非 POST 回 405（OPTIONS 由既有 db_connect.php 回 200）、無效 action 或必要欄位不足回 400。原 update 端點在缺少必要欄位時曾回 HTTP 200 + error；新入口改為 HTTP 400 + error。
- 未修改其他 PHP 模組、共用 helper 或資料庫結構。

本次合併驗證：

- PHP 8.2 容器內 `php -l` 通過。
- `npm run build` 通過，包含 TypeScript 與頁面生成。
- 實際 HTTP OPTIONS 回 200；9 項請求檢查通過：缺 action、無效 action、非 POST、無效 JSON、JSON 陣列、缺行程 ID、缺行李內容、缺帳號、無行程關聯帳號。
- `git diff --check` 通過；前端和後端程式已無舊行李端點引用。
- 未對真實帳號進行行李讀取／儲存端對端測試，未寫入測試行李資料。

## 15. 全部 itinerary 合併完成（2026-09-28）

目前 itinerary 共有 **9 個 PHP 檔案**：6 個 JSON 模組入口、2 個圖片上傳入口、1 個共用 helper；提供原本的 35 種操作。原本 35 個單操作端點已移除，未保留舊網址轉接。這是 itinerary 階段的盤點；後續 community 與 destinations 的整合另見各自文件。

```text
F:\trav-app\backend\trav-api\itinerary\
├── api_helpers.php
├── core.php
├── items.php
├── expenses.php
├── collaboration.php
├── luggage.php
├── places.php
└── uploads\
    └── upload.php
```

### 新舊操作對照（目前 API）

所有操作使用 POST；JSON 入口的 action 由 URL query 傳入，使用固定白名單。圖片入口接受 FormData。下表來源連結指向整合後對應函式。

| 舊網址 | 新網址 | 目前程式來源 |
| --- | --- | --- |
| `/itinerary/collaboration/get_chat_messages.php` | `/itinerary/collaboration.php?action=messages` | [collaboration.php:86](F:/trav-app/backend/trav-api/itinerary/collaboration.php:86) |
| `/itinerary/collaboration/get_chat_presence.php` | `/itinerary/collaboration.php?action=presence` | [collaboration.php:151](F:/trav-app/backend/trav-api/itinerary/collaboration.php:151) |
| `/itinerary/collaboration/get_itinerary_members.php` | `/itinerary/collaboration.php?action=members` | [collaboration.php:33](F:/trav-app/backend/trav-api/itinerary/collaboration.php:33) |
| `/itinerary/collaboration/send_chat_message.php` | `/itinerary/collaboration.php?action=send` | [collaboration.php:123](F:/trav-app/backend/trav-api/itinerary/collaboration.php:123) |
| `/itinerary/collaboration/update_chat_presence.php` | `/itinerary/collaboration.php?action=update_presence` | [collaboration.php:180](F:/trav-app/backend/trav-api/itinerary/collaboration.php:180) |
| `/itinerary/core/create_itinerary.php` | `/itinerary/core.php?action=create` | [core.php:118](F:/trav-app/backend/trav-api/itinerary/core.php:118) |
| `/itinerary/core/delete_itinerary.php` | `/itinerary/core.php?action=delete` | [core.php:180](F:/trav-app/backend/trav-api/itinerary/core.php:180) |
| `/itinerary/core/get_itineraries.php` | `/itinerary/core.php?action=list` | [core.php:17](F:/trav-app/backend/trav-api/itinerary/core.php:17) |
| `/itinerary/core/get_itinerary_detail.php` | `/itinerary/core.php?action=detail` | [core.php:78](F:/trav-app/backend/trav-api/itinerary/core.php:78) |
| `/itinerary/core/get_or_create_invite_code.php` | `/itinerary/core.php?action=invite` | [core.php:281](F:/trav-app/backend/trav-api/itinerary/core.php:281) |
| `/itinerary/core/join_itinerary.php` | `/itinerary/core.php?action=join` | [core.php:313](F:/trav-app/backend/trav-api/itinerary/core.php:313) |
| `/itinerary/core/pin_itinerary.php` | `/itinerary/core.php?action=pin` | [core.php:227](F:/trav-app/backend/trav-api/itinerary/core.php:227) |
| `/itinerary/core/toggle_itinerary_visibility.php` | `/itinerary/core.php?action=visibility` | [core.php:251](F:/trav-app/backend/trav-api/itinerary/core.php:251) |
| `/itinerary/core/update_cover_image.php` | `/itinerary/uploads/upload.php?action=cover` | [uploads/upload.php:14](F:/trav-app/backend/trav-api/itinerary/uploads/upload.php:14) |
| `/itinerary/core/update_itinerary_info.php` | `/itinerary/core.php?action=update` | [core.php:158](F:/trav-app/backend/trav-api/itinerary/core.php:158) |
| `/itinerary/expenses/create_expense.php` | `/itinerary/expenses.php?action=create` | [expenses.php:82](F:/trav-app/backend/trav-api/itinerary/expenses.php:82) |
| `/itinerary/expenses/delete_expense.php` | `/itinerary/expenses.php?action=delete` | [expenses.php:161](F:/trav-app/backend/trav-api/itinerary/expenses.php:161) |
| `/itinerary/expenses/get_expenses.php` | `/itinerary/expenses.php?action=list` | [expenses.php:26](F:/trav-app/backend/trav-api/itinerary/expenses.php:26) |
| `/itinerary/expenses/update_expense_share.php` | `/itinerary/expenses.php?action=update_share` | [expenses.php:189](F:/trav-app/backend/trav-api/itinerary/expenses.php:189) |
| `/itinerary/expenses/update_expense.php` | `/itinerary/expenses.php?action=update` | [expenses.php:123](F:/trav-app/backend/trav-api/itinerary/expenses.php:123) |
| `/itinerary/items/create_itinerary_item.php` | `/itinerary/items.php?action=create` | [items.php:79](F:/trav-app/backend/trav-api/itinerary/items.php:79) |
| `/itinerary/items/delete_itinerary_item.php` | `/itinerary/items.php?action=delete` | [items.php:262](F:/trav-app/backend/trav-api/itinerary/items.php:262) |
| `/itinerary/items/get_itinerary_items.php` | `/itinerary/items.php?action=list` | [items.php:30](F:/trav-app/backend/trav-api/itinerary/items.php:30) |
| `/itinerary/items/update_item_location.php` | `/itinerary/items.php?action=update_location` | [items.php:193](F:/trav-app/backend/trav-api/itinerary/items.php:193) |
| `/itinerary/items/update_item_time.php` | `/itinerary/items.php?action=update_time` | [items.php:158](F:/trav-app/backend/trav-api/itinerary/items.php:158) |
| `/itinerary/items/update_item_title.php` | `/itinerary/items.php?action=update_title` | [items.php:136](F:/trav-app/backend/trav-api/itinerary/items.php:136) |
| `/itinerary/items/update_sort_order.php` | `/itinerary/items.php?action=sort` | [items.php:284](F:/trav-app/backend/trav-api/itinerary/items.php:284) |
| `/itinerary/luggage/get_luggage.php` | `/itinerary/luggage.php?action=get` | [luggage.php:41](F:/trav-app/backend/trav-api/itinerary/luggage.php:41) |
| `/itinerary/luggage/update_luggage.php` | `/itinerary/luggage.php?action=update` | [luggage.php:58](F:/trav-app/backend/trav-api/itinerary/luggage.php:58) |
| `/itinerary/places/get_place_tags.php` | `/itinerary/places.php?action=get` | [places.php:17](F:/trav-app/backend/trav-api/itinerary/places.php:17) |
| `/itinerary/places/update_place_tags.php` | `/itinerary/places.php?action=update` | [places.php:53](F:/trav-app/backend/trav-api/itinerary/places.php:53) |

### 保留與調整

- 前端 43 處呼叫已遷移；涉及 Planner 列表、行程編輯、個人頁面。公開狀態操作雖無直接前端呼叫，仍保留為 core 的 visibility action。
- 各操作輸入欄位、成功 payload、資料排序、個人行李格式、輪詢頻率與資料存取規則沿用盤點中的邏輯。
- 保留地點標籤交易、費用分攤、排序時另更新時間、聊天最新 100 筆、公開快取失效，以及擁有者刪除／成員退出。
- 費用與聊天的重複建表 SQL 各集中成模組函式，仍在原本操作中執行；沒有另外做 schema migration 或效能重構。
- 全部新入口明確拒絕非 POST（405）；OPTIONS 由既有 db_connect.php 回 200。無效／缺少 action、無效 JSON 或 JSON 根節點陣列回 400。其他操作層錯誤狀態碼維持既有邏輯；luggage 缺欄位的調整另見第 14 節。
- 原建立細項的字面值 `\vert{}\vert{}` 修正為 PHP 邏輯 OR `||`，normalize_time_value 集中成 items 內唯一共用函式。
- 封面上傳仍寫入 API 根目錄的 uploads/covers；截圖改用 dirname(__DIR__, 2) 指向 API 根目錄的 uploads/reservations，與回傳網址一致。未搬動或刪除已有圖片。
- api_helpers.php 未搬移或修改。當時 17 個外部 PHP 引用保留；後續 destinations 合併後，外部引用檔案數改為 9 個（見第 13 節）。

### 本輪驗證

- 5 個新 JSON 模組與 2 個新上傳入口均通過 PHP 8.2 容器內 php -l；luggage 的語法與 HTTP 驗證見第 14 節。
- 55 項實際 HTTP 檢查通過：places 9、expenses 8、items 11、collaboration 10、core 11、上傳入口 6。包含 OPTIONS、方法與 action 驗證、JSON 格式、權限拒絕、時間／座標錯誤、無資料列表，以及公開設定的快取依賴載入。
- npm run build 通過，包含 TypeScript 與頁面生成；git diff --check 通過。
- 已檢查 PHP 總數、35 種操作對照、43 處前端 URL 的目標檔案與 action，以及舊網址殘留。
- 尚未以真實帳號執行新增／修改／刪除、聊天傳送、標籤交易或有效圖片上傳的端對端測試；驗證未寫入真實使用者資料。

資料來源：目前上述 PHP 操作函式、共用 helper、3 個前端頁面、專案內附 Next.js 16.2.6 的 Server and Client Components 指南，以及本輪 PHP CLI／HTTP／建置結果。
