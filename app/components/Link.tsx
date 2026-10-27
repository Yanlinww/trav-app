'use client';

import React from "react";
import { useRouter } from "next/navigation";

// 自訂站內連結，以 router.push 導航；不是 next/link，未提供其完整功能。
interface LinkProps {
    to: string; // 站內目的地路徑。
    children: React.ReactNode; // 連結中的文字、圖示或元件。
    className?: string; // 父元件控制外觀，未提供時使用下方的空字串預設值。
    onClick?: () => void; // 導航前的額外操作，例如關閉手機選單。
}

export function Link({ to, children, className = "", onClick }: LinkProps) {
    // 目的地由呼叫端傳入；此元件不查詢登入狀態，也不代替目標頁做權限驗證。
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        // 取消瀏覽器預設導航，改交由 Next.js 路由器換頁；不阻止事件冒泡。
        e.preventDefault();
        
        // 先執行回呼，不傳事件、不等待非同步完成；同步拋錯時不會繼續導航。
        if (onClick) onClick();
        
        // 新增一筆瀏覽器歷史紀錄；目前未另行處理 Ctrl／Command 點擊等分支。
        router.push(to);
    };

    // href 保留連結目的地；點擊時執行 handleClick，不在渲染階段就呼叫導航。
    // children 直接成為連結內容，例如 TopNav 的圖示與名稱，不另建一份內容狀態。
    return (
        <a href={to} onClick={handleClick} className={className} style={{ cursor: 'pointer' }}>
            {children}
        </a>
    );
}
