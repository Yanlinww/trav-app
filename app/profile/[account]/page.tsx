'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { CalendarDays, Camera, Copy, Eye, Heart, MapPin, Bookmark, Loader2, ChevronLeft } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaTiktok } from 'react-icons/fa';
import { Link2 } from 'lucide-react';
import { UserCheck, UserPlus } from 'lucide-react';
import FollowListModal from '../../components/FollowListModal';

// 公開行程卡片與創作者統計使用的回應格式，不包含行程編輯資料。
type PublicItinerary = {
  id: string;
  title: string;
  coverImage: string;
  description?: string | null;
  location?: string | null;
  likeCount: number;
  viewCount: number;
  copyCount: number;
  itemCount: number;
  dayCount: number;
};

// 公開個人頁：資料歸屬由網址帳號決定，追蹤操作則由目前登入者發起。
export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const currentAccount = user ? String(user.id || (user as any).Account || "") : ""; // 觀看者，未登入為空。
  
  const targetAccount = decodeURIComponent(params.account as string); // 網址指定的個人頁主人。
  
  const [activeTab, setActiveTab] = useState('photos');
  
  const [profileUser, setProfileUser] = useState<{
    account: string; name: string; avatar: string; followersCount: number; followingCount: number; isFollowing: boolean;
  } | null>(null);
  // null 關閉名單；followers／following 同時決定彈窗標題與要查詢的關係種類。
  const [followListType, setFollowListType] = useState<'followers' | 'following' | null>(null);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const [userFiles, setUserFiles] = useState<any[]>([]); 
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [itineraries, setItineraries] = useState<PublicItinerary[]>([]);
  const [isLoadingItineraries, setIsLoadingItineraries] = useState(true);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '', twitter: '', xiaohongshu: '', tiktok: '', youtube: '', facebook: ''
  });

  // 由 itineraries 推算筆數、讚數與複製數；列表更新時才重新計算，不另呼叫統計 API。
  // 本頁請求 Limit=48，這裡只加總已載入列表，不代表帳號所有歷史行程的統計。
  const publicStats = useMemo(() => ({
    count: itineraries.length,
    likes: itineraries.reduce((total, itinerary) => total + itinerary.likeCount, 0),
    copies: itineraries.reduce((total, itinerary) => total + itinerary.copyCount, 0),
  }), [itineraries]);
  // Account 查頁面主人，Viewer_Account 決定回傳的 isFollowing 觀看角度。
  useEffect(() => {
    // 網址尚未提供帳號時不查詢，避免送出空的名單主人。
    if (!targetAccount) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch("/backend/social.php?action=profile", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Account: targetAccount, Viewer_Account: currentAccount })
        });
        const data = await res.json();
        // data.data 包含名稱、頭像、追蹤人數與 isFollowing，更新後驅動上方資料與追蹤按鈕。
        // 業務失敗不清空舊物件；此讀取目前沒有取消旗標，註釋整理不新增舊回應保護。
        if (data.status === 'success') setProfileUser(data.data);
      // 例外只記錄到主控台；finally 結束初次載入，沒有 profileUser 時走「找不到旅行者」。
      } catch (e) { console.error(e); } 
      finally { setIsLoadingProfile(false); }
    };
    fetchProfile();
  // 切換頁面主人或觀看者時重讀，因為同一會員對不同觀看者可能有不同追蹤狀態。
  }, [targetAccount, currentAccount]);

  // 以登入者追蹤／取消追蹤目標會員；後端成功才更新狀態與粉絲數，不是改動自己的追蹤數。
  // Follower_Account 目前由前端提供，這裡的登入判斷不等於可信的後端身分驗證。
  const handleToggleFollow = async () => {
    // 未登入先導頁；已在更新時略過，避免同一操作重複切換追蹤關係。
    if (!currentAccount) { router.push('/auth/login'); return; }
    if (isUpdatingFollow) return;
    setIsUpdatingFollow(true);
    try {
      const response = await fetch('http://localhost:8080/social.php?action=toggle_follow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // Follower 是發起操作的人，Target 是被追蹤的人，不能對調兩者。
        body: JSON.stringify({ Follower_Account: currentAccount, Target_Account: targetAccount }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'success') throw new Error(result.message || '更新追蹤狀態失敗');
      // 以後端結果為準，不自行反轉舊值；保留原個人資料，只替換按鈕狀態與目標會員的粉絲數。
      setProfileUser((profile) => profile && ({ ...profile, isFollowing: Boolean(result.isFollowing), followersCount: result.followersCount }));
    } catch (error) { alert(error instanceof Error ? error.message : '更新追蹤狀態失敗'); }
    finally { setIsUpdatingFollow(false); }
  };

  // 只有在 photos 分頁才讀取頁面主人的照片，不使用觀看者帳號查詢。
  useEffect(() => {
    if (!targetAccount || activeTab !== 'photos') return;
    const fetchFiles = async () => {
      setIsLoadingFiles(true);
      try {
        const res = await fetch("/backend/files.php?action=get", {
          method: "POST", headers: { "Content-Type": "application/json" },
          // Account 指照片擁有者，Tab_Type 指定 photos，不會讀取其他類型的檔案。
          body: JSON.stringify({ Account: targetAccount, Tab_Type: 'photos' }),
        });
        const data = await res.json();
        // 成功時取代照片列表；業務失敗則清空。網路／解析例外的現有分支不另清空列表。
        if (data.status === 'success') setUserFiles(data.data);
        else setUserFiles([]);
      } catch (e) {} finally { setIsLoadingFiles(false); }
    };
    fetchFiles();
  // 換會員或切回照片分頁時重新查詢；finally 會結束照片區自己的載入提示。
  }, [targetAccount, activeTab]);

  // Owner_Account 篩選行程作者，Account 傳入觀看者；結果供公開卡片與上方統計共用。
  useEffect(() => {
    if (!targetAccount) return;
    const fetchItins = async () => {
      setIsLoadingItineraries(true);
      try {
        const res = await fetch("/backend/destinations/public_itineraries.php?action=list", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            Account: currentAccount,
            Owner_Account: targetAccount,
            // 本頁不套搜尋字詞或天數篩選，只顯示指定作者的公開列表，最多請求 48 筆。
            Search: '',
            Duration: 'all',
            Limit: 48,
          }),
        });
        const data = await res.json();
        // 確保列表是陣列，避免卡片 map 與上方 reduce 遇到非陣列回應。
        if (data.status === 'success') setItineraries(Array.isArray(data.data) ? data.data : []);
        else setItineraries([]);
      } catch (e) {} finally { setIsLoadingItineraries(false); }
      // 例外保持原列表；finally 只結束行程載入，不改基本資料或照片區的狀態。
    };
    fetchItins();
  }, [targetAccount, currentAccount]);

  // 讀取頁面主人的社群網址，供下方 Instagram、Facebook 等平台圖示使用；這裡沒有儲存操作。
  useEffect(() => {
    // 等網址帳號可用才送出請求，避免以空字串查詢其他會員資料。
    if (!targetAccount) return;
    const fetchSocials = async () => {
      try {
        // action=links 選擇「讀連結」功能；POST 的 JSON 內文提供要查詢的會員帳號。
        const res = await fetch("/backend/social.php?action=links", {
          method: "POST", headers: { "Content-Type": "application/json" },
          // 使用 targetAccount 查主人，而不是 currentAccount（目前觀看者）。
          body: JSON.stringify({ Account: targetAccount }),
        });
        // 解析 JSON 後檢查業務 status 與資料是否存在；此分支未另外檢查 HTTP res.ok。
        const data = await res.json();
        // data.data 是各平台網址物件；寫入 state 後由 SocialIconBtn 決定是否顯示與連往何處。
        if (data.status === 'success' && data.data) setSocialLinks(data.data);
      // 現有例外分支不顯示提示、不重試也不清空，會保留原本的 socialLinks。
      } catch (e) {}
    };
    fetchSocials();
  // 首次掛載及主人帳號改變時重讀；單純切分頁或登入者改變不會觸發這段。
  }, [targetAccount]);

  // 未設定的平台不顯示圖示，有連結才另開視窗。
  const SocialIconBtn = ({ link, icon: Icon, label, network: _network }: { link: string, icon: any, label?: string, network?: string }) => {
    // 空網址直接不渲染；label 用於文字型平台標誌，未提供時顯示傳入的圖示元件。
    if (!link || link.trim().length === 0) return null; 
    return (
      <a href={link} target="_blank" rel="noreferrer" className="flex items-center justify-center size-8 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-all shadow-sm">
        {label ? <span className="text-[10px] font-bold">{label}</span> : <Icon size={16} />}
      </a>
    );
  };

  // 先區分基本資料仍在讀取與沒有可顯示的會員；照片、行程各自管理載入狀態。
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

  // 追蹤名單以 targetAccount 為主人、currentAccount 為觀看者，沿用同一個共用彈窗。
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
          
          {/* 右側：公開行程統計與社群連結 */}
          <div className="flex flex-col items-center md:items-end gap-5 mt-4 md:mt-0">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-neutral-800 md:justify-end">
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">{publicStats.likes}</span> <span className="text-sm text-neutral-500 font-medium">獲得喜歡</span></div>
              <div className="w-px h-6 bg-neutral-200"></div>
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">{publicStats.copies}</span> <span className="text-sm text-neutral-500 font-medium">被複製</span></div>
              <button type="button" onClick={() => setFollowListType('followers')} className="text-center flex items-baseline gap-1.5 hover:text-[#F04D79]"><span className="text-2xl font-bold">{profileUser.followersCount}</span> <span className="text-sm font-medium">粉絲</span></button>
              <button type="button" onClick={() => setFollowListType('following')} className="text-center flex items-baseline gap-1.5 hover:text-[#F04D79]"><span className="text-2xl font-bold">{profileUser.followingCount}</span> <span className="text-sm font-medium">追蹤中</span></button>
            </div>
            {currentAccount !== targetAccount && <button type="button" disabled={isUpdatingFollow} onClick={() => void handleToggleFollow()} className="inline-flex items-center gap-2 rounded-full bg-[#F04D79] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{profileUser.isFollowing ? <><UserCheck size={17} />取消追蹤</> : <><UserPlus size={17} />追蹤</>}</button>}
            
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
      {followListType && <FollowListModal account={targetAccount} viewerAccount={currentAccount} listType={followListType} onClose={() => setFollowListType(null)} />}
    </div>
  );
}
