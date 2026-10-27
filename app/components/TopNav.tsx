'use client';

// 讀取目前路徑，與下方導覽設定比對；不自行保存另一份路由 state。
import { usePathname } from "next/navigation"; 
import { Link } from "./Link";
import { Plane, Map, Calendar, MessagesSquare } from "lucide-react";

type TopNavProps = {
  mobile?: boolean; // Header 在手機底欄傳入 true，桌機導覽省略時預設 false。
};

// 桌機與手機共用四個目的地，只切換排列、間距與選取樣式；不呼叫後端 API。
export function TopNav({ mobile = false }: TopNavProps) {
  // 導航後由 Hook 取得新 pathname 並重新繪製；不含網址的 query string。
  const pathname = usePathname(); 

  // path 同時是導航目標與列表 key；label 為文字，icon 為對應的圖示元件。
  // 增減導覽入口集中修改此陣列，兩種版面會沿用同一份設定。
  const navItems = [
    { path: "/", label: "首頁", icon: Plane },
    { path: "/destinations", label: "旅遊景點", icon: Map },
    { path: "/planner", label: "行程規劃", icon: Calendar },
    { path: "/community", label: "動態牆", icon: MessagesSquare },
  ];

  // map 將每筆設定轉為自訂 Link；點擊後由 Link 的 router.push 導頁。
  // 選取以 pathname === path 完全相等判斷，因此 /planner/123 不會讓 /planner 視為選取。
  // mobile=true 採平均分配寬度、圖上字下；桌機採橫向排列，選取時另加淺色背景。
  // 圖示亦依 mobile 切換尺寸；版面的顯示／隱藏斷點由外層 Header 控制。
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
