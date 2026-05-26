// app/profile/page.tsx
'use client';

import React, { useState } from 'react';
// 1. 所有 Font Awesome 6 正確的圖示名稱
import { FaUser, FaMapLocationDot, FaHeart, FaGear, FaArrowRightFromBracket, FaCalendarDays } from 'react-icons/fa6';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('trips');

  // 模擬用戶資料
  const user = {
    name: "廷哲",
    title: "高山攝影愛好者",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150",
    cover: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&h=400",
    stats: { trips: 8, saved: 24, reviews: 12 }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* 1. 封面與大頭貼區 */}
      <div className="relative h-64 bg-gray-300">
        <img src={user.cover} alt="Cover" className="w-full h-full object-cover" />
        <div className="absolute -bottom-16 left-8 flex items-end space-x-4">
          <img src={user.avatar} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg" />
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-gray-800">{user.name}</h1>
            <p className="text-sm text-gray-500">{user.title}</p>
          </div>
        </div>
      </div>

      {/* 2. 數據統計欄與內容區 */}
      <div className="max-w-6xl mx-auto px-4 mt-20 grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* 左側：功能導覽選單 */}
        <div className="bg-white p-4 rounded-xl shadow-sm h-fit space-y-2">
          <button 
            onClick={() => setActiveTab('trips')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition ${activeTab === 'trips' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FaMapLocationDot /> <span>我的行程 ({user.stats.trips})</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('saved')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition ${activeTab === 'saved' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FaHeart /> <span>收藏景點 ({user.stats.saved})</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FaGear /> <span>帳號設定</span>
          </button>
          
          <hr className="my-2 border-gray-100" />
          
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-red-500 hover:bg-red-50 transition">
            <FaArrowRightFromBracket /> <span>登出帳號</span>
          </button>
        </div>

        {/* 右側：主內容呈現區 */}
        <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-sm min-h-[400px]">
          
          {/* 分頁一：我的行程 */}
          {activeTab === 'trips' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaCalendarDays className="text-blue-500" /> 即將到來的行程
              </h2>
              {/* 行程卡片 */}
              <div className="border border-gray-100 rounded-xl p-4 flex gap-4 hover:shadow-md transition">
                <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=150&h=100" alt="trip" className="w-32 h-24 object-cover rounded-lg" />
                <div className="flex-1">
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded font-semibold">準備出發 · 剩 5 天</span>
                  <h3 className="font-bold text-lg text-gray-800 mt-1">墾丁三天兩夜衝浪團</h3>
                  <p className="text-sm text-gray-500 mt-1">日期：2026/06/01 - 2026/06/03</p>
                </div>
              </div>
            </div>
          )}

          {/* 分頁二：收藏景點 */}
          {activeTab === 'saved' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">收藏的私房景點</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <img src="https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=400&h=200" alt="place" className="w-full h-40 object-cover" />
                  <div className="p-3">
                    <h3 className="font-bold text-gray-800">阿里山日出小火車</h3>
                    <p className="text-xs text-gray-400 mt-1">嘉義縣阿里山鄉</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* 分頁三：帳號設定 */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6">帳號與安全設定</h2>
              <form className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">電子郵件</label>
                  <input type="email" disabled value="user@example.com" className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">更改暱稱</label>
                  <input type="text" placeholder="輸入新暱稱" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">新密碼</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                </div>
                <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                  儲存修改
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}