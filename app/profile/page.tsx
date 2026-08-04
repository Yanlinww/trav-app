'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Camera, MapPin, Bookmark, Compass, Map, 
  Link2, X, Loader2, Plus, Eye, FileText
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaTiktok } from 'react-icons/fa';

export default function ProfilePage() {
  const { user } = useAuth();
  
  // 原本的狀態
  const [activeTab, setActiveTab] = useState('photos');
  
  // 上傳與檔案狀態
  const [isUploading, setIsUploading] = useState(false);
  const [userFiles, setUserFiles] = useState<any[]>([]); 
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 社群連結設定相關狀態
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isSavingLinks, setIsSavingLinks] = useState(false); // 🌟 新增儲存中的 Loading 狀態
  const [socialLinks, setSocialLinks] = useState({
    instagram: '', twitter: '', xiaohongshu: '', tiktok: '', youtube: '', facebook: ''
  });

  const displayName = user?.nickname || 'TRAVELER';
  const avatarUrl = (user as any)?.avatar;

  // 1. 抓取分頁檔案
  const fetchUserFiles = async () => {
    if (!user) return;
    setIsLoadingFiles(true);
    try {
      const res = await fetch("http://localhost:8080/get_user_files.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account, Tab_Type: activeTab }),
      });
      const data = await res.json();
      if (data.status === 'success') setUserFiles(data.data);
      else setUserFiles([]);
    } catch (error) { console.error("無法取得檔案", error); } 
    finally { setIsLoadingFiles(false); }
  };

  // 2. 🌟 抓取使用者儲存的社群連結 🌟
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
          instagram: data.data.instagram || '',
          twitter: data.data.twitter || '',
          xiaohongshu: data.data.xiaohongshu || '',
          tiktok: data.data.tiktok || '',
          youtube: data.data.youtube || '',
          facebook: data.data.facebook || ''
        });
      }
    } catch (error) { console.error("無法取得社群連結", error); }
  };

  // 網頁載入時觸發
  useEffect(() => {
    if (user) fetchUserFiles();
  }, [user, activeTab]);

  useEffect(() => {
    if (user) fetchSocialLinks();
  }, [user]);

  // 3. 🌟 儲存社群連結到資料庫 🌟
  const handleSaveLinks = async () => {
    if (!user) return;
    setIsSavingLinks(true);
    try {
      const res = await fetch("http://localhost:8080/update_social_links.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Account: user.id || (user as any).Account,
          ...socialLinks
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert("✅ 社群連結已成功儲存！");
        setIsLinkModalOpen(false);
      } else {
        alert(`❌ 儲存失敗：${data.message}`);
      }
    } catch (error) {
      alert("❌ 伺服器連線錯誤");
    } finally {
      setIsSavingLinks(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeTab === 'photos' && !file.type.startsWith('image/')) {
      alert("📸 旅遊照片區塊只能上傳圖片檔案喔！");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('Account', user?.id || (user as any)?.Account || '');
    formData.append('type', activeTab);

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
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">0</span> <span className="text-sm text-neutral-500 font-medium">粉絲</span></div>
              <div className="w-px h-6 bg-neutral-200"></div>
              <div className="text-center flex items-baseline gap-1.5"><span className="text-2xl font-bold">0</span> <span className="text-sm text-neutral-500 font-medium">追蹤中</span></div>
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

        {/* ================= 2. 下方內容分頁 ================= */}
        <div className="flex flex-wrap gap-4 mt-12 justify-center md:justify-start mb-8">
          <button onClick={() => setActiveTab('photos')} className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${activeTab === 'photos' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}><Camera className="size-3.5" /> 旅遊照片</button>
          <button onClick={() => setActiveTab('journeys')} className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${activeTab === 'journeys' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}><Map className="size-3.5" /> 我的旅程</button>
          <button onClick={() => setActiveTab('saved')} className={`px-6 py-3 flex items-center gap-2 text-xs font-medium tracking-widest uppercase transition-all border ${activeTab === 'saved' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}><Bookmark className="size-3.5" /> 收藏地點</button>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept={activeTab === 'photos' ? "image/*" : "image/*, .pdf, .doc, .docx"} />

        {/* ================= 3. 檔案顯示區塊 ================= */}
        {isLoadingFiles ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-300" /></div>
        ) : userFiles.length > 0 ? (
          
          activeTab === 'photos' ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-12 animate-in fade-in duration-300">
              <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${isUploading ? 'border-[#F04D79] bg-pink-50/30' : 'border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-300'}`}>
                <div className={`p-4 rounded-full transition-all duration-300 ${isUploading ? 'bg-pink-100 text-[#F04D79]' : 'bg-white text-neutral-400 group-hover:text-neutral-600 shadow-sm border border-neutral-100 group-hover:shadow group-hover:-translate-y-1'}`}>
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                </div>
                <span className={`mt-4 text-xs font-bold tracking-widest uppercase transition-colors ${isUploading ? 'text-[#F04D79]' : 'text-neutral-400 group-hover:text-neutral-600'}`}>{isUploading ? '上傳中...' : '新增檔案'}</span>
              </div>
              
              {userFiles.map((file) => {
                const isImage = file.File_URL.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                return (
                  <div key={file.File_ID} className="aspect-[4/3] rounded-2xl bg-white overflow-hidden border border-neutral-200 shadow-sm relative group cursor-pointer flex flex-col">
                     {isImage ? (
                       <>
                         <img src={file.File_URL} alt="Uploaded" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                           <a href={file.File_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-white text-xs font-bold tracking-wider"><Eye size={16} /> 查看圖片</a>
                         </div>
                       </>
                     ) : (
                       <a href={file.File_URL} target="_blank" rel="noreferrer" className="w-full h-full flex flex-col items-center justify-center p-6 hover:bg-neutral-50 transition-colors group/link relative">
                         <div className="absolute top-4 left-4 bg-neutral-100 px-3 py-1 rounded-full text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Document</div>
                         <div className="p-4 bg-neutral-100 rounded-full mb-4 text-neutral-400 group-hover/link:text-neutral-600 transition-colors group-hover/link:-translate-y-2 duration-300 shadow-inner">
                           <FileText className="w-8 h-8" />
                         </div>
                         <span className="text-xs font-bold text-neutral-700 text-center break-all line-clamp-2">{file.File_URL.split('/').pop()}</span>
                       </a>
                     )}
                  </div>
                );
              })}
            </div>
          )

        ) : (
          <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`bg-white rounded-2xl border-2 border-dashed p-16 sm:p-20 flex flex-col items-center justify-center text-center shadow-sm mb-12 transition-all group animate-in fade-in duration-300 ${isUploading ? 'border-[#F04D79] bg-pink-50/30 cursor-wait' : 'border-neutral-200 cursor-pointer hover:bg-neutral-50 hover:border-neutral-300'}`}>
            <div className="relative mb-6 group-hover:scale-110 transition-transform duration-300">
               <div className={`${isUploading ? 'text-[#F04D79]' : 'text-neutral-300 group-hover:text-neutral-500'} relative z-10 transition-colors`}>
                  {isUploading ? <Loader2 className="w-12 h-12 animate-spin" /> : activeTab === 'photos' ? <Camera className="w-12 h-12" /> : activeTab === 'journeys' ? <MapPin className="w-12 h-12" /> : <Compass className="w-12 h-12" />}
               </div>
            </div>
            <h3 className={`text-lg font-bold tracking-widest mb-2 uppercase ${isUploading ? 'text-[#F04D79]' : 'text-neutral-900'}`}>
              {isUploading ? '檔案上傳中...' : activeTab === 'photos' ? '分享你的旅行視角' : activeTab === 'journeys' ? '紀錄你的每一段旅程' : '收藏你的夢想清單'}
            </h3>
            <p className="text-sm text-neutral-400 font-medium max-w-sm leading-relaxed">
              {isUploading ? '請稍候，正在將您的檔案安全地寫入伺服器。' : activeTab === 'photos' ? '點擊此處上傳照片，讓 AI 幫你生成專屬的旅行故事。' : activeTab === 'journeys' ? '點擊此處上傳行程檔案，規劃中的藍圖都會顯示在這裡。' : '點擊此處上傳景點截圖或檔案，準備隨時出發。'}
            </p>
          </div>
        )}
      </div>

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