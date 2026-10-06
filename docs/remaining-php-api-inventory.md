# 其餘 PHP API 合併對照

管理後台與追蹤操作在登入權杖移除期間暫停。API 根目錄的其他端點按功能集中在 `auth.php`、`social.php`、`notifications.php`、`files.php`。

| 舊端點 | 新網址 | 功能 |
| --- | --- | --- |
| `login.php` | `POST /auth.php?action=login` | 密碼登入 |
| `register.php` | `POST /auth.php?action=register` | 註冊 |
| `social_login_google.php` | `POST /auth.php?action=google` | Google 登入 |
| `social_login_facebook.php` | `POST /auth.php?action=facebook` | Facebook 登入 |
| `get_user_profile.php` | `POST /social.php?action=profile` | 個人資料與粉絲／追蹤數量 |
| `get_social_links.php` | `POST /social.php?action=links` | 讀取社群連結 |
| `update_social_links.php` | `POST /social.php?action=update_links` | 儲存社群連結 |
| `get_notifications.php` | `POST /notifications.php?action=get` | 讀取通知 |
| `mark_notifications_read.php` | `POST /notifications.php?action=mark_read` | 標記已讀 |
| `get_user_files.php` | `POST /files.php?action=get` | 讀取個人檔案清單 |
| `upload_photo.php` | `POST /files.php?action=upload` | FormData 上傳照片 |

`get_places.php` 已隨舊 `Place` 表移除。`db_connect.php` 是共用程式；`admin/schema.php` 與 `admin/migrations/run.php` 是資料表及命令列遷移工具。

行程封面使用 `POST /itinerary/uploads/upload.php?action=cover` 上傳；詳見 `itinerary-api-inventory.md`。

密碼及第三方登入仍會回傳使用者資料，但不再建立專案自建的登入權杖。`admin/api.php` 暫時回傳 503；追蹤操作與追蹤名單端點不再開放。既有追蹤紀錄仍保留於 `User_Follows`。

驗證：前端通過 `npm run build`；修改過的 PHP 通過語法檢查。

資料來源：`backend/trav-api/admin/api.php`、`backend/trav-api/auth.php`、`backend/trav-api/social.php`、`backend/trav-api/notifications.php`、`backend/trav-api/files.php`、`app/admin/page.tsx`、`app/auth/`、`app/profile/` 與本地檢查。
