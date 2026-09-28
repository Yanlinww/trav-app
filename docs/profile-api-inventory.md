# 個人設定 PHP 端點整理

`backend/trav-api/profile/` 的 7 支單功能 API 已整合到 `profile.php`，設定頁與追蹤名單元件的 6 處呼叫已更新。Instagram 綁定目前沒有前端直接呼叫，但原功能仍保留為 action。舊單功能網址已移除。

此文件記錄先前的 `profile/` 合併。後續根目錄合併已將個人資料、社群連結與追蹤改到 `social.php`，個人檔案讀取與上傳改到 `files.php`；`auth/auth_session_helpers.php` 仍是共用函式。完整對照見 `remaining-php-api-inventory.md`。

## 新舊操作對照

| 舊端點 | 新網址 | 請求內容與功能 |
| --- | --- | --- |
| `update_profile.php` | `POST /profile/profile.php?action=update` | FormData：`Account`、`Name`，選填 `Avatar` 檔案；修改暱稱與頭像。 |
| `update_password.php` | `POST /profile/profile.php?action=password` | JSON：`Account`、`OldPassword`、`NewPassword`；核對舊密碼並儲存新密碼雜湊。 |
| `get_follow_list.php` | `POST /profile/profile.php?action=follow_list` | JSON：`Account`、`List_Type`（`followers`／`following`），另需 Bearer 憑證；讀取追蹤名單。 |
| `get_social_bindings.php` | `POST /profile/profile.php?action=bindings` | JSON：`Account`；讀取 Google、Facebook 綁定狀態。 |
| `bind_google.php` | `POST /profile/profile.php?action=bind_google` | JSON：`Account`、`AccessToken`；向 Google 查驗後儲存 ID。 |
| `bind_facebook.php` | `POST /profile/profile.php?action=bind_facebook` | JSON：`Account`、`Code`；向 Facebook 換取 ID 並儲存。 |
| `bind_instagram.php` | `POST /profile/profile.php?action=bind_instagram` | JSON：`Account`、`Code`；向 Instagram 換取 ID 並儲存。 |

追蹤名單的登入檢查與原有建表流程仍只在 `follow_list` 操作執行。OPTIONS 預檢保持原本狀態碼：追蹤名單 204，其餘操作 200。除入口整合外，本次未改動各操作的驗證與回應邏輯。

## 驗證與範圍

- 新入口在 PHP 容器通過 `php -l`。
- 7 個操作的無效輸入與 OPTIONS 回應逐一比對新舊網址，狀態碼與 JSON 內容一致；無效帳號的綁定狀態查詢亦一致。
- 未以真實帳號或第三方授權憑證執行更新個人資料、密碼、頭像、社群綁定或已登入的追蹤名單端對端測試。

資料來源：`backend/trav-api/profile/profile.php`、`app/settings/page.tsx`、`app/components/FollowListModal.tsx` 與本次 HTTP 比對結果。
