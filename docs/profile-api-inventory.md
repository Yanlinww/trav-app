# 個人設定 PHP 端點整理

`backend/trav-api/profile/profile.php` 目前提供基本資料、密碼與第三方帳號綁定操作。Instagram 綁定目前沒有前端直接呼叫，但原功能仍保留為 action。

公開個人資料與社群連結由 `social.php` 提供，個人檔案讀取與上傳由 `files.php` 提供。完整對照見 `remaining-php-api-inventory.md`。

## 新舊操作對照

| 舊端點 | 新網址 | 請求內容與功能 |
| --- | --- | --- |
| `update_profile.php` | `POST /profile/profile.php?action=update` | FormData：`Account`、`Name`，選填 `Avatar` 檔案；修改暱稱與頭像。 |
| `update_password.php` | `POST /profile/profile.php?action=password` | JSON：`Account`、`OldPassword`、`NewPassword`；核對舊密碼並儲存新密碼雜湊。 |
| `get_social_bindings.php` | `POST /profile/profile.php?action=bindings` | JSON：`Account`；讀取 Google、Facebook 綁定狀態。 |
| `bind_google.php` | `POST /profile/profile.php?action=bind_google` | JSON：`Account`、`AccessToken`；向 Google 查驗後儲存 ID。 |
| `bind_facebook.php` | `POST /profile/profile.php?action=bind_facebook` | JSON：`Account`、`Code`；向 Facebook 換取 ID 並儲存。 |
| `bind_instagram.php` | `POST /profile/profile.php?action=bind_instagram` | JSON：`Account`、`Code`；向 Instagram 換取 ID 並儲存。 |

追蹤名單暫停提供；既有 `User_Follows` 資料與公開的粉絲／追蹤數量仍保留。

## 驗證與範圍

- 新入口在 PHP 容器通過 `php -l`。
- 前端通過 `npm run build`，`profile.php` 通過 PHP 語法檢查。
- 未以真實帳號或第三方授權憑證執行更新個人資料、密碼、頭像或社群綁定的端對端測試。

資料來源：`backend/trav-api/profile/profile.php`、`app/settings/page.tsx` 與本地檢查。
