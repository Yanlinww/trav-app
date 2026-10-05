'use client';

/**
 * 模組匯入說明：
 * - React 核心 Hook：用於狀態管理 (useState)、副作用處理 (useEffect)、DOM 引用 (useRef)
 * - Next.js 路由：useRouter 用於頁面跳轉
 * - 驗證 Context：useAuth 取得使用者登入狀態與資訊
 * - Lucide React 圖示庫：提供 UI 所需的向量圖示
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { 
  Plus, X, Calendar, MapPin, Loader2, User, Pin, Trash2, MoreVertical, ChevronLeft,
  Globe, Lock
} from "lucide-react";

/**
 * @interface Itinerary
 * @description 定義單一行程資料結構
 * @property {string} id - 行程的唯一識別碼
 * @property {string} title - 行程標題
 * @property {string} startDate - 開始日期 (格式通常為 YYYY-MM-DD)
 * @property {string} endDate - 結束日期 (格式通常為 YYYY-MM-DD)
 * @property {string} coverImage - 封面圖片 URL
 * @property {string} isPinned - 是否被釘選至頂部
 * @property {boolean} isPublic - 是否公開行程 (true: 公開, false: 私密)
 * @property {string} Account - 行程建立者的帳號識別碼 (用於判斷權限 Owner/Member)
 */
interface Itinerary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  isPinned: boolean;
  isPublic: boolean; // 🌟 擴充 isPublic 型別
  Account: string;
}

