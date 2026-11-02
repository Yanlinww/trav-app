"use client";

import { useState } from "react";
import { Link } from "./components/Link";
import { ArrowRight, ArrowUpRight, Check, Clock3, Coffee, Compass, Footprints, MapPin, Moon, Sparkles, Star, Sun, Utensils, Wallet } from "lucide-react";
import { destinations } from "./data/destinations";

// 首頁只展示旅行靈感並提供入口；完整規劃在 /planner，AI 生成功能尚在開發。
const moods = [
    { title: "吃點好吃的", subtitle: "為一頓飯，出門也值得", icon: Utensils, color: "#f3e6da", stops: ["找間喜歡的咖啡店", "逛逛附近的小店", "好好吃一頓晚餐"], budget: "600", time: "16:00 — 20:00" },
    { title: "散步放個空", subtitle: "換一條路，換一種心情", icon: Footprints, color: "#e5ebdf", stops: ["走進一條綠色步道", "在河邊等一場日落", "帶份晚餐慢慢回家"], budget: "400", time: "16:00 — 19:30" },
    { title: "看看夜景", subtitle: "把今天，留給城市的燈光", icon: Moon, color: "#e8e6f0", stops: ["先吃一頓喜歡的晚餐", "尋找城市裡的觀景角落", "散步回車站"], budget: "800", time: "18:00 — 22:00" },
    { title: "來點文化感", subtitle: "在街角，遇見新的故事", icon: Coffee, color: "#ece6dd", stops: ["走訪一處展覽空間", "探訪街區裡的老建築", "在小店喝杯咖啡"], budget: "500", time: "14:00 — 18:00" },
];

