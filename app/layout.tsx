// 引入 Next.js / React 相關類型與自訂元件
import React from "react";

// 引入自訂 Header 元件：包含導覽列、使用者登入狀態顯示、選單以及響應式切換選單等 UI 邏輯
import { Header } from "./components/Header";

// 從 lucide-react 圖示庫引入飛機圖示 (Plane Icon)，用於 Footer 的品牌 Visual Identity 標誌
import { Plane } from "lucide-react";

// 引入全域樣式檔（包含 Tailwind CSS 的 @base, @components, @utilities 指令、全域 CSS 變數與 Reset 樣式）
import "./globals.css";

// 引入身份驗證 Context Provider，用於在元件樹中共享使用者登入狀態、Token 與驗證邏輯 (React Context API)
import { AuthProvider } from "./context/AuthContext";

/**
 * RootLayout - Next.js App Router 的根佈局元件 (Root Layout)
 * 
 * @param {Object} props - 元件屬性
 * @param {React.ReactNode} props.children - 當前路由對應的頁面內容 (Page component) 或子佈局 (Nested Layout)
 * 
 * @returns {JSX.Element} 包含完整 HTML 結構、全域狀態 Provider 與頁面通用邊框（Header / Footer）的根佈局
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* 
      <html> 標籤：
      - lang="zh-TW": 設定網頁主要語言為繁體中文，有利於 SEO 語意化與螢幕閱讀器 (Accessibility)
      - suppressHydrationWarning: 防止因為瀏覽器擴充功能（如 Grammarly, DarkReader）修改 DOM 導致 SSR 與 CSR 不一致時跳出警告
    */
    <html lang="zh-TW" suppressHydrationWarning>
      {/* 
        <body> 標籤：
        - min-h-screen: 設定最小高度為 100vh (視窗高度)，確保頁面內容較少時 Footer 仍能維持在最下方
        - flex flex-col: 使用 Flexbox 垂直方向佈局，便於控制 Header, Main, Footer 的高度分配
      */}
      <body className="min-h-screen flex flex-col">
        {/* 
          1. AuthProvider ( Context Provider ):
             - 必須包裹在最外層，為所有子元件提供 useAuth Hook 的資料流 (如 user, login, logout)
             - 包裹 Header 可以確保 Header 內的登入/登出按鈕及頭像能正常存取 Auth 狀態
        */}
        <AuthProvider>
          
          {/* 2. 全域頁首導覽列 (Header Component) */}
          <Header />

          {/* 
            3. 中間內容與頁尾的包裹容器：
               - flex flex-1 flex-col: 佔據剩下的所有垂直空間 (flex-1)，並維持垂直佈局
               - pb-[calc(4.5rem+env(safe-area-inset-bottom))]: 針對行動端（如 iPhone Safe Area 避開底部 Home Indicator）設定底部內距
               - md:pb-0: 在中型螢幕 (>=768px) 以上取消行動端的底部內距
          */}
          <div className="flex flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
            {/* 
              4. 主要內容區域 (Main Content Area):
                 - main: HTML5 語意化標籤，代表網頁的主要獨特內容
                 - flex-1: 自動延伸填滿剩餘空間，推擠 Footer 到頁面底部
            */}
            <main className="flex-1">
              {children}
            </main>

            {/* 
              5. 頁尾區域 (Footer Area):
                 - footer: HTML5 語意化頁尾標籤
                 - bg-gray-900: 背景顏色設為深灰色 (#111827)
                 - text-white: 文字顏色設為純白色
                 - py-12: 上下內距設定為 3rem (48px)
            */}
            <footer className="bg-gray-900 text-white py-12">
              {/* 
                container: Tailwind 內建容器，自動依據 Breakpoint 限制最大寬度
                mx-auto: 水平居中置中 (margin-left: auto; margin-right: auto;)
                px-4: 左右保留 1rem (16px) 的內距Padding，避免邊緣文字緊貼螢幕 border
              */}
              <div className="container mx-auto px-4">
                
                {/* 
                  網格佈局 (CSS Grid):
                  - grid: 啟用 Grid 佈局
                  - grid-cols-1: 行動端預設為單欄顯示
                  - md:grid-cols-4: 在中型螢幕 (>=768px) 以上切換為 4 欄等寬佈局
                  - gap-8: 網格欄位之間的間隔 (gap) 設定為 2rem (32px)
                */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  
                  {/* 第一欄：品牌標誌 (Brand Identity) 與簡介 */}
                  <div>
                    {/* flex items-center gap-2: 圖示與文字水平對齊，間距 0.5rem (8px)，mb-4: 下方留白 1rem (16px) */}
                    <div className="flex items-center gap-2 mb-4">
                      {/* size-6: 設定 SVG 圖示寬度與高度皆為 1.5rem (24px) */}
                      <Plane className="size-6" />
                      {/* font-bold: 字體加粗, text-lg: 字體大小 1.125rem (18px) */}
                      <span className="font-bold text-lg">旅遊探索</span>
                    </div>
                    {/* text-gray-400: 次級文字灰色, text-sm: 字體大小 0.875rem (14px) */}
                    <p className="text-gray-400 text-sm">
                      探索世界，創造美好回憶
                    </p>
                  </div>

                  {/* 第二欄：網站熱門連結區塊 */}
                  <div>
                    {/* mb-4: 下方留白 1rem (16px), text-gray-200: 標題使用較亮淺灰色 */}
                    <h3 className="mb-4 text-gray-200 font-medium">熱門目的地</h3>
                    {/* space-y-2: 子元素之間垂直間距 0.5rem (8px), text-sm: 字體大小 14px, text-gray-400: 灰色內文 */}
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>日本</li>
                      <li>歐洲</li>
                      <li>東南亞</li>
                    </ul>
                  </div>

                  {/* 第三欄：（預留擴充欄位，可放置如「關於我們」或「客戶服務」等連結） */}
                  <div>
                    <h3 className="mb-4 text-gray-200 font-medium">關於我們</h3>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>品牌故事</li>
                      <li>最新消息</li>
                      <li>加入我們</li>
                    </ul>
                  </div>

                  {/* 第四欄：（預留擴充欄位，可放置聯絡資訊或訂閱電子報） */}
                  <div>
                    <h3 className="mb-4 text-gray-200 font-medium">聯絡我們</h3>
                    <p className="text-sm text-gray-400">
                      Email: support@example.com
                    </p>
                  </div>

                </div>

                {/* 
                  版權宣告分隔線與底部文字區域：
                  - border-t: 加上頂部邊框線
                  - border-gray-800: 分隔線顏色設定為極深灰色 (#1F2937)，呈現低調的分割感
                  - mt-8: 上方外距 2rem (32px)，與上方 4 欄內容拉開距離
                  - pt-8: 頂部內距 2rem (32px)，確保分隔線與版權文字不重疊
                  - text-center: 文字水平置中
                  - text-sm text-gray-400: 小字體與灰色次級文字
                */}
                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
                  © 2026 旅遊探索. All rights reserved.
                </div>

              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}