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
    MessageSquare,
    X,
    CalendarDays
} from "lucide-react";
import { destinations } from "./data/destinations";

export default function Home() {
    /* ==========================================
     * 1. 狀態管理 (State Management)
     * ========================================== */
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [isMapMode, setIsMapMode] = useState<boolean>(false);
    const [isAiOpen, setIsAiOpen] = useState<boolean>(false);

    /* ==========================================
     * 2. 常數與假資料 (Constants)
     * ========================================== */
    const soloTags = ["一人旅", "安全", "預算友善", "深度體驗"];
    const hotKeywords = ["東京", "京都", "北海道", "首爾"];

    /* ==========================================
     * 3. 資料處理 (Data Processing)
     * ========================================== */
    const filteredDestinations = selectedTag
        ? destinations.filter((dest) => dest.tags?.includes(selectedTag))
        : destinations.slice(0, 6);

    return (
        <div className="flex flex-col bg-white text-neutral-900 relative">
            
            {/* ==========================================
             * 區塊 1: 沉浸式主視覺 & 膠囊搜尋 (極簡黑白)
             * ========================================== */}
            <section className="relative min-h-[85vh] flex items-center justify-center bg-[#F8F8F8] pt-24 pb-16">
                {/* 裝飾背景 */}
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
                    <span className="text-xs tracking-[0.3em] uppercase text-neutral-900 mb-6 block font-bold">
                        Luxury Solo Travel Experience
                    </span>
                    <h1 className="mb-8 max-w-5xl mx-auto text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900">
                        探索你的下一個<span className="text-neutral-500 italic">完美旅程</span>
                    </h1>
                    <p className="text-base md:text-lg mb-12 max-w-2xl mx-auto text-neutral-500 font-medium tracking-wide leading-relaxed">
                        不再需要妥協。從機票、住宿到行程安排，一站式打造專屬於你的安全、質感旅行體驗。
                    </p>

                    {/* 旅遊 APP 膠囊搜尋列 */}
                    <div className="mx-auto max-w-4xl bg-white rounded-full shadow-xl shadow-slate-200/60 border border-neutral-100 p-2 flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-neutral-100">
                        <div className="flex-1 px-6 py-3 w-full hover:bg-neutral-50 rounded-full transition cursor-text text-left">
                            <div className="text-xs font-bold text-neutral-800 tracking-wider">目的地</div>
                            <input placeholder="想去哪裡探索？" className="bg-transparent outline-none text-sm w-full text-neutral-500 mt-1 placeholder:text-neutral-300" />
                        </div>
                        <div className="flex-1 px-6 py-3 w-full hover:bg-neutral-50 rounded-full transition cursor-text text-left">
                            <div className="text-xs font-bold text-neutral-800 tracking-wider">出發日期</div>
                            <input placeholder="新增日期" className="bg-transparent outline-none text-sm w-full text-neutral-500 mt-1 placeholder:text-neutral-300" />
                        </div>
                        <div className="px-2 w-full md:w-auto mt-2 md:mt-0 pb-2 md:pb-0">
                            <Link to="/destinations">
                                <button className="w-full md:w-auto bg-neutral-900 text-white px-8 py-4 rounded-full font-bold shadow-md shadow-neutral-900/10 hover:bg-neutral-700 transition-all flex items-center justify-center gap-2">
                                    <Search className="size-4" /> 搜尋
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* 熱門標籤區 */}
                    <div className="max-w-4xl mx-auto mt-8 text-left px-2 space-y-4">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                            <span className="text-neutral-400 flex items-center gap-1 mr-2 tracking-wider font-bold">
                                <Filter className="size-3" /> 獨旅友善標籤
                            </span>
                            {soloTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                    className={`px-4 py-2 tracking-wider border rounded-full transition-all duration-300 font-medium ${
                                        selectedTag === tag
                                            ? "border-neutral-900 bg-neutral-900 text-white shadow-md shadow-neutral-900/10"
                                            : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 hover:shadow-sm hover:bg-neutral-50"
                                    }`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs">
                            <span className="text-neutral-400 tracking-wider font-bold">熱門搜尋：</span>
                            {hotKeywords.map((keyword) => (
                                <button
                                    key={keyword}
                                    className="text-neutral-500 hover:text-neutral-900 transition-colors font-medium"
                                >
                                    {keyword}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ==========================================
             * 區塊 2: 精選推薦牆 (大圓角 App 卡片風格)
             * ========================================== */}
            <section className="py-24 bg-[#FBFBFB]">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-neutral-900 font-bold">
                                <TrendingUp className="size-4" /> Featured Destinations
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900">
                                {selectedTag ? `專屬推薦 #${selectedTag}` : "嚴選獨旅目的地"}
                            </h2>
                            <p className="text-neutral-500 font-medium tracking-wide text-sm">
                                根據百萬獨旅者的真實數據，為你精選最安全、最舒適的行程。
                            </p>
                        </div>
                        <Link to="/destinations">
                            <button className="group flex items-center gap-2 px-6 py-2.5 text-xs font-bold tracking-[0.1em] uppercase border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 hover:text-neutral-900 transition-all bg-white rounded-full shadow-sm">
                                探索更多 <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                    </div>

                    {filteredDestinations.length === 0 ? (
                        <div className="text-center py-20 text-neutral-400 font-medium text-sm bg-white rounded-3xl border border-dashed border-neutral-200">
                            目前沒有符合 #{selectedTag} 的推薦行程
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {filteredDestinations.map((destination) => (
                                <Link key={destination.id} to={`/destinations/${destination.id}`}>
                                    <div className="group cursor-pointer flex flex-col h-full bg-white rounded-3xl border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)] hover:border-neutral-200 transition-all duration-300 p-3">
                                        
                                        {/* 圖片容器 (3XL 大圓角) */}
                                        <div className="relative h-[320px] overflow-hidden mb-4 bg-neutral-100 rounded-[1.25rem]">
                                            <img
                                                src={destination.image}
                                                alt={destination.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                            {/* 左上角標籤 */}
                                            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-sm rounded-full">
                                                <span className="text-[10px] tracking-[0.15em] font-bold text-neutral-900">
                                                    {destination.category}
                                                </span>
                                            </div>
                                            {/* 右上角毛玻璃評分 */}
                                            <div className="absolute top-4 right-4 bg-neutral-900/75 backdrop-blur-md px-3 py-1.5 text-white flex items-center gap-1.5 rounded-full shadow-sm">
                                                <Star className="size-3 text-amber-400 fill-amber-400" />
                                                <span className="text-[10px] font-bold tracking-wider">安全 {destination.safetyRating || "9.5"}</span>
                                            </div>
                                        </div>

                                        {/* 文字資訊 */}
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
                                            
                                            {/* 底部價格 */}
                                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-neutral-50">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-neutral-400 font-bold tracking-widest uppercase mb-0.5">
                                                        Starting from
                                                    </span>
                                                    <span className="text-lg font-bold text-neutral-900">
                                                        NT$ {destination.price.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="size-8 rounded-full bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-900 group-hover:text-white transition-colors text-neutral-400">
                                                    <ArrowRight className="size-4" />
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

            {/* ==========================================
             * 區塊 3: 地圖探索模式
             * ========================================== */}
            <section className="py-24 bg-white border-y border-neutral-100">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                        <div className="space-y-3">
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900">
                                地圖探索模式
                            </h2>
                            <p className="text-neutral-500 font-medium tracking-wide text-sm">
                                直接在地圖上尋找你的下一個避風港。
                            </p>
                        </div>
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

                    {!isMapMode ? (
                        <div className="bg-neutral-50 border border-neutral-100 p-8 md:p-12 text-center rounded-[2rem]">
                            <div className="max-w-md mx-auto space-y-6 py-10">
                                <div className="size-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-neutral-200">
                                    <Compass className="size-8 text-neutral-900" />
                                </div>
                                <h3 className="text-xl font-bold text-neutral-900">切換至地圖模式</h3>
                                <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                                    開啟地圖檢視，直觀探索各地理位置的獨旅景點分布與距離關聯。
                                </p>
                                <button onClick={() => setIsMapMode(true)} className="px-8 py-3.5 bg-neutral-900 text-white text-sm font-bold rounded-full hover:bg-neutral-700 hover:shadow-md hover:shadow-neutral-900/10 transition-all">
                                    開啟地圖
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative h-[550px] bg-neutral-100 border border-neutral-200 rounded-[2rem] overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px] bg-white"></div>
                            
                            {/* 地圖打卡點 A */}
                            <div className="absolute top-1/4 left-1/3 group cursor-pointer z-10">
                                <div className="bg-neutral-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 transition-transform group-hover:-translate-y-1">
                                    <MapPin className="size-3.5 text-white fill-neutral-900" /> 京都
                                </div>
                            </div>
                            
                            {/* 地圖打卡點 B */}
                            <div className="absolute bottom-1/3 right-1/4 group cursor-pointer z-10">
                                <div className="bg-neutral-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 transition-transform group-hover:-translate-y-1">
                                    <MapPin className="size-3.5 text-white fill-neutral-900" /> 24h 保全飯店
                                </div>
                            </div>
                            
                            <div className="relative z-20 bg-white/95 backdrop-blur-md p-6 max-w-sm border border-neutral-200 shadow-2xl absolute bottom-6 left-6 space-y-3 rounded-2xl">
                                <span className="text-[10px] tracking-[0.2em] font-bold text-neutral-900 block uppercase">Interactive Map</span>
                                <h4 className="text-base font-bold text-neutral-900">互動式安全地圖即將上線</h4>
                                <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                                    我們正在整合全球犯罪率與即時治安數據，為獨旅者提供視覺化的安全庇護所地圖。
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ==========================================
             * 區塊 4: 手機友善的橫向滑動分類 
             * ========================================== */}
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

                    {/* 水平滑動容器 */}
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
                                <div className="size-10 bg-neutral-100 rounded-full flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-neutral-200 transition-all">
                                    {category.icon}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-neutral-800">{category.name}</h3>
                                    <p className="text-[10px] font-bold text-neutral-500 mt-0.5">{category.count} 個目的地</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==========================================
             * 區塊 5: AI 浮動按鈕 Widget
             * ========================================== */}
            <div className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-50">
                {!isAiOpen ? (
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
                    <div className="bg-white border border-neutral-200 shadow-2xl shadow-neutral-900/10 w-[calc(100vw-3rem)] md:w-96 rounded-[1.5rem] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Chat Header */}
                        <div className="bg-neutral-900 text-white p-4 flex items-center justify-between border-b border-neutral-700">
                            <div className="flex items-center gap-2">
                                <Sparkles className="size-4 text-white" />
                                <span className="text-sm font-bold">Solo Concierge AI</span>
                            </div>
                            <button onClick={() => setIsAiOpen(false)} className="text-neutral-400 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full">
                                <X className="size-4" />
                            </button>
                        </div>
                        {/* Chat Body */}
                        <div className="p-4 h-64 overflow-y-auto space-y-4 bg-neutral-50">
                            <div className="flex gap-2">
                                <div className="size-6 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 shadow-sm shadow-neutral-900/10">
                                    <Sparkles className="size-3 text-white" />
                                </div>
                                <div className="bg-white p-3 border border-neutral-200 shadow-sm text-neutral-700 text-sm font-medium leading-relaxed rounded-2xl rounded-tl-none">
                                    你好！我是你的專屬獨旅顧問。無論是想尋找最安全的住宿，或是需要緊急行程備案，我隨時為你提供協助。今天想了解什麼呢？
                                </div>
                            </div>
                        </div>
                        {/* Chat Input */}
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