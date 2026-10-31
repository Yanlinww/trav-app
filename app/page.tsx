"use client"; // 宣告這是一個 Client Component，因為我們用到了 useState 與 onClick 等前端互動功能

// ==========================================
// 1. 模組與元件引用 (Imports)
// ==========================================
import { useState } from "react";
import { Link } from "./components/Link"; // 自訂的路由切換元件
import { useRouter } from "next/navigation"; // Next.js 原生路由，用於後續跳轉頁面
import {
    Search,
    MapPin,
    Star,
    TrendingUp,
    ArrowRight,
    Map as MapIcon,
    Compass,
    Sparkles,
    Filter,
    MessageSquare,
    X,
    Loader2
} from "lucide-react"; // 引用高質感的 Lucide 圖示庫
import { destinations } from "./data/destinations"; // 引用假資料 (行程推薦列表)

export default function Home() {
    const router = useRouter();

    // ==========================================
    // 2. 狀態管理區 (State Management)
    // ==========================================
    
    // -- UI 顯示控制狀態 --
    // 用於記錄目前使用者點擊了哪個「熱門標籤 (如: #一人旅)」，null 代表未選取任何標籤
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    // 控制是否切換到「地圖模式」，預設為 false (網格模式)
    const [isMapMode, setIsMapMode] = useState<boolean>(false);
    // 控制右下角「AI 專屬顧問聊天室」的展開與收合狀態
    const [isAiOpen, setIsAiOpen] = useState<boolean>(false);

    // -- 🌟 AI 行程生成器專用狀態 🌟 --
    // 記錄使用者輸入的目的地 (如: 台北)
    const [aiDestination, setAiDestination] = useState("");
    // 記錄使用者輸入的預計遊玩天數
    const [aiDays, setAiDays] = useState("");
    // 控制是否正在「AI 規劃中」的 Loading 動畫狀態
    const [isGenerating, setIsGenerating] = useState(false);

    // ==========================================
    // 3. 常數設定與假資料 (Constants)
    // ==========================================
    
    // 顯示在「推薦行程」區塊的熱門過濾標籤
    const soloTags = ["一人旅", "安全", "預算友善", "深度體驗"];
    // 顯示在搜尋框下方的快速點擊靈感 (台灣熱門景點)
    const hotKeywords = ["台北", "台中", "台南", "花蓮", "台東", "墾丁"];

    // ==========================================
    // 4. 資料處理 (Data Processing)
    // ==========================================
    
    // 根據使用者選擇的標籤 (selectedTag) 來過濾要顯示的行程。
    // 如果有選標籤，就只顯示包含該標籤的行程；如果沒選，預設顯示前 6 筆行程。
    const filteredDestinations = selectedTag
        ? destinations.filter((dest) => dest.tags?.includes(selectedTag))
        : destinations.slice(0, 6);

    // ==========================================
    // 5. 事件處理常式 (Event Handlers)
    // ==========================================
    
    /**
     * 處理點擊「生成專屬行程」的動作 (前端 Demo 展示用)
     * 在專題報告時，可以展示這個 Loading 動畫，模擬 AI 正在運算的過程
     */
    const handleGenerateItinerary = () => {
        // 防呆：如果沒填寫目的地或天數，就不執行
        if (!aiDestination || !aiDays) return;
        
        // 1. 開啟載入動畫，按鈕會變成「AI 規劃中...」
        setIsGenerating(true); 

        // 2. 使用 setTimeout 模擬等待後端 API 回應 (設定為 2.5 秒)
        setTimeout(() => {
            setIsGenerating(false); // 關閉動畫
            // 3. 專題 Demo 提示 (這裡未來可以換成 router.push('/result') 跳轉到結果頁)
            alert(`🎉 AI 已經成功為您規劃【${aiDestination} ${aiDays}天】的專屬行程！\n(這裡之後可以串接後端 API，並跳轉至行程結果頁面)`);
        }, 2500);
    };

    // ==========================================
    // 6. UI 畫面渲染 (Render)
    // ==========================================
    return (
        // 最外層容器，確保頁面至少滿版 (min-h-screen)
        <div className="flex flex-col bg-white text-neutral-900 relative">
            
            {/* ==============================================
             * 區塊 1: 沉浸式主視覺 (Hero Section) & AI 生成器
             * ============================================== */}
            <section className="relative min-h-[85vh] flex items-center justify-center bg-[#F8F8F8] pt-24 pb-16">
                
                {/* 絕對定位的裝飾背景 (網格點陣列) */}
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
                    
                    {/* 小徽章 / 眉批 */}
                    <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-neutral-500 mb-6 font-bold bg-white px-4 py-2 rounded-full shadow-sm border border-neutral-200">
                        <Sparkles className="size-3 text-neutral-900" /> Smart Travel Planner
                    </span>
                    
                    {/* 主標題 (改為感性文案) */}
                    <h1 className="mb-6 max-w-5xl mx-auto text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900">
                        說走就走，遇見最美的<span className="text-neutral-500 italic">台灣</span>
                    </h1>
                    
                    {/* 副標題描述 */}
                    <p className="text-base md:text-lg mb-12 max-w-2xl mx-auto text-neutral-500 font-medium tracking-wide leading-relaxed">
                        告別繁瑣的行前功課。輸入目的地與天數，立刻為你量身打造專屬行程，發掘在地秘境與質感體驗。
                    </p>

                    {/* 🌟 核心組件：AI 智能生成控制台 (Airbnb 膠囊風格) 🌟 */}
                    <div className="mx-auto max-w-4xl bg-white rounded-full shadow-2xl shadow-neutral-900/5 border border-neutral-100 p-2 flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-neutral-100 relative">
                        
                        {/* 左側：目的地輸入框 */}
                        <div className="flex-1 px-6 py-3 w-full hover:bg-neutral-50 rounded-full transition cursor-text text-left focus-within:bg-neutral-50">
                            <div className="text-[11px] font-bold text-neutral-900 tracking-widest uppercase mb-1">Destination</div>
                            <input 
                                value={aiDestination}
                                onChange={(e) => setAiDestination(e.target.value)} // 同步更新狀態
                                placeholder="你想去哪裡？ (例: 花蓮)" 
                                disabled={isGenerating} // 生成時鎖定輸入
                                className="bg-transparent outline-none text-sm w-full text-neutral-600 placeholder:text-neutral-300 font-medium disabled:opacity-50" 
                            />
                        </div>

                        {/* 中間：天數輸入框 (嚴格控制上限) */}
                        <div className="flex-1 px-6 py-3 w-full hover:bg-neutral-50 rounded-full transition cursor-text text-left focus-within:bg-neutral-50">
                            <div className="text-[11px] font-bold text-neutral-900 tracking-widest uppercase mb-1">Duration</div>
                            <input 
                                type="number"
                                min="1"
                                max="30"
                                value={aiDays}
                                onChange={(e) => {
                                    // 🌟 嚴格攔截邏輯：確保使用者無法用鍵盤輸入超過 30 的數字
                                    let val = e.target.value;
                                    if (Number(val) > 30) val = "30"; // 超過 30 強制變回 30
                                    if (Number(val) < 0) val = "";    // 負數強制清空
                                    setAiDays(val);
                                }}
                                placeholder="預計玩幾天？ (上限: 30天)" 
                                disabled={isGenerating}
                                className="bg-transparent outline-none text-sm w-full text-neutral-600 placeholder:text-neutral-300 font-medium disabled:opacity-50" 
                            />
                        </div>

                        {/* 右側：生成按鈕 */}
                        <div className="px-2 w-full md:w-auto mt-2 md:mt-0 pb-2 md:pb-0">
                            <button 
                                onClick={handleGenerateItinerary} // 觸發生成動畫與 API 流程
                                disabled={isGenerating || !aiDestination || !aiDays} // 條件不滿足時按鈕反灰
                                className="w-full md:w-auto bg-neutral-900 text-white px-8 py-4 rounded-full font-bold shadow-md shadow-neutral-900/10 hover:bg-neutral-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {/* 根據 isGenerating 狀態切換按鈕文字與圖示 */}
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" /> 
                                        AI 規劃中...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="size-4 group-hover:scale-110 transition-transform" /> 
                                        生成專屬行程
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* 熱門搜尋關鍵字，點擊後會直接把文字填入上面的輸入框 */}
                    <div className="max-w-4xl mx-auto mt-8 text-left px-2 space-y-4">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs">
                            <span className="text-neutral-400 tracking-wider font-bold flex items-center gap-1">
                                <TrendingUp className="size-3" /> 熱門靈感：
                            </span>
                            {hotKeywords.map((keyword) => (
                                <button
                                    key={keyword}
                                    onClick={() => {
                                        // 點擊關鍵字時，自動代入地點，並預設帶入 3 天
                                        setAiDestination(keyword);
                                        setAiDays("3");
                                    }}
                                    disabled={isGenerating}
                                    className="text-neutral-500 hover:text-neutral-900 transition-colors font-medium border border-neutral-200 px-3 py-1.5 rounded-full hover:bg-white hover:shadow-sm"
                                >
                                    {keyword}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ==============================================
             * 區塊 2: 精選推薦牆 (Destination Cards)
             * ============================================== */}
            <section className="py-24 bg-[#FBFBFB]">
                <div className="container mx-auto px-4 md:px-6">
                    
                    {/* 推薦牆標題與過濾標籤列 */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-neutral-900 font-bold">
                                <MapPin className="size-4" /> Destination Ideas
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900">
                                {selectedTag ? `專屬推薦 #${selectedTag}` : "沒有靈感？探索台灣之美"}
                            </h2>
                            <p className="text-neutral-500 font-medium tracking-wide text-sm">
                                點擊下方卡片，讓 AI 針對這些熱門城市為你自動排好行程。
                            </p>
                        </div>
                        
                        {/* 標籤按鈕列表 */}
                        <div className="flex flex-wrap gap-2">
                            {soloTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                    className={`px-4 py-2 text-xs tracking-wider border rounded-full transition-all duration-300 font-bold ${
                                        selectedTag === tag
                                            ? "border-neutral-900 bg-neutral-900 text-white shadow-md shadow-neutral-900/10" // 選中狀態 (深色)
                                            : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 hover:shadow-sm" // 未選中狀態 (淺色)
                                    }`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 行程卡片網格 (Grid) */}
                    {filteredDestinations.length === 0 ? (
                        // 找不到資料時顯示的空狀態 (Empty State)
                        <div className="text-center py-20 text-neutral-400 font-medium text-sm bg-white rounded-3xl border border-dashed border-neutral-200">
                            目前沒有符合 #{selectedTag} 的推薦行程
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {filteredDestinations.map((destination) => (
                                <Link key={destination.id} to={`/destinations/${destination.id}`}>
                                    {/* 卡片主體 (大圓角設計 rounded-3xl) */}
                                    <div className="group cursor-pointer flex flex-col h-full bg-white rounded-3xl border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)] hover:border-neutral-200 transition-all duration-300 p-3">
                                        
                                        {/* 圖片容器 */}
                                        <div className="relative h-[320px] overflow-hidden mb-4 bg-neutral-100 rounded-[1.25rem]">
                                            <img
                                                src={destination.image}
                                                alt={destination.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                            {/* 左上角：分類標籤 */}
                                            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-sm rounded-full">
                                                <span className="text-[10px] tracking-[0.15em] font-bold text-neutral-900">
                                                    {destination.category}
                                                </span>
                                            </div>
                                            {/* 右上角：毛玻璃評分 (Glassmorphism) */}
                                            <div className="absolute top-4 right-4 bg-neutral-900/75 backdrop-blur-md px-3 py-1.5 text-white flex items-center gap-1.5 rounded-full shadow-sm">
                                                <Star className="size-3 text-amber-400 fill-amber-400" />
                                                <span className="text-[10px] font-bold tracking-wider">安全 {destination.safetyRating || "9.5"}</span>
                                            </div>
                                        </div>

                                        {/* 卡片文字資訊 */}
                                        <div className="px-2 pb-2 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-xl font-bold tracking-wide text-neutral-900 group-hover:text-neutral-600 transition-colors">
                                                    {destination.name}
                                                </h3>
                                                <span className="text-xs text-neutral-600 font-bold bg-neutral-100 px-2 py-1 rounded-md">
                                                    {destination.country}
                                                </span>
                                            </div>
                                            <p className="text-neutral-500 text-sm font-medium leading-relaxed line-clamp-2 mb-4">
                                                {destination.description}
                                            </p>
                                            
                                            {/* 底部預估價格與小按鈕 */}
                                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-neutral-50">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-neutral-400 font-bold tracking-widest uppercase mb-0.5">
                                                        Estimated Cost
                                                    </span>
                                                    <span className="text-lg font-bold text-neutral-900">
                                                        NT$ {destination.price.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="px-3 py-1.5 rounded-full bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-900 group-hover:text-white transition-colors text-neutral-600 text-xs font-bold gap-1">
                                                    <Sparkles className="size-3" /> 生成
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ==============================================
             * 區塊 3: 地圖探索模式 (Map Exploration)
             * ============================================== */}
            <section className="py-24 bg-white border-y border-neutral-100">
                <div className="container mx-auto px-4 md:px-6">
                    
                    {/* 地圖模式標題列 */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                        <div className="space-y-3">
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900">
                                台灣地圖探索模式
                            </h2>
                            <p className="text-neutral-500 font-medium tracking-wide text-sm">
                                不確定地點？直接在地圖上框選，讓 AI 幫你規劃該區域的行程。
                            </p>
                        </div>
                        
                        {/* 網格/地圖切換 Toggle 按鈕 */}
                        <div className="flex border border-neutral-200 p-1 rounded-full bg-neutral-50 self-start md:self-auto">
                            <button
                                onClick={() => setIsMapMode(false)}
                                className={`px-6 py-2.5 text-xs font-bold transition-all rounded-full ${!isMapMode ? "bg-neutral-900 text-white shadow-md shadow-neutral-900/10" : "text-neutral-500 hover:text-neutral-900"}`}
                            >
                                網格檢視
                            </button>
                            <button
                                onClick={() => setIsMapMode(true)}
                                className={`px-6 py-2.5 text-xs font-bold transition-all flex items-center gap-2 rounded-full ${isMapMode ? "bg-neutral-900 text-white shadow-md shadow-neutral-900/10" : "text-neutral-500 hover:text-neutral-900"}`}
                            >
                                <MapIcon className="size-4" /> 地圖檢視
                            </button>
                        </div>
                    </div>

                    {/* 根據狀態 (isMapMode) 切換要顯示的內容 */}
                    {!isMapMode ? (
                        // 未開啟地圖時的提示畫面
                        <div className="bg-neutral-50 border border-neutral-100 p-8 md:p-12 text-center rounded-[2rem]">
                            <div className="max-w-md mx-auto space-y-6 py-10">
                                <div className="size-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-neutral-200">
                                    <Compass className="size-8 text-neutral-900" />
                                </div>
                                <h3 className="text-xl font-bold text-neutral-900">切換至地圖模式</h3>
                                <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                                    開啟地圖檢視，直觀探索台灣各縣市的獨旅景點分布與距離關聯。
                                </p>
                                <button onClick={() => setIsMapMode(true)} className="px-8 py-3.5 bg-neutral-900 text-white text-sm font-bold rounded-full hover:bg-neutral-700 hover:shadow-md hover:shadow-neutral-900/10 transition-all">
                                    開啟地圖
                                </button>
                            </div>
                        </div>
                    ) : (
                        // 開啟地圖時的模擬地圖畫面 (專題階段先用排版模擬示意)
                        <div className="relative h-[550px] bg-neutral-100 border border-neutral-200 rounded-[2rem] overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px] bg-white"></div>
                            
                            {/* 地圖打卡點 A */}
                            <div className="absolute top-1/4 left-1/3 group cursor-pointer z-10">
                                <div className="bg-neutral-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 transition-transform group-hover:-translate-y-1">
                                    <MapPin className="size-3.5 text-white fill-neutral-900" /> 台中市
                                </div>
                            </div>
                            
                            {/* 地圖打卡點 B */}
                            <div className="absolute bottom-1/3 right-1/4 group cursor-pointer z-10">
                                <div className="bg-neutral-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 transition-transform group-hover:-translate-y-1">
                                    <MapPin className="size-3.5 text-white fill-neutral-900" /> 花蓮太魯閣
                                </div>
                            </div>
                            
                            {/* 地圖左下角資訊框 */}
                            <div className="relative z-20 bg-white/95 backdrop-blur-md p-6 max-w-sm border border-neutral-200 shadow-2xl absolute bottom-6 left-6 space-y-3 rounded-2xl">
                                <span className="text-[10px] tracking-[0.2em] font-bold text-neutral-900 block uppercase">Interactive Map</span>
                                <h4 className="text-base font-bold text-neutral-900">全台互動式安全地圖即將上線</h4>
                                <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                                    我們正在整合全台治安數據，為獨旅者提供視覺化的安全庇護所地圖。
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ==============================================
             * 區塊 4: 水平滑動主題分類 (Scrollable Pills)
             * ============================================== */}
            <section className="py-24 bg-[#FBFBFB]">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center mb-10 space-y-3">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900">
                            探索旅行主題
                        </h2>
                        <p className="text-neutral-500 font-medium">
                            尋找專屬於你的旅行靈感
                        </p>
                    </div>

                    {/* 使用 overflow-x-auto 和 snap 達成手機橫向滑動效果 */}
                    <div className="flex overflow-x-auto gap-4 pb-6 no-scrollbar snap-x snap-mandatory px-4 -mx-4 md:px-0 md:mx-0">
                        {[
                            { name: "熱門推薦", count: 120, icon: "🔥" },
                            { name: "海島度假", count: 85, icon: "🏝️" },
                            { name: "歷史文化", count: 95, icon: "🏛️" },
                            { name: "自然探索", count: 150, icon: "🏔️" },
                            { name: "城市漫遊", count: 210, icon: "🏙️" },
                            { name: "美食之旅", count: 320, icon: "🍜" },
                        ].map((category, idx) => (
                            <div
                                key={idx}
                                className="snap-center flex-shrink-0 flex items-center gap-4 px-6 py-4 bg-white border border-neutral-100 rounded-full hover:border-neutral-300 hover:shadow-md hover:shadow-neutral-900/5 transition-all duration-300 cursor-pointer group"
                            >
                                {/* 左側 Icon 圓框 */}
                                <div className="size-10 bg-neutral-100 rounded-full flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-neutral-200 transition-all">
                                    {category.icon}
                                </div>
                                {/* 右側文字資訊 */}
                                <div>
                                    <h3 className="text-sm font-bold text-neutral-800">{category.name}</h3>
                                    <p className="text-[10px] font-bold text-neutral-500 mt-0.5">{category.count} 個目的地</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==============================================
             * 區塊 5: 右下角 AI 浮動聊天室 Widget (FAB)
             * ============================================== */}
            <div className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-50">
                {/* 根據 isAiOpen 控制顯示按鈕還是對話框 */}
                {!isAiOpen ? (
                    // 收合狀態：圓形按鈕
                    <button
                        onClick={() => setIsAiOpen(true)}
                        className="bg-neutral-900 text-white p-3.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.2)] border border-neutral-800 hover:border-neutral-600 hover:scale-105 hover:bg-neutral-800 transition-all duration-300 flex items-center gap-3 md:px-6 group"
                    >
                        <Sparkles className="size-5 text-white group-hover:rotate-12 transition-transform" />
                        <span className="hidden md:inline text-sm font-bold">
                            AI 專屬顧問
                        </span>
                    </button>
                ) : (
                    // 展開狀態：對話方塊
                    <div className="bg-white border border-neutral-200 shadow-2xl shadow-neutral-900/10 w-[calc(100vw-3rem)] md:w-96 rounded-[1.5rem] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        
                        {/* 聊天室標頭 (Header) */}
                        <div className="bg-neutral-900 text-white p-4 flex items-center justify-between border-b border-neutral-700">
                            <div className="flex items-center gap-2">
                                <Sparkles className="size-4 text-white" />
                                <span className="text-sm font-bold">Solo Concierge AI</span>
                            </div>
                            <button onClick={() => setIsAiOpen(false)} className="text-neutral-400 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full">
                                <X className="size-4" />
                            </button>
                        </div>
                        
                        {/* 聊天室內容區 (Body) */}
                        <div className="p-4 h-64 overflow-y-auto space-y-4 bg-neutral-50">
                            {/* AI 預設歡迎訊息 */}
                            <div className="flex gap-2">
                                <div className="size-6 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 shadow-sm shadow-neutral-900/10">
                                    <Sparkles className="size-3 text-white" />
                                </div>
                                <div className="bg-white p-3 border border-neutral-200 shadow-sm text-neutral-700 text-sm font-medium leading-relaxed rounded-2xl rounded-tl-none">
                                    你好！我是你的專屬行程助理。你可以直接在首頁輸入你想去的台灣「地點」與「天數」，我會立刻幫你規劃專屬行程哦！
                                </div>
                            </div>
                        </div>
                        
                        {/* 聊天室輸入框 (Input) */}
                        <div className="p-3 bg-white border-t border-neutral-100 flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="輸入訊息..."
                                className="flex-1 text-sm bg-[#F8F8F8] border border-neutral-200 px-4 py-3 rounded-full focus:outline-none focus:border-neutral-900 focus:bg-white transition-colors"
                            />
                            <button className="bg-neutral-900 text-white p-3 rounded-full hover:bg-neutral-700 hover:shadow-md hover:shadow-neutral-900/10 transition-all">
                                <MessageSquare className="size-4" />
                            </button>
                        </div>
                        
                    </div>
                )}
            </div>
            
        </div>
    );
}