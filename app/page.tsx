'use client';
import { Link } from "./components/Link";
import {
    Search,
    MapPin,
    Star,
    TrendingUp,
    Award,
    Users,
    Clock,
} from "lucide-react";
import { destinations } from "./data/destinations";

export default function Home() {
    const featuredDestinations = destinations.slice(0, 6);

    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative h-[600px] flex items-center justify-center text-white">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                <div className="absolute inset-0 bg-black/30"></div>
                <div className="relative z-10 container mx-auto px-4 text-center">
                    <h1 className="mb-6 max-w-3xl mx-auto">
                        發現世界的美好，開啟你的旅程
                    </h1>
                    <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
                        精選全球熱門景點，為您打造專屬的完美旅行體驗
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-2xl p-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                                <input
                                    placeholder="搜尋目的地、景點..."
                                    className="w-full pl-10 h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex-1 relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                                <input
                                    placeholder="地區或國家"
                                    className="w-full pl-10 h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <Link to="/destinations">
                                <button className="h-12 w-full md:w-auto px-8 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                    搜尋
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 bg-gray-50 border-y">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            {
                                icon: MapPin,
                                label: "旅遊目的地",
                                value: "500+",
                            },
                            { icon: Users, label: "滿意旅客", value: "100K+" },
                            { icon: Award, label: "獲獎行程", value: "50+" },
                            { icon: Star, label: "平均評分", value: "4.8" },
                        ].map((stat, idx) => (
                            <div key={idx} className="text-center">
                                <stat.icon className="size-8 mx-auto mb-3 text-blue-600" />
                                <div className="text-3xl mb-1">
                                    {stat.value}
                                </div>
                                <div className="text-gray-600 text-sm">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Destinations */}
            <section className="py-16">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="size-5 text-blue-600" />
                                <span className="px-3 py-1 border border-gray-300 rounded-full text-sm">
                                    熱門推薦
                                </span>
                            </div>
                            <h2 className="mb-2">精選旅遊行程</h2>
                            <p className="text-gray-600">
                                探索最受歡迎的旅遊目的地
                            </p>
                        </div>
                        <Link to="/destinations">
                            <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                                查看全部
                            </button>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuredDestinations.map((destination) => (
                            <Link
                                key={destination.id}
                                to={`/destinations/${destination.id}`}
                            >
                                <div className="bg-white rounded-lg overflow-hidden shadow hover:shadow-xl transition-shadow group">
                                    <div className="relative h-48 overflow-hidden">
                                        {/* <ImageWithFallback
                      src={destination.image}
                      alt={destination.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    /> */}
                                        <span className="absolute top-3 left-3 bg-white/90 text-gray-900 px-3 py-1 rounded-full text-sm">
                                            {destination.category}
                                        </span>
                                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                                            <Star className="size-4 fill-yellow-400 text-yellow-400" />
                                            <span className="text-sm">
                                                {destination.rating}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="mb-1">
                                            {destination.name}
                                        </h3>
                                        <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                                            <MapPin className="size-3" />
                                            {destination.country}
                                        </p>
                                        <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                                            {destination.description}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Clock className="size-3" />
                                                    {destination.days} 天
                                                </div>
                                                <div className="text-blue-600">
                                                    NT${" "}
                                                    {destination.price.toLocaleString()}
                                                </div>
                                            </div>
                                            <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                                                查看詳情
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <h2 className="text-center mb-2">熱門旅遊類型</h2>
                    <p className="text-center text-gray-600 mb-8">
                        選擇您喜歡的旅遊方式
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            {
                                name: "文化探索",
                                count: 120,
                                color: "bg-purple-500",
                            },
                            {
                                name: "海島度假",
                                count: 85,
                                color: "bg-blue-500",
                            },
                            {
                                name: "戶外探險",
                                count: 95,
                                color: "bg-green-500",
                            },
                            {
                                name: "美食文化",
                                count: 150,
                                color: "bg-orange-500",
                            },
                        ].map((category, idx) => (
                            <div
                                key={idx}
                                className="bg-white rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
                            >
                                <div className="p-6 text-center">
                                    <div
                                        className={`w-16 h-16 rounded-full ${category.color} mx-auto mb-3 flex items-center justify-center text-white text-2xl`}
                                    >
                                        {category.name[0]}
                                    </div>
                                    <h3 className="mb-1 text-lg">
                                        {category.name}
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                        {category.count} 個行程
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="mb-4 text-white">
                        準備好開始您的旅程了嗎？
                    </h2>
                    <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
                        加入我們，探索更多精彩的旅遊體驗
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link to="/destinations">
                            <button className="px-6 py-3 bg-white text-gray-900 rounded-md hover:bg-gray-100 transition-colors">
                                探索景點
                            </button>
                        </Link>
                        <Link to="/planner">
                            <button className="px-6 py-3 bg-transparent border-2 border-white text-white rounded-md hover:bg-white/10 transition-colors">
                                規劃行程
                            </button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