export default function Home() {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedMood, setSelectedMood] = useState(0);
    const soloTags = ["一人旅", "安全", "預算友善", "深度體驗"];
    // 沿用使用者指定的目的地卡片與標籤篩選資料來源。
    const filteredDestinations = selectedTag
        ? destinations.filter((dest) => dest.tags?.includes(selectedTag))
        : destinations.slice(0, 6);
    const mood = moods[selectedMood];

    return (
        <div className="bg-[#f7f5ef] text-[#243e37]">
            {/* 主視覺以介紹與導航為主，不在首頁模擬生成結果。 */}
            <section className="relative overflow-hidden border-b border-[#dedfd5]">
                <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 md:px-8 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
                    <div className="relative z-10">
                        <div className="mb-7 flex items-center gap-3 text-[10px] font-bold tracking-[0.23em] text-[#6c7b6a]">
                            <span className="h-px w-9 bg-[#b56b4d]" /> A LITTLE ESCAPE, A GOOD DAY
                        </div>
                        <h1 className="text-[46px] font-black leading-[1.18] tracking-tight sm:text-6xl lg:text-[76px]">
                            現在出門，<br />
                            <span className="relative inline-block text-[#b85f40]">今晚去哪？<svg aria-hidden="true" viewBox="0 0 360 16" className="absolute -bottom-3 left-0 w-full fill-none stroke-[#cf9d70] stroke-[3]"><path d="M3 11 Q165 -5 355 8" /></svg></span>
                        </h1>
                        <p className="mt-8 max-w-md text-sm leading-8 text-[#6c756d] md:text-base">
                            不用等長假，也能有一趟小旅行。<br />
                            留一點時間給自己，去吃、去逛、去遇見日常以外的風景。
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <Link to="/planner" className="inline-flex items-center gap-5 rounded-full bg-[#b85f40] px-7 py-4 text-sm font-bold text-white shadow-lg shadow-[#b85f40]/15 transition hover:bg-[#9e4d33]">
                                開始規劃今天 <ArrowUpRight size={18} />
                            </Link>
                            <a href="#destination-ideas" className="inline-flex items-center gap-2 px-2 py-3 text-sm font-bold hover:text-[#b85f40]">先找點靈感 <ArrowRight size={16} /></a>
                        </div>
                        <div className="mt-10 flex items-center gap-3 border-t border-[#dddcd2] pt-5 text-xs text-[#7c8176]">
                            <Compass size={16} className="text-[#b85f40]" /> 你的時間，你的步調，你的台灣小旅行。
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-lg pb-9 pl-2 pr-5 md:pb-12 md:pr-8">
                        <div aria-hidden="true" className="absolute inset-0 bottom-9 left-7 rotate-[4deg] rounded-t-[10rem] rounded-b-[2rem] bg-[#e6dfd0]" />
                        <div className="relative h-[360px] overflow-hidden rounded-t-[10rem] rounded-b-[2rem] sm:h-[440px] lg:h-[475px]">
                            <img src={destinations[3].image} alt="層疊山巒與晨光的旅行意象" fetchPriority="high" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#18362d]/75 via-transparent to-transparent" />
                            <div className="absolute bottom-9 left-7 right-7 text-white">
                                <span className="mb-3 inline-flex items-center gap-2 text-[10px] tracking-[0.22em]"><Sun size={14} /> FIND YOUR OWN PACE</span>
                                <p className="text-2xl font-bold leading-relaxed">把日常，<br />走成一趟旅行。</p>
                            </div>
                        </div>
                        <div className="absolute -right-1 top-8 flex size-20 rotate-12 flex-col items-center justify-center rounded-full border border-[#dfd6c3] bg-[#f3eedf] text-[#5b6d52] shadow-sm md:size-24">
                            <Sun size={24} strokeWidth={1.4} />
                            <span className="mt-1 text-[9px] font-bold tracking-widest">LET’S GO OUT</span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-3 flex items-center gap-4 rounded-2xl border border-white/70 bg-white px-5 py-5 shadow-xl shadow-[#243e37]/10 sm:left-7 sm:right-10">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f3e8dc] text-[#b85f40]"><MapPin size={21} /></span>
                            <div className="min-w-0 flex-1"><p className="text-[10px] tracking-widest text-[#909487]">YOUR NEXT LITTLE ADVENTURE</p><p className="mt-1 text-sm font-bold">不用走遠，也能發現不一樣。</p></div>
                            <ArrowUpRight size={19} className="shrink-0 text-[#a6ac9c]" />
                        </div>
                    </div>
                </div>
            </section>

            {/* 情境按鈕更新下方示意行程，讓使用者先理解未來的規劃方式。 */}
            <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
                <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
                    <div><p className="mb-2 text-[10px] font-bold tracking-[0.22em] text-[#9c775d]">START WITH A FEELING</p><h2 className="text-2xl font-bold tracking-tight md:text-3xl">今天，想怎麼過？</h2></div>
                    <p className="text-xs text-[#8c9187]">選一種心情，看看出門的可能。</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                    {moods.map((item, index) => {
                        const Icon = item.icon;
                        return <button key={item.title} type="button" aria-pressed={selectedMood === index} onClick={() => setSelectedMood(index)} className={`group rounded-2xl border p-4 text-left transition md:p-5 ${selectedMood === index ? "border-[#b85f40] bg-white shadow-sm" : "border-[#e3e3d8] bg-[#faf9f5] hover:border-[#b7bda9] hover:bg-white"}`}>
                            <div className="mb-5 flex items-center justify-between"><span style={{ backgroundColor: item.color }} className="flex size-10 items-center justify-center rounded-xl"><Icon size={20} strokeWidth={1.5} /></span><ArrowUpRight size={15} className={selectedMood === index ? "text-[#b85f40]" : "text-[#aeb4a4]"} /></div>
                            <h3 className="text-sm font-bold md:text-base">{item.title}</h3><p className="mt-2 text-[11px] leading-5 text-[#858b7d]">{item.subtitle}</p>
                        </button>;
                    })}
                </div>
            </section>

            <section id="day-plan" className="scroll-mt-24 border-y border-[#e1e3d7] bg-[#e9ede3]">
                <div className="mx-auto grid max-w-7xl items-center gap-9 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-2 lg:gap-20">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#cbd3bf] px-3 py-1.5 text-[10px] font-bold text-[#617455]"><Sparkles size={12} /> AI 當日行程・開發中</span>
                        <h2 className="mt-5 text-3xl font-bold leading-[1.45] tracking-tight md:text-[40px]">一個下午的空檔，<br />也值得好好安排。</h2>
                        <p className="mt-5 max-w-md text-sm leading-7 text-[#74816b]">告訴我們出發地、剩餘時間與預算。未來，讓 AI 幫你串起附近的好去處，把「不知道去哪」變成「現在就出發」。</p>
                        <div className="mt-6 flex flex-wrap gap-2 text-xs text-[#627356]">{["依出發地找靈感", "照自己的預算", "留下回程時間"].map(text => <span key={text} className="flex items-center gap-1.5 rounded-full bg-white/55 px-3 py-2"><Check size={12} />{text}</span>)}</div>
                        <Link to="/planner" className="mt-8 inline-flex items-center gap-5 border-b border-[#78876a] pb-2 text-sm font-bold transition hover:text-[#b85f40]">先用現有工具安排一趟 <ArrowRight size={16} /></Link>
                    </div>
                    <div aria-live="polite" className="rounded-[1.75rem] border border-white/80 bg-[#fffefa] p-6 shadow-xl shadow-[#4b6341]/5 md:p-8">
                        <div className="mb-6 flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[0.2em] text-[#939987]">A FEW HOURS WELL SPENT</p><h3 className="mt-2 text-xl font-bold">{mood.title}</h3></div><span className="shrink-0 rounded-full bg-[#f1eee5] px-3 py-1 text-[10px] text-[#8c8c7d]">行程示意</span></div>
                        <div className="mb-7 flex flex-wrap gap-3 border-b border-[#eeeee5] pb-5 text-xs text-[#7c8472]"><span className="flex items-center gap-1.5"><Clock3 size={14} />{mood.time}</span><span className="flex items-center gap-1.5"><Wallet size={14} />預算 NT$ {mood.budget}</span></div>
                        <ol className="space-y-5">{mood.stops.map((stop,index) => <li key={stop} className="flex items-center gap-4"><span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-[#b85f40] text-white" : "bg-[#eff0e7] text-[#7b8a6c]"}`}>{String(index+1).padStart(2,"0")}</span><span className="text-sm font-medium">{stop}</span></li>)}</ol>
                        <p className="mt-7 border-t border-dashed border-[#dfe2d5] pt-4 text-[11px] leading-5 text-[#959a8b]">這是一份情境示意，非即時推薦；AI 自動排程功能正在準備中。</p>
                    </div>
                </div>
            </section>

            <section id="destination-ideas" className="scroll-mt-24 py-16 md:py-24 bg-[#FBFBFB]">
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
                                從熟悉的城市到還沒去過的角落，找找下一趟旅行的靈感。
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
                                <Link key={destination.id} to="/planner">
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
                                                    <ArrowUpRight className="size-3" /> 去規劃
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

            <section className="bg-[#f7f5ef] px-5 py-14 md:px-8 md:py-20">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 rounded-[2rem] bg-[#243e37] px-7 py-10 text-[#fffdf5] md:flex-row md:items-center md:px-12 md:py-14">
                    <div><p className="mb-3 text-[10px] font-bold tracking-[0.22em] text-[#b3bd9c]">LESS SCROLLING. MORE EXPLORING.</p><h2 className="text-2xl font-bold leading-relaxed md:text-3xl">下一趟旅行，從你的一個念頭開始。</h2><p className="mt-3 text-sm leading-7 text-[#b9c6b7]">自己安排路線，或看看別人的旅行。找到靈感，就出發吧。</p></div>
                    <div className="flex shrink-0 flex-wrap gap-3"><Link to="/planner" className="inline-flex items-center gap-4 rounded-full bg-[#f3e7d0] px-6 py-3.5 text-sm font-bold text-[#243e37] transition hover:bg-white">我的行程規劃 <ArrowUpRight size={16} /></Link><Link to="/destinations" className="inline-flex items-center gap-2 rounded-full border border-[#6c8076] px-6 py-3.5 text-sm font-bold transition hover:bg-white/10">探索公開行程</Link></div>
                </div>
            </section>
        </div>
    );
}
