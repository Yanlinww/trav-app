// app/profile/page.tsx
'use client';

import React, { useState } from 'react';
// 改用輕量、簡約的圖示，融入極簡風格
import { FaRegCompass, FaRegHeart, FaRegUser, FaSignOutAlt, FaRegCalendarAlt } from 'react-icons/fa';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('settings'); // 預設停在設定方便你檢查

  // 模擬用戶資料
  const user = {
    name: "廷哲",
    title: "LUXURY TRAVELER / HIGH-MOUNTAIN PHOTOGRAPHER",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150",
    cover: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&h=400",
    stats: { trips: 8, saved: 24 }
  };

  const [nickname, setNickname] = useState(user.name);

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 font-sans tracking-wide">
      {/* 1. 封面與大頭貼區（改為乾淨的嵌入式排版，減少雜亂感） */}
      <div className="relative h-80 bg-gray-50 border-b border-gray-100 overflow-hidden">
        <img src={user.cover} alt="Cover" className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
      </div>

      {/* 2. 用戶基本資訊（大氣字體、置中對齊） */}
      <div className="max-w-6xl mx-auto px-6 -mt-20 relative z-10 text-center border-b border-gray-100 pb-12">
        <img 
          src={user.avatar} 
          alt="Avatar" 
          className="w-28 h-28 rounded-full border border-gray-200 object-cover shadow-sm mx-auto p-1 bg-white" 
        />
        <h1 className="text-3xl font-light text-gray-900 mt-4 tracking-widest">{nickname}</h1>
        <p className="text-xs text-gray-400 mt-2 tracking-widest uppercase font-medium">{user.title}</p>
      </div>

      {/* 3. 主內容區 */}
      <div className="max-w-5xl mx-auto px-6 mt-12 grid grid-cols-1 md:grid-cols-4 gap-12">
        
        {/* 左側：極簡線條導覽選單 */}
        <div className="space-y-1">
          <button 
            onClick={() => setActiveTab('trips')}
            className={`w-full flex items-center space-x-3 py-3 text-sm tracking-wider border-b transition-all duration-300 ${activeTab === 'trips' ? 'border-black text-black font-medium' : 'border-transparent text-gray-400 hover:text-black'}`}
          >
            <FaRegCompass className="text-base" /> <span>我的行程 ({user.stats.trips})</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('saved')}
            className={`w-full flex items-center space-x-3 py-3 text-sm tracking-wider border-b transition-all duration-300 ${activeTab === 'saved' ? 'border-black text-black font-medium' : 'border-transparent text-gray-400 hover:text-black'}`}
          >
            <FaRegHeart className="text-base" /> <span>收藏景點 ({user.stats.saved})</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 py-3 text-sm tracking-wider border-b transition-all duration-300 ${activeTab === 'settings' ? 'border-black text-black font-medium' : 'border-transparent text-gray-400 hover:text-black'}`}
          >
            <FaRegUser className="text-base" /> <span>帳號設定</span>
          </button>
          
          <button className="w-full flex items-center space-x-3 py-6 text-sm tracking-wider text-gray-400 hover:text-red-600 transition-colors duration-300 mt-8">
            <FaSignOutAlt className="text-base" /> <span>登出帳號</span>
          </button>
        </div>

        {/* 右側：主內容呈現區 */}
        <div className="md:col-span-3 min-h-[400px]">
          
          {/* 分頁一：我的行程 */}
          {activeTab === 'trips' && (
            <div className="space-y-8 animate-fade-in">
              <h2 className="text-lg font-light text-black tracking-widest uppercase mb-6 flex items-center gap-2">
                <FaRegCalendarAlt className="text-gray-400" /> Upcoming Journeys
              </h2>
              {/* 行程項目（改為乾淨的黑白線條感） */}
              <div className="group flex gap-6 pb-6 border-b border-gray-100 items-center cursor-pointer">
                <div className="w-40 h-28 overflow-hidden bg-gray-50">
                  <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&h=200" alt="trip" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] uppercase tracking-widest text-amber-700 font-semibold">DEPARTING IN 5 DAYS</span>
                  <h3 className="font-light text-xl text-gray-900 mt-1 tracking-wider">墾丁三天兩夜衝浪團</h3>
                  <p className="text-xs text-gray-400 mt-2 tracking-wide">PERIOD：2026/06/01 - 2026/06/03</p>
                </div>
              </div>
            </div>
          )}

          {/* 分頁二：收藏景點 */}
          {activeTab === 'saved' && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-light text-black tracking-widest uppercase mb-8">Saved Destinations</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="group cursor-pointer">
                  <div className="w-full h-48 overflow-hidden bg-gray-50 mb-3">
                    <img src="https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=500&h=300" alt="place" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <h3 className="font-light text-base text-gray-900 tracking-wider">阿里山日出小火車</h3>
                  <p className="text-xs text-gray-400 mt-1 tracking-wide">嘉義縣阿里山鄉</p>
                </div>
              </div>
            </div>
          )}

          {/* 分頁三：帳號設定 */}
          {activeTab === 'settings' && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-light text-black tracking-widest uppercase mb-8">Account Settings</h2>
              <form className="space-y-8 max-w-xl">
                
                {/* 電子郵件 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-100">
                  <div className="mb-2 sm:mb-0">
                    <label className="block text-xs uppercase tracking-widest text-gray-400 font-medium">Email Address</label>
                  </div>
                  <input 
                    type="email" 
                    disabled 
                    value="user@example.com" 
                    className="w-full sm:w-80 py-1 bg-transparent text-gray-400 cursor-not-allowed text-sm focus:outline-none tracking-wide" 
                  />
                </div>

                {/* 更改暱稱 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-black">
                  <div className="mb-2 sm:mb-0">
                    <label className="block text-xs uppercase tracking-widest text-gray-800 font-semibold">Display Name</label>
                  </div>
                  <input 
                    type="text" 
                    value={nickname} 
                    onChange={(e) => setNickname(e.target.value)} 
                    placeholder="輸入新暱稱" 
                    className="w-full sm:w-80 py-1 bg-transparent text-black text-sm focus:outline-none tracking-wide font-light" 
                  />
                </div>

                {/* 新密碼 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-100">
                  <div className="mb-2 sm:mb-0">
                    <label className="block text-xs uppercase tracking-widest text-gray-400 font-medium">New Password</label>
                  </div>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full sm:w-80 py-1 bg-transparent text-black text-sm focus:outline-none tracking-wide font-light" 
                  />
                </div>

                {/* 與首頁「註冊/搜尋」按鈕呼應的黑底白字高對比按鈕 */}
                <div className="flex justify-end pt-4">
                  <button 
                    type="button" 
                    className="bg-black text-white px-8 py-3 text-xs uppercase tracking-widest font-medium hover:bg-gray-900 transition-colors duration-300 shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}