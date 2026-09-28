# 社群 PHP 端點整理

`backend/trav-api/community/` 現在有 2 個 PHP：`community.php` 是對外入口，`community_helpers.php` 提供資料查詢、格式化、標籤處理及 JSON 回應函式。前端 `app/community/page.tsx` 的 6 處呼叫已改到新入口；舊的 6 個單功能網址已移除。

## 功能對照

| 原端點 | 現在的呼叫方式 | 功能與主要輸入 | 回傳 |
| --- | --- | --- | --- |
| `get_posts.php` | `GET /community/community.php?action=posts` | 貼文列表；query `type`、`search`、`Account` | `status`、`data`（貼文陣列） |
| `get_topics.php` | `GET /community/community.php?action=topics` | 最多 10 個熱門標籤 | `status`、`data`（標籤及數量） |
| `get_comments.php` | `GET /community/community.php?action=comments&postId=...` | 單篇貼文的留言；展開留言時才載入 | `status`、`data`（留言陣列） |
| `create_post.php` | `POST /community/community.php?action=create` | `Account`、`Post_Type`、`Content`；可選 `Title`、`Location_Name`、`Location_Coordinates`、`Tags`、`image` | `status`、`message`、`data`（新貼文） |
| `toggle_reaction.php` | `POST /community/community.php?action=reaction` | JSON：`Account`、`Post_ID`、`Reaction_Type`（前端送 `like`／`save`） | `status`、`data.active`、`data.likes` |
| `add_comment.php` | `POST /community/community.php?action=comment` | JSON：`Account`、`Post_ID`、`Content`；回覆另傳 `Parent_Comment_ID` | `status`、`data`（新留言） |

貼文列表仍先取得 Post_ID，再批次讀取貼文、標籤與圖片；不在列表預載留言。`create` 仍接受 JSON 或含圖片的 `multipart/form-data`，在發文時執行既有建表流程，並保留原本的交易與圖片儲存位置 `backend/trav-api/uploads/community/`。按讚和留言的通知流程也保留。

路由新增固定 `action` 白名單，未知 action 回 HTTP 400。除 `create` 原本明確限定 POST 外，其餘功能的請求方法驗證沿用原端點；前端讀取用 GET、寫入用 POST。共用 CORS 和 OPTIONS 回應來自 `db_connect.php`。

## 驗證與範圍

- 合併前與合併後的實際 HTTP 回應逐一比對：貼文列表、熱門標籤、帶篩選的空列表、有效／無效留言列表，以及三個寫入操作的空參數錯誤；狀態碼與 JSON 內容一致。
- 新入口在 PHP 容器通過 `php -l`。
- 這次沒有以真實帳號測試發文、上傳、按讚或留言，也沒有寫入測試貼文。

資料來源：`backend/trav-api/community/community.php`、`backend/trav-api/community/community_helpers.php`、`app/community/page.tsx`，以及合併前後的 HTTP 比對結果。
