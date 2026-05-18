'use client';

import { useState } from 'react';
import Header from './components/Header';
import TopNav, { TabType } from './components/TopNav'; // 改為引入頂部導覽列
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentTab, setCurrentTab] = useState<TabType>('explore');

  const getHeaderTitle = () => {
    switch (currentTab) {
      case 'explore': return '探索與靈感';
      case 'trips': return '我的獨旅計畫';
      case 'toolkit': return '獨旅求生工具箱';
      case 'community': return '獨旅者即時社群';
      case 'profile': return '個人帳號中心';
      default: return '獨旅達人';
    }
  };

  return (
    <html lang="zh-TW">
      <body style={{ margin: 0, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        {/* 1. 頂部主標題列 */}
        <Header 
          title={getHeaderTitle()} 
          onMenuClick={() => alert('打開側邊欄選單')}
          onNotificationClick={() => alert('打開通知中心')}
        />

        {/* 2. 大宗分支頁籤（已成功移到上方，緊接在標題區下方） */}
        <TopNav currentTab={currentTab} onTabChange={setCurrentTab} />

        {/* 3. 內頁主內容區 */}
        <main style={{ paddingTop: '10px', paddingBottom: '30px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}