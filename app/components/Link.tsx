import React from "react";

interface LinkProps {
    to: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export function Link({ to, children, className = "", onClick }: LinkProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onClick) onClick();
        (window as any).navigate?.(to);
    };

    return (
        <a href={to} onClick={handleClick} className={className}>
            {children}
        </a>
    );
}
