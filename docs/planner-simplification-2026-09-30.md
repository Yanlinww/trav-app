# 行程編輯頁簡化紀錄（2026-09-30）

## 已移除

- `/planner/[id]` 右側的總覽、聊天、旅伴、今日面板及對應手機入口。右側只保留記帳與行李。
- `/planner` 與 `/profile` 的邀請碼產生、分享及加入行程介面。
- PHP `itinerary/core.php` 的 `invite`、`join` 操作，以及 `itinerary/collaboration.php` 全部操作。行程列表、詳情、權限檢查及刪除現在只處理行程擁有者。
- 資料表 `Itinerary_Chat_Message`、`Itinerary_Members`，以及 `Itinerary.Invite_Code` 欄位。
- 共同記帳、分攤與結清畫面，以及 PHP 的分攤操作。資料表 `Itinerary_Expense_Share` 和 `Itinerary_Expense` 的 `Payer`、`Is_Split`、`Type` 欄位已移除。

## 保留的資料與功能

- 行程每日規劃及地圖仍使用原有 `Itinerary_Item`；「今日」面板沒有獨立資料表。
- 記帳只保留個人花費的列表、新增、修改、刪除與各幣別總額。現有資料庫的 2 筆共同分帳已依使用者選擇刪除，2 筆個人花費保留。
- 擁有者的行李資料從 `Itinerary_Members.Luggage_Data` 搬到 `Itinerary_Luggage`；現有資料庫搬移並驗證了 1 筆。行李 API 現在只允許行程擁有者讀寫。

資料庫變更見 `backend/trav-api/itinerary/migrations/003_remove_planner_collaboration.sql` 與 `004_personal_expenses_only.sql`，兩支遷移已套用至目前的 `defaultdb`。舊的 `001_create_itinerary_luggage.sql` 已去除對現有資料庫不存在的 `Itinerary.Luggage_Data` 欄位的讀取。
