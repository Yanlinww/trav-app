'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 定義 User 資料的型別 (對應你的 Member 資料表與前端需求)
export interface User {
  Member_ID?: string | number;
  Account?: string;
  Email?: string;
  nickname?: string; // 對應資料庫的 Name
  Gender?: string;
  avatar?: string | null; // 支援我們剛剛做的大頭貼功能
  [key: string]: any; // 保留擴充性
}

// 定義 AuthContext 提供的功能型別
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

// 建立 Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider 元件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🌟 初始化檢查：網頁一打開時，檢查 localStorage 有沒有暫存的登入資料
  useEffect(() => {
    const checkLoginStatus = () => {
      try {
        const savedUser = localStorage.getItem('user_info');
        const savedToken = localStorage.getItem('auth_token');

        if (savedUser && savedToken) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error("讀取登入狀態失敗:", error);
      } finally {
        // 🌟 關鍵修復：無論 try 成功還是進到 catch，最後一定會執行這裡
        // 這樣網頁就絕對不會永遠卡在灰色的 Loading 骨架屏！
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  // 登入功能：把後端傳來的資料與 Token 存起來
  const login = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('user_info', JSON.stringify(userData));
    localStorage.setItem('auth_token', token);
  };

  // 登出功能：清空所有暫存資料
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user_info');
    localStorage.removeItem('auth_token');
    
    // 登出後強制把畫面導回首頁，確保安全
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 自訂 Hook：讓其他頁面可以輕鬆呼叫 useAuth()
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必須在 AuthProvider 的範圍內使用');
  }
  return context;
};