'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { CalendarDays, Camera, Copy, Eye, Heart, MapPin, Bookmark, Loader2, ChevronLeft, UserPlus, UserCheck } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaTiktok } from 'react-icons/fa';
import { Link2 } from 'lucide-react';

type PublicItinerary = {
  id: string;
  title: string;
  coverImage: string;
  description?: string | null;
  location?: string | null;
  tags: string[];
  likeCount: number;
  viewCount: number;
  copyCount: number;
  itemCount: number;
  dayCount: number;
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const currentAccount = user ? String(user.id || (user as any).Account || "") : "";
  
  const targetAccount = decodeURIComponent(params.account as string);
  
  const [activeTab, setActiveTab] = useState('photos');
  
  const [profileUser, setProfileUser] = useState<{
    account: string; name: string; avatar: string; followersCount: number; followingCount: number; isFollowing: boolean;
  } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  
  const [userFiles, setUserFiles] = useState<any[]>([]); 
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [itineraries, setItineraries] = useState<PublicItinerary[]>([]);
  const [isLoadingItineraries, setIsLoadingItineraries] = useState(true);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '', twitter: '', xiaohongshu: '', tiktok: '', youtube: '', facebook: ''
  });

  const publicStats = useMemo(() => ({
    count: itineraries.length,
    likes: itineraries.reduce((total, itinerary) => total + itinerary.likeCount, 0),
    copies: itineraries.reduce((total, itinerary) => total + itinerary.copyCount, 0),
  }), [itineraries]);
  // 1. 抓取基本資料
  useEffect(() => {
    if (!targetAccount) return;
    const fetchProfile = async () => {
      try {
        const authToken = window.localStorage.getItem('auth_token');
        const res = await fetch("http://localhost:8080/get_user_profile.php", {
          method: "POST", headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
          body: JSON.stringify({ Account: targetAccount })
        });
        const data = await res.json();
        if (data.status === 'success') setProfileUser(data.data);
      } catch (e) { console.error(e); } 
      finally { setIsLoadingProfile(false); }
    };
    fetchProfile();
  }, [targetAccount, currentAccount]);

  // 2. 處理追蹤/取消追蹤
  const handleToggleFollow = async () => {
    if (!currentAccount) {
      alert("請先登入才能追蹤旅行者喔！");
      return;
    }
    if (currentAccount === targetAccount) return;

    setIsTogglingFollow(true);
    try {
      const authToken = window.localStorage.getItem('auth_token');
      const res = await fetch("http://localhost:8080/toggle_follow.php", {
        method: "POST", headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ Target_Account: targetAccount })
      });
      const data = await res.json();
      if (data.status === 'success' && profileUser) {
        setProfileUser({
          ...profileUser,
          isFollowing: data.isFollowing,
          followersCount: data.followersCount
        });
      } else {
        alert(data.message || '追蹤狀態更新失敗，請重新登入後再試。');
      }
    } catch (e) {
      console.error(e);
      alert("伺服器連線錯誤");
    } finally {
      setIsTogglingFollow(false);
    }
  };

  // 3. 抓取照片檔案
  useEffect(() => {
    if (!targetAccount || activeTab !== 'photos') return;
    const fetchFiles = async () => {
      setIsLoadingFiles(true);
      try {
        const res = await fetch("http://localhost:8080/get_user_files.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Account: targetAccount, Tab_Type: 'photos' }),
        });
        const data = await res.json();
        if (data.status === 'success') setUserFiles(data.data);
        else setUserFiles([]);
      } catch (e) {} finally { setIsLoadingFiles(false); }
    };
    fetchFiles();
  }, [targetAccount, activeTab]);

  // 4. 抓取公開行程與創作者統計
  useEffect(() => {
    if (!targetAccount) return;
    const fetchItins = async () => {
      setIsLoadingItineraries(true);
      try {
        const res = await fetch("http://localhost:8080/destinations/get_public_itineraries.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            Account: currentAccount,
            Owner_Account: targetAccount,
            Search: '',
            Tags: [],
            Transport: '',
            Duration: 'all',
            Limit: 48,
          }),
        });
        const data = await res.json();
        if (data.status === 'success') setItineraries(Array.isArray(data.data) ? data.data : []);
        else setItineraries([]);
      } catch (e) {} finally { setIsLoadingItineraries(false); }
    };
    fetchItins();
  }, [targetAccount, currentAccount]);

  // 5. 抓取社群連結
  useEffect(() => {
    if (!targetAccount) return;
    const fetchSocials = async () => {
      try {
        const res = await fetch("http://localhost:8080/get_social_links.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Account: targetAccount }),
        });
        const data = await res.json();
        if (data.status === 'success' && data.data) setSocialLinks(data.data);
      } catch (e) {}
    };
    fetchSocials();
  }, [targetAccount]);

  const SocialIconBtn = ({ link, icon: Icon, label, network: _network }: { link: string, icon: any, label?: string, network?: string }) => {
    if (!link || link.trim().length === 0) return null; 
    return (
      <a href={link} target="_blank" rel="noreferrer" className="flex items-center justify-center size-8 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-all shadow-sm">
        {label ? <span className="text-[10px] font-bold">{label}</span> : <Icon size={16} />}
      </a>
    );
  };

  if (isLoadingProfile) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FBFBFB]"><Loader2 className="w-8 h-8 animate-spin text-neutral-300" /></div>;
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBFB] gap-4">
        <h2 className="text-xl font-bold text-neutral-600">找不到此旅行者</h2>
        <button onClick={() => router.back()} className="px-6 py-2 bg-neutral-900 text-white rounded-full text-sm font-bold">返回上一頁</button>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-[#FBFBFB] pb-24">
      <div className="absolute top-0 left-0 w-full h-[280px] bg-neutral-900 rounded-b-[40px] shadow-inner z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
      </div>

      <div className="max-w-5xl mx-auto pt-20 px-4 sm:px-6 relative z-10">
        
        {/* ================= 1. 個人資料面板 ================= */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8 relative border border-neutral-100">
          <button onClick={() => router.back()} className="absolute top-6 left-6 text-neutral-400 hover:text-neutral-900 transition-colors hidden md:block">
            <ChevronLeft size={24} />
          </button>

          {/* 左側：大頭貼與名字等資訊 */}
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left md:ml-8 mt-4 md:mt-0">
            <div className="w-28 h-28 bg-neutral-100 rounded-full border-4 border-white flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
              {profileUser.avatar ? <img src={profileUser.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-4xl font-light text-neutral-300">{profileUser.name.charAt(0)}</span>}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">{profileUser.name}</h1>
              <p className="text-sm font-medium text-neutral-500 flex items-center justify-center md:justify-start gap-2">
                <span>{publicStats.count} 公開行程</span><span className="w-1 h-1 bg-neutral-300 rounded-full"></span><span>{userFiles.length} 旅遊照片</span><span className="bg-neutral-100 p-1 rounded text-neutral-400"><MapPin size={12}/></span>
              </p>
            </div>
          </div>
          
          {/* 右側：追蹤按鈕、粉絲數據與社群連結 */}
          <div className="flex flex-col items-center md:items-end gap-5 mt-4 md:mt-0">
            
            {/* 🌟 將追蹤按鈕移至這裡 (粉絲數據的上方) 🌟 */}
            {currentAccount !== profileUser.account && (
              <button 
                onClick={handleToggleFollow}
                disabled={isTogglingFollow}
                className={`flex items-center justify-center gap-1.5 px-6 py-2 rounded-full text-xs font-bold transition-all shadow-sm w-full md:w-auto ${
                  profileUser.isFollowing 
                    ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200' 
                    : 'bg-[#F04D79] text-white hover:bg-pink-600'
                }`}
              >
                {isTogglingFollow ? <Loader2 size={16} className="animate-spin" /> : profileUser.isFollowing ? <><UserCheck size={16} /> 追蹤中</> : <><UserPlus size={16} /> 追蹤</>}
              </button>
            )}

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-neutral-800 md:justify-end">
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">{profileUser.followersCount}</span> <span className="text-sm text-neutral-500 font-medium">粉絲</span></div>
              <div className="w-px h-6 bg-neutral-200"></div>
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">{profileUser.followingCount}</span> <span className="text-sm text-neutral-500 font-medium">追蹤中</span></div>
              <div className="w-px h-6 bg-neutral-200"></div>
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">{publicStats.likes}</span> <span className="text-sm text-neutral-500 font-medium">獲得喜歡</span></div>
              <div className="w-px h-6 bg-neutral-200"></div>
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">{publicStats.copies}</span> <span className="text-sm text-neutral-500 font-medium">被複製</span></div>
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

        {/* ================= 2. 下方內容分頁 ================= */}
        <div className="flex flex-wrap gap-4 mt-12 justify-center md:justify-start mb-8">
          <button onClick={() => setActiveTab('photos')} className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${activeTab === 'photos' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}><Camera className="size-3.5" /> 旅遊照片</button>
          <button onClick={() => setActiveTab('journeys')} className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${activeTab === 'journeys' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}><Bookmark className="size-3.5" /> 分享的行程</button>
        </div>

        {/* ================= 3. 唯讀的檔案顯示區塊 ================= */}
        
        {activeTab === 'photos' && (
          isLoadingFiles ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-300" /></div>
          ) : userFiles.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4 mb-12 animate-in fade-in duration-300">
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
            <div className="bg-white rounded-2xl border border-neutral-200 p-16 sm:p-20 flex flex-col items-center justify-center text-center shadow-sm mb-12 animate-in fade-in duration-300">
              <Camera className="w-12 h-12 text-neutral-200 mb-4" />
              <h3 className="text-lg font-bold tracking-widest mb-2 text-neutral-500">這位旅行者尚未分享照片</h3>
            </div>
          )
        )}

        {activeTab === 'journeys' && (
          isLoadingItineraries ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-300" /></div>
          ) : itineraries.length > 0 ? (
            <div className="mb-12 animate-in fade-in duration-300"><div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold tracking-[0.16em] text-neutral-400">TRAVEL STYLE</p><h2 className="mt-1 text-lg font-bold text-neutral-800">{profileUser.name} 的公開旅行靈感</h2></div><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {itineraries.map((itinerary) => (
                <div 
                  key={itinerary.id} 
                  className="bg-white border border-neutral-200 rounded-2xl group overflow-hidden flex flex-col shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                    <img src={itinerary.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={itinerary.title} />
                    {itinerary.location && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-xs font-bold text-white"><span className="inline-flex items-center gap-1"><MapPin size={13} />{itinerary.location}</span></div>}
                  </div>
                  <div className="flex flex-1 flex-col p-4 bg-white">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-neutral-900">{itinerary.title}</h3>
                    <p className="mt-2 min-h-10 line-clamp-2 break-all text-xs leading-5 text-neutral-500">{itinerary.description || ''}</p>
                    <div className="mt-3 min-h-6 overflow-hidden">{itinerary.tags.length > 0 && <div className="flex flex-nowrap gap-1.5">{itinerary.tags.slice(0, 3).map((tag) => <span key={tag} className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-bold text-neutral-500">#{tag}</span>)}</div>}</div>
                    <div className="mt-auto flex flex-wrap gap-x-2 gap-y-1 border-t border-neutral-100 pt-3 text-[11px] font-medium text-neutral-400"><span className="inline-flex items-center gap-1"><CalendarDays size={12} />{itinerary.dayCount} 天</span><span>{itinerary.itemCount} 個地點</span><span className="inline-flex items-center gap-1"><Heart size={12} />{itinerary.likeCount}</span><span className="inline-flex items-center gap-1"><Copy size={12} />{itinerary.copyCount}</span><span className="inline-flex items-center gap-1"><Eye size={12} />{itinerary.viewCount}</span></div>
                  </div>
                </div>
              ))}
            </div></div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 p-16 sm:p-20 flex flex-col items-center justify-center text-center shadow-sm mb-12 animate-in fade-in duration-300">
              <Bookmark className="w-12 h-12 text-neutral-200 mb-4" />
              <h3 className="text-lg font-bold tracking-widest mb-2 text-neutral-500">這位旅行者尚未公開行程</h3>
            </div>
          )
        )}
      </div>
    </div>
  );
}
