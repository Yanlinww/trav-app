'use client';

/**
 * /planner 是「我的行程」列表頁。這裡有表單、下拉選單和按鈕事件，
 * 需要 React 狀態與瀏覽器端互動，因此檔案開頭使用 'use client'。
 * 頁面只處理列表與建立入口；單一行程的詳細編輯放在 /planner/[id]。
 */
// useState 保存畫面狀態；useEffect 在登入狀態確定後載入資料。
import { useState, useEffect } from "react";
// 按鈕點擊後才決定目的地，所以使用客戶端路由切換。
import { useRouter } from "next/navigation";
// 從共用 Context 取得目前登入者，讓此頁知道要查哪個帳號的行程。
import { useAuth } from "../context/AuthContext";
import { 
  Plus, X, Calendar, MapPin, Loader2, User, Pin, Trash2, MoreVertical, ChevronLeft,
  Globe, Lock
} from "lucide-react";

/**
 * 列表 API 回傳的卡片資料；型別寫在此頁，方便檢查排序與卡片會用到的欄位。
 */
interface Itinerary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  isPinned: boolean;
  isPublic: boolean; // 決定卡片顯示公開或私密圖示。
  Account: string; // 行程擁有者帳號，用於卡片上的身分標示。
}

export default function PlannerDashboard() {
  // 本頁的資料以登入者為範圍；loading 結束前不能判定使用者未登入。
  const { user, loading } = useAuth();
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // 狀態管理 (State Management)
  // ---------------------------------------------------------------------------
  
  // 這些狀態只影響本頁畫面，放在頁面元件即可，不必交給全站 Context。
  // 是否顯示「建立新行程」表單。
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 只允許一張卡片的選單展開；null 表示全部關閉。
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // 分開記錄「驗證中」與「行程載入中」，避免資料回來前閃出空列表。
  const [isFetching, setIsFetching] = useState(true);
  
  // 送出期間停用按鈕，避免重複建立行程。
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表單輸入由 React 狀態管理，送出時可直接組成後端需要的資料。
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [destination, setDestination] = useState("taipei");

  /**
   * 下拉選單的城市代碼會在建立行程時換成地圖初始座標。
   * 這是城市的代表位置，不是使用者選定的精確景點座標。
   * 目前只有本頁表單會使用，所以對照表放在這個元件內。
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

  // 後端列表回應保存在此，建立／刪除／釘選後可立即更新畫面。
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  
  // ---------------------------------------------------------------------------
  // API 與資料操作函式 (API Handling & Business Logic)
  // ---------------------------------------------------------------------------

  /**
   * 此頁負責顯示行程卡片，因此在這裡向列表 API 取得登入者的行程。
   * 建立成功後也會重用此函式，取得後端產生的行程 ID 與完整卡片資料。
   */
  // Account 指定要查詢的帳號，Viewer_Account 指定目前觀看者；本頁兩者都傳登入者。
  // 列表讀取失敗只記錄錯誤並結束轉圈，畫面不會額外顯示失敗訊息。
  const fetchItineraries = async () => {
    if (!user) return;
    try {
      const res = await fetch("http://localhost:8080/itinerary/core.php?action=list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account, Viewer_Account: user.id || (user as any).Account }),
      });
      const data = await res.json();
      // 只在後端確認成功時更新列表，避免錯誤回應蓋掉原有卡片。
      if (data.status === 'success') {
        setItineraries(data.data);
      }
    } catch (error) {
      console.error("載入行程失敗", error);
    } finally {
      // 成功或失敗都結束載入畫面，否則使用者會一直看到轉圈。
      setIsFetching(false);
    }
  };

  /**
   * 登入資料由 AuthContext 從瀏覽器儲存空間恢復，所以要等 loading 結束，
   * 才能判斷是否真的未登入；已有使用者時才發出行程列表請求。
   * 這是頁面載入後要做的事，放在 useEffect 而不是渲染 JSX 時執行。
   */
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    } else if (user) {
      fetchItineraries();
    }
  }, [user, loading, router]);

  // sort 會直接修改陣列，因此先複製；只改畫面的顯示順序，不改原始 state。
  // 釘選的行程排前面；兩筆狀態相同時保留原本的相對順序。
  const sortedItineraries = [...itineraries].sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  /**
   * 公開資訊在 /destinations 頁管理，所以這裡只傳行程 ID 並導過去。
   * 按鈕位於可點擊的卡片內；stopPropagation 避免同時進入行程詳細頁。
   */
  const openPublicSettings = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdown(null);
    router.push(`/destinations?publish=${encodeURIComponent(id)}`);
  };

  /**
   * 刪除操作從卡片選單發起；先請使用者確認，再呼叫後端刪除。
   * 只有後端回報成功才從本頁列表移除卡片，避免畫面與資料庫不同步。
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
   * 釘選只影響本頁卡片的排序，因此先改本地列表，讓點擊後立刻看到結果。
   * 若後端儲存失敗，再還原原本狀態；這種做法稱為樂觀更新。
   */
  // 只有 API 確認成功才算完成儲存；本地排序會先變動，失敗再還原目標卡片。
  const handlePin = async (id: string, isCurrentlyPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetPinStatus = !isCurrentlyPinned;
    // 先更新畫面，sortedItineraries 會在重新渲染時把卡片移到對應位置。
    setItineraries(itineraries.map(it => it.id === id ? { ...it, isPinned: targetPinStatus } : it));
    setActiveDropdown(null);
    try {
      const res = await fetch("http://localhost:8080/itinerary/core.php?action=pin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user?.id || (user as any)?.Account, Itinerary_ID: id, Is_Pinned: targetPinStatus }),
      });
      const data = await res.json();
      if (data.status !== 'success') {
        // 後端拒絕更新時，還原原本的釘選狀態。
        setItineraries(itineraries.map(it => it.id === id ? { ...it, isPinned: isCurrentlyPinned } : it));
        alert(data.message);
      }
    } catch (error) {
      // 網路或程式例外也要還原，避免只改到前端。
      setItineraries(itineraries.map(it => it.id === id ? { ...it, isPinned: isCurrentlyPinned } : it));
      alert("釘選狀態更新失敗");
    }
  };

  /**
   * 建立表單就在此頁的彈窗內，所以送出邏輯也放在此頁。
   * preventDefault 避免瀏覽器重新整理；城市代碼換成座標後送給後端。
   */
  // destination 的值必須對應 CITY_COORDINATES 的 key；送出的是城市座標而非代碼。
  // 此處 required 由表單檢查必填，日期順序沒有另外在這個函式中驗證。
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
        // 重新讀取列表，比自行拼接卡片更能反映後端實際儲存的資料。
        await fetchItineraries();
        // 只有建立成功才清空草稿；按右上角關閉視窗時，輸入內容仍保留在本頁 state。
        setIsModalOpen(false);
        setTitle("");
        setStartDate("");
        setEndDate("");
        setDestination("taipei");
      } 
    else { alert("建立失敗: " + data.message); }
    } catch (error) { alert("發生錯誤"); } finally { setIsSubmitting(false); }
  };

  // 登入與列表資料尚未準備好時先顯示載入畫面，避免短暫顯示「沒有行程」。
  if (loading || isFetching) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin size-8 text-slate-300" /></div>;

  // ---------------------------------------------------------------------------
  // JSX 視圖渲染 (UI Render)
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FAFAFA] relative">
      {/* 選單開啟時蓋一層透明區域，點卡片外面即可關閉選單。 */}
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

        {/* 同一塊列表位置依資料數量切換提示或卡片，不另建一個頁面。 */}
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
                {/* 整張卡片可進入詳細頁；內部選單按鈕會阻止事件往卡片傳遞。 */}
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
                
                {/* 只有 activeDropdown 對應的卡片顯示選單，避免多個選單一起開啟。 */}
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
                    
                    {/* 公開圖示來自 isPublic；目前列表只查本人行程，所以身分通常是 Owner。 */}
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

      {/* 彈窗和列表共用本頁的表單狀態；關閉後不用離開 /planner。 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h2 className="text-sm font-bold tracking-widest uppercase">Start Planning</h2><button onClick={() => setIsModalOpen(false)}><X size={20} /></button></div>
            {/* 受控輸入欄位的 value 與上方 state 同步，送出時讀取同一份資料。 */}
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