export default function PlannerDashboard() {
  // 取得使用者驗證狀態與路由控制器
  const { user, loading } = useAuth();
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // 狀態管理 (State Management)
  // ---------------------------------------------------------------------------
  
  /** @type {boolean} 新增行程彈窗開關狀態 */
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  /** @type {string | null} 當前展開下拉選單的行程 ID，null 代表無選單展開 */
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  /** @type {boolean} 資料載入中狀態 (頁面初始化抓取) */
  const [isFetching, setIsFetching] = useState(true);
  
  /** @type {boolean} 建立行程表單提交中狀態 */
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表單輸入狀態
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [destination, setDestination] = useState("taipei");

  /**
   * @constant CITY_COORDINATES
   * @description 台灣各縣市及海外主要城市之經緯度對照表，用於建立行程時帶入目的地座標
   */
  const CITY_COORDINATES: Record<string, { lat: number, lng: number }> = {
    "keelung": { lat: 25.1276, lng: 121.7392 },
    "taipei": { lat: 25.0478, lng: 121.5170 },
    "new_taipei": { lat: 25.0119, lng: 121.4654 },
    "taoyuan": { lat: 24.9936, lng: 121.3010 },
    "hsinchu_city": { lat: 24.8138, lng: 120.9675 },
    "hsinchu_county": { lat: 24.8383, lng: 121.0177 },
    "miaoli": { lat: 24.5602, lng: 120.8214 },
    "taichung": { lat: 24.1477, lng: 120.6736 },
    "changhua": { lat: 24.0755, lng: 120.5447 },
    "nantou": { lat: 23.9111, lng: 120.6872 },
    "yunlin": { lat: 23.7092, lng: 120.4313 },
    "chiayi_city": { lat: 23.4795, lng: 120.4414 },
    "chiayi_county": { lat: 23.4518, lng: 120.2555 },
    "tainan": { lat: 22.9997, lng: 120.2270 },
    "kaohsiung": { lat: 22.6273, lng: 120.3014 },
    "pingtung": { lat: 22.6690, lng: 120.4862 },
    "yilan": { lat: 24.7570, lng: 121.7530 },
    "hualien": { lat: 23.9872, lng: 121.6016 },
    "taitung": { lat: 22.7583, lng: 121.1444 },
    "penghu": { lat: 23.5711, lng: 119.5815 },
    "kinmen": { lat: 24.4327, lng: 118.3225 },
    "matsu": { lat: 26.1505, lng: 119.9334 },
    "tokyo": { lat: 35.6812, lng: 139.7671 },
    "osaka": { lat: 34.6937, lng: 135.5023 },
  };

  /** @type {Itinerary[]} 使用者擁有的所有行程清單 */
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  
  // ---------------------------------------------------------------------------
  // API 與資料操作函式 (API Handling & Business Logic)
  // ---------------------------------------------------------------------------

  /**
   * @function fetchItineraries
   * @async
   * @description 向後端 API 取得該使用者相關的所有行程列表
   */
  const fetchItineraries = async () => {
    if (!user) return;
    try {
      const res = await fetch("http://localhost:8080/itinerary/core.php?action=list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account, Viewer_Account: user.id || (user as any).Account }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setItineraries(data.data);
      }
    } catch (error) {
      console.error("載入行程失敗", error);
    } finally {
      setIsFetching(false);
    }
  };

  /**
   * 驗證與初始化 Effect：
   * 1. 若驗證結束後使用者未登入，重定向至登入頁面
   * 2. 若使用者已登入，開始抓取行程列表
   */
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    } else if (user) {
      fetchItineraries();
    }
  }, [user, loading, router]);

  /**
   * @constant sortedItineraries
   * @description 排序後的行程列表（已釘選的行程會排在最前面）
   */
  const sortedItineraries = [...itineraries].sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  /**
   * @function openPublicSettings
   * @description 導向至景點/公開設定頁面以調整行程公開資訊
   * @param {string} id - 行程 ID
   * @param {React.MouseEvent} e - 滑鼠點擊事件
   */
  const openPublicSettings = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdown(null);
    router.push(`/destinations?publish=${encodeURIComponent(id)}`);
  };

  /**
   * @function handleDelete
   * @async
   * @description 刪除指定行程
   * @param {string} id - 行程 ID
   * @param {React.MouseEvent} e - 滑鼠點擊事件
   */
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("確定要刪除這個行程嗎？此動作無法復原。")) {
      try {
        const res = await fetch("http://localhost:8080/itinerary/core.php?action=delete", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Account: user?.id || (user as any)?.Account, Itinerary_ID: id }),
        });
        const data = await res.json();
        if (data.status === 'success') { setItineraries(itineraries.filter(it => it.id !== id)); } 
        else { alert(data.message); }
      } catch (error) { alert("刪除失敗"); }
      setActiveDropdown(null);
    }
  };

  /**
   * @function handlePin
   * @async
   * @description 切換行程的釘選狀態（採用 Optimistic UI 更新策略）
   * @param {string} id - 行程 ID
   * @param {boolean} isCurrentlyPinned - 當前是否已釘選
   * @param {React.MouseEvent} e - 滑鼠點擊事件
   */
  const handlePin = async (id: string, isCurrentlyPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetPinStatus = !isCurrentlyPinned;
    // 樂觀更新：先更新畫面狀態
    setItineraries(itineraries.map(it => it.id === id ? { ...it, isPinned: targetPinStatus } : it));
    setActiveDropdown(null);
    try {
      const res = await fetch("http://localhost:8080/itinerary/core.php?action=pin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user?.id || (user as any)?.Account, Itinerary_ID: id, Is_Pinned: targetPinStatus }),
      });
      const data = await res.json();
      if (data.status !== 'success') {
        // 若伺服器回應失敗，回滾狀態
        setItineraries(itineraries.map(it => it.id === id ? { ...it, isPinned: isCurrentlyPinned } : it));
        alert(data.message);
      }
    } catch (error) {
      // 發生例外時，回滾狀態
      setItineraries(itineraries.map(it => it.id === id ? { ...it, isPinned: isCurrentlyPinned } : it));
      alert("釘選狀態更新失敗");
    }
  };

  /**
   * @function handleCreateItinerary
   * @async
   * @description 表單送出：建立全新的行程
   * @param {React.FormEvent} e - 表單送出事件
   */
  const handleCreateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const coords = CITY_COORDINATES[destination];
    try {
      const res = await fetch("http://localhost:8080/itinerary/core.php?action=create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          Account: user?.id || (user as any)?.Account, 
          Title: title, 
          StartDate: startDate, 
          EndDate: endDate, 
          Dest_Lat: coords.lat, 
          Dest_Lng: coords.lng 
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        await fetchItineraries();
        setIsModalOpen(false);
        setTitle("");
        setStartDate("");
        setEndDate("");
        setDestination("taipei");
      } 
    else { alert("建立失敗: " + data.message); }
    } catch (error) { alert("發生錯誤"); } finally { setIsSubmitting(false); }
  };

  // 渲染全螢幕加載狀態
  if (loading || isFetching) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin size-8 text-slate-300" /></div>;

  // ---------------------------------------------------------------------------
  // JSX 視圖渲染 (UI Render)
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FAFAFA] relative">
      {/* 點擊空白處關閉選單之透明遮罩 */}
      {activeDropdown && <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />}
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* 頂部標題與操作按鈕區 */}
        <div className="mb-8 md:mb-12 md:flex md:items-center md:justify-between">
          <h1 className="text-[28px] font-bold leading-tight text-slate-900 tracking-wide md:text-3xl">我的行程</h1>
          <div className="mt-4 md:mt-0">
            <button onClick={() => setIsModalOpen(true)} className="flex h-12 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 text-xs font-medium text-white transition-all hover:bg-amber-600 sm:text-sm md:px-5">
              <Plus className="size-4" /> <span>建立新行程</span>
            </button>
          </div>
        </div>

        {/* 行程列表區域：無資料狀態 vs 卡片網格 */}
        {itineraries.length === 0 ? (
          <div className="text-center py-28 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><MapPin className="text-slate-300" size={28} /></div>
            <p className="text-slate-500 mb-8 tracking-wide">還沒有任何行程，開始規劃你的下一趟旅程吧！</p>
            <button onClick={() => setIsModalOpen(true)} className="px-7 py-3 bg-slate-900 text-white font-medium rounded-lg">建立第一個行程</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {sortedItineraries.map((itinerary) => (
              <div key={itinerary.id} onClick={() => router.push(`/planner/${itinerary.id}`)} className="bg-white border border-slate-100 rounded-xl group cursor-pointer hover:shadow-xl relative">
                {/* 行程封面圖與更多功能按鈕 */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 rounded-t-xl">
                  <img src={itinerary.coverImage} className="w-full h-full object-cover grayscale-[40%] group-hover:grayscale-0 transition-all" />
                  {itinerary.isPinned && <div className="absolute top-3 left-3 bg-slate-900/90 text-white p-1.5 rounded-full"><Pin className="size-3.5" /></div>}
                  <button
                    type="button"
                    aria-label={`開啟「${itinerary.title}」的行程選單`}
                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === itinerary.id ? null : itinerary.id); }}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition-opacity md:right-3 md:top-3 md:size-8 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <MoreVertical className="size-3.5 md:size-4" />
                  </button>
                </div>
                
                {/* 卡片下拉操作選單 */}
                {activeDropdown === itinerary.id && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-3 top-14 w-36 bg-white border border-gray-100 shadow-xl rounded-lg py-1.5 z-50">
                    <button onClick={(e) => handlePin(itinerary.id, itinerary.isPinned, e)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"><Pin className="size-4" /> {itinerary.isPinned ? '取消釘選' : '釘選行程'}</button>
                    
                    <button onClick={(e) => openPublicSettings(itinerary.id, e)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100">
                      <Globe className="size-4 text-emerald-600" />
                      {itinerary.isPublic ? '管理公開資訊' : '前往發布'}
                    </button>

                    <button onClick={(e) => handleDelete(itinerary.id, e)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"><Trash2 className="size-4" /> 刪除行程</button>
                  </div>
                )}
                
                {/* 行程資訊內容區 */}
                <div className="p-5">
                  <h3 className="text-lg font-medium text-slate-900 mb-1.5 truncate">{itinerary.title}</h3>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="flex min-w-0 flex-col gap-1 text-xs font-mono leading-tight text-slate-400">
                      <span className="whitespace-nowrap">{itinerary.startDate}</span>
                      <span className="whitespace-nowrap">{itinerary.endDate}</span>
                    </p>
                    
                    {/* 🌟 狀態標示區塊 (公開性與擁有者身分) 🌟 */}
                    <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
                      <span title={itinerary.isPublic ? '公開行程' : '私密行程'}>
                        {itinerary.isPublic ? <Globe size={12} className="text-emerald-500" /> : <Lock size={12} className="text-slate-300" />}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300 uppercase">{itinerary.Account === (user?.id || (user as any)?.Account) ? 'Owner' : 'Member'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------------- */
      /* 彈窗 1：建立新行程 Modal                                                */
      /* ----------------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h2 className="text-sm font-bold tracking-widest uppercase">Start Planning</h2><button onClick={() => setIsModalOpen(false)}><X size={20} /></button></div>
            <form onSubmit={handleCreateItinerary} className="p-8 space-y-6">
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="為你的旅程取個名字" className="w-full p-4 bg-slate-50 border rounded-xl" />
                <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-[#F04D79]">
                  <optgroup label="北部">
                    <option value="keelung">基隆市</option>
                    <option value="taipei">台北市</option>
                    <option value="new_taipei">新北市</option>
                    <option value="taoyuan">桃園市</option>
                    <option value="hsinchu_city">新竹市</option>
                    <option value="hsinchu_county">新竹縣</option>
                  </optgroup>
                  <optgroup label="中部">
                    <option value="miaoli">苗栗縣</option>
                    <option value="taichung">台中市</option>
                    <option value="changhua">彰化縣</option>
                    <option value="nantou">南投縣</option>
                    <option value="yunlin">雲林縣</option>
                  </optgroup>
                  <optgroup label="南部">
                    <option value="chiayi_city">嘉義市</option>
                    <option value="chiayi_county">嘉義縣</option>
                    <option value="tainan">台南市</option>
                    <option value="kaohsiung">高雄市</option>
                    <option value="pingtung">屏東縣</option>
                  </optgroup>
                  <optgroup label="東部">
                    <option value="yilan">宜蘭縣</option>
                    <option value="hualien">花蓮縣</option>
                    <option value="taitung">台東縣</option>
                  </optgroup>
                  <optgroup label="外島">
                    <option value="penghu">澎湖縣</option>
                    <option value="kinmen">金門縣</option>
                    <option value="matsu">連江縣(馬祖)</option>
                  </optgroup>
                  <optgroup label="海外 (測試)">
                    <option value="tokyo">日本東京</option>
                    <option value="osaka">日本大阪</option>
                  </optgroup>
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl" />
                  <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-slate-900 text-white rounded-xl">{isSubmitting ? "建立中..." : "開始規劃"}</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
