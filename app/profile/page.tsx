'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Camera, MapPin, Bookmark, Compass, Map, CalendarCheck, Check, 
  Link2, X 
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaTiktok } from 'react-icons/fa';

export default function ProfilePage() {
  const { user } = useAuth();
  
  // 原本的狀態
  const [activeTab, setActiveTab] = useState('photos');
  const [streakDays, setStreakDays] = useState(3);
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  
  // 社群連結設定相關狀態
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    twitter: '',
    xiaohongshu: '',
    tiktok: '',
    youtube: '',
    facebook: ''
  });

  const displayName = user?.nickname || 'TRAVELER';
  const avatarUrl = (user as any)?.avatar;

  const handleCheckIn = () => {
    setTodayCheckedIn(true);
    setStreakDays(prev => prev + 1);
    alert("🎉 簽到成功！獲得 50 哩程！");
  };

  const handleSaveLinks = () => {
    alert("✅ 社群連結已暫存！");
    setIsLinkModalOpen(false);
  };

  // 輔助元件：如果沒有連結，點擊就會自動打開設定視窗
  const SocialIconBtn = ({ network, link, icon: Icon, label }: { network: string, link: string, icon: any, label?: string }) => {
    const isActive = link.trim().length > 0;
    return (
      <a 
        href={isActive ? link : undefined}
        target={isActive ? "_blank" : undefined}
        rel="noreferrer"
        onClick={(e) => {
          // 如果還沒有網址，阻止預設行為，改為打開彈窗
          if (!isActive) {
            e.preventDefault();
            setIsLinkModalOpen(true);
          }
        }}
        className={`flex items-center justify-center size-8 rounded-full transition-all ${
          isActive 
            ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer' 
            : 'bg-transparent text-neutral-300 hover:text-neutral-500 hover:bg-neutral-50 cursor-pointer'
        }`}
        title={isActive ? `前往 ${network}` : `點擊設定 ${network} 連結`}
      >
        {label ? (
          <span className="text-[10px] font-bold">{label}</span>
        ) : (
          <Icon size={16} />
        )}
      </a>
    );
  };

  return (
    <div className="relative w-full min-h-screen bg-[#FBFBFB] pb-24">
      {/* 頂部裝飾背景 */}
      <div className="absolute top-0 left-0 w-full h-[280px] bg-neutral-900 rounded-b-[40px] shadow-inner z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
      </div>

      <div className="max-w-5xl mx-auto pt-20 px-4 sm:px-6 relative z-10">
        
        {/* ================= 1. 全新個人資料面板 ================= */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8 relative border border-neutral-100">
          
          {/* 左側：大頭貼與基本資訊 */}
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-28 h-28 bg-neutral-100 rounded-full border-4 border-white flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-light text-neutral-300">{displayName.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">{displayName}</h1>
              <p className="text-sm font-medium text-neutral-500 flex items-center justify-center md:justify-start gap-2">
                <span>0 行程</span>
                <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                <span>0 旅遊小書</span>
                <span className="bg-neutral-100 p-1 rounded text-neutral-400"><MapPin size={12}/></span>
              </p>
            </div>
          </div>

          {/* 右側：粉絲數據與社群連結 */}
          <div className="flex flex-col items-center md:items-end gap-5 mt-2 md:mt-0">
            {/* 數據區 */}
            <div className="flex items-center gap-6 text-neutral-800">
              <div className="text-center flex items-baseline gap-1.5">
                <span className="text-2xl font-bold">0</span> 
                <span className="text-sm text-neutral-500 font-medium">粉絲</span>
              </div>
              <div className="w-px h-6 bg-neutral-200"></div>
              <div className="text-center flex items-baseline gap-1.5">
                <span className="text-2xl font-bold">0</span> 
                <span className="text-sm text-neutral-500 font-medium">追蹤中</span>
              </div>
              <div className="w-px h-6 bg-neutral-200"></div>
              <div className="text-center flex items-baseline gap-1.5">
                <span className="text-2xl font-bold">0</span> 
                <span className="text-sm text-neutral-500 font-medium">影音</span>
              </div>
            </div>

            {/* 社群圖示列 */}
            <div className="flex items-center gap-2">
              <SocialIconBtn network="facebook" link={socialLinks.facebook} icon={FaFacebook} />
              <SocialIconBtn network="instagram" link={socialLinks.instagram} icon={FaInstagram} />
              <SocialIconBtn network="twitter" link={socialLinks.twitter} icon={FaTwitter} />
              <SocialIconBtn network="xiaohongshu" link={socialLinks.xiaohongshu} icon={Link2} label="小紅書" />
              <SocialIconBtn network="tiktok" link={socialLinks.tiktok} icon={FaTiktok} />
              <SocialIconBtn network="youtube" link={socialLinks.youtube} icon={FaYoutube} />
            </div>
          </div>
        </div>

        {/* ================= 2. 旅行打卡紀錄 ================= */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 md:p-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="size-5 text-neutral-900" />
              <h3 className="text-lg font-light text-neutral-900 tracking-widest uppercase">TRAVEL LOG</h3>
            </div>
            <p className="text-xs text-neutral-400 font-light mb-6">連續簽到解鎖 AI 專屬行程建議與里程回饋</p>
            
            <div className="flex items-center justify-between w-full max-w-md relative">
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
          <div className="w-full md:w-auto">
            <button
              onClick={handleCheckIn}
              disabled={todayCheckedIn}
              className="w-full md:w-auto px-8 py-4 bg-neutral-900 text-white text-xs tracking-widest uppercase hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-sm flex items-center justify-center gap-2 font-medium"
            >
              {todayCheckedIn ? <><Check className="size-4" /> 今日已簽到</> : '打卡領取里程'}
            </button>
          </div>
        </div>

        {/* ================= 3. 下方內容分頁 ================= */}
        <div className="flex flex-wrap gap-4 mt-12 justify-center md:justify-start">
          <button onClick={() => setActiveTab('photos')} className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${activeTab === 'photos' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}>
            <Camera className="size-3.5" /> 旅遊照片
          </button>
          <button onClick={() => setActiveTab('journeys')} className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${activeTab === 'journeys' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}>
            <Map className="size-3.5" /> 我的旅程
          </button>
          <button onClick={() => setActiveTab('saved')} className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${activeTab === 'saved' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}>
            <Bookmark className="size-3.5" /> 收藏地點
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
            {activeTab === 'photos' && '分享你的旅行視角'}
            {activeTab === 'journeys' && '紀錄你的每一段旅程'}
            {activeTab === 'saved' && '收藏你的夢想清單'}
          </h3>
          <p className="text-sm text-neutral-400 font-light max-w-sm leading-relaxed">
            {activeTab === 'photos' && '上傳照片，讓 AI 幫你生成專屬的旅行故事。'}
            {activeTab === 'journeys' && '過去的行程與規劃中的藍圖都會顯示在這裡。'}
            {activeTab === 'saved' && '隨時回顧你曾經心動的景點，準備隨時出發。'}
          </p>
        </div>
      </div>

      {/* ================= 社群連結設定 Modal ================= */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 relative">
              <h3 className="text-lg font-bold text-neutral-900">造訪連結設定</h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-100 rounded-full p-1.5 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Inputs) */}
            <div className="p-6 overflow-y-auto space-y-5 bg-white">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Instagram</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><FaInstagram size={18} /></div>
                  <input type="url" placeholder="貼上個人檔案連結" value={socialLinks.instagram} onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Twitter (X)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><FaTwitter size={18} /></div>
                  <input type="url" placeholder="貼上個人檔案連結" value={socialLinks.twitter} onChange={(e) => setSocialLinks({...socialLinks, twitter: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">小紅書</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-[10px] bg-neutral-200 px-1 rounded">小紅書</div>
                  <input type="url" placeholder="貼上個人檔案連結" value={socialLinks.xiaohongshu} onChange={(e) => setSocialLinks({...socialLinks, xiaohongshu: e.target.value})} className="w-full pl-[52px] pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">TikTok</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><FaTiktok size={18} /></div>
                  <input type="url" placeholder="貼上個人檔案連結" value={socialLinks.tiktok} onChange={(e) => setSocialLinks({...socialLinks, tiktok: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Youtube</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><FaYoutube size={18} /></div>
                  <input type="url" placeholder="貼上個人檔案連結" value={socialLinks.youtube} onChange={(e) => setSocialLinks({...socialLinks, youtube: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Facebook</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><FaFacebook size={18} /></div>
                  <input type="url" placeholder="貼上個人檔案連結" value={socialLinks.facebook} onChange={(e) => setSocialLinks({...socialLinks, facebook: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-100 flex gap-4 bg-white">
              <button onClick={() => setIsLinkModalOpen(false)} className="flex-1 py-2.5 bg-white border border-neutral-300 text-neutral-700 rounded-full font-bold hover:bg-neutral-50 transition-colors">取消</button>
              <button onClick={handleSaveLinks} className="flex-1 py-2.5 bg-[#0095FF] text-white rounded-full font-bold shadow-md hover:bg-blue-600 transition-colors">儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}