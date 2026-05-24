import { Header } from "./components/Header";
import { Plane } from "lucide-react";
import "./globals.css"; // 確保引入你的 Tailwind 樣式

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1">
          {children}
        </main>

        <footer className="bg-gray-900 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Plane className="size-6" />
                  <span className="font-bold text-lg">旅遊探索</span>
                </div>
                <p className="text-gray-400 text-sm">探索世界，創造美好回憶</p>
              </div>
              {/* 這裡保留你原本 Footer 的其餘列 */}
              <div>
                <h3 className="mb-4 text-gray-200">熱門目的地</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>日本</li><li>歐洲</li><li>東南亞</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
              © 2026 旅遊探索. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}