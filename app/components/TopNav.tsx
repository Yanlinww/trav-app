'use client';

// 🌟 1. 改從 next/navigation 引入 usePathname
import { usePathname } from "next/navigation"; 
import { Link } from "./Link";
import { Plane, Map, Calendar, User } from "lucide-react";

export function TopNav() {
  // 🌟 2. 直接使用 Hook，它會自動偵測並響應路由變化，不需要 useEffect 了！
  const pathname = usePathname(); 

  const navItems = [
    { path: "/", label: "首頁999", icon: Plane },
    { path: "/destinations", label: "旅遊景點", icon: Map },
    { path: "/planner", label: "行程規劃", icon: Calendar },
    { path: "/community", label: "討論區", icon: User },
  ];

  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
            pathname === item.path // 🌟 3. 這裡改用 pathname 來判斷
              ? "text-neutral-900 bg-neutral-100 font-bold" // 👈 替換成這行 (極簡深色)
              : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50" // 👈 替換成這行 (未選中狀態)
          }`}
        >
          <item.icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      ))}
    </>
  );
}