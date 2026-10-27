'use client';

import { useState } from 'react';

type AvatarImageProps = {
  src?: string | null; // 頭像來源；未提供或載入失敗時改用文字備案。
  name?: string; // 提供備案首字與圖片替代文字。
  className?: string; // 圖片樣式，不套用到備案文字容器。
  fallbackClassName?: string; // 備案文字容器的附加樣式。
};

// 統一處理各頁面的頭像失敗備案，不在此元件讀取或更新會員資料。
export function AvatarImage(props: AvatarImageProps) {
  // src 改變便以新 key 重建內層元件，重置失敗狀態，讓新圖片重新嘗試載入。
  // 僅改 name 或樣式不會重建，仍沿用同一份 failed；更換成不同來源才解除原有失敗狀態。
  return <AvatarContent key={props.src || ''} {...props} />;
}

function AvatarContent({ src, name, className, fallbackClassName }: AvatarImageProps) {
  // failed 只屬於此元件實例；圖片 onError 設為 true 後，下次 render 走文字備案分支。
  const [failed, setFailed] = useState(false);
  // Array.from 依 Unicode 碼點取首字；名稱空白或缺少時使用「旅」。
  const initial = Array.from(name?.trim() || '旅')[0];

  // 缺少來源或圖片報錯時顯示文字；同一個 src 不會自動重試。
  if (!src || failed) {
    // role／aria-label 提供圖片語意；fallbackClassName 只附加到此 span，不使用圖片的 className。
    return <span role="img" aria-label={`${name || '旅客'}的大頭貼`} className={`flex h-full w-full items-center justify-center bg-slate-100 font-medium text-slate-600 ${fallbackClassName || ''}`}>{initial}</span>;
  }

  // 不向圖片來源傳送 Referer；載入錯誤只切換備案，避免重試循環。
  // 傳入 className 時整份取代預設圖片樣式；未提供才使用撐滿容器與 object-cover。
  return <img src={src} alt={`${name || '旅客'}的大頭貼`} referrerPolicy="no-referrer" onError={() => setFailed(true)} className={className || 'h-full w-full object-cover'} />;
}
