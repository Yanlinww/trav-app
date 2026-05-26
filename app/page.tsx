"use client";

import { Link } from "./components/Link";
import {
    Search,
    MapPin,
    Star,
    TrendingUp,
    Award,
    Users,
    Clock,
    ArrowRight
} from "lucide-react";
import { destinations } from "./data/destinations";

export default function Home() {
    const featuredDestinations = destinations.slice(0, 6);

    return (
        <div className="flex flex-col bg-white text-neutral-900">
            {/* Hero Section */}
            <section className="relative h-[80vh] flex items-center justify-center bg-[#F8F8F8]">
                <div className="relative z-10 container mx-auto px-6 text-center">
                    <span className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-6 block font-medium">
                        Luxury Travel Experience
                    </span>
                    <h1 className="mb-8 max-w-5xl mx-auto text-6xl md:text-8xl font-extralight tracking-tight text-neutral-900">
                        探索世界之美
                    </h1>
                    <p className="text-lg md:text-xl mb-16 max-w-2xl mx-auto text-neutral-500 font-light tracking-wide leading-relaxed">
                        精選全球頂級目的地，為您規劃一場洗滌心靈的專屬旅程。
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-4xl mx-auto bg-white shadow-[0_10px_50px_rgba(0,0,0,0.04)] border border-neutral-100 p-2 rounded-sm">
                        <div className="flex flex-col md:flex-row gap-2">
                            <div className="flex-1 relative flex items-center px-4">
                                <Search className="size-4 text-neutral-400 mr-2" />
                                <input
                                    placeholder="目的地"
                                    className="w-full h-14 text-sm tracking-wide bg-transparent focus:outline-none placeholder:text-neutral-300"
                                />
                            </div>
                            <div className="w-px bg-neutral-100 hidden md:block my-3"></div>
                            <div className="flex-1 relative flex items-center px-4">
                                <MapPin className="size-4 text-neutral-400 mr-2" />
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
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-24 bg-white border-y border-neutral-100">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                        {[
                            { label: "旅遊目的地", value: "500+" },
                            { label: "滿意旅客", value: "100K+" },
                            { label: "獲獎行程", value: "50+" },
                            { label: "平均評分", value: "4.8" },
                        ].map((stat, idx) => (
                            <div key={idx} className="text-center group">
                                <div className="text-4xl md:text-5xl mb-3 font-extralight tracking-tighter text-neutral-900 group-hover:scale-110 transition-transform duration-500">
                                    {stat.value}
                                </div>
                                <div className="text-neutral-400 text-[10px] tracking-[0.2em] uppercase font-medium">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Destinations */}
            <section className="py-32 bg-white">
                <div className="container mx-auto px-6">
                    <div className="flex items-end justify-between mb-20">
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-neutral-900">
                                精選行程
                            </h2>
                            <div className="h-0.5 w-12 bg-neutral-900"></div>
                            <p className="text-neutral-500 font-light tracking-wide italic">
                                Exploring the world's most hidden gems
                            </p>
                        </div>
                        <Link to="/destinations">
                            <button className="group flex items-center gap-2 px-8 py-3 text-xs tracking-[0.2em] uppercase border border-neutral-200 hover:border-neutral-900 transition-all">
                                查看全部 <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                        {featuredDestinations.map((destination) => (
                            <Link
                                key={destination.id}
                                to={`/destinations/${destination.id}`}
                            >
                                <div className="group cursor-pointer">
                                    <div className="relative h-[450px] overflow-hidden mb-8 bg-neutral-100 rounded-sm">
                                        <img
                                            src={destination.image}
                                            alt={destination.name}
                                            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
                                        />
                                        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 shadow-sm">
                                            <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-neutral-800">
                                                {destination.category}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-4 px-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-2xl font-light tracking-wide text-neutral-900">
                                                {destination.name}
                                            </h3>
                                            <span className="text-xs text-neutral-400 mt-2">{destination.country}</span>
                                        </div>
                                        <p className="text-neutral-500 text-sm font-light leading-relaxed line-clamp-2">
                                            {destination.description}
                                        </p>
                                        <div className="flex items-center justify-between pt-6 border-t border-neutral-100">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-neutral-400 tracking-widest uppercase mb-1">
                                                    Starting from
                                                </span>
                                                <span className="text-xl font-light tracking-tight text-neutral-900">
                                                    NT$ {destination.price.toLocaleString()}
                                                </span>
                                            </div>
                                            <span className="text-[10px] tracking-widest uppercase font-medium border-b border-neutral-900 pb-1 group-hover:pr-2 transition-all">
                                                Detail
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Categories */}
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
                {/* 裝飾性文字背景 */}
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
        </div>
    );
}