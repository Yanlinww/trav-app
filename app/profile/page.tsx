'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AvatarImage } from '../components/AvatarImage';
import FollowListModal from '../components/FollowListModal';
import { useRouter } from 'next/navigation';
import { 
  Camera, MapPin, Bookmark,
  Link2, X, Loader2, Plus, Eye
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaTiktok } from 'react-icons/fa';

// 本人頁依登入帳號載入照片、行程與社群資料；編輯操作分別送往對應 PHP API。
export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter(); 
  
  // photos 顯示上傳照片；journeys 顯示本人的行程列表，資料來源不是收藏關係 API。
  const [activeTab, setActiveTab] = useState('photos');
  
  // 📸 照片上傳與檔案狀態
  const [isUploading, setIsUploading] = useState(false);
  const [userFiles, setUserFiles] = useState<any[]>([]); 
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  // 由照片區卡片觸發隱藏的 file input；上傳結束後也用此 ref 清空選取值。
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 帳號行程列表與獨立載入狀態。
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [isLoadingItineraries, setIsLoadingItineraries] = useState(false);
  // 🔗 社群連結設定相關狀態
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '', twitter: '', xiaohongshu: '', tiktok: '', youtube: '', facebook: ''
  });
  // 同一份 socialLinks 同時作為圖示網址與編輯草稿；輸入即更新 state，按儲存才寫入後端。

  const displayName = user?.nickname || 'TRAVELER';
  const avatarUrl = (user as any)?.avatar;
  const currentAccount = user ? String(user.id || (user as any).Account || '') : ''; // 兼容既有會員欄位。
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 });
  // null 表示關閉；字串值決定 FollowListModal 讀粉絲名單或追蹤中名單。
  const [followListType, setFollowListType] = useState<'followers' | 'following' | null>(null);

  // 帳號或名單開關改變時更新統計；以本人同時作為名單主人與觀看者。
  useEffect(() => {
    if (!currentAccount) return;
    const loadFollowStats = async () => {
      try {
        const response = await fetch('/backend/social.php?action=profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Account: currentAccount, Viewer_Account: currentAccount }),
        });
        const result = await response.json();
        // 直接以後端兩個計數取代目前統計；此入口沒有取消／舊回應忽略機制。
        if (result.status === 'success') setFollowStats({ followersCount: result.data.followersCount, followingCount: result.data.followingCount });
      } catch (error) { console.error('無法取得追蹤統計', error); }
    };
    void loadFollowStats();
  }, [currentAccount, followListType]);

  // files.php 依 Account 與 photos 類型讀取照片，成功後取代目前列表。
  const fetchUserFiles = async () => {
    // 登入資料尚未還原時不查詢；載入旗標只控制照片區，不鎖住整個個人頁。
    if (!user) return;
    setIsLoadingFiles(true);
    try {
      const res = await fetch("/backend/files.php?action=get", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // 兼容會員回應的 id／Account；photos 指定只取旅遊照片。
        body: JSON.stringify({ Account: user.id || (user as any).Account, Tab_Type: 'photos' }),
      });
      const data = await res.json();
      // 成功替換照片列表，業務失敗清空；例外只記錄錯誤，finally 一律結束載入。
      if (data.status === 'success') setUserFiles(data.data);
      else setUserFiles([]);
    } catch (error) { console.error("無法取得照片", error); } 
    finally { setIsLoadingFiles(false); }
  };

  // core.php?action=list 讀取帳號行程，不是收藏關係查詢；卡片連到可編輯的 /planner/{id}。
  const fetchItineraries = async () => {
    if (!user) return;
    setIsLoadingItineraries(true);
    try {
      const res = await fetch("/backend/itinerary/core.php?action=list", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account }),
      });
      const data = await res.json();
      // 回應列表供 journeys 卡片使用；不是把行程複製到本頁或修改其公開狀態。
      if (data.status === 'success') setItineraries(data.data);
      else setItineraries([]);
    } catch (error) { console.error("無法取得行程", error); } 
    finally { setIsLoadingItineraries(false); }
  };

  // 讀取社群連結並把缺少的平台補為空字串，供圖示與編輯欄位共用。
  const fetchSocialLinks = async () => {
    if (!user) return;
    try {
      const res = await fetch("/backend/social.php?action=links", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account }),
      });
      // links 只讀取；data.data 預期含 instagram、twitter 等與 state 同名的平台欄位。
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        // 將缺少值補成空字串，讓後續 trim 判斷與受控輸入欄位維持字串型別。
        setSocialLinks({
          instagram: data.data.instagram || '', twitter: data.data.twitter || '',
          xiaohongshu: data.data.xiaohongshu || '', tiktok: data.data.tiktok || '',
          youtube: data.data.youtube || '', facebook: data.data.facebook || ''
        });
      }
    // 業務失敗或例外不覆蓋原資料；例外只在主控台記錄，沒有彈窗提示。
    } catch (error) { console.error("無法取得社群連結", error); }
  };

  // 切到哪個分頁才讀該類資料；社群連結另於 user 改變時讀取。
  useEffect(() => {
    if (user) {
      if (activeTab === 'photos') fetchUserFiles();
      else if (activeTab === 'journeys') fetchItineraries();
    }
  }, [user, activeTab]);

  // user 變動才讀取連結，不因切換照片／行程分頁而重讀。
  useEffect(() => { if (user) fetchSocialLinks(); }, [user]);

  useEffect(() => {
    // 另一個初始化統計入口；取消旗標只忽略舊回應，不中止已送出的 HTTP 請求。
    let isCancelled = false;
    if (!currentAccount) {
      setFollowStats({ followersCount: 0, followingCount: 0 });
      return;
    }

    const fetchFollowStats = async () => {
      try {
        const res = await fetch("/backend/social.php?action=profile", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Account: currentAccount }),
        });
        const data = await res.json();
        // 只接受仍屬於這輪 Effect 的回應；數字轉型與預設 0 供統計按鈕顯示。
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
    // 換帳號或卸載後使舊回應失效，與上方依名單開關重讀的統計入口各自運作。
    return () => { isCancelled = true; };
  }, [currentAccount]);

  // 將目前連結草稿送往 update_links，成功才關閉表單；各欄位與後端平台名稱一致。
  // 關閉／取消按鈕只關閉彈窗，不還原 socialLinks；未儲存的草稿仍可能被圖示或下次編輯沿用。
  const handleSaveLinks = async () => {
    if (!user) return;
    setIsSavingLinks(true);
    try {
      const res = await fetch("/backend/social.php?action=update_links", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // Account 指定保存對象，展開 socialLinks 將各平台草稿平鋪到同一份 JSON。
        body: JSON.stringify({ Account: user.id || (user as any).Account, ...socialLinks }),
      });
      const data = await res.json();
      // 成功只關閉彈窗，網址仍沿用目前 state；失敗不關窗，finally 恢復儲存按鈕。
      if (data.status === 'success') {
        alert("✅ 社群連結已成功儲存！");
        setIsLinkModalOpen(false);
      } else alert(`❌ 儲存失敗：${data.message}`);
    } catch (error) { alert("❌ 伺服器連線錯誤"); } 
    finally { setIsSavingLinks(false); }
  };

  // 先檢查圖片類型，再以 FormData 上傳原檔；成功後重讀列表，結束時清空 input 以便重選同一檔。
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 取消檔案選擇時沒有 File，直接結束；MIME 檢查只在前端，並不檢查圖片實際內容。
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("📸 旅遊照片區塊只能上傳圖片檔案喔！");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    // 檔案用 FormData 送二進位；不手動指定 Content-Type，讓瀏覽器加入 multipart 邊界。
    const formData = new FormData();
    formData.append('file', file);
    formData.append('Account', user?.id || (user as any)?.Account || '');
    formData.append('type', 'photos'); // 與讀列表的 Tab_Type 名稱不同，這是上傳 API 接收的欄位。

    try {
      const res = await fetch("/backend/files.php?action=upload", { method: "POST", body: formData });
      const data = await res.json();
      // 重新讀後端產生的檔案資料，不直接把本機 File 物件插入照片列表。
      if (data.status === 'success') fetchUserFiles(); 
      else alert(`❌ 上傳失敗：${data.message}`);
    } catch (error) { alert("❌ 無法連線到上傳 API"); } 
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  // 有連結則另開視窗，無連結則開啟設定彈窗，不導航到空網址。
  const SocialIconBtn = ({ network, link, icon: Icon, label }: { network: string, link: string, icon: any, label?: string }) => {
    // 非空連結才有 href 與 _blank；未設定時讓點擊開啟草稿表單，而不是導航。
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

  // 名單彈窗共用 followListType；本人取消追蹤時先調整畫面計數，開關變化也會觸發重讀。
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
              <AvatarImage src={avatarUrl} name={displayName} fallbackClassName="text-4xl" />
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
              <button type="button" onClick={() => setFollowListType('followers')} className="text-center flex items-baseline gap-1.5 hover:text-[#F04D79]"><span className="text-2xl font-bold">{followStats.followersCount}</span> <span className="text-sm font-medium">粉絲</span></button>
              <button type="button" onClick={() => setFollowListType('following')} className="text-center flex items-baseline gap-1.5 hover:text-[#F04D79]"><span className="text-2xl font-bold">{followStats.followingCount}</span> <span className="text-sm font-medium">追蹤中</span></button>
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
          <button onClick={() => setActiveTab('journeys')} className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${activeTab === 'journeys' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}><Bookmark className="size-3.5" /> 我的行程</button>
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

        {/* 🗺️ 我的行程區塊 */}
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
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-12 text-center text-sm text-neutral-500">目前沒有行程，前往行程規劃建立第一趟旅程。</div>
          )
        )}
      </div>

      {followListType && currentAccount && <FollowListModal account={currentAccount} viewerAccount={currentAccount} listType={followListType} isOwnList onClose={() => setFollowListType(null)} onOwnFollowingChanged={() => setFollowStats((stats) => ({ ...stats, followingCount: Math.max(0, stats.followingCount - 1) }))} />}

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
