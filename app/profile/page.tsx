'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, 
  Image as ImageIcon, 
  Video, 
  Heart, 
  ImageMinus,
  Loader2
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa';

export default function ProfilePage() {
  const { user, login } = useAuth(); // 🌟 把 login 函式解構出來，用來更新全域狀態
  const [activeTab, setActiveTab] = useState('photos'); 

  // 🌟 新增：控制「編輯視窗」的狀態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 預設顯示資料
  const displayName = user?.nickname || '旅客';

  // 🌟 核心：處理儲存個人資料的邏輯
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      alert("暱稱不能為空喔！");
      return;
    }

    setIsSaving(true);

    try {
      // 💡 TODO: 未來這裡會寫一個 fetch 去呼叫 PHP (例如 update_profile.php) 來更新 Aiven 資料庫
      // 模擬網路延遲
      await new Promise(resolve => setTimeout(resolve, 800));

      // 💡 先更新前端全域狀態 (讓畫面瞬間改變)
      if (user) {
        const token = localStorage.getItem('auth_token') || 'auth_token_from_php';
        login({ ...user, nickname: editName }, token); 
      }

      setIsEditModalOpen(false); // 關閉視窗
    } catch (error) {
      console.error(error);
      alert("儲存失敗請稍後再試！");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 font-sans relative">
      <div className="max-w-5xl mx-auto pt-12 px-6">
        
        {/* ================= 頂部個人資訊區塊 ================= */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-red-500 border-2 border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
               <span className="text-white text-3xl font-bold">{displayName.charAt(0)}</span>
            </div>

            <div className="flex flex-col mt-1">
              <h1 className="text-2xl font-bold text-gray-900 tracking-wide flex items-center gap-2">
                {displayName}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                0 行程・0 旅遊小書
              </p>
              
              <div className="flex items-center gap-3 mt-4">
                {/* 🌟 點擊編輯按鈕，打開視窗並把目前的暱稱填入輸入框 */}
                <button 
                  onClick={() => {
                    setEditName(displayName);
                    setIsEditModalOpen(true);
                  }}
                  className="px-5 py-1.5 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  編輯
                </button>
                <button className="p-1.5 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:items-end mt-2 md:mt-0">
            <div className="flex gap-6 text-sm">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-gray-900">0</span>
                <span className="text-gray-500">粉絲</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-gray-900">0</span>
                <span className="text-gray-500">追蹤中</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-gray-900">0</span>
                <span className="text-gray-500">影音</span>
              </div>
            </div>

            <div className="flex gap-4 mt-4 text-gray-300">
              <FaFacebook className="w-5 h-5 cursor-pointer hover:text-gray-500 transition-colors" />
              <FaInstagram className="w-5 h-5 cursor-pointer hover:text-gray-500 transition-colors" />
              <FaTwitter className="w-5 h-5 cursor-pointer hover:text-gray-500 transition-colors" />
              <FaYoutube className="w-5 h-5 cursor-pointer hover:text-gray-500 transition-colors" />
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-50 border border-gray-100 rounded-xl p-4 flex justify-between items-center max-w-sm">
          <div>
            <p className="text-sm font-bold text-gray-800">想要更多專屬功能？</p>
            <p className="text-xs text-gray-500 mt-0.5">快速登入/註冊會員</p>
          </div>
          <button className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors">
            立即升級
          </button>
        </div>

        <div className="flex gap-8 mt-12 border-b border-gray-100 px-2">
          <button 
            onClick={() => setActiveTab('photos')}
            className={`pb-3 flex items-center gap-1.5 text-sm transition-all relative ${
              activeTab === 'photos' ? 'text-gray-900 font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> 照片
            {activeTab === 'photos' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-t-full"></div>}
          </button>
          
          <button 
            onClick={() => setActiveTab('videos')}
            className={`pb-3 flex items-center gap-1.5 text-sm transition-all relative ${
              activeTab === 'videos' ? 'text-gray-900 font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Video className="w-4 h-4" /> 影片
            {activeTab === 'videos' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-t-full"></div>}
          </button>
          
          <button 
            onClick={() => setActiveTab('saved')}
            className={`pb-3 flex items-center gap-1.5 text-sm transition-all relative ${
              activeTab === 'saved' ? 'text-gray-900 font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Heart className="w-4 h-4" /> 收藏
            {activeTab === 'saved' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-t-full"></div>}
          </button>
        </div>

        <div className="py-32 flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
             <div className="absolute -top-6 -left-8 text-gray-200 rotate-[-10deg]">
                <ImageMinus className="w-12 h-12" />
             </div>
             <div className="absolute -top-10 right-0 text-gray-200 rotate-[15deg]">
                <ImageMinus className="w-10 h-10" />
             </div>
             <div className="w-16 h-12 bg-red-500 rounded-t-full relative z-10 mx-auto mt-8 border-b-2 border-black">
                <div className="absolute top-3 left-4 w-1.5 h-1.5 bg-black rounded-full"></div>
                <div className="absolute top-3 right-4 w-1.5 h-1.5 bg-black rounded-full"></div>
             </div>
             <div className="w-32 h-0.5 bg-gray-800 mx-auto"></div>
          </div>

          <p className="text-gray-500 text-sm tracking-wide">
            {activeTab === 'photos' && '還沒有任何照片哦'}
            {activeTab === 'videos' && '還沒有任何影片哦'}
            {activeTab === 'saved' && '還沒有收藏任何內容哦'}
          </p>
        </div>
      </div>

      {/* ================= 🌟 編輯個人資料的彈出視窗 (Modal) ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">編輯個人資料</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 pl-1">
                  你的暱稱
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all text-gray-900"
                  placeholder="輸入你想被稱呼的名字"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex-1 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> 儲存中</> : "儲存變更"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}