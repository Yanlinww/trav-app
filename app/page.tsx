"use client";

import { useState } from "react";
import { Link } from "./components/Link";
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
    MessageSquare, // ⬇️ 新增 AI 助手需要的圖標
    X,
} from "lucide-react";
import { destinations } from "./data/destinations";

export default function Home() {
    // 狀態管理：用於熱門標籤與地圖/列表模式切換
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [isMapMode, setIsMapMode] = useState<boolean>(false);
    
    // ⬇️ 新增狀態：控制 AI 視窗開啟/關閉
    const [isAiOpen, setIsAiOpen] = useState<boolean>(false);

    const soloTags = [
        "安全首選",
        "交通便利",
        "社交青旅",
        "慢活探索",
        "自然療癒",
    ];
    const hotKeywords = ["京都", "冰島藍湖", "清邁", "巴塞隆納"];
    const dynamicNews = [
        "🔥 本週熱門：獨旅女性推薦安全目的地 Top 10 已更新",
        "✨ 季節限定：日本東北秘境紅葉單人行程開放預約",
        "💡 獨旅貼士：歐洲火車通行證最新優惠與防偷指南",
    ];

    const filteredDestinations = selectedTag
        ? destinations.filter((dest) => dest.tags?.includes(selectedTag))
        : destinations.slice(0, 6);

    return (
        <div className="flex flex-col bg-white text-neutral-900 relative">
            {/* Hero Section & 全域搜尋與篩選 */}
            <section className="relative min-h-[90vh] flex items-center justify-center bg-[#F8F8F8] pt-20 pb-16">
                <div className="relative z-10 container mx-auto px-6 text-center">
                    <span className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-6 block font-medium">
                        Luxury Solo Travel Experience
                    </span>
                    <h1 className="mb-8 max-w-5xl mx-auto text-6xl md:text-8xl font-extralight tracking-tight text-neutral-900">
                        探索世界之美
                    </h1>
                    <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto text-neutral-500 font-light tracking-wide leading-relaxed">
                        精選全球頂級與獨旅友善目的地，為您規劃一場洗滌心靈的專屬旅程。
                    </p>

                    {/* 全域搜尋框 */}
                    <div className="max-w-4xl mx-auto bg-white shadow-[0_10px_50px_rgba(0,0,0,0.04)] border border-neutral-100 p-2 rounded-sm">
                        <div className="flex flex-col md:flex-row gap-2">
                            <div className="flex-1 relative flex items-center px-4">
                                <Search className="size-4 text-neutral-400 mr-2 flex-shrink-0" />
                                <input
                                    placeholder="輸入關鍵字模糊搜尋（如：秘境、咖啡廳、極光...）"
                                    className="w-full h-14 text-sm tracking-wide bg-transparent focus:outline-none placeholder:text-neutral-300"
                                />
                            </div>
                            <div className="w-px bg-neutral-100 hidden md:block my-3"></div>
                            <div className="flex-1 relative flex items-center px-4">
                                <MapPin className="size-4 text-neutral-400 mr-2 flex-shrink-0" />
                                <input
                                    placeholder="國家或地區"
                                    className="w-full h-14 text-sm tracking-wide bg-transparent focus:outline-none placeholder:text-neutral-300"
                                />
                            </div>
                            <Link to="/destinations">
                                <button className="h-14 w-full md:w-auto px-12 bg-neutral-900 text-white text-sm tracking-widest uppercase hover:bg-neutral-800 transition-all duration-300 rounded-sm">
                                    搜尋
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* 獨旅專屬標籤篩選 & 熱門關鍵字 */}
                    <div className="max-w-4xl mx-auto mt-6 text-left px-2 space-y-4">
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

            {/* 即時情報快訊 Bar */}
            <div className="bg-neutral-900 text-white py-3 overflow-hidden border-b border-neutral-800">
                <div className="container mx-auto px-6 flex items-center gap-4 text-xs tracking-wider">
                    <span className="bg-white text-neutral-900 px-2 py-0.5 uppercase font-medium text-[10px] tracking-widest flex items-center gap-1 flex-shrink-0">
                        <Sparkles className="size-3 text-amber-500" /> Live
                    </span>
                    <div className="flex gap-12 animate-marquee whitespace-nowrap overflow-x-auto no-scrollbar">
                        {dynamicNews.map((news, i) => (
                            <span key={i} className="font-light opacity-90">
                                {news}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 推薦牆 X 精選行程 */}
            <section className="py-32 bg-[#FBFBFB]">
                <div className="container mx-auto px-6">
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

                    {/* 融合後的 Grid 卡片 */}
                    {filteredDestinations.length === 0 ? (
                        <div className="text-center py-12 text-neutral-400 font-light text-sm">
                            沒有找到符合 #{selectedTag}{" "}
                            試試其他標籤吧！
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                            {filteredDestinations.map((destination) => (
                                <Link
                                    key={destination.id}
                                    to={`/destinations/${destination.id}`}
                                >
                                    <div className="group cursor-pointer flex flex-col h-full justify-between">
                                        <div>
                                            <div className="relative h-[420px] overflow-hidden mb-6 bg-neutral-100 rounded-sm">
                                                <img
                                                    src={destination.image}
                                                    alt={destination.name}
                                                    className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
                                                />
                                                <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-3 py-1.5 shadow-sm border border-neutral-100">
                                                    <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-neutral-800">
                                                        {destination.category}
                                                    </span>
                                                </div>
                                                <div className="absolute top-6 right-6 bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 text-white flex items-center gap-1 rounded-sm text-xs font-light">
                                                    <Star className="size-3 text-amber-400 fill-amber-400" />
                                                    <span>
                                                        安全{" "}
                                                        {destination.safetyRating || "9.5"}
                                                    </span>
                                                </div>
                                            </div>

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

            {/* 3. 景點地圖模式區塊 */}
            <section className="py-32 bg-white border-t border-neutral-100">
                <div className="container mx-auto px-6">
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

                    {!isMapMode ? (
                        <div className="bg-neutral-50 border border-neutral-100 p-8 md:p-12 text-center rounded-sm">
                            <div className="max-w-md mx-auto space-y-6 py-12">
                                <Compass className="size-10 mx-auto text-neutral-300" />
                                <h3 className="text-lg font-light tracking-wide text-neutral-885">
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
                        <div className="relative h-[550px] bg-neutral-100 border border-neutral-200 rounded-sm overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px] bg-white"></div>

                            <div className="absolute top-1/4 left-1/3 group cursor-pointer">
                                <div className="bg-neutral-900 text-white text-[10px] tracking-wider px-3 py-1.5 rounded-sm shadow-xl flex items-center gap-1.5 transition-transform group-hover:-translate-y-1">
                                    <MapPin className="size-3 text-amber-400 fill-amber-400" />{" "}
                                    獨旅友善：藝創特區
                                </div>
                                <div className="w-2 h-2 bg-neutral-900 mx-auto rotate-45 -mt-1 shadow-lg"></div>
                            </div>

                            <div className="absolute bottom-1/3 right-1/4 group cursor-pointer">
                                <div className="bg-neutral-900 text-white text-[10px] tracking-wider px-3 py-1.5 rounded-sm shadow-xl flex items-center gap-1.5 transition-transform group-hover:-translate-y-1">
                                    <MapPin className="size-3 text-amber-400 fill-amber-400" />{" "}
                                    24h 安全青年聚落
                                </div>
                                <div className="w-2 h-2 bg-neutral-900 mx-auto rotate-45 -mt-1 shadow-lg"></div>
                            </div>

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

            {/* Categories (旅行方式) */}
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

            {/* CTA Section */}
            <section className="py-40 bg-neutral-900 text-white overflow-hidden relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] text-[20vw] font-bold whitespace-nowrap pointer-events-none">
                    VOYAGE VOYAGE
                </div>

                <div className="container mx-auto px-6 text-center relative z-10">
                    <h2 className="mb-8 text-5xl md:text-7xl font-extralight tracking-tighter italic">
                        開始您的旅程
                    </h2>
                    <p className="text-lg mb-16 max-w-2xl mx-auto text-neutral-400 font-light tracking-[0.1em] leading-relaxed">
                        世界上最美麗的風景，都值得您親身體驗。讓我們為您打造下一個難忘的回憶。
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <Link to="/destinations">
                            <button className="min-w-[200px] px-10 py-5 bg-white text-neutral-900 text-xs tracking-[0.3em] uppercase font-semibold hover:bg-neutral-100 transition-all">
                                探索景點
                            </button>
                        </Link>
                        <Link to="/planner">
                            <button className="min-w-[200px] px-10 py-5 border border-neutral-700 text-white text-xs tracking-[0.3em] uppercase font-semibold hover:bg-white hover:text-neutral-900 hover:border-white transition-all">
                                規劃行程
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ⬇️ ==================== 固定右下角 AI 助手區塊 ==================== */}
            <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
                
                {/* AI 彈出對話小視窗 */}
                {isAiOpen && (
                    <div className="w-80 md:w-96 h-[450px] bg-white/90 backdrop-blur-xl border border-neutral-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
                        {/* 視窗頂部 */}
                        <div className="bg-neutral-900 text-white px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="size-4 text-amber-400 fill-amber-400" />
                                <span className="text-xs tracking-[0.2em] uppercase font-light">Solo Concierge AI</span>
                            </div>
                            <button 
                                onClick={() => setIsAiOpen(false)} 
                                className="text-neutral-400 hover:text-white transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        
                        {/* 對話內容區 (示意) */}
                        <div className="flex-1 p-5 overflow-y-auto text-sm font-light space-y-4">
                            <div className="bg-neutral-50 p-3 rounded-sm text-neutral-600 leading-relaxed border border-neutral-100">
                                您好！我是您的獨旅專屬顧問。正在尋找安全、適合獨自放鬆、或是交通方便的頂級奢華行程嗎？隨時告訴我您的想法。
                            </div>
                        </div>

                        {/* 輸入欄位 */}
                        <div className="p-3 border-t border-neutral-100 bg-white flex gap-2">
                            <input 
                                type="text" 
                                placeholder="問問 AI...（例如：推薦適合女性獨旅的國家）" 
                                className="w-full h-10 px-3 bg-neutral-50 text-xs border border-neutral-100 focus:outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-300 font-light"
                            />
                            <button className="h-10 px-4 bg-neutral-900 text-white text-[10px] tracking-widest uppercase hover:bg-neutral-800 transition-colors">
                                發送
                            </button>
                        </div>
                    </div>
                )}

                {/* 圓形固定懸浮按鈕 */}
                <button
                    onClick={() => setIsAiOpen(!isAiOpen)}
                    className="w-14 h-14 bg-neutral-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-neutral-800 hover:scale-105 transition-all duration-300 border border-neutral-800 group relative"
                    aria-label="AI Travel Assistant"
                >
                    {isAiOpen ? (
                        <X className="size-5 transition-transform duration-300 rotate-90" />
                    ) : (
                        <>
                            <MessageSquare className="size-5" />
                            {/* 小提示紅點（表示有 Live 線上感） */}
                            <span className="absolute top-0 right-0 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                        </>
                    )}
                </button>
            </div>
            {/* ⬆️ ============================================================= */}
        </div>
    );
}