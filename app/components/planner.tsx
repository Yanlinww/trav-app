import { useState } from "react";
import { Plus, X, MapPin, Users, DollarSign } from "lucide-react";
import { destinations } from "../data/destinations";

interface TripItem {
    id: string;
    destinationId: string;
    days: number;
}

export function TripPlanner() {
    const [tripItems, setTripItems] = useState<TripItem[]>([]);
    const [startDate, setStartDate] = useState("");
    const [travelers, setTravelers] = useState("2");
    const [budget, setBudget] = useState("");
    const [notes, setNotes] = useState("");

    const addDestination = (destinationId: string) => {
        if (!destinationId) return;
        const destination = destinations.find((d) => d.id === destinationId);
        if (destination) {
            setTripItems([
                ...tripItems,
                {
                    id: Math.random().toString(),
                    destinationId,
                    days: destination.days,
                },
            ]);
        }
    };

    const removeDestination = (id: string) => {
        setTripItems(tripItems.filter((item) => item.id !== id));
    };

    const totalDays = tripItems.reduce((sum, item) => sum + item.days, 0);
    const totalCost = tripItems.reduce((sum, item) => {
        const dest = destinations.find((d) => d.id === item.destinationId);
        return sum + (dest?.price || 0);
    }, 0);

    return (
        <div className="min-h-screen bg-white py-16">
            <div className="container mx-auto px-6">
                <div className="mb-16">
                    <h1 className="mb-6 text-5xl md:text-6xl font-extralight tracking-tight">
                        行程規劃
                    </h1>
                    <p className="text-gray-500 font-light tracking-wide">
                        自由組合您的旅程
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-12">
                    {/* Main Planning Area */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Basic Info */}
                        <div className="border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-xl font-light tracking-wide">
                                    基本資訊
                                </h3>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs tracking-widest uppercase text-gray-500">
                                            出發日期
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) =>
                                                setStartDate(e.target.value)
                                            }
                                            className="w-full h-12 px-4 text-sm tracking-wide border border-gray-300 focus:outline-none focus:border-black transition-colors"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs tracking-widest uppercase text-gray-500">
                                            旅客人數
                                        </label>
                                        <select
                                            value={travelers}
                                            onChange={(e) =>
                                                setTravelers(e.target.value)
                                            }
                                            className="w-full h-12 px-4 text-sm tracking-wide border border-gray-300 focus:outline-none focus:border-black transition-colors bg-white"
                                        >
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(
                                                (num) => (
                                                    <option
                                                        key={num}
                                                        value={num.toString()}
                                                    >
                                                        {num} 人
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs tracking-widest uppercase text-gray-500">
                                        預算範圍（每人）
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="例如：50000"
                                        value={budget}
                                        onChange={(e) =>
                                            setBudget(e.target.value)
                                        }
                                        className="w-full h-12 px-4 text-sm tracking-wide border border-gray-300 focus:outline-none focus:border-black transition-colors"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs tracking-widest uppercase text-gray-500">
                                        備註
                                    </label>
                                    <textarea
                                        placeholder="特殊需求或其他注意事項..."
                                        value={notes}
                                        onChange={(e) =>
                                            setNotes(e.target.value)
                                        }
                                        rows={4}
                                        className="w-full px-4 py-3 text-sm tracking-wide border border-gray-300 focus:outline-none focus:border-black transition-colors resize-none font-light"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Add Destinations */}
                        <div className="border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-xl font-light tracking-wide">
                                    選擇目的地
                                </h3>
                            </div>
                            <div className="p-8">
                                <select
                                    onChange={(e) => {
                                        addDestination(e.target.value);
                                        e.target.value = "";
                                    }}
                                    className="w-full h-12 px-4 text-sm tracking-wide border border-gray-300 focus:outline-none focus:border-black transition-colors bg-white"
                                    defaultValue=""
                                >
                                    <option value="" disabled>
                                        新增景點到行程
                                    </option>
                                    {destinations.map((dest) => (
                                        <option key={dest.id} value={dest.id}>
                                            {dest.name} - {dest.country} (
                                            {dest.days}天)
                                        </option>
                                    ))}
                                </select>

                                {tripItems.length > 0 && (
                                    <div className="mt-8 space-y-4">
                                        {tripItems.map((item) => {
                                            const dest = destinations.find(
                                                (d) =>
                                                    d.id === item.destinationId,
                                            );
                                            if (!dest) return null;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center gap-4 p-6 border border-gray-200 hover:border-black transition-colors"
                                                >
                                                    <div className="flex-1">
                                                        <h4 className="mb-2 text-lg font-light tracking-wide">
                                                            {dest.name}
                                                        </h4>
                                                        <div className="flex items-center gap-6 text-sm text-gray-500 font-light">
                                                            <span className="flex items-center gap-2">
                                                                <MapPin className="size-3" />
                                                                {dest.country}
                                                            </span>
                                                            <span>
                                                                {dest.days} 天
                                                            </span>
                                                            <span className="px-3 py-1 border border-gray-300 text-xs tracking-widest uppercase">
                                                                {dest.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-light tracking-wide">
                                                            NT${" "}
                                                            {dest.price.toLocaleString()}
                                                        </div>
                                                        <div className="text-xs text-gray-400 tracking-wide">
                                                            每人
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            removeDestination(
                                                                item.id,
                                                            )
                                                        }
                                                        className="size-10 hover:bg-gray-100 flex items-center justify-center transition-colors"
                                                    >
                                                        <X className="size-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {tripItems.length === 0 && (
                                    <div className="mt-12 text-center py-16 border border-gray-200">
                                        <p className="text-gray-400 font-light tracking-wide">
                                            尚未新增任何景點
                                        </p>
                                        <p className="text-sm text-gray-400 font-light mt-2">
                                            請從上方選單選擇景點
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Summary Sidebar */}
                    <div>
                        <div className="border border-gray-200 sticky top-24">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-xl font-light tracking-wide">
                                    行程摘要
                                </h3>
                            </div>
                            <div className="p-8 space-y-8">
                                <div>
                                    <div className="text-xs text-gray-400 tracking-wider uppercase mb-2">
                                        總天數
                                    </div>
                                    <div className="text-3xl font-extralight tracking-tight">
                                        {totalDays} 天
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-gray-400 tracking-wider uppercase mb-2">
                                        景點數量
                                    </div>
                                    <div className="text-3xl font-extralight tracking-tight">
                                        {tripItems.length} 個
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 font-light">
                                        <Users className="size-4" />
                                        <span>{travelers} 位旅客</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 font-light">
                                        <DollarSign className="size-4" />
                                        <span>每人費用</span>
                                    </div>
                                    <div className="text-3xl font-extralight tracking-tight mt-4">
                                        NT$ {totalCost.toLocaleString()}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-200">
                                    <div className="text-xs text-gray-400 tracking-wider uppercase mb-2">
                                        團體總價（{travelers}人）
                                    </div>
                                    <div className="text-xl font-light tracking-wide">
                                        NT${" "}
                                        {(
                                            totalCost * parseInt(travelers)
                                        ).toLocaleString()}
                                    </div>
                                </div>

                                {budget && (
                                    <div className="pt-6 border-t border-gray-200">
                                        <div className="text-xs text-gray-400 tracking-wider uppercase mb-3">
                                            預算評估
                                        </div>
                                        {totalCost <= parseInt(budget) ? (
                                            <span className="px-4 py-2 bg-black text-white text-xs tracking-wider uppercase">
                                                在預算內
                                            </span>
                                        ) : (
                                            <span className="px-4 py-2 border border-black text-xs tracking-wider uppercase">
                                                超出預算 NT${" "}
                                                {(
                                                    totalCost - parseInt(budget)
                                                ).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="pt-6 space-y-3">
                                    <button
                                        className="w-full h-12 bg-black text-white text-sm tracking-widest uppercase hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        disabled={tripItems.length === 0}
                                    >
                                        確認預訂
                                    </button>
                                    <button className="w-full h-12 border border-gray-300 text-sm tracking-wide hover:border-black transition-colors">
                                        儲存行程
                                    </button>
                                </div>

                                <div className="pt-6 border-t border-gray-200 text-xs text-gray-400 font-light tracking-wide leading-relaxed space-y-2">
                                    <p>• 價格包含基本行程費用</p>
                                    <p>• 不含個人消費與小費</p>
                                    <p>• 最終價格以實際匯率為準</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
