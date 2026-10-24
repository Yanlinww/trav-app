# Google 地圖請求保護與中文程式說明

## 這次完成什麼

保護的是本專案四個 Google Places 代理端點：自動完成、文字搜尋、地點詳情、照片。
前端先減少誤操作，後端在送出 Google 請求前再檢查頻率。所有使用者共用同一程序的上限。
不需要新增資料表、環境變數或付費服務，也沒有恢復先前撤回的每月計數功能。

## 預設限制與調整位置

在 app/lib/places-request-guard.js 調整以下常數：

| 常數或服務名稱 | 中文意思 | 預設值 |
| --- | --- | --- |
| WINDOW_MS | 滑動時間視窗，單位毫秒 | 60,000，亦即最近 60 秒 |
| TOTAL_PER_MINUTE | 四種服務合計的全站請求上限 | 每分鐘 30 次 |
| MAX_IN_FLIGHT | 不同查詢同時等待 Google 回應的上限 | 4 筆 |
| autocomplete | 自動完成搜尋建議 | 每分鐘 20 次 |
| textsearch | 按 Enter 後的文字搜尋 | 每分鐘 10 次 |
| placedetails | 地點詳細資料 | 每分鐘 10 次 |
| placephoto | 地點照片 | 每分鐘 10 次 |

這些數字是減少短時間大量操作的預設值，不是 Google 免費用量，也不是每位訪客各有一份。
例如甲查 8 次文字搜尋，乙在同一視窗內只能再查 2 次；總上限和各服務上限同時適用。
若要調整，修改常數後重新建置與部署。不要在前端放一份計數就認為別人無法繞過。
Google 控制台的 per day（每日）配額另外管理；本次沒有替你改成每日 30 次。

## 前端流程

1. 少於 2 個字不送出查詢，最多接受 100 個字。
2. 輸入法選字期間不查詢，停止輸入 800 毫秒才送出自動完成。
3. 只因父元件重新繪製而建立的新座標物件，不會觸發額外查詢。
4. 改字、選建議、按 Enter 時取消尚未送出的自動完成；舊回應也不能覆蓋新狀態。
5. 選取建議後更新名稱，不再為這個名稱自動查一次建議。
6. 同一建議兩秒內重複點擊不再觸發選取；地點詳情進行中使用同一個 Promise。
7. 文字搜尋進行中與送出後一秒內不接受連點；收到 429 後依 Retry-After 冷卻。
8. 已開啟且讀取完整的同一地點資訊框，再點同一標記不重查詳情。
9. 照片失敗顯示中文提示，不自動換網址重試；其他地點資訊仍可使用。

取消瀏覽器請求不代表 Google 一定沒有收到。節省次數主要靠送出前延遲、防重複與後端檢查。

## 後端流程與名詞翻譯

- Route Handler：路由處理函式，也就是 app/api 各個 route.js 的入口。
- Debounce：輸入防抖，等使用者停止輸入一段時間才送出。
- Rate limit：頻率限制，超過短時間上限就拒絕新查詢。
- Sliding window：滑動視窗，每次看最近 60 秒，不是每到整點就歸零。
- In-flight request：已送出且尚未完成的請求。
- Promise：非同步工作的結果；多個呼叫等待同一份結果就不用重複向 Google 查詢。
- signature：正規化後的查詢條件，與服務名稱組成合併請求的鍵值。
- globalThis：目前 Node.js 程序的全域物件，讓四個端點共用狀態。
- AbortController：取消瀏覽器請求的控制器。
- HTTP 400：參數或 JSON 無效，不呼叫 Google。
- HTTP 429：查詢過於頻繁，或 Google 已回報用量限制。
- Retry-After：建議等待多少秒再重試；本專案不自動重試。
- HTTP 502：Google 或網路連線異常；不把 Google 原始錯誤或金鑰交給前端。
- HTTP 503：尚未設定地圖 API 金鑰。
- HTTP 504：外部查詢超過 10 秒。
- Cache-Control: private, no-store：不允許瀏覽器或共用代理保存這份回應作為快取。
- FieldMask：指定 Google 需要回傳的欄位；不同欄位可能影響計費項目。

後端先驗證 JSON 與參數，再檢查金鑰；有效請求才進入共用保護工具。
相同查詢正在進行時共用一份外部回應，各呼叫拿 Response.clone()，避免內文被其他呼叫讀走。
外部請求成功或失敗後都移除合併狀態，不保存長期地點資料或照片。
已送出的失敗請求也保留次數，防止連線異常時持續重試。Google 回報 429 時全站冷卻一分鐘。

## 保護範圍與限制

- 目前不是後端驗證的會員配額；前端提供的帳號不能作為可信身分。
- 攻擊者仍可能耗完全站共用額度。要按會員公平分配，需要先恢復可信後端登入驗證。
- 計數只在目前 Node.js 程序記憶體中。重啟會重置，多台伺服器或 Serverless 執行個體各自計數。
- 瀏覽器直接載入 Google Maps JavaScript API 的地圖，不經過這四個端點，不受此工具限制。
- 前端 Google 地圖金鑰仍須設定網站來源與可用 API 限制；伺服器金鑰另外設定適合部署環境的限制。
- 本次沒有改寫地圖掛載方式：目前行程頁已有共用 mapRef，沒有因這次保護另建地圖。
- 免費用量、其他專案共用用量、當月歷史用量仍須在 Google 控制台核對；程式節流不能保證零費用。
- 保留 Google 控制台每日配額作為外部防線；預算通知也不是立即停用開關。

## 驗證與人工操作

執行 node --test tests/places-request-guard.test.mjs tests/place-autocomplete.test.cjs 可驗證後端保護與前端事件流程。
前端使用模擬 Hook 環境測試，不等於真實瀏覽器操作。
測試使用模擬回應，不需要真實金鑰，也不發送 Google 計費請求。

瀏覽器人工檢查可在需要時進行（會消耗實際 Google 配額）：

1. 在開發者工具 Network 篩選 autocomplete；快速打字後停止，只應在最後送出一筆。
2. 用中文輸入法選字，確認選字中的 Enter 不會送出文字搜尋。
3. 按 Enter 搜尋，再連按數次，確認只有一筆進行中的 textsearch。
4. 連點同一個標記，確認等待期間只有一筆 placedetails。
5. 遇到上限時應出現中文提示，等待後手動操作，不應持續自動重試。

## 資料來源

- 專案目前的四個 Places API、PlaceAutocomplete.tsx、app/planner/[id]/page.tsx。
- 專案內 Next.js 16.2.6 文件：node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md。
- Google Places 資料使用政策：https://developers.google.com/maps/documentation/places/web-service/policies
- Google 官方計價與免費用量：https://developers.google.com/maps/billing-and-pricing/pricing
