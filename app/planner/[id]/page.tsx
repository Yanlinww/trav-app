'use client';

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext"; // 請確認此路徑與你的專案結構相符
import { 
  Map as MapIcon, Calendar, DollarSign, BaggageClaim, Ticket, 
  GripVertical, Plus, Train, Hotel, Coffee, Camera,
  ChevronLeft, Wallet, Loader2
} from "lucide-react";

export default function ItineraryEditor() {
  const router = useRouter();
  const params = useParams(); 
  const { user, loading: authLoading } = useAuth();

  // ================= 狀態管理 =================
  const [isLoading, setIsLoading] = useState(true);
  const [itineraryData, setItineraryData] = useState<any>(null);
  
  const [coverImage, setCoverImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ================= 運作機制：初始化與抓取資料 =================
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const fetchDetail = async () => {
      try {
        const res = await fetch("http://localhost:8080/itinerary/get_itinerary_detail.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            Itinerary_ID: params.id,
            Account: user.id || (user as any).Account 
          }),
        });
        
        const data = await res.json();
        if (data.status === 'success') {
          setItineraryData(data.data);
          // 若資料庫無圖片，則套用預設圖片
          setCoverImage(data.data.coverImage || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop");
        } else {
          alert(data.message);
          router.push("/planner");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        alert("資料讀取失敗，請確認後端伺服器狀態。");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchDetail();
    }
  }, [params.id, user, authLoading, router]);

  // ================= 運作機制：圖片即時預覽 =================
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. 為了使用者體驗，先保留本機即時預覽 (UI 不卡頓)
    const previewUrl = URL.createObjectURL(file);
    setCoverImage(previewUrl);
    setIsUploading(true);

    // 2. 將資料打包為 FormData (這才能傳送實體檔案)
    const formData = new FormData();
    formData.append("cover_image", file); // 這裡的名稱必須與 PHP $_FILES['cover_image'] 一致
    formData.append("Itinerary_ID", params.id as string);
    formData.append("Account", user?.id || (user as any)?.Account);

    try {
      // 3. 發送請求 (注意：使用 FormData 時，絕對不能手動設定 Content-Type，瀏覽器會自動加上 boundary)
      const res = await fetch("http://localhost:8080/itinerary/update_cover_image.php", {
        method: "POST",
        body: formData, 
      });

      const data = await res.json();
      
      if (data.status === 'success') {
        // 4. 上傳成功，將狀態替換為伺服器回傳的真實絕對網址
        setCoverImage(data.new_image_url);
      } else {
        alert(data.message);
        // 上傳失敗，將預覽圖還原回原本的資料庫圖片
        setCoverImage(itineraryData.coverImage);
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("圖片上傳失敗，請檢查網路連線。");
      setCoverImage(itineraryData.coverImage); // 錯誤時還原
    } finally {
      setIsUploading(false);
      // 清空 input，允許使用者重複選取同一張圖片
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  // ================= 畫面渲染攔截 (防護機制) =================
  if (authLoading || isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="animate-spin text-slate-300 size-8" />
      </div>
    );
  }
  if (!itineraryData) return null;

  return (
    <div className="h-screen w-full flex bg-[#FAFAFA] overflow-hidden font-sans text-slate-800">
      
      {/* ================= 左欄：行程時間軸 ================= */}
      <div className="w-[380px] bg-white border-r border-slate-100 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.01)] relative">
        
        {/* 封面橫幅區塊 (含上傳邏輯) */}
        <div className="relative h-40 w-full bg-slate-100 group overflow-hidden shrink-0">
          <img 
            src={coverImage} 
            alt="行程封面" 
            className={`w-full h-full object-cover transition-all duration-700 ${isUploading ? 'opacity-50 grayscale blur-sm' : 'group-hover:scale-105 group-hover:brightness-90'}`}
          />
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/png, image/jpeg, image/webp" 
            className="hidden" 
          />

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 m-auto size-12 rounded-full bg-slate-900/60 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#F04D79] hover:scale-110 disabled:opacity-100 disabled:bg-slate-900/40"
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
          </button>

          <button 
            onClick={() => router.push('/planner')}
            className="absolute top-4 left-4 flex items-center justify-center size-8 rounded-full bg-slate-900/40 backdrop-blur-sm text-white hover:bg-[#F04D79] transition-colors"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* 標題與日期資訊區 (動態綁定 API 資料) */}
        <div className="px-6 py-5 border-b border-slate-50 shrink-0">
          <div className="inline-block px-2.5 py-1 bg-pink-50 text-[#F04D79] text-[10px] font-bold tracking-widest rounded-md mb-3">
            SOLO TRAVEL
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-wide mb-2 truncate">
            {itineraryData.title}
          </h1>
          <div className="flex items-center text-xs font-medium text-slate-400 tracking-wide">
            <Calendar size={14} className="mr-2 opacity-70" />
            {itineraryData.startDate} - {itineraryData.endDate}
          </div>
        </div>

        {/* 橫向天數切換 */}
        <div className="flex overflow-x-auto hide-scrollbar px-6 border-b border-slate-100 gap-6">
          <button className="pb-3 text-sm font-bold text-[#F04D79] border-b-2 border-[#F04D79] whitespace-nowrap">
            Day 1 (出發)
          </button>
          <button className="pb-3 text-sm font-medium text-slate-400 hover:text-slate-600 whitespace-nowrap transition-colors">
            Day 2
          </button>
          <button className="pb-3 text-sm font-medium text-slate-400 hover:text-slate-600 whitespace-nowrap transition-colors">
            Day 3
          </button>
        </div>

        {/* 拖曳卡片列表區 (靜態展示) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/30">
          
          <div className="group flex bg-white border border-slate-100 rounded-2xl p-3 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-200 cursor-grab active:cursor-grabbing">
            <div className="flex items-center text-slate-200 group-hover:text-blue-300 pr-2 transition-colors">
              <GripVertical size={16} />
            </div>
            <div className="flex-1 flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                <Train size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-blue-400/80 font-mono mb-0.5 tracking-wider">08:00</div>
                <div className="text-sm font-bold text-slate-700 truncate tracking-wide">交通移動 (範例)</div>
              </div>
              <button className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-blue-500 hover:text-white transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                <DollarSign size={14} />
              </button>
            </div>
          </div>

          <div className="group flex bg-white border border-slate-100 rounded-2xl p-3 shadow-sm transition-all duration-300 hover:shadow-md hover:border-pink-200 cursor-grab active:cursor-grabbing">
            <div className="flex items-center text-slate-200 group-hover:text-pink-300 pr-2 transition-colors">
              <GripVertical size={16} />
            </div>
            <div className="flex-1 flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-pink-50 flex items-center justify-center text-[#F04D79] shrink-0">
                <Hotel size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-pink-400/80 font-mono mb-0.5 tracking-wider">15:00</div>
                <div className="text-sm font-bold text-slate-700 truncate tracking-wide">住宿 Check-in (範例)</div>
              </div>
              <button className="size-8 rounded-full bg-[#F04D79] flex items-center justify-center text-white shrink-0 shadow-sm shadow-pink-200">
                <DollarSign size={14} />
              </button>
            </div>
          </div>

          <button className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-[#F04D79] hover:border-pink-200 hover:bg-pink-50/50 flex items-center justify-center gap-2 text-xs font-bold tracking-widest transition-all duration-300">
            <Plus size={16} /> 新增行程項目
          </button>
        </div>
      </div>

      {/* ================= 中欄：地圖視覺區 ================= */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-100/50">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10 flex flex-col items-center gap-4 opacity-30">
          <div className="size-16 rounded-full border-2 border-slate-300 border-dashed flex items-center justify-center text-slate-400">
            <MapIcon size={28} strokeWidth={1.5} />
          </div>
          <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Map Visualizer</p>
        </div>
      </div>

      {/* ================= 右欄：輔助工具箱 ================= */}
      <div className="w-[340px] bg-white border-l border-slate-100 flex flex-col z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.01)] relative">
        
        {/* 工具列切換 */}
        <div className="flex pt-2 px-4 border-b border-slate-100 gap-1">
          <button className="flex-1 py-4 flex flex-col items-center gap-1.5 text-[#F04D79] border-b-2 border-[#F04D79]">
            <Wallet size={18} />
            <span className="text-[10px] font-bold tracking-widest">記帳</span>
          </button>
          <button className="flex-1 py-4 flex flex-col items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors">
            <BaggageClaim size={18} />
            <span className="text-[10px] font-bold tracking-widest">行李</span>
          </button>
          <button className="flex-1 py-4 flex flex-col items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors">
            <Ticket size={18} />
            <span className="text-[10px] font-bold tracking-widest">憑證</span>
          </button>
        </div>

        {/* 記帳模組內容 */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          
          <div className="bg-gradient-to-br from-[#F04D79] to-[#D93D66] rounded-3xl p-6 text-white mb-8 shadow-[0_8px_30px_rgba(240,77,121,0.25)] relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
              <DollarSign size={120} strokeWidth={3} />
            </div>
            <div className="text-[10px] text-pink-100 font-bold tracking-widest uppercase mb-1">Total Expenses</div>
            <div className="text-3xl font-bold font-mono tracking-tight mb-6">$0</div>
            
            <div className="flex items-center justify-between text-[11px] pt-4 border-t border-white/20">
              <span className="font-medium tracking-wide text-pink-50">載入中...</span>
              <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-md font-mono font-bold text-white shadow-sm">
                RATE 0.213
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-[11px] font-bold text-slate-400 tracking-widest">最新支出明細</h3>
            <button className="text-[10px] text-slate-400 font-bold tracking-wide hover:text-[#F04D79] transition-colors">VIEW ALL</button>
          </div>

          <div className="text-center py-10 text-xs text-slate-400">
            目前尚無支出紀錄
          </div>

          <button className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold tracking-widest hover:bg-[#F04D79] transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
            <Plus size={16} /> 記一筆
          </button>
          
        </div>
      </div>
    </div>
  );
}