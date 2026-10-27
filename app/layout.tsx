import React from "react";
import { Header } from "./components/Header";
import { Plane } from "lucide-react";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";

/** 根佈局：共用會員資料、頁首與頁尾，children 為目前路由的頁面內容。 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 僅抑制根元素的 hydration 差異警告，不會修正伺服器與瀏覽器的內容差異。
    <html lang="zh-TW" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        {/* Header 與頁面共用會員顯示資料；Provider 本身不驗證後端登入身分。 */}
        <AuthProvider>
          {/* 共用頁首，包含桌機導覽與手機底欄。 */}
          <Header />
          {/* 手機預留底欄高度與裝置安全區，md 以上取消預留。 */}
          <div className="flex flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
            {/* 主內容撐開剩餘高度，讓短頁面的頁尾保持在下方。 */}
            <main className="flex-1">
              {children}
            </main>
            {/* 靜態頁尾；以下文字項目目前沒有連結或 API 行為。 */}
            <footer className="bg-gray-900 text-white py-12">
              <div className="container mx-auto px-4">
                {/* 手機單欄，md 以上四欄。 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Plane className="size-6" />
                      <span className="font-bold text-lg">旅遊探索</span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      探索世界，創造美好回憶
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-4 text-gray-200 font-medium">熱門目的地</h3>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>日本</li>
                      <li>歐洲</li>
                      <li>東南亞</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-4 text-gray-200 font-medium">關於我們</h3>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>品牌故事</li>
                      <li>最新消息</li>
                      <li>加入我們</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-4 text-gray-200 font-medium">聯絡我們</h3>
                    <p className="text-sm text-gray-400">
                      Email: support@example.com
                    </p>
                  </div>
                </div>
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
