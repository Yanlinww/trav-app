'use client';

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Link } from "./Link";
import { Menu, X, User, LogOut, ChevronDown, Settings, Bell } from "lucide-react";
import { TopNav } from "./TopNav";
import { useAuth } from "../context/AuthContext";
import { AvatarImage } from "./AvatarImage";

// 全站頁首：共用會員狀態與 TopNav，依螢幕寬度顯示桌機導覽或手機帳號選單／底欄。
export function Header() {
  // 手機帳號選單與桌機頭像選單獨立開關，互不共用展開狀態。
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // 路徑變化只影響底欄顯示條件；目前沒有 Effect 在換頁或點擊選單外時自動收合選單。
  const pathname = usePathname();
  // loading 期間顯示骨架；還原完成後才依 user 切換會員資訊或登入／註冊入口。
  const { user, logout, loading } = useAuth();
  // 頭像與暱稱來自共用會員物件；login 更新資料後，本元件隨 Context 更新，不另查會員 API。
  const avatarUrl = (user as any)?.avatar;
  // /planner/{id} 編輯頁隱藏手機底欄；/planner 行程列表仍保留。
  const showMobileBottomNav = !pathname.startsWith("/planner/");

  // 頁首由 sticky 固定在頂部；下方手機主導覽另外以 fixed 貼齊視窗底部。
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-100 shadow-sm">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Image
            src="/brand/travmate-logo-v1.png"
            alt="TRAVMATE 旅遊探索"
            width={36}
            height={36}
            priority
            className="size-8 shrink-0 object-contain sm:size-9"
          />
          <span className="font-black text-xl tracking-widest text-neutral-900 uppercase">Travmade</span>
        </Link>

        {/* md 以上顯示桌機導覽，導覽項目與目前路由樣式由 TopNav 管理。 */}
        <div className="hidden md:flex items-center gap-6">
          <TopNav />
        </div>

        {/* 三種顯示：loading 顯示骨架；有 user 顯示頭像選單；其餘顯示登入與註冊。 */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-24 h-10 animate-pulse bg-neutral-100 rounded-full"></div>
          ) : user ? (
            <div className="relative flex items-center gap-4">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 p-1.5 rounded-lg transition-all"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                {/* AvatarImage 接收來源與名稱；圖片失敗時由它切成名稱首字，不在 Header 重試。 */}
                <div className="size-9 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-600 border border-neutral-200 overflow-hidden shadow-sm">
                  <AvatarImage src={avatarUrl} name={user.nickname} />
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-neutral-700 tracking-wider uppercase">{user.nickname}</span>
                  <span className="text-[9px] text-neutral-400 tracking-widest font-mono">TRAVELER</span>
                </div>
                <ChevronDown className={`size-4 text-neutral-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* 點擊頭像切換 userMenuOpen，同時旋轉箭頭；只在展開時渲染下拉選單。
                  桌機連結未另設關閉回呼，登出則先執行共用 logout，再更新本地開關。 */}
              {userMenuOpen && (
                <div className="absolute top-14 right-0 w-48 bg-white border border-neutral-100 rounded-sm shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* 1. 旅客檔案 (個人頁面) */}
                  <Link to="/profile">
                    <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 cursor-pointer transition-colors tracking-widest">
                      <User className="size-4" />
                      <span>旅客檔案</span>
                    </div>
                  </Link>

                  {/* 2. 帳號設定 (包含子項目大頭貼、安全、偏好、社群) */}
                  <Link to="/settings">
                    <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 cursor-pointer transition-colors tracking-widest">
                      <Settings className="size-4" />
                      <span>帳號設定</span>
                    </div>
                  </Link>

                  {/* 3. 通知中心 */}
                  <Link to="/notifications">
                    <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 cursor-pointer transition-colors tracking-widest">
                      <Bell className="size-4" />
                      <span>通知中心</span>
                    </div>
                  </Link>

                  {/* 分隔線 */}
                  <div className="h-px bg-neutral-100 my-1 mx-2"></div>

                  {/* 清除共用會員資料並返回首頁，再收起本地選單狀態。 */}
                  <button 
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 text-left transition-colors tracking-widest"
                  >
                    <LogOut className="size-4" />
                    <span>結束旅程</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/auth/login">
                <button className="px-5 py-2 text-xs font-bold tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors uppercase">
                  登入
                </button>
              </Link>
              <Link to="/auth/register">
                <button className="px-5 py-2 bg-neutral-900 text-white text-xs font-bold tracking-widest rounded-sm hover:bg-neutral-800 shadow-md transition-all uppercase">
                  註冊
                </button>
              </Link>
            </>
          )}
        </div>

        {/* 漢堡按鈕只在 md 以下出現，切換 mobileMenuOpen 與 Menu／X 圖示。
            md 斷點只控制 CSS 顯示，不會把兩個選單的 React state 自動重置。 */}
        <button className="md:hidden p-2 text-neutral-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {/* 手機帳號選單只在展開時掛載；最大高度扣除頁首與底欄，超出內容可捲動。
          showMobileBottomNav=false 時只扣頁首高度，避免編輯頁仍保留不存在的底欄空間。 */}
      {mobileMenuOpen && (
        <div className={`absolute inset-x-0 top-full z-40 overflow-y-auto border-t border-neutral-100 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 md:hidden ${showMobileBottomNav ? 'max-h-[calc(100dvh-8.5rem)]' : 'max-h-[calc(100dvh-4rem)]'}`}>
          <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
            {loading ? (
              <div className="flex flex-col gap-3">
                <div className="h-12 w-full animate-pulse bg-neutral-100 rounded-sm"></div>
                <div className="h-12 w-full animate-pulse bg-neutral-100 rounded-sm"></div>
              </div>
            ) : user ? (
              <div className="flex flex-col gap-1">
                {/* 用戶基本資訊顯示 */}
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <div className="size-10 bg-neutral-50 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 overflow-hidden shadow-sm">
                    <AvatarImage src={avatarUrl} name={user.nickname} />
                  </div>
                  <span className="font-bold text-neutral-700 tracking-wider uppercase">{user.nickname}</span>
                </div>

                {/* 手機連結透過回呼先收起選單，再由自訂 Link 導航。 */}
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-md">
                    <User className="size-4" /> 旅客檔案
                  </div>
                </Link>
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-md">
                    <Settings className="size-4" /> 帳號設定
                  </div>
                </Link>
                <Link to="/notifications" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-md">
                    <Bell className="size-4" /> 通知中心
                  </div>
                </Link>
                <div className="h-[1px] bg-neutral-100 my-2"></div>

                <button 
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-md flex items-center gap-3"
                >
                  <LogOut className="size-4" /> 結束旅程
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link to="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full px-4 py-3 border border-neutral-200 rounded-sm text-neutral-600 font-bold tracking-widest uppercase hover:bg-neutral-50">
                    登入
                  </button>
                </Link>
                <Link to="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full px-4 py-3 bg-neutral-900 text-white rounded-sm font-bold tracking-widest shadow-md uppercase hover:bg-neutral-800">
                    註冊
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 路由允許時才掛載底欄，md 以上再以 CSS 隱藏；TopNav mobile 負責圖示／文字的排列。
          fixed 不佔主內容高度，頁面預留空間由 layout 等外層處理；安全區內距避開裝置底部操作區。 */}
      {showMobileBottomNav && (
        <nav
          aria-label="手機主導覽"
          className="fixed inset-x-0 bottom-0 z-50 flex min-h-[4.5rem] border-t border-neutral-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
        >
          <TopNav mobile />
        </nav>
      )}
    </header>
  );
}
