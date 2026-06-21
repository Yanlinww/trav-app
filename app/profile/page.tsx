'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  TrainFront,
  Camera,
  MapPin,
  Bookmark,
  Loader2,
  Ticket,
  Compass,
  Map
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('photos'); // 'photos', 'journeys', 'saved'

  // 控制編輯視窗與表單狀態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null); // 🌟 新增：暫存上傳的大頭貼
  const [isSaving, setIsSaving] = useState(false);

  // 預設顯示資料
  const displayName = user?.nickname || 'TRAVELER';
  const avatarUrl = (user as any)?.avatar; // 讀取全域狀態中的大頭貼

  // 🌟 處理選擇本地圖片並轉成 Base64 預覽
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string); // 將圖片轉成 Base64 字串
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      alert("請輸入旅人姓名！");
      return;
    }
    setIsSaving(true);
    try {
      // 模擬網路延遲
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (user) {
        const token = localStorage.getItem('auth_token') || 'auth_token_from_php';
        // 🌟 將新的暱稱與大頭貼寫入 AuthContext
        login({ ...user, nickname: editName, avatar: editAvatar } as any, token); 
      }
      setIsEditModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("系統繁忙，請稍後再試！");
    } finally {
      setIsSaving(false);
    }
  };

  // 打開編輯視窗時，載入目前的資料
  const openEditModal = () => {
    if (!user) return; // 🌟 安全機制：未登入者無法打開編輯視窗
    setEditName(displayName);
    setEditAvatar(avatarUrl || null);
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F5] text-slate-800 pb-24 font-sans relative overflow-hidden">
      {/* 台灣山林鐵道背景裝飾 */}
      <div className="absolute top-0 left-0 w-full h-80 bg-emerald-700 rounded-b-[60px] shadow-inner opacity-95 z-0 overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
         <TrainFront className="absolute top-12 -right-10 w-48 h-48 text-emerald-800 opacity-20 rotate-12" />
      </div>

      <div className="max-w-4xl mx-auto pt-20 px-4 sm:px-6 relative z-10">
        
        {/* ================= 鐵道通行證主卡片 (Railway Pass) ================= */}
        <div className="bg-[#FFFDF9] rounded-xl shadow-2xl flex flex-col md:flex-row relative overflow-hidden border border-amber-100">
          
          <div className="flex-1 p-8 md:p-10 relative">
            <div className="flex justify-between items-center mb-8 border-b-2 border-emerald-800 pb-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <TrainFront className="w-8 h-8" />
                <span className="text-xl font-black tracking-widest uppercase">VOYAGE EXPRESS</span>
              </div>
              <span className="text-sm font-mono font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                {user ? 'ISLAND PASS' : 'GUEST PASS'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-8">
              {/* 🌟 旅人大頭貼區塊 */}
              <div className="w-24 h-24 bg-emerald-50 rounded-full border-2 border-dashed border-emerald-300 flex items-center justify-center flex-shrink-0 relative overflow-hidden group shadow-inner">
                {/* 顯示大頭貼或預設字母 */}
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-emerald-300">{displayName.charAt(0)}</span>
                )}
                
                {/* 🌟 只有已登入的會員 (user 存在) 才會顯示懸浮編輯遮罩 */}
                {user && (
                  <div 
                    className="absolute inset-0 bg-emerald-700/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white"
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
                  <p className="text-[10px] font-mono text-slate-400 mb-1 tracking-widest">TRAVELER (旅人)</p>
                  <h1 className="text-3xl font-black text-slate-800 tracking-wider uppercase">
                    {displayName}
                  </h1>
                </div>
                
                <div>
                  <p className="text-[10px] font-mono text-slate-400 mb-1 tracking-widest">STOPS (停靠站)</p>
                  <p className="text-xl font-bold text-slate-800 font-mono">0</p>
                </div>

                <div>
                  <p className="text-[10px] font-mono text-slate-400 mb-1 tracking-widest">FOOTPRINTS (足跡)</p>
                  <p className="text-xl font-bold text-slate-800 font-mono">0</p>
                </div>

                <div className="col-span-2 flex gap-4 mt-2">
                  <FaFacebook className="w-5 h-5 text-slate-300 hover:text-emerald-600 cursor-pointer transition-colors" />
                  <FaInstagram className="w-5 h-5 text-slate-300 hover:text-emerald-600 cursor-pointer transition-colors" />
                  <FaTwitter className="w-5 h-5 text-slate-300 hover:text-emerald-600 cursor-pointer transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {/* 右半部：車票存根聯 (Stub) */}
          <div className="w-full md:w-64 bg-emerald-50 border-t-2 md:border-t-0 md:border-l-2 border-dashed border-emerald-200 p-8 flex flex-col justify-between relative">
            
            <div className="hidden md:block absolute -top-4 -left-4 w-8 h-8 bg-[#F4F6F5] rounded-full shadow-inner"></div>
            <div className="hidden md:block absolute -bottom-4 -left-4 w-8 h-8 bg-[#F4F6F5] rounded-full shadow-inner"></div>
            <div className="md:hidden absolute -top-4 -left-4 w-8 h-8 bg-[#F4F6F5] rounded-full shadow-inner"></div>
            <div className="md:hidden absolute -top-4 -right-4 w-8 h-8 bg-[#F4F6F5] rounded-full shadow-inner"></div>

            <div>
              <p className="text-[10px] font-mono text-slate-400 mb-1 tracking-widest">PLATFORM (月台)</p>
              <p className="text-2xl font-black text-emerald-700 font-mono">NO. 9</p>
            </div>
            
            <div>
              <p className="text-[10px] font-mono text-slate-400 mb-1 tracking-widest">CAR / SEAT</p>
              <p className="text-2xl font-black text-slate-800 font-mono">3 - 14A</p>
            </div>

            {/* 純 CSS 畫的條碼 */}
            <div className="flex gap-1 h-12 items-center opacity-40 w-full overflow-hidden mt-4">
              <div className="w-1.5 h-full bg-emerald-900"></div>
              <div className="w-3 h-full bg-emerald-900"></div>
              <div className="w-1 h-full bg-emerald-900"></div>
              <div className="w-4 h-full bg-emerald-900"></div>
              <div className="w-1.5 h-full bg-emerald-900"></div>
              <div className="w-2 h-full bg-emerald-900"></div>
              <div className="w-1 h-full bg-emerald-900"></div>
              <div className="w-5 h-full bg-emerald-900"></div>
              <div className="w-2 h-full bg-emerald-900"></div>
              <div className="w-1 h-full bg-emerald-900"></div>
              <div className="w-3 h-full bg-emerald-900"></div>
            </div>
          </div>
        </div>

        {/* ================= 探索分頁選單 ================= */}
        <div className="flex flex-wrap gap-4 mt-12 justify-center md:justify-start">
          <button 
            onClick={() => setActiveTab('photos')}
            className={`px-6 py-3 rounded-full flex items-center gap-2 text-sm font-bold tracking-widest uppercase transition-all shadow-sm border-2 ${
              activeTab === 'photos' ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-transparent text-slate-500 hover:border-emerald-200'
            }`}
          >
            <Camera className="w-4 h-4" /> 沿途風景
          </button>
          
          <button 
            onClick={() => setActiveTab('journeys')}
            className={`px-6 py-3 rounded-full flex items-center gap-2 text-sm font-bold tracking-widest uppercase transition-all shadow-sm border-2 ${
              activeTab === 'journeys' ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-transparent text-slate-500 hover:border-emerald-200'
            }`}
          >
            <Map className="w-4 h-4" /> 路線規劃
          </button>
          
          <button 
            onClick={() => setActiveTab('saved')}
            className={`px-6 py-3 rounded-full flex items-center gap-2 text-sm font-bold tracking-widest uppercase transition-all shadow-sm border-2 ${
              activeTab === 'saved' ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-transparent text-slate-500 hover:border-emerald-200'
            }`}
          >
            <Bookmark className="w-4 h-4" /> 收藏站點
          </button>
        </div>

        {/* ================= 鐵道探險空狀態 ================= */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 p-20 flex flex-col items-center justify-center text-center">
          
          <div className="relative mb-6">
             <div className="bg-emerald-50 text-emerald-600 rounded-full p-5 relative z-10 border border-emerald-100">
                {activeTab === 'photos' && <Camera className="w-10 h-10" />}
                {activeTab === 'journeys' && <MapPin className="w-10 h-10" />}
                {activeTab === 'saved' && <Compass className="w-10 h-10" />}
             </div>
          </div>

          <h3 className="text-lg font-black text-slate-800 tracking-widest mb-2 uppercase">
            {activeTab === 'photos' && '尚未捕捉任何台灣之美'}
            {activeTab === 'journeys' && '火車尚未啟程'}
            {activeTab === 'saved' && '地圖上還沒有你的專屬記號'}
          </h3>
          <p className="text-sm text-slate-500 font-medium max-w-sm">
            {activeTab === 'photos' && '帶上相機，記錄從北到南的每一片海洋與山林。'}
            {activeTab === 'journeys' && '跳上下一班列車，現在就開始規劃你的環島路線。'}
            {activeTab === 'saved' && '發掘秘境並點擊收藏，打造你的台灣獨旅願望清單。'}
          </p>

          <button className="mt-8 px-8 py-3 bg-emerald-700 text-white text-xs font-bold tracking-widest uppercase hover:bg-emerald-800 transition-colors rounded-full shadow-lg">
             {activeTab === 'photos' ? '上傳風景' : '開始探索'}
          </button>
        </div>

      </div>

      {/* ================= 換票/編輯資料 Modal ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm px-4">
          <div className="bg-[#FFFDF9] p-8 w-full max-w-sm rounded-2xl shadow-2xl border-t-8 border-emerald-700 animate-in fade-in zoom-in-95 duration-200 relative">
            
            <h3 className="text-xl font-black tracking-widest text-emerald-800 mb-6 text-center mt-2 flex items-center justify-center gap-2">
              <Ticket className="w-5 h-5" /> 票務更新
            </h3>
            
            <div className="space-y-6">
              
              {/* 🌟 更改大頭貼區塊 */}
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-mono text-emerald-600 mb-3 font-bold tracking-widest">
                  TRAVELER AVATAR (旅人頭像)
                </p>
                <div className="w-20 h-20 bg-white rounded-full border-2 border-dashed border-emerald-300 flex items-center justify-center relative overflow-hidden group cursor-pointer shadow-sm">
                  {editAvatar ? (
                    <img src={editAvatar} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-emerald-300" />
                  )}
                  {/* Hover 提示 */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <Camera className="w-5 h-5 text-white" />
                  </div>
                  {/* 隱藏的檔案輸入框，點擊外層 div 就會觸發 */}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              {/* 更改名稱區塊 */}
              <div>
                <label className="block text-[10px] font-mono text-emerald-600 mb-2 font-bold tracking-widest">
                  TRAVELER NAME (旅人姓名)
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-emerald-100 focus:bg-emerald-50 focus:border-emerald-600 outline-none transition-all text-slate-900 font-bold tracking-wider rounded-lg"
                  placeholder="輸入名稱"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-500 text-xs font-black tracking-widest hover:bg-slate-200 transition-colors rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex-[2] py-3 bg-emerald-700 text-white text-xs font-black tracking-widest hover:bg-emerald-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 rounded-lg shadow-md"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> 更新中</> : "確認換票"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}