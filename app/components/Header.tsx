'use client';

import { useState } from "react";
import { Link } from "./Link";
import { Plane, Menu, X, User, LogOut, ChevronDown, Settings, Bell } from "lucide-react";
import { TopNav } from "./TopNav";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const avatarUrl = (user as any)?.avatar;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-100 shadow-sm">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Plane className="size-6 text-neutral-900" />
          <span className="font-black text-xl tracking-widest text-neutral-900 uppercase">TRAVMADE</span>
        </Link>

        {/* 桌面端主導覽 */}
        <div className="hidden md:flex items-center gap-6">
          <TopNav />
        </div>

        {/* 桌面端右側使用者狀態 */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-24 h-10 animate-pulse bg-neutral-100 rounded-full"></div>
          ) : user ? (
            <div className="relative flex items-center gap-4">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 p-1.5 rounded-lg transition-all"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                {/* 大頭貼 */}
                <div className="size-9 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-600 border border-neutral-200 overflow-hidden shadow-sm">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover grayscale-[20%]" />
                  ) : (
                    <User className="size-5" />
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-neutral-700 tracking-wider uppercase">{user.nickname}</span>
                  <span className="text-[9px] text-neutral-400 tracking-widest font-mono">TRAVELER</span>
                </div>
                <ChevronDown className={`size-4 text-neutral-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* ================= 桌面端大頭貼下拉選單 (依據設計圖擴充) ================= */}
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

                  {/* 4. 結束旅程 (登出) */}
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

        {/* 漢堡選單按鈕 (行動端) */}
        <button className="md:hidden p-2 text-neutral-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {/* ================= 行動端 RWD 導覽選單同步更新 ================= */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-white animate-in slide-in-from-top duration-300 shadow-xl">
          <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
            <TopNav />
            
            <div className="h-[1px] bg-neutral-100 my-2"></div>
            
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
                    {avatarUrl ? (
                      <img srcsrc={avatarUrl} alt="Avatar" className="w-full h-full object-cover grayscale-[20%]" />
                    ) : (
                      <User className="size-6" />
                    )}
                  </div>
                  <span className="font-bold text-neutral-700 tracking-wider uppercase">{user.nickname}</span>
                </div>

                {/* 行動端選單功能同步 */}
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
    </header>
  );
}