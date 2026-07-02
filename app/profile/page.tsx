'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  TrainFront, Camera, MapPin, Bookmark, Loader2, Ticket, Compass, Map 
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('photos');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const displayName = user?.nickname || 'TRAVELER';
  const avatarUrl = (user as any)?.avatar;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

const handleSaveProfile = async () => {
  if (!editName.trim()) {
    alert("請輸入旅人姓名！");
    return;
  }
  if (!user) return;

  setIsSaving(true);
  try {
    // 呼叫後端更新 API
    const res = await fetch("http://localhost:8080/trav-app/backend/trav-api/profile/update_profile.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Account: user.id || (user as any).Account, // 確保抓到正確的帳號 ID
        Name: editName,
        Avatar: editAvatar
      }),
    });

    const data = await res.json();

    if (data.status === 'success') {
      // 資料庫更新成功後，同步更新前端全域狀態與 LocalStorage
      const token = localStorage.getItem('auth_token') || 'auth_token_from_php';
      login({ ...user, nickname: editName, avatar: editAvatar } as any, token); 
      setIsEditModalOpen(false);
    } else {
      alert("更新失敗：" + data.message);
    }
  } catch (error) {
    console.error(error);
    alert("系統連線異常，請確認伺服器狀態！");
  } finally {
    setIsSaving(false);
  }
};

  const openEditModal = () => {
    if (!user) return;
    setEditName(displayName);
    setEditAvatar(avatarUrl || null);
    setIsEditModalOpen(true);
  };

  return (
    <div className="relative w-full h-[320px] bg-slate-900 overflow-hidden">
      {/* 極簡黑背景裝飾 */}
      <div className="absolute top-0 left-0 w-full h-80 bg-neutral-900 rounded-b-[60px] shadow-inner z-0 overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
         <TrainFront className="absolute top-12 -right-10 w-48 h-48 text-neutral-800 opacity-20 rotate-12" />
      </div>

      <div className="max-w-4xl mx-auto pt-20 px-4 sm:px-6 relative z-10">
        
        {/* ================= 鐵道通行證主卡片 (Railway Pass) ================= */}
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
              {/* 旅人大頭貼區塊 */}
              <div className="w-24 h-24 bg-neutral-50 rounded-full border border-neutral-200 flex items-center justify-center flex-shrink-0 relative overflow-hidden group shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover grayscale-[20%]" />
                ) : (
                  <span className="text-4xl font-light text-neutral-300">{displayName.charAt(0)}</span>
                )}
                
                {user && (
                  <div 
                    className="absolute inset-0 bg-neutral-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white"
                    onClick={openEditModal}
                  >
                    <Ticket className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold tracking-widest">換票</span>
                  </div>
                )}
              </div>

              {/* 旅客資料欄位 */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 w-full">
                <div className="col-span-2">
                  <p className="text-[10px] font-mono text-neutral-400 mb-1 tracking-widest">TRAVELER (旅人)</p>
                  <h1 className="text-3xl font-light text-neutral-900 tracking-wider uppercase">
                    {displayName}
                  </h1>
                </div>
                
                <div>
                  <p className="text-[10px] font-mono text-neutral-400 mb-1 tracking-widest">STOPS (停靠站)</p>
                  <p className="text-xl font-light text-neutral-900 font-mono">0</p>
                </div>

                <div>
                  <p className="text-[10px] font-mono text-neutral-400 mb-1 tracking-widest">FOOTPRINTS (足跡)</p>
                  <p className="text-xl font-light text-neutral-900 font-mono">0</p>
                </div>

                <div className="col-span-2 flex gap-4 mt-2">
                  <FaFacebook className="w-4 h-4 text-neutral-300 hover:text-neutral-900 cursor-pointer transition-colors" />
                  <FaInstagram className="w-4 h-4 text-neutral-300 hover:text-neutral-900 cursor-pointer transition-colors" />
                  <FaTwitter className="w-4 h-4 text-neutral-300 hover:text-neutral-900 cursor-pointer transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {/* 右半部：車票存根聯 (Stub) */}
          <div className="w-full md:w-64 bg-neutral-50 border-t md:border-t-0 md:border-l border-dashed border-neutral-200 p-8 flex flex-col justify-between relative">
            
            <div className="hidden md:block absolute -top-4 -left-4 w-8 h-8 bg-[#FBFBFB] rounded-full shadow-inner border border-neutral-100"></div>
            <div className="hidden md:block absolute -bottom-4 -left-4 w-8 h-8 bg-[#FBFBFB] rounded-full shadow-inner border border-neutral-100"></div>
            <div className="md:hidden absolute -top-4 -left-4 w-8 h-8 bg-[#FBFBFB] rounded-full shadow-inner border border-neutral-100"></div>
            <div className="md:hidden absolute -top-4 -right-4 w-8 h-8 bg-[#FBFBFB] rounded-full shadow-inner border border-neutral-100"></div>

            <div>
              <p className="text-[10px] font-mono text-neutral-400 mb-1 tracking-widest">PLATFORM (月台)</p>
              <p className="text-2xl font-light text-neutral-900 font-mono">NO. 9</p>
            </div>
            
            <div>
              <p className="text-[10px] font-mono text-neutral-400 mb-1 tracking-widest">CAR / SEAT</p>
              <p className="text-2xl font-light text-neutral-900 font-mono">3 - 14A</p>
            </div>

            {/* 純 CSS 畫的極簡條碼 */}
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
              <div className="w-1 h-full bg-neutral-900"></div>
              <div className="w-3 h-full bg-neutral-900"></div>
            </div>
          </div>
        </div>

        {/* ================= 探索分頁選單 ================= */}
        <div className="flex flex-wrap gap-4 mt-12 justify-center md:justify-start">
          <button 
            onClick={() => setActiveTab('photos')}
            className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${
              activeTab === 'photos' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'
            }`}
          >
            <Camera className="size-3.5" /> 沿途風景
          </button>
          
          <button 
            onClick={() => setActiveTab('journeys')}
            className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${
              activeTab === 'journeys' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'
            }`}
          >
            <Map className="size-3.5" /> 路線規劃
          </button>
          
          <button 
            onClick={() => setActiveTab('saved')}
            className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${
              activeTab === 'saved' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'
            }`}
          >
            <Bookmark className="size-3.5" /> 收藏站點
          </button>
        </div>

        {/* ================= 鐵道探險空狀態 ================= */}
        <div className="mt-8 bg-white rounded-sm border border-neutral-100 p-20 flex flex-col items-center justify-center text-center shadow-sm">
          
          <div className="relative mb-6">
             <div className="text-neutral-300 relative z-10">
                {activeTab === 'photos' && <Camera className="w-12 h-12" />}
                {activeTab === 'journeys' && <MapPin className="w-12 h-12" />}
                {activeTab === 'saved' && <Compass className="w-12 h-12" />}
             </div>
          </div>

          <h3 className="text-lg font-light text-neutral-900 tracking-widest mb-2 uppercase">
            {activeTab === 'photos' && '尚未捕捉任何世界之美'}
            {activeTab === 'journeys' && '旅程尚未啟程'}
            {activeTab === 'saved' && '地圖上還沒有你的專屬記號'}
          </h3>
          <p className="text-sm text-neutral-400 font-light max-w-sm leading-relaxed">
            {activeTab === 'photos' && '帶上相機，記錄從南到北的每一片海洋與山林。'}
            {activeTab === 'journeys' && '現在就開始規劃你的獨旅路線，探索未知的風景。'}
            {activeTab === 'saved' && '發掘秘境並點擊收藏，打造你的世界獨旅願望清單。'}
          </p>

          <button className="mt-8 px-8 py-3 bg-neutral-900 text-white text-xs tracking-widest uppercase hover:bg-neutral-800 transition-colors rounded-sm">
             {activeTab === 'photos' ? '上傳風景' : '開始探索'}
          </button>
        </div>

      </div>

      {/* ================= 換票/編輯資料 Modal ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 z-50 flex items-center justify-center backdrop-blur-sm px-4">
          <div className="bg-white p-8 w-full max-w-sm rounded-sm shadow-2xl border-t-4 border-neutral-900 animate-in fade-in zoom-in-95 duration-200 relative">
            
            <h3 className="text-lg font-light tracking-widest text-neutral-900 mb-6 text-center mt-2 flex items-center justify-center gap-2 uppercase">
              <Ticket className="w-4 h-4" /> 票務更新
            </h3>
            
            <div className="space-y-6">
              
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-mono text-neutral-500 mb-3 tracking-widest">
                  TRAVELER AVATAR
                </p>
                <div className="w-20 h-20 bg-neutral-50 rounded-full border border-dashed border-neutral-300 flex items-center justify-center relative overflow-hidden group cursor-pointer">
                  {editAvatar ? (
                    <img src={editAvatar} alt="Preview" className="w-full h-full object-cover grayscale-[20%]" />
                  ) : (
                    <Camera className="w-6 h-6 text-neutral-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <Camera className="w-5 h-5 text-white" />
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-2 tracking-widest">
                  TRAVELER NAME
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none transition-all text-neutral-900 font-light tracking-wider rounded-sm text-sm"
                  placeholder="輸入名稱"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 bg-white border border-neutral-200 text-neutral-500 text-xs tracking-widest hover:bg-neutral-50 transition-colors rounded-sm"
              >
                取消
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex-[2] py-3 bg-neutral-900 text-white text-xs tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 rounded-sm"
              >
                {isSaving ? <><Loader2 className="size-3 animate-spin" /> 更新中</> : "確認換票"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}