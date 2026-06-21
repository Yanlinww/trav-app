'use client';

import { useState } from "react";
import { Link } from "./Link";
import { Plane, Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { TopNav } from "./TopNav";
import { useAuth } from "../context/AuthContext"; // 確保路徑正確

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo 區域 */}
        <Link to="/" className="flex items-center gap-2">
          <Plane className="size-6 text-blue-600" />
          <span className="font-bold text-xl tracking-tight text-gray-800">VOYAGE</span>
        </Link>

        {/* 電腦版導覽列 */}
        <div className="hidden md:flex items-center gap-6">
          <TopNav />
        </div>

        {/* 右側按鈕區域 */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            /* --- 已登入狀態 --- */
            <div className="relative flex items-center gap-4">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-all"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="size-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 border border-blue-200">
                  <User className="size-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">{user.nickname}</span>
                  <span className="text-[10px] text-gray-400">已登入</span>
                </div>
                <ChevronDown className={`size-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* 使用者下拉選單 */}
              {userMenuOpen && (
                <div className="absolute top-12 right-0 w-48 bg-white border rounded-xl shadow-xl py-2 z-50">
                  <Link to="/profile">
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer">
                      <User className="size-4" /> 個人資料
                    </div>
                  </Link>
                  <button 
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                  >
                    <LogOut className="size-4" /> 登出帳號
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* --- 未登入狀態 --- */
            <>
              <Link to="/auth/login">
                <button className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                  登入
                </button>
              </Link>
              <Link to="/auth/register">
                <button className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 shadow-md hover:shadow-lg transition-all">
                  立即註冊
                </button>
              </Link>
            </>
          )}
        </div>

        {/* 手機版選單按鈕 */}
        <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {/* 手機版下拉選單 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white animate-in slide-in-from-top duration-300">
          <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
            <TopNav />
            
            <div className="h-[1px] bg-gray-100 my-2"></div>

            {user ? (
              <div className="flex flex-col gap-3">
                <Link to="/profile">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="size-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <User className="size-6" />
                    </div>
                    <span className="font-medium text-gray-700">{user.nickname}</span>
                  </div>
                </Link>
                <button 
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-red-500 font-medium flex items-center gap-2"
                >
                  <LogOut className="size-4" /> 登出
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link to="/login">
                  <button className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium">
                    登入
                  </button>
                </Link>
                <Link to="/register">
                  <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg">
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