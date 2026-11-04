'use client';

import React from "react";
import NextLink from "next/link";

// 保留既有 to 介面，統一由 Next.js 處理站內導航與瀏覽器的開新分頁操作。
interface LinkProps {
    to: string; // 站內目的地路徑。
    children: React.ReactNode; // 連結中的文字、圖示或元件。
    className?: string; // 父元件控制外觀，未提供時使用下方的空字串預設值。
    onClick?: () => void; // 沿用舊名稱，實際交由 onNavigate 在站內導航前執行，例如關閉手機選單。
}

export function Link({ to, children, className = "", onClick }: LinkProps) {
    // 選單收合等回呼僅在本頁導航執行；Ctrl／Command 點擊不應改動目前頁面。
    // 暫停預抓以維持原有網路請求量，避免一次載入大量行程詳情。
    return (
        <NextLink href={to} onNavigate={onClick} prefetch={false} className={className} style={{ cursor: 'pointer' }}>
            {children}
        </NextLink>
    );
}
