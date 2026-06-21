'use client';

// 🌟 1. 改從 next/navigation 引入 usePathname
import { usePathname } from "next/navigation"; 
import { Link } from "./Link";
import { Plane, Map, Calendar, User } from "lucide-react";

export function TopNav() {
  // 🌟 2. 直接使用 Hook，它會自動偵測並響應路由變化，不需要 useEffect 了！
  const pathname = usePathname(); 

  const navItems = [
    { path: "/", label: "首頁", icon: Plane },
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
              ? "text-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
          }`}
        >
          <item.icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      ))}
    </>
  );
}