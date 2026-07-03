'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  TrainFront, Camera, MapPin, Bookmark, Ticket, Compass, Map, CalendarCheck, Check 
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('photos');
  
  // 簽到系統狀態 (模擬資料：目前連續簽到 3 天)
  const [streakDays, setStreakDays] = useState(3);
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);

  const displayName = user?.nickname || 'TRAVELER';
  const avatarUrl = (user as any)?.avatar;

  // 處理點擊簽到
  const handleCheckIn = () => {
    // 這裡未來可以串接 PHP API (例如 checkin.php) 來記錄資料庫
    setTodayCheckedIn(true);
    setStreakDays(prev => prev + 1);
    alert("🎉 簽到成功！獲得 50 哩程數。");
  };

  return (
    <div className="relative w-full min-h-screen bg-[#FBFBFB] pb-24">
      {/* 頂部背景圖案 */}
      <div className="absolute top-0 left-0 w-full h-[320px] bg-neutral-900 rounded-b-[60px] shadow-inner z-0 overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
         <TrainFront className="absolute top-12 -right-10 w-48 h-48 text-neutral-800 opacity-20 rotate-12" />
      </div>

      <div className="max-w-4xl mx-auto pt-20 px-4 sm:px-6 relative z-10">
         
        {/* ================= 1. 旅客通行證 (Railway Pass) ================= */}
        <div className="bg-white rounded-xl shadow-2xl flex flex-col md:flex-row relative overflow-hidden border border-neutral-100">
          
          <div className="flex-1 p-8 md:p-10 relative">
            <div className="flex justify-between items-center mb-8 border-b border-neutral-200 pb-4">
              <div className="flex items-center gap-2 text-neutral-900">
                <TrainFront className="w-8 h-8" />
                <span className="text-xl font-black tracking-widest uppercase">TRAVMADE EXPRESS</span>
              </div>
              <span className="text-sm font-mono font-bold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-sm">
                {user ? 'SOLO PASS' : 'GUEST PASS'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-8">
              {/* 大頭貼 (已移除編輯點擊功能，引導至設定頁) */}
              <div className="w-24 h-24 bg-neutral-50 rounded-full border border-neutral-200 flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover grayscale-[20%]" />
                ) : (
                  <span className="text-4xl font-light text-neutral-300">{displayName.charAt(0)}</span>
                )}
              </div>

              {/* 基本資訊 */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 w-full">
                <div className="col-span-2">
                  <p className="text-[10px] font-mono text-neutral-400 mb-1 tracking-widest">TRAVELER (旅客名稱)</p>
                  <h1 className="text-3xl font-light text-neutral-900 tracking-wider uppercase">
                    {displayName}
                  </h1>
                </div>
                
                <div>
                  <p className="text-[10px] font-mono text-neutral-400 mb-1 tracking-widest">STOPS (停靠站)</p>
                  <p className="text-xl font-light text-neutral-900 font-mono">12</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-neutral-400 mb-1 tracking-widest">MILEAGE (哩程)</p>
                  <p className="text-xl font-light text-neutral-900 font-mono">
                    {streakDays * 50} <span className="text-xs text-neutral-400">m</span>
                  </p>
                </div>

                <div className="col-span-2 flex gap-4 mt-2">
                  <FaFacebook className="w-4 h-4 text-neutral-300 hover:text-neutral-900 cursor-pointer transition-colors" />
                  <FaInstagram className="w-4 h-4 text-neutral-300 hover:text-neutral-900 cursor-pointer transition-colors" />
                  <FaTwitter className="w-4 h-4 text-neutral-300 hover:text-neutral-900 cursor-pointer transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {/* 票根 (Stub) */}
          <div className="w-full md:w-64 bg-neutral-50 border-t md:border-t-0 md:border-l border-dashed border-neutral-200 p-8 flex flex-col justify-between relative">
            <div className="hidden md:block absolute -top-4 -left-4 w-8 h-8 bg-[#FBFBFB] rounded-full shadow-inner border border-neutral-100"></div>
            <div className="hidden md:block absolute -bottom-4 -left-4 w-8 h-8 bg-[#FBFBFB] rounded-full shadow-inner border border-neutral-100"></div>
            
            <div>
              <p className="text-[10px] font-mono text-neutral-400 mb-1 tracking-widest">PLATFORM (月台)</p>
              <p className="text-2xl font-light text-neutral-900 font-mono">NO. 9</p>
            </div>
            
            <div>
              <p className="text-[10px] font-mono text-neutral-400 mb-1 tracking-widest">CAR / SEAT</p>
              <p className="text-2xl font-light text-neutral-900 font-mono">3 - 14A</p>
            </div>

            {/* 條碼 CSS */}
            <div className="flex gap-1 h-12 items-center opacity-80 w-full overflow-hidden mt-4">
              <div className="w-1.5 h-full bg-neutral-900"></div>
              <div className="w-3 h-full bg-neutral-900"></div>
              <div className="w-1 h-full bg-neutral-900"></div>
              <div className="w-4 h-full bg-neutral-900"></div>
              <div className="w-1.5 h-full bg-neutral-900"></div>
              <div className="w-2 h-full bg-neutral-900"></div>
              <div className="w-1 h-full bg-neutral-900"></div>
              <div className="w-5 h-full bg-neutral-900"></div>
              <div className="w-2 h-full bg-neutral-900"></div>
              <div className="w-3 h-full bg-neutral-900"></div>
            </div>
          </div>
        </div>

        {/* ================= 2. 每日簽到系統 (Travel Log) ================= */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 md:p-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="size-5 text-neutral-900" />
              <h3 className="text-lg font-light text-neutral-900 tracking-widest uppercase">TRAVEL LOG</h3>
            </div>
            <p className="text-xs text-neutral-400 font-light mb-6">每日簽到收集專屬足跡戳章，累積哩程即可解鎖 AI 深度行程規劃功能。</p>
            
            {/* 7 天進度條 */}
            <div className="flex items-center justify-between w-full max-w-md relative">
              {/* 背景進度線 */}
              <div className="absolute top-1/2 left-0 w-full h-px bg-neutral-100 -z-10 -translate-y-1/2"></div>
              
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const isChecked = day <= streakDays;
                return (
                  <div key={day} className="flex flex-col items-center gap-2 bg-white">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-500 border-2 ${
                      isChecked
                        ? 'bg-neutral-900 text-white border-neutral-900 scale-110 shadow-md'
                        : 'bg-white text-neutral-300 border-neutral-100'
                    }`}>
                      {isChecked ? <Check className="size-4" /> : `D${day}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 簽到按鈕 */}
          <div className="w-full md:w-auto">
            <button
              onClick={handleCheckIn}
              disabled={todayCheckedIn}
              className="w-full md:w-auto px-8 py-4 bg-neutral-900 text-white text-xs tracking-widest uppercase hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-sm flex items-center justify-center gap-2 font-medium"
            >
              {todayCheckedIn ? (
                <>
                  <Check className="size-4" /> 今日已完成簽到
                </>
              ) : (
                '蓋下今日戳章'
              )}
            </button>
          </div>
        </div>

        {/* ================= 3. 下方頁籤切換 ================= */}
        <div className="flex flex-wrap gap-4 mt-12 justify-center md:justify-start">
          <button 
            onClick={() => setActiveTab('photos')}
            className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${
              activeTab === 'photos' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'
            }`}
          >
            <Camera className="size-3.5" /> 旅程回憶
          </button>
          
          <button 
            onClick={() => setActiveTab('journeys')}
            className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${
              activeTab === 'journeys' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'
            }`}
          >
            <Map className="size-3.5" /> 歷史足跡
          </button>
          
          <button 
            onClick={() => setActiveTab('saved')}
            className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${
              activeTab === 'saved' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'
            }`}
          >
            <Bookmark className="size-3.5" /> 珍藏地點
          </button>
        </div>

        <div className="mt-8 bg-white rounded-sm border border-neutral-100 p-20 flex flex-col items-center justify-center text-center shadow-sm mb-12">
          <div className="relative mb-6">
             <div className="text-neutral-300 relative z-10">
                {activeTab === 'photos' && <Camera className="w-12 h-12" />}
                {activeTab === 'journeys' && <MapPin className="w-12 h-12" />}
                {activeTab === 'saved' && <Compass className="w-12 h-12" />}
             </div>
          </div>
          <h3 className="text-lg font-light text-neutral-900 tracking-widest mb-2 uppercase">
            {activeTab === 'photos' && '尚未上傳回憶'}
            {activeTab === 'journeys' && '尚無歷史足跡'}
            {activeTab === 'saved' && '尚未珍藏地點'}
          </h3>
          <p className="text-sm text-neutral-400 font-light max-w-sm leading-relaxed">
            {activeTab === 'photos' && '記錄你在世界角落的每個精彩瞬間，建立專屬的獨旅相簿。'}
            {activeTab === 'journeys' && '展開你的第一趟旅程，讓世界地圖亮起你的專屬標記。'}
            {activeTab === 'saved' && '將心儀的目的地加入珍藏，為下一次的出發做好準備。'}
          </p>
        </div>

      </div>
    </div>
  );
}