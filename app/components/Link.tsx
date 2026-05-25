'use client';

import React from "react";
import { useRouter } from "next/navigation";

interface LinkProps {
    to: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export function Link({ to, children, className = "", onClick }: LinkProps) {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        // 阻止 <a> 標籤的預設重新整理行為
        e.preventDefault();
        
        // 如果有傳入額外的 onClick (例如關閉手機選單)，就執行它
        if (onClick) onClick();
        
        // 執行跳轉
        router.push(to);
    };

    return (
        <a href={to} onClick={handleClick} className={className} style={{ cursor: 'pointer' }}>
            {children}
        </a>
    );
}