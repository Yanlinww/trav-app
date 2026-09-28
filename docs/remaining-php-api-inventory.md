# 其餘 PHP API 合併對照

管理後台的 6 支單功能端點合併為 `admin/api.php`；API 根目錄的 12 支端點按功能合併為 `auth.php`、`social.php`、`notifications.php`、`files.php`。前端呼叫已改用 `action` 網址參數，舊單功能網址已移除。

| 舊端點 | 新網址 | 功能 |
| --- | --- | --- |
| `admin/get_admin_dashboard_stats.php` | `POST /admin/api.php?action=dashboard_stats` | 管理統計 |
| `admin/get_admin_users.php` | `POST /admin/api.php?action=users` | 使用者清單 |
| `admin/get_public_itinerary_moderation_log.php` | `POST /admin/api.php?action=moderation_log` | 審核紀錄 |
| `admin/get_public_itinerary_reports.php` | `POST /admin/api.php?action=reports` | 檢舉清單 |
| `admin/update_public_itinerary_report.php` | `POST /admin/api.php?action=update_report` | 處理檢舉 |
| `admin/update_public_itinerary_visibility.php` | `POST /admin/api.php?action=update_visibility` | 下架或恢復公開行程 |
| `login.php` | `POST /auth.php?action=login` | 密碼登入 |
| `register.php` | `POST /auth.php?action=register` | 註冊 |
| `social_login_google.php` | `POST /auth.php?action=google` | Google 登入 |
| `social_login_facebook.php` | `POST /auth.php?action=facebook` | Facebook 登入 |
| `get_user_profile.php` | `POST /social.php?action=profile` | 個人資料與追蹤狀態 |
| `get_social_links.php` | `POST /social.php?action=links` | 讀取社群連結 |
| `update_social_links.php` | `POST /social.php?action=update_links` | 儲存社群連結 |
| `toggle_follow.php` | `POST /social.php?action=toggle_follow` | 追蹤／取消追蹤 |
| `get_notifications.php` | `POST /notifications.php?action=get` | 讀取通知 |
| `mark_notifications_read.php` | `POST /notifications.php?action=mark_read` | 標記已讀 |
| `get_user_files.php` | `POST /files.php?action=get` | 讀取個人檔案清單 |
| `upload_photo.php` | `POST /files.php?action=upload` | FormData 上傳照片 |

`get_places.php` 原本就是單一地點查詢端點，沒有其他同類端點可合併，因此保留。`db_connect.php`、`auth/auth_session_helpers.php`、`admin/admin_helpers.php` 是共用程式；`admin/schema.php` 與 `admin/migrations/run.php` 是資料表及命令列遷移工具，也保留原檔。

行程的兩支上傳端點也合併為 `POST /itinerary/uploads/upload.php?action=cover` 和 `POST /itinerary/uploads/upload.php?action=screenshot`，仍使用各自原有的 FormData 欄位；詳見 `itinerary-api-inventory.md`。

管理後台仍需 Bearer 權杖與管理員身分。追蹤操作仍從權杖取得操作者帳號。原本 JSON 與 FormData 的輸入、回應欄位和資料庫操作留在各自 action 中。

驗證：6 個新入口通過 PHP 語法檢查；20 個新舊操作的 OPTIONS 和無效輸入回應逐一比對，狀態碼及內容一致；另對不存在的帳號測試個人資料、社群連結、檔案、通知、登入、追蹤與無檔案上傳。沒有用真實帳號執行寫入、檔案上傳或第三方 OAuth 流程。

資料來源：`backend/trav-api/admin/api.php`、`backend/trav-api/auth.php`、`backend/trav-api/social.php`、`backend/trav-api/notifications.php`、`backend/trav-api/files.php`、`app/admin/page.tsx`、`app/auth/`、`app/profile/`、`app/notifications/page.tsx`、`app/components/FollowListModal.tsx` 與本地 HTTP 比對。
