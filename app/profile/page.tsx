'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Camera, MapPin, Bookmark,
  Link2, X, Loader2, Plus, Eye
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaTiktok } from 'react-icons/fa';

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter(); 
  
  // 狀態：只保留 photos (旅遊照片) 與 journeys (收藏的行程)
  const [activeTab, setActiveTab] = useState('photos');
  
  // 📸 照片上傳與檔案狀態
  const [isUploading, setIsUploading] = useState(false);
  const [userFiles, setUserFiles] = useState<any[]>([]); 
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🗺️ 行程與收藏狀態
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [isLoadingItineraries, setIsLoadingItineraries] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [inviteCodeArray, setInviteCodeArray] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);
  
  // 🔗 社群連結設定相關狀態
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '', twitter: '', xiaohongshu: '', tiktok: '', youtube: '', facebook: ''
  });
  const [followStats, setFollowStats] = useState<{ followersCount: number; followingCount: number } | null>(null);

  const displayName = user?.nickname || 'TRAVELER';
  const avatarUrl = (user as any)?.avatar;
  const currentAccount = user ? String(user.id || (user as any).Account || '') : '';

  // 1. 抓取照片檔案
  const fetchUserFiles = async () => {
    if (!user) return;
    setIsLoadingFiles(true);
    try {
      const res = await fetch("http://localhost:8080/get_user_files.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account, Tab_Type: 'photos' }),
      });
      const data = await res.json();
      if (data.status === 'success') setUserFiles(data.data);
      else setUserFiles([]);
    } catch (error) { console.error("無法取得照片", error); } 
    finally { setIsLoadingFiles(false); }
  };

  // 2. 抓取收藏的行程 (串接 Planner API)
  const fetchItineraries = async () => {
    if (!user) return;
    setIsLoadingItineraries(true);
    try {
      const res = await fetch("http://localhost:8080/itinerary/core/get_itineraries.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account }),
      });
      const data = await res.json();
      if (data.status === 'success') setItineraries(data.data);
      else setItineraries([]);
    } catch (error) { console.error("無法取得行程", error); } 
    finally { setIsLoadingItineraries(false); }
  };

  // 3. 抓取使用者儲存的社群連結
  const fetchSocialLinks = async () => {
    if (!user) return;
    try {
      const res = await fetch("http://localhost:8080/get_social_links.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account }),
      });
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setSocialLinks({
          instagram: data.data.instagram || '', twitter: data.data.twitter || '',
          xiaohongshu: data.data.xiaohongshu || '', tiktok: data.data.tiktok || '',
          youtube: data.data.youtube || '', facebook: data.data.facebook || ''
        });
      }
    } catch (error) { console.error("無法取得社群連結", error); }
  };

  // 監聽分頁切換
  useEffect(() => {
    if (user) {
      if (activeTab === 'photos') fetchUserFiles();
      else if (activeTab === 'journeys') fetchItineraries();
    }
  }, [user, activeTab]);

  useEffect(() => { if (user) fetchSocialLinks(); }, [user]);

  useEffect(() => {
    let isCancelled = false;
    if (!currentAccount) {
      setFollowStats(null);
      return;
    }

    const fetchFollowStats = async () => {
      try {
        const authToken = window.localStorage.getItem('auth_token');
        const res = await fetch("http://localhost:8080/get_user_profile.php", {
          method: "POST", headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
          body: JSON.stringify({ Account: currentAccount }),
        });
        const data = await res.json();
        if (!isCancelled && data.status === 'success' && data.data) {
          setFollowStats({
            followersCount: Number(data.data.followersCount) || 0,
            followingCount: Number(data.data.followingCount) || 0,
          });
        }
      } catch (error) {
        console.error("無法取得追蹤統計", error);
      }
    };

    void fetchFollowStats();
    return () => { isCancelled = true; };
  }, [currentAccount]);

  // 處理邀請碼輸入
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    const cleanedText = pastedText.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    if (cleanedText) {
      const newArray = [...inviteCodeArray];
      for (let i = 0; i < cleanedText.length; i++) newArray[i] = cleanedText[i];
      setInviteCodeArray(newArray);
      const nextIndex = Math.min(cleanedText.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const char = value.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const newArray = [...inviteCodeArray];
    newArray[index] = char;
    setInviteCodeArray(newArray);
    if (char && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !inviteCodeArray[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 提交邀請碼
  const handleJoinItinerary = async () => {
    const finalCode = inviteCodeArray.join('');
    if (finalCode.length < 6) return;
    
    setIsSubmittingJoin(true);
    try {
      const res = await fetch("http://localhost:8080/itinerary/core/join_itinerary.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Invite_Code: finalCode, Account: user?.id || (user as any)?.Account })
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert("🎉 成功收藏/加入行程！");
        setIsJoinModalOpen(false);
        setInviteCodeArray(Array(6).fill(""));
        fetchItineraries(); 
      } else { alert(data.message); }
    } catch (error) { alert("伺服器連線錯誤"); } 
    finally { setIsSubmittingJoin(false); }
  };

  // 儲存社群連結
  const handleSaveLinks = async () => {
    if (!user) return;
    setIsSavingLinks(true);
    try {
      const res = await fetch("http://localhost:8080/update_social_links.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account, ...socialLinks }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert("✅ 社群連結已成功儲存！");
        setIsLinkModalOpen(false);
      } else alert(`❌ 儲存失敗：${data.message}`);
    } catch (error) { alert("❌ 伺服器連線錯誤"); } 
    finally { setIsSavingLinks(false); }
  };

  // 處理照片上傳
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("📸 旅遊照片區塊只能上傳圖片檔案喔！");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('Account', user?.id || (user as any)?.Account || '');
    formData.append('type', 'photos'); 

    try {
      const res = await fetch("http://localhost:8080/upload_photo.php", { method: "POST", body: formData });
      const data = await res.json();
      if (data.status === 'success') fetchUserFiles(); 
      else alert(`❌ 上傳失敗：${data.message}`);
    } catch (error) { alert("❌ 無法連線到上傳 API"); } 
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const SocialIconBtn = ({ network, link, icon: Icon, label }: { network: string, link: string, icon: any, label?: string }) => {
    const isActive = link.trim().length > 0;
    return (
      <a 
        href={isActive ? link : undefined}
        target={isActive ? "_blank" : undefined}
        rel="noreferrer"
        onClick={(e) => {
          if (!isActive) {
            e.preventDefault();
            setIsLinkModalOpen(true);
          }
        }}
        className={`flex items-center justify-center size-8 rounded-full transition-all ${isActive ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer' : 'bg-transparent text-neutral-300 hover:text-neutral-500 hover:bg-neutral-50 cursor-pointer'}`}
        title={isActive ? `前往 ${network}` : `點擊設定 ${network} 連結`}
      >
        {label ? <span className="text-[10px] font-bold">{label}</span> : <Icon size={16} />}
      </a>
    );
  };

  return (
    <div className="relative w-full min-h-screen bg-[#FBFBFB] pb-24">
      <div className="absolute top-0 left-0 w-full h-[280px] bg-neutral-900 rounded-b-[40px] shadow-inner z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
      </div>

      <div className="max-w-5xl mx-auto pt-20 px-4 sm:px-6 relative z-10">
        
        {/* ================= 1. 個人資料面板 ================= */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8 relative border border-neutral-100">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-28 h-28 bg-neutral-100 rounded-full border-4 border-white flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-4xl font-light text-neutral-300">{displayName.charAt(0)}</span>}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">{displayName}</h1>
              <p className="text-sm font-medium text-neutral-500 flex items-center justify-center md:justify-start gap-2">
                <span>0 行程</span><span className="w-1 h-1 bg-neutral-300 rounded-full"></span><span>0 旅遊小書</span><span className="bg-neutral-100 p-1 rounded text-neutral-400"><MapPin size={12}/></span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-5 mt-2 md:mt-0">
            <div className="flex items-center gap-6 text-neutral-800">
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">{followStats?.followersCount ?? '—'}</span> <span className="text-sm text-neutral-500 font-medium">粉絲</span></div>
              <div className="w-px h-6 bg-neutral-200"></div>
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">{followStats?.followingCount ?? '—'}</span> <span className="text-sm text-neutral-500 font-medium">追蹤中</span></div>
              <div className="w-px h-6 bg-neutral-200"></div>
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">0</span> <span className="text-sm text-neutral-500 font-medium">影音</span></div>
            </div>
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

        {/* ================= 2. 下方內容分頁 (合併為兩項) ================= */}
        <div className="flex flex-wrap gap-4 mt-12 justify-center md:justify-start mb-8">
          <button onClick={() => setActiveTab('photos')} className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${activeTab === 'photos' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}><Camera className="size-3.5" /> 旅遊照片</button>
          <button onClick={() => setActiveTab('journeys')} className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${activeTab === 'journeys' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}><Bookmark className="size-3.5" /> 收藏的行程</button>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />

        {/* ================= 3. 內容顯示區塊 ================= */}
        
        {/* 📸 旅遊照片區塊 */}
        {activeTab === 'photos' && (
          isLoadingFiles ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-300" /></div>
          ) : userFiles.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4 mb-12 animate-in fade-in duration-300">
              <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${isUploading ? 'border-[#F04D79] bg-pink-50/30' : 'border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-300'}`}>
                <div className={`p-3 rounded-full transition-all duration-300 ${isUploading ? 'bg-pink-100 text-[#F04D79]' : 'bg-white text-neutral-400 group-hover:text-neutral-600 shadow-sm border border-neutral-100 group-hover:shadow group-hover:-translate-y-1'}`}>
                  {isUploading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" />}
                </div>
                <span className={`mt-3 text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-colors ${isUploading ? 'text-[#F04D79]' : 'text-neutral-400 group-hover:text-neutral-600'}`}>{isUploading ? '上傳中...' : '新增照片'}</span>
              </div>
              
              {userFiles.map((file) => (
                <div key={file.File_ID} className="aspect-square rounded-2xl bg-neutral-100 overflow-hidden border border-neutral-200 shadow-sm relative group cursor-pointer">
                   <img src={file.File_URL} alt="Uploaded" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                   <div className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                     <a href={file.File_URL} target="_blank" rel="noreferrer" className="size-10 sm:size-12 bg-white/20 hover:bg-white text-white hover:text-neutral-900 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg transform translate-y-4 group-hover:translate-y-0 duration-300"><Eye size={20} /></a>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`bg-white rounded-2xl border-2 border-dashed p-16 sm:p-20 flex flex-col items-center justify-center text-center shadow-sm mb-12 transition-all group animate-in fade-in duration-300 ${isUploading ? 'border-[#F04D79] bg-pink-50/30 cursor-wait' : 'border-neutral-200 cursor-pointer hover:bg-neutral-50 hover:border-neutral-300'}`}>
              <div className="relative mb-6 group-hover:scale-110 transition-transform duration-300">
                 <div className={`${isUploading ? 'text-[#F04D79]' : 'text-neutral-300 group-hover:text-neutral-500'} relative z-10 transition-colors`}>
                    {isUploading ? <Loader2 className="w-12 h-12 animate-spin" /> : <Camera className="w-12 h-12" />}
                 </div>
              </div>
              <h3 className={`text-lg font-bold tracking-widest mb-2 uppercase ${isUploading ? 'text-[#F04D79]' : 'text-neutral-900'}`}>
                {isUploading ? '檔案上傳中...' : '分享你的旅行視角'}
              </h3>
              <p className="text-sm text-neutral-400 font-medium max-w-sm leading-relaxed">
                {isUploading ? '請稍候，正在將您的檔案安全地寫入伺服器。' : '點擊此處上傳照片，記錄你的專屬旅遊回憶。'}
              </p>
            </div>
          )
        )}

        {/* 🗺️ 收藏的行程區塊 */}
        {activeTab === 'journeys' && (
          isLoadingItineraries ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-300" /></div>
          ) : itineraries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12 animate-in fade-in duration-300">
              
              {/* 輸入邀請碼收藏按鈕 */}
              <div 
                onClick={() => setIsJoinModalOpen(true)}
                className="aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-300 group"
              >
                <div className="p-4 rounded-full transition-all duration-300 bg-white text-neutral-400 group-hover:text-[#F04D79] shadow-sm border border-neutral-100 group-hover:shadow group-hover:-translate-y-1 group-hover:border-pink-100">
                  <Bookmark className="w-6 h-6" />
                </div>
                <span className="mt-4 text-xs font-bold tracking-widest uppercase transition-colors text-neutral-400 group-hover:text-[#F04D79]">
                  輸入邀請碼收藏
                </span>
              </div>

              {itineraries.map((itinerary) => (
                <div 
                  key={itinerary.id} 
                  onClick={() => router.push(`/planner/${itinerary.id}`)} 
                  className="bg-white border border-neutral-200 rounded-2xl group cursor-pointer hover:shadow-xl transition-all relative overflow-hidden flex flex-col aspect-[4/3]"
                >
                  <div className="relative h-2/3 overflow-hidden bg-neutral-100">
                    <img src={itinerary.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={itinerary.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1 bg-white">
                    <h3 className="text-sm font-bold text-neutral-900 truncate">{itinerary.title}</h3>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-[10px] text-neutral-400 font-mono font-medium">{itinerary.startDate} - {itinerary.endDate}</p>
                      <span className="text-[9px] font-bold text-neutral-500 uppercase bg-neutral-100 px-2 py-0.5 rounded-full">
                        {itinerary.Account === (user?.id || (user as any)?.Account) ? 'Owner' : 'Member'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              onClick={() => setIsJoinModalOpen(true)}
              className="bg-white rounded-2xl border-2 border-dashed p-16 sm:p-20 flex flex-col items-center justify-center text-center shadow-sm mb-12 transition-all group animate-in fade-in duration-300 border-neutral-200 cursor-pointer hover:bg-neutral-50 hover:border-neutral-300"
            >
              <div className="relative mb-6 group-hover:scale-110 transition-transform duration-300">
                 <div className="text-neutral-300 group-hover:text-[#F04D79] relative z-10 transition-colors">
                    <Bookmark className="w-12 h-12" />
                 </div>
              </div>
              <h3 className="text-lg font-bold tracking-widest mb-2 uppercase text-neutral-900">
                收藏你的專屬行程
              </h3>
              <p className="text-sm text-neutral-400 font-medium max-w-sm leading-relaxed">
                點擊此處輸入 6 碼邀請碼，你所收藏的行程都會自動顯示在這裡。
              </p>
            </div>
          )
        )}
      </div>

      {/* ================= 邀請碼輸入 Modal ================= */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-8 relative">
            <button onClick={() => { setIsJoinModalOpen(false); setInviteCodeArray(Array(6).fill("")); }} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full p-1.5 transition-colors">
              <X size={18} />
            </button>
            <div className="mb-8 text-center mt-2">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-pink-50">
                <Bookmark className="size-7 text-[#F04D79]" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3 text-center">輸入邀請碼</h2>
              <p className="text-sm text-slate-500 font-medium text-center">請輸入 6 碼英數字邀請碼，即可將該行程加入你的收藏庫。</p>
            </div>

            {/* 6 碼輸入框 */}
            <div className="flex justify-center gap-3 mb-10">
              {inviteCodeArray.map((char, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  value={char}
                  onPaste={handlePaste}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-2xl outline-none transition-all duration-200 shadow-sm ${
                    char 
                      ? 'border-2 border-[#F04D79] text-[#F04D79] bg-pink-50/30' 
                      : 'border-2 border-slate-200 text-slate-700 focus:border-[#F04D79] focus:ring-4 focus:ring-pink-100 bg-white'
                  }`}
                />
              ))}
            </div>

            <button 
              onClick={handleJoinItinerary} 
              disabled={isSubmittingJoin || inviteCodeArray.join('').length < 6}
              className="w-full py-4 rounded-xl text-[17px] font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-white disabled:shadow-none bg-[#F04D79] text-white hover:bg-pink-600"
            >
              {isSubmittingJoin ? <Loader2 size={20} className="animate-spin" /> : "確認收藏"}
            </button>
          </div>
        </div>
      )}

      {/* ================= 社群連結設定 Modal ================= */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 relative">
              <h3 className="text-lg font-bold text-neutral-900">造訪連結設定</h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-100 rounded-full p-1.5 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5 bg-white">
              <div className="space-y-1.5"><label className="text-sm font-medium text-neutral-700">Instagram</label><div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><FaInstagram size={18} /></div><input type="url" placeholder="貼上個人檔案連結" value={socialLinks.instagram} onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" /></div></div>
              <div className="space-y-1.5"><label className="text-sm font-medium text-neutral-700">Twitter (X)</label><div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><FaTwitter size={18} /></div><input type="url" placeholder="貼上個人檔案連結" value={socialLinks.twitter} onChange={(e) => setSocialLinks({...socialLinks, twitter: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" /></div></div>
              <div className="space-y-1.5"><label className="text-sm font-medium text-neutral-700">小紅書</label><div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-[10px] bg-neutral-200 px-1 rounded">小紅書</div><input type="url" placeholder="貼上個人檔案連結" value={socialLinks.xiaohongshu} onChange={(e) => setSocialLinks({...socialLinks, xiaohongshu: e.target.value})} className="w-full pl-[52px] pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" /></div></div>
              <div className="space-y-1.5"><label className="text-sm font-medium text-neutral-700">TikTok</label><div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><FaTiktok size={18} /></div><input type="url" placeholder="貼上個人檔案連結" value={socialLinks.tiktok} onChange={(e) => setSocialLinks({...socialLinks, tiktok: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" /></div></div>
              <div className="space-y-1.5"><label className="text-sm font-medium text-neutral-700">Youtube</label><div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><FaYoutube size={18} /></div><input type="url" placeholder="貼上個人檔案連結" value={socialLinks.youtube} onChange={(e) => setSocialLinks({...socialLinks, youtube: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" /></div></div>
              <div className="space-y-1.5"><label className="text-sm font-medium text-neutral-700">Facebook</label><div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><FaFacebook size={18} /></div><input type="url" placeholder="貼上個人檔案連結" value={socialLinks.facebook} onChange={(e) => setSocialLinks({...socialLinks, facebook: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-[#0095FF] focus:ring-1 focus:ring-[#0095FF] transition-all" /></div></div>
            </div>
            <div className="p-4 border-t border-neutral-100 flex gap-4 bg-white">
              <button onClick={() => setIsLinkModalOpen(false)} disabled={isSavingLinks} className="flex-1 py-2.5 bg-white border border-neutral-300 text-neutral-700 rounded-full font-bold hover:bg-neutral-50 transition-colors disabled:opacity-50">取消</button>
              <button onClick={handleSaveLinks} disabled={isSavingLinks} className="flex-1 py-2.5 bg-[#0095FF] text-white rounded-full font-bold shadow-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                {isSavingLinks ? <Loader2 size={16} className="animate-spin" /> : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
