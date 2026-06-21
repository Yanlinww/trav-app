'use client';

import { useState } from "react";
import { Link } from "./Link";
import { Plane, Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { TopNav } from "./TopNav";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // 🌟 從 useAuth 解構出 loading 狀態
  const { user, logout, loading } = useAuth();

  // 取得全域狀態中的大頭貼
  const avatarUrl = (user as any)?.avatar;

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Plane className="size-6 text-emerald-700" />
          <span className="font-black text-xl tracking-widest text-slate-800 uppercase">VOYAGE</span>
        </Link>

        {/* 桌面版導覽列 */}
        <div className="hidden md:flex items-center gap-6">
          <TopNav />
        </div>

        {/* 桌面版右側會員選單 */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            /* 🌟 1. 載入中：顯示低調的灰色骨架屏 (Skeleton)，防止畫面閃爍跳動 */
            <div className="w-24 h-10 animate-pulse bg-slate-100 rounded-full"></div>
          ) : user ? (
            /* 🌟 2. 確定有登入：顯示會員頭像與選單 */
            <div className="relative flex items-center gap-4">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-all"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                {/* 大頭貼顯示邏輯 */}
                <div className="size-9 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-200 overflow-hidden shadow-sm">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="size-5" />
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 tracking-wider uppercase">{user.nickname}</span>
                  <span className="text-[9px] text-slate-400 tracking-widest font-mono">TRAVELER</span>
                </div>
                <ChevronDown className={`size-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* 下拉選單 */}
              {userMenuOpen && (
                <div className="absolute top-14 right-0 w-48 bg-white border border-slate-100 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link to="/profile">
                    <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer transition-colors tracking-widest">
                      <User className="size-4" /> 旅客檔案
                    </div>
                  </Link>
                  <button 
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 text-left transition-colors tracking-widest"
                  >
                    <LogOut className="size-4" /> 結束旅程
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 🌟 3. 確定未登入：顯示登入/註冊按鈕 */
            <>
              <Link to="/auth/login">
                <button className="px-5 py-2 text-xs font-bold tracking-widest text-slate-500 hover:text-emerald-700 transition-colors uppercase">
                  登入
                </button>
              </Link>
              <Link to="/auth/register">
                <button className="px-5 py-2 bg-slate-900 text-white text-xs font-bold tracking-widest rounded-full hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all uppercase">
                  註冊
                </button>
              </Link>
            </>
          )}
        </div>

        {/* 手機版漢堡選單按鈕 */}
        <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {/* 手機版下拉選單 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white animate-in slide-in-from-top duration-300 shadow-xl">
          <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
            <TopNav />
            
            <div className="h-[1px] bg-slate-100 my-2"></div>
            
            {loading ? (
              /* 🌟 手機版載入中的骨架屏 */
              <div className="flex flex-col gap-3">
                <div className="h-12 w-full animate-pulse bg-slate-100 rounded-xl"></div>
                <div className="h-12 w-full animate-pulse bg-slate-100 rounded-xl"></div>
              </div>
            ) : user ? (
              <div className="flex flex-col gap-3">
                <Link to="/profile">
                  <div className="flex items-center gap-3 px-3 py-2">
                    {/* 手機版也同步大頭貼 */}
                    <div className="size-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 overflow-hidden shadow-sm">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="size-6" />
                      )}
                    </div>
                    <span className="font-bold text-slate-700 tracking-wider uppercase">{user.nickname}</span>
                  </div>
                </Link>
                <button 
                  onClick={logout}
                  className="w-full text-left px-3 py-3 text-red-500 font-bold tracking-widest flex items-center gap-2"
                >
                  <LogOut className="size-4" /> 結束旅程
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link to="/auth/login">
                  <button className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-600 font-bold tracking-widest uppercase">
                    登入
                  </button>
                </Link>
                <Link to="/auth/register">
                  <button className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl font-bold tracking-widest shadow-lg uppercase">
                    註冊
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}