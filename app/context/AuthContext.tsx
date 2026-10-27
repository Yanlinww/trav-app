'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 全站會員顯示資料，由 layout 的 AuthProvider 提供，登入頁與設定頁透過 login 更新。
// 僅保存前端狀態，不管理權杖或驗證後端登入身分。
export interface User {
  Member_ID?: string | number; // 可選會員識別欄位；各頁也可能使用 API 回傳的 id。
  Account?: string; // 帳號，作為部分 API 請求的識別資料，不是畫面暱稱。
  Email?: string; // 聯絡郵件；此介面不強制它與 Account 相同。
  nickname?: string; // 登入 API 將 Member.Name 映射為顯示暱稱。
  Gender?: string; // 保留會員性別欄位，不在此進行正規化或驗證。
  avatar?: string | null; // 頭像來源；無圖片時由顯示元件處理備案。
  role?: 'user' | 'admin' | 'moderator'; // 前端角色資料，不代表後端已授權某項操作。
  [key: string]: any; // 兼容現有 API 的額外欄位，例如 id。
}

// 對外提供會員資料、初始化狀態與更新／清除入口。
interface AuthContextType {
  user: User | null; // 還原前、無保存資料或登出後皆可能為 null，需搭配 loading 判斷。
  loading: boolean; // 只表示本機資料還原中，不代表正在向後端驗證。
  login: (userData: User) => void;
  logout: () => void;
}

// undefined 表示缺少 Provider，與合法的 user=null（無會員資料）分開判斷。
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// React state 供目前畫面使用；localStorage 的 user_info 供重新整理後還原。
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // 還原結束前，不應只依 user=null 判定未登入。

  // 掛載後讀取瀏覽器保存的會員資料；此流程不向後端驗證，也不驗證物件欄位。
  useEffect(() => {
    const checkLoginStatus = () => {
      try {
        // user_info 與 login／logout 使用同一個儲存名稱；未保存過時 getItem 回傳 null。
        const savedUser = localStorage.getItem('user_info');
        if (savedUser) {
          // 將 JSON 字串還原為畫面用的會員物件，setUser 會通知訂閱 Context 的元件更新。
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        // 儲存空間不可用或 JSON 損壞時只記錄錯誤；不會自動清除原字串或重試登入。
        console.error("讀取登入狀態失敗:", error);
      } finally {
        // 無資料或解析失敗也結束載入，避免依賴 loading 的頁面一直等待。
        setLoading(false);
      }
    };

    checkLoginStatus();
  // 空依賴陣列不因 user 更新而重讀；重新掛載或開發模式檢查仍可能再次執行。
  }, []);

  // 同步畫面與本機保存資料；登入成功及暱稱／頭像更新後皆可使用，不負責呼叫登入 API。
  const login = (userData: User) => {
    // 先更新目前元件樹的會員狀態，再保存字串供下次掛載還原；此處不寫入會員資料表。
    setUser(userData);
    localStorage.setItem('user_info', JSON.stringify(userData));
    // 現有流程沒有捕捉 setItem 失敗，若儲存拋錯，不會自行復原已更新的 state。
  };

  // 清除本模組的會員資料，不影響其他儲存項目，也不呼叫後端登出 API。
  const logout = () => {
    // 只移除會員顯示資料，不清空其他功能的 localStorage，也不撤銷後端工作階段。
    setUser(null);
    localStorage.removeItem('user_info');
    
    // 以完整頁面導航返回首頁，重新建立前端狀態。
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  // value 包含會員、載入狀態與兩個方法；children 內的 Header／頁面以 useAuth() 取得同一份資料。
  // 本段只提供資料通道，不決定子頁要顯示會員內容、訪客畫面或導回登入頁。
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 統一讀取所屬 Provider 的狀態；缺少 Provider 時拋錯，未登入本身不會觸發此錯誤。
export const useAuth = () => {
  // 讀取最近一層 AuthProvider；若沒有提供者，使用建立 Context 時的 undefined 預設值。
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必須在 AuthProvider 的範圍內使用');
  }
  return context;
};
