"use client";

// 載入 React 狀態鉤子與導頁組件
import { useState } from "react";
import { Link } from "./components/Link";

// 載入 UI 圖示元件 (Lucide Icons)
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
} from "lucide-react";

// 匯入目的地範例資料集
import { destinations } from "./data/destinations";

export default function Home() {
    /* ==========================================
     * 1. 狀態管理 (State Management)
     * ========================================== */
    // selectedTag: 當前使用者選取的獨旅標籤 (若為 null 則代表未篩選，顯示預設推薦)
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    // isMapMode: 景點探索區塊的顯示模式切換 (false: 列表模式, true: 地圖模式)
    const [isMapMode, setIsMapMode] = useState<boolean>(false);

    // isAiOpen: 右下角 AI 獨旅禮賓顧問對話視窗的開啟/關閉狀態
    const [isAiOpen, setIsAiOpen] = useState<boolean>(false);

    /* ==========================================
     * 2. 常數與靜態資料 (Constants & Mock Data)
     * ========================================== */
    // 獨旅專屬快速篩選標籤
    const soloTags = [
        "安全首選",
        "交通便利",
        "社交青旅",
        "慢活探索",
        "自然療癒",
    ];

    // 熱門搜尋關鍵字快捷鍵
    const hotKeywords = ["京都", "冰島藍湖", "清邁", "巴塞隆納"];

    // 即時情報跑馬燈資訊
    const dynamicNews = [
        "🔥 本週熱門：獨旅女性推薦安全目的地 Top 10 已更新",
        "✨ 季節限定：日本東北秘境紅葉單人行程開放預約",
        "💡 獨旅貼士：歐洲火車通行證最新優惠與防偷指南",
    ];

    /* ==========================================
     * 3. 資料處理邏輯 (Data Processing)
     * ========================================== */
    // 根據選取的標籤進行目的地過濾；若未選取標籤，預設僅展示前 6 筆精選資料
    const filteredDestinations = selectedTag
        ? destinations.filter((dest) => dest.tags?.includes(selectedTag))
        : destinations.slice(0, 6);

    return (
        <div className="flex flex-col bg-white text-neutral-900 relative">
            {/* ==========================================
             * 區塊 1: Hero Section & 全域搜尋與標籤篩選
             * ========================================== */}
            <section className="relative min-h-[90vh] flex items-center justify-center bg-[#F8F8F8] pt-20 pb-16">
                <div className="relative z-10 container mx-auto px-6 text-center">
                    {/* 副標題 / 品牌定位 */}
                    <span className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-6 block font-medium">
                        Luxury Solo Travel Experience
                    </span>

                    {/* 主標題與簡介 */}
                    <h1 className="mb-8 max-w-5xl mx-auto text-6xl md:text-8xl font-extralight tracking-tight text-neutral-900">
                        探索世界之美
                    </h1>
                    <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto text-neutral-500 font-light tracking-wide leading-relaxed">
                        精選全球頂級與獨旅友善目的地，為您規劃一場洗滌心靈的專屬旅程。
                    </p>

                    {/* 搜尋輸入框卡片 */}
                    <div className="max-w-4xl mx-auto bg-white shadow-[0_10px_50px_rgba(0,0,0,0.04)] border border-neutral-100 p-2 rounded-sm">
                        <div className="flex flex-col md:flex-row gap-2">
                            {/* 關鍵字搜尋 */}
                            <div className="flex-1 relative flex items-center px-4">
                                <Search className="size-4 text-neutral-400 mr-2 flex-shrink-0" />
                                <input
                                    placeholder="輸入關鍵字模糊搜尋（如：秘境、咖啡廳、極光...）"
                                    className="w-full h-14 text-sm tracking-wide bg-transparent focus:outline-none placeholder:text-neutral-300"
                                />
                            </div>

                            {/* 分隔線 (桌機版顯示) */}
                            <div className="w-px bg-neutral-100 hidden md:block my-3"></div>

                            {/* 目的地地區搜尋 */}
                            <div className="flex-1 relative flex items-center px-4">
                                <MapPin className="size-4 text-neutral-400 mr-2 flex-shrink-0" />
                                <input
                                    placeholder="國家或地區"
                                    className="w-full h-14 text-sm tracking-wide bg-transparent focus:outline-none placeholder:text-neutral-300"
                                />
                            </div>

                            {/* 搜尋按鈕 */}
                            <Link to="/destinations">
                                <button className="h-14 w-full md:w-auto px-12 bg-neutral-900 text-white text-sm tracking-widest uppercase hover:bg-neutral-800 transition-all duration-300 rounded-sm">
                                    搜尋
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* 獨旅專屬標籤篩選 & 熱門關鍵字區塊 */}
                    <div className="max-w-4xl mx-auto mt-6 text-left px-2 space-y-4">
                        {/* 標籤按鈕列：可點擊切換篩選 */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-neutral-400 flex items-center gap-1 mr-2 tracking-wider">
                                <Filter className="size-3" /> 專屬標籤：
                            </span>
                            {soloTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() =>
                                        setSelectedTag(
                                            selectedTag === tag ? null : tag,
                                        )
                                    }
                                    className={`px-3 py-1.5 tracking-wider border rounded-full transition-all duration-300 ${
                                        selectedTag === tag
                                            ? "border-neutral-900 bg-neutral-900 text-white"
                                            : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
                                    }`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>

                        {/* 熱門關鍵字列表 */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="text-neutral-400 tracking-wider">
                                熱門搜尋：
                            </span>
                            {hotKeywords.map((keyword) => (
                                <button
                                    key={keyword}
                                    className="text-neutral-600 hover:text-neutral-900 underline underline-offset-4 decoration-neutral-200 hover:decoration-neutral-900 transition-all"
                                >
                                    {keyword}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ==========================================
             * 區塊 2: 即時情報快訊跑馬燈 (Live News Bar)
             * ========================================== */}
            <div className="bg-neutral-900 text-white py-3 overflow-hidden border-b border-neutral-800">
                <div className="container mx-auto px-6 flex items-center gap-4 text-xs tracking-wider">
                    {/* Live 標籤 */}
                    <span className="bg-white text-neutral-900 px-2 py-0.5 uppercase font-medium text-[10px] tracking-widest flex items-center gap-1 flex-shrink-0">
                        <Sparkles className="size-3 text-amber-500" /> Live
                    </span>
                    {/* 滾動動畫資訊內容 */}
                    <div className="flex gap-12 animate-marquee whitespace-nowrap overflow-x-auto no-scrollbar">
                        {dynamicNews.map((news, i) => (
                            <span key={i} className="font-light opacity-90">
                                {news}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ==========================================
             * 區塊 3: 推薦牆 X 精選目的地列表
             * ========================================== */}
            <section className="py-32 bg-[#FBFBFB]">
                <div className="container mx-auto px-6">
                    {/* 區塊標題與更多按鈕 */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-neutral-400 font-medium">
                                <TrendingUp className="size-4 text-neutral-900" />{" "}
                                Featured Recommendation Wall
                            </div>
                            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-neutral-900">
                                {selectedTag
                                    ? `專屬推薦：#${selectedTag}`
                                    : "獨旅精選推薦牆"}
                            </h2>
                            <div className="h-0.5 w-12 bg-neutral-900"></div>
                            <p className="text-neutral-500 font-light tracking-wide text-sm italic">
                                結合全球安全係數、獨旅友善度及頂級奢華體驗的專屬目的地評選
                            </p>
                        </div>
                        <Link to="/destinations">
                            <button className="group flex items-center gap-2 px-8 py-3 text-xs tracking-[0.2em] uppercase border border-neutral-200 hover:border-neutral-900 transition-all bg-white">
                                查看全部{" "}
                                <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                    </div>

                    {/* 目的地卡片網格 (Filtered Destination Grid) */}
                    {filteredDestinations.length === 0 ? (
                        /* 無符合條件資料時顯示 */
                        <div className="text-center py-12 text-neutral-400 font-light text-sm">
                            沒有找到符合 #{selectedTag} 的地點，試試其他標籤吧！
                        </div>
                    ) : (
                        /* 目的地列表卡片 */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                            {filteredDestinations.map((destination) => (
                                <Link
                                    key={destination.id}
                                    to={`/destinations/${destination.id}`}
                                >
                                    <div className="group cursor-pointer flex flex-col h-full justify-between">
                                        <div>
                                            {/* 目的地影像圖片與浮動標籤 */}
                                            <div className="relative h-[420px] overflow-hidden mb-6 bg-neutral-100 rounded-sm">
                                                <img
                                                    src={destination.image}
                                                    alt={destination.name}
                                                    className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
                                                />
                                                {/* 左上角類別標籤 */}
                                                <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-3 py-1.5 shadow-sm border border-neutral-100">
                                                    <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-neutral-800">
                                                        {destination.category}
                                                    </span>
                                                </div>
                                                {/* 右上角安全指數 */}
                                                <div className="absolute top-6 right-6 bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 text-white flex items-center gap-1 rounded-sm text-xs font-light">
                                                    <Star className="size-3 text-amber-400 fill-amber-400" />
                                                    <span>
                                                        安全{" "}
                                                        {destination.safetyRating || "9.5"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 景點名稱與簡述 */}
                                            <div className="space-y-3 px-1">
                                                <div className="flex justify-between items-baseline">
                                                    <h3 className="text-2xl font-light tracking-wide text-neutral-900">
                                                        {destination.name}
                                                    </h3>
                                                    <span className="text-xs text-neutral-400 tracking-wider font-light">
                                                        {destination.country}
                                                    </span>
                                                </div>
                                                <p className="text-neutral-500 text-sm font-light leading-relaxed line-clamp-2">
                                                    {destination.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 底部價格與進入詳情按鈕 */}
                                        <div className="flex items-center justify-between pt-6 mt-6 border-t border-neutral-100 px-1">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-neutral-400 tracking-widest uppercase mb-0.5">
                                                    Starting from
                                                </span>
                                                <span className="text-lg font-light tracking-tight text-neutral-900">
                                                    NT${" "}{destination.price.toLocaleString()}
                                                </span>
                                            </div>
                                            <span className="text-[10px] tracking-widest uppercase font-medium border-b border-neutral-900 pb-1 group-hover:pr-2 transition-all">
                                                Explore Detail
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ==========================================
             * 區塊 4: 周邊景點與地圖/列表模式切換區塊
             * ========================================== */}
            <section className="py-32 bg-white border-t border-neutral-100">
                <div className="container mx-auto px-6">
                    {/* 標題與切換按鈕 */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-neutral-900">
                                周邊景點與地圖探索
                            </h2>
                            <div className="h-0.5 w-12 bg-neutral-900"></div>
                            <p className="text-neutral-500 font-light tracking-wide text-sm">
                                開啟地圖模式，快速定位身邊的獨旅友善地標與私房景點
                            </p>
                        </div>

                        {/* 列表/地圖模式開關 */}
                        <div className="flex border border-neutral-200 p-1 rounded-sm bg-neutral-50 self-start md:self-auto">
                            <button
                                onClick={() => setIsMapMode(false)}
                                className={`px-6 py-2 text-xs tracking-[0.15em] uppercase font-medium transition-all ${!isMapMode ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-900"}`}
                            >
                                列表模式
                            </button>
                            <button
                                onClick={() => setIsMapMode(true)}
                                className={`px-6 py-2 text-xs tracking-[0.15em] uppercase font-medium transition-all flex items-center gap-2 ${isMapMode ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-900"}`}
                            >
                                <MapIcon className="size-3.5" /> 地圖模式
                            </button>
                        </div>
                    </div>

                    {/* 根據 isMapMode 狀態渲染 列表 或 地圖 UI */}
                    {!isMapMode ? (
                        /* 模式 A：列表模式 (定位提示卡片) */
                        <div className="bg-neutral-50 border border-neutral-100 p-8 md:p-12 text-center rounded-sm">
                            <div className="max-w-md mx-auto space-y-6 py-12">
                                <Compass className="size-10 mx-auto text-neutral-300" />
                                <h3 className="text-lg font-light tracking-wide text-neutral-800">
                                    探索您周邊的獨旅友善地標
                                </h3>
                                <p className="text-sm text-neutral-400 font-light leading-relaxed">
                                    系統偵測到您目前的位置，點擊下方按鈕或切換至地圖模式，即可解鎖方圓 5 公里內最受獨旅者歡迎的極簡咖啡廳、安全文創街區與英語友善背包客棧。
                                </p>
                                <button className="px-8 py-3 bg-neutral-900 text-white text-xs tracking-widest uppercase hover:bg-neutral-800 transition-all">
                                    允許定位探索
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* 模式 B：地圖模式 (模擬互動地圖 UI) */
                        <div className="relative h-[550px] bg-neutral-100 border border-neutral-200 rounded-sm overflow-hidden flex items-center justify-center">
                            {/* 地圖網格背景效果 */}
                            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px] bg-white"></div>

                            {/* 模擬地圖地標點 A */}
                            <div className="absolute top-1/4 left-1/3 group cursor-pointer">
                                <div className="bg-neutral-900 text-white text-[10px] tracking-wider px-3 py-1.5 rounded-sm shadow-xl flex items-center gap-1.5 transition-transform group-hover:-translate-y-1">
                                    <MapPin className="size-3 text-amber-400 fill-amber-400" />{" "}
                                    獨旅友善：藝創特區
                                </div>
                                <div className="w-2 h-2 bg-neutral-900 mx-auto rotate-45 -mt-1 shadow-lg"></div>
                            </div>

                            {/* 模擬地圖地標點 B */}
                            <div className="absolute bottom-1/3 right-1/4 group cursor-pointer">
                                <div className="bg-neutral-900 text-white text-[10px] tracking-wider px-3 py-1.5 rounded-sm shadow-xl flex items-center gap-1.5 transition-transform group-hover:-translate-y-1">
                                    <MapPin className="size-3 text-amber-400 fill-amber-400" />{" "}
                                    24h 安全青年聚落
                                </div>
                                <div className="w-2 h-2 bg-neutral-900 mx-auto rotate-45 -mt-1 shadow-lg"></div>
                            </div>

                            {/* 地圖左下角資訊面板 */}
                            <div className="relative z-10 bg-white/90 backdrop-blur-md p-6 max-w-xs border border-neutral-200 shadow-xl absolute bottom-6 left-6 space-y-3">
                                <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-neutral-400 block">
                                    Interactive Map
                                </span>
                                <h4 className="text-sm font-medium tracking-wide">
                                    已為您篩選：台北市
                                </h4>
                                <p className="text-xs text-neutral-500 font-light leading-relaxed">
                                    地圖已自動標註設有單人友善座位、24小時安保及女性專屬樓層的地標。
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ==========================================
             * 區塊 5: 旅行方式分類 (Categories)
             * ========================================== */}
            <section className="py-32 bg-[#FBFBFB]">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20 space-y-4">
                        <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-neutral-900">
                            旅行方式
                        </h2>
                        <p className="text-neutral-400 font-light tracking-[0.1em]">
                            Find your travel inspiration
                        </p>
                    </div>

                    {/* 四大旅行類別 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { name: "文化探索", count: 120 },
                            { name: "海島度假", count: 85 },
                            { name: "戶外探險", count: 95 },
                            { name: "美食文化", count: 150 },
                        ].map((category, idx) => (
                            <div
                                key={idx}
                                className="bg-white p-10 text-center border border-transparent hover:border-neutral-200 hover:shadow-xl hover:shadow-neutral-200/20 transition-all duration-500 cursor-pointer group"
                            >
                                <div className="w-16 h-16 border border-neutral-100 mx-auto mb-8 flex items-center justify-center text-xl font-extralight group-hover:bg-neutral-900 group-hover:text-white transition-all duration-500">
                                    {category.name[0]}
                                </div>
                                <h3 className="mb-2 text-lg font-light tracking-wide text-neutral-800">
                                    {category.name}
                                </h3>
                                <p className="text-neutral-400 text-[10px] tracking-widest uppercase font-medium">
                                    {category.count} Destinations
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==========================================
             * 區塊 6: AI 獨旅禮賓顧問 Floating Widget
             * ========================================== */}
            <div className="fixed bottom-8 right-8 z-50">
                {!isAiOpen ? (
                    <button
                        onClick={() => setIsAiOpen(true)}
                        className="bg-neutral-900 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3 px-6 group"
                    >
                        <Sparkles className="size-5 text-amber-400 group-hover:rotate-12 transition-transform" />
                        <span className="text-xs tracking-widest uppercase font-light">
                            AI 獨旅顧問
                        </span>
                    </button>
                ) : (
                    <div className="bg-white border border-neutral-200 shadow-2xl w-80 md:w-96 rounded-sm overflow-hidden flex flex-col">
                        {/* 彈窗 Header */}
                        <div className="bg-neutral-900 text-white p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="size-4 text-amber-400" />
                                <span className="text-xs tracking-widest uppercase font-medium">
                                    Solo Concierge AI
                                </span>
                            </div>
                            <button
                                onClick={() => setIsAiOpen(false)}
                                className="text-neutral-400 hover:text-white transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* 對話內容區塊 */}
                        <div className="p-4 h-64 overflow-y-auto space-y-3 bg-neutral-50 text-xs">
                            <div className="bg-white p-3 border border-neutral-100 shadow-sm text-neutral-600 leading-relaxed">
                                您好！我是您的專屬獨旅禮賓顧問。請問您正在規劃獨自前往哪個國家，或是需要安全性評估？
                            </div>
                        </div>

                        {/* 對話輸入框 */}
                        <div className="p-3 bg-white border-t border-neutral-100 flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="詢問關於獨旅安全性、行程安排..."
                                className="flex-1 text-xs bg-neutral-50 border border-neutral-200 px-3 py-2 focus:outline-none focus:border-neutral-900"
                            />
                            <button className="bg-neutral-900 text-white p-2 hover:bg-neutral-800 transition-colors">
                                <MessageSquare className="size-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}