'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Camera, MapPin, Bookmark, Loader2, Eye, ChevronLeft, UserPlus, UserCheck } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaTiktok } from 'react-icons/fa';
import { Link2 } from 'lucide-react';

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
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [isLoadingItineraries, setIsLoadingItineraries] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '', twitter: '', xiaohongshu: '', tiktok: '', youtube: '', facebook: ''
  });

  // 1. 抓取基本資料
  useEffect(() => {
    if (!targetAccount) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:8080/get_user_profile.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Account: targetAccount, Viewer_Account: currentAccount })
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
      const res = await fetch("http://localhost:8080/toggle_follow.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Follower_Account: currentAccount, Target_Account: targetAccount })
      });
      const data = await res.json();
      if (data.status === 'success' && profileUser) {
        setProfileUser({
          ...profileUser,
          isFollowing: data.isFollowing,
          followersCount: data.followersCount
        });
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

  // 4. 抓取公開行程 (🌟 這裡已幫你補上 Viewer_Account)
  useEffect(() => {
    if (!targetAccount || activeTab !== 'journeys') return;
    const fetchItins = async () => {
      setIsLoadingItineraries(true);
      try {
        const res = await fetch("http://localhost:8080/itinerary/core/get_itineraries.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            Account: targetAccount,
            Viewer_Account: currentAccount 
          }),
        });
        const data = await res.json();
        if (data.status === 'success') setItineraries(data.data);
        else setItineraries([]);
      } catch (e) {} finally { setIsLoadingItineraries(false); }
    };
    fetchItins();
  }, [targetAccount, currentAccount, activeTab]);

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

  const SocialIconBtn = ({ link, icon: Icon, label }: { link: string, icon: any, label?: string }) => {
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
                <span>{itineraries.length} 行程</span><span className="w-1 h-1 bg-neutral-300 rounded-full"></span><span>{userFiles.length} 旅遊照片</span><span className="bg-neutral-100 p-1 rounded text-neutral-400"><MapPin size={12}/></span>
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

            <div className="flex items-center gap-6 text-neutral-800">
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">{profileUser.followersCount}</span> <span className="text-sm text-neutral-500 font-medium">粉絲</span></div>
              <div className="w-px h-6 bg-neutral-200"></div>
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">{profileUser.followingCount}</span> <span className="text-sm text-neutral-500 font-medium">追蹤中</span></div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12 animate-in fade-in duration-300">
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
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