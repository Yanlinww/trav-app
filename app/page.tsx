import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      {/* 主要卡片容器 */}
      <main className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-10 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          你好，世界！
        </h1>
        
        <p className="text-gray-600 text-lg mb-8">
          這是一個使用 <span className="font-mono font-bold text-gray-800">Next.js</span> 與 
          <span className="font-mono font-bold text-sky-500"> Tailwind CSS</span> 構建的簡單頁面。
        </p>

        <div className="flex gap-4 justify-center">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            開始使用
          </button>
          <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
            了解更多
          </button>
        </div>
      </main>

      {/* 頁尾 */}
      <footer className="mt-12 text-gray-400 text-sm">
        © 2026 我的網站項目
      </footer>
    </div>
  );
}