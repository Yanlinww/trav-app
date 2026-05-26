import { Header } from "./components/Header";
import { Footer } from "./components/footer";
import { Plane } from "lucide-react";
import "./globals.css"; 
import { AuthProvider } from "./context/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen flex flex-col">
        {/* 1. AuthProvider 必須在最外層，包住所有會用到登入資訊的元件 */}
        <AuthProvider>
          
          {/* 2. Header 現在在 Provider 裡面了，useAuth() 就能正常運作 */}
          <Header />
          
          {/* 3. 主要內容區域 */}
          <main className="flex-1">
            {children}
          </main>

          {/* 4. 頁尾區域 */}
          <Footer />

        </AuthProvider>
      </body>
    </html>
  );
}