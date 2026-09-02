'use client';

// 🌟 1. 改從 next/navigation 引入 usePathname
import { usePathname } from "next/navigation"; 
import { Link } from "./Link";
import { Plane, Map, Calendar, MessagesSquare } from "lucide-react";

type TopNavProps = {
  mobile?: boolean;
};

export function TopNav({ mobile = false }: TopNavProps) {
  // 🌟 2. 直接使用 Hook，它會自動偵測並響應路由變化，不需要 useEffect 了！
  const pathname = usePathname(); 

  const navItems = [
    { path: "/", label: "首頁", icon: Plane },
    { path: "/destinations", label: "旅遊景點", icon: Map },
    { path: "/planner", label: "行程規劃", icon: Calendar },
    { path: "/community", label: "動態牆", icon: MessagesSquare },
  ];

  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={mobile
            ? `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium leading-tight transition-colors ${
                pathname === item.path
                  ? "text-neutral-900 font-bold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`
            : `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
                pathname === item.path
                  ? "bg-neutral-100 font-bold text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              }`
          }
        >
          <item.icon className={mobile ? "size-5" : "size-4"} />
          <span>{item.label}</span>
        </Link>
      ))}
    </>
  );
}
