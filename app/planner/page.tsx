'use client';

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
// 新增引入 Train, Car, Bike, Compass 作為交通圖示
import { Plus, MoreHorizontal, Loader2, X, Pin, Trash2, MapPin, Share, Train, Car, Bike, Compass } from "lucide-react";

interface Itinerary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  isPinned: boolean; 
}

export default function PlannerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // ================= 狀態管理 =================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transport, setTransport] = useState("public"); // 預設大眾運輸
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [itineraries, setItineraries] = useState<Itinerary[]>([]);

  // 交通工具選項資料
  const transportOptions = [
    { id: 'public', label: '大眾運輸', icon: Train },
    { id: 'car', label: '汽車', icon: Car },
    { id: 'motorcycle', label: '機車', icon: Bike },
    { id: 'other', label: '其他', icon: Compass },
  ];

  // ================= 運作機制：資料庫讀取 =================
  const fetchItineraries = async () => {
    if (!user) return;
    try {
      const res = await fetch("http://localhost:8080/itinerary/get_itineraries.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setItineraries(data.data);
      }
    } catch (error) {
      console.error("行程讀取異常", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    } else if (user) {
      fetchItineraries();
    }
  }, [user, loading, router]);

  const sortedItineraries = [...itineraries].sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  // ================= 運作機制：行程卡片操作 =================
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("確定刪除此行程？此動作無法復原。")) {
      try {
        const res = await fetch("http://localhost:8080/itinerary/delete_itinerary.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Account: user?.id || (user as any)?.Account, Itinerary_ID: id }),
        });
        const data = await res.json();
        
        if (data.status === 'success') {
          setItineraries(itineraries.filter(it => it.id !== id));
        } else {
          alert(data.message);
        }
      } catch (error) {
        alert("連線異常，無法刪除行程。");
      }
      setActiveDropdown(null);
    }
  };

  const handlePin = async (id: string, isCurrentlyPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetPinStatus = !isCurrentlyPinned;

    setItineraries(itineraries.map(it => it.id === id ? { ...it, isPinned: targetPinStatus } : it));
    setActiveDropdown(null);

    try {
      const res = await fetch("http://localhost:8080/itinerary/pin_itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user?.id || (user as any)?.Account, Itinerary_ID: id, Is_Pinned: targetPinStatus }),
      });
      const data = await res.json();
      
      if (data.status !== 'success') {
        setItineraries(itineraries.map(it => it.id === id ? { ...it, isPinned: isCurrentlyPinned } : it));
        alert(data.message);
      }
    } catch (error) {
      setItineraries(itineraries.map(it => it.id === id ? { ...it, isPinned: isCurrentlyPinned } : it));
      alert("連線異常，釘選狀態未儲存。");
    }
  };

  const handleShare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/planner/${id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("行程連結已複製！快去邀請旅伴吧：\n" + shareUrl);
    }).catch(() => {
      alert("複製失敗，請手動分享此連結：" + shareUrl);
    });
    setActiveDropdown(null);
  };

  // ================= 運作機制：寫入資料庫 =================
  const handleCreateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(endDate) < new Date(startDate)) {
      alert("結束日期不能早於出發日期。");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:8080/itinerary/create_itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          Account: user?.id || (user as any)?.Account, 
          Title: title, 
          StartDate: startDate, 
          EndDate: endDate, 
          Transport: transport 
        }),
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        await fetchItineraries();
        setIsModalOpen(false);
        setTitle("");
        setStartDate("");
        setEndDate("");
        setTransport("public");
      } else {
        alert("建立失敗：" + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("系統連線異常，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isFetching) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin size-8 text-slate-300" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] relative">
      {activeDropdown && <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />}

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 tracking-wide">我的行程</h1>
          {itineraries.length > 0 && (
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium transition-all duration-300 hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-md active:scale-95 z-20"
            >
              <Plus size={16} /> 建立新行程
            </button>
          )}
        </div>

        {itineraries.length === 0 ? (
          <div className="text-center py-28 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="text-slate-300" size={28} />
            </div>
            <p className="text-slate-500 mb-8 tracking-wide">立即體驗行程規劃的樂趣，為您的下一趟獨旅輕鬆做準備。</p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="px-7 py-3 bg-slate-900 text-white font-medium rounded-lg transition-all duration-300 hover:bg-amber-600 hover:-translate-y-1 hover:shadow-lg active:scale-95"
              >
                開始規劃
              </button>
              <button className="px-7 py-3 bg-white text-slate-700 border border-slate-200 font-medium rounded-lg transition-all duration-300 hover:bg-slate-50 hover:-translate-y-1 hover:shadow-md active:scale-95">
                透過邀請碼加入
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
           {sortedItineraries.map((itinerary) => (
              <div 
                key={itinerary.id} 
                onClick={() => router.push(`/planner/${itinerary.id}`)}
                className="bg-white border border-slate-100 rounded-xl group cursor-pointer transition-shadow duration-300 hover:shadow-xl relative"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 rounded-t-xl">
                  <img 
                    src={itinerary.coverImage} 
                    alt={itinerary.title}
                    className="w-full h-full object-cover grayscale-[40%] transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" 
                  />
                  {itinerary.isPinned && (
                    <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-sm text-white p-1.5 rounded-full shadow-sm z-10">
                      <Pin className="size-3.5" />
                    </div>
                  )}
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === itinerary.id ? null : itinerary.id); }}
                    className="absolute top-3 right-3 size-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-600 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:text-slate-900 z-20"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>

                {activeDropdown === itinerary.id && (
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="absolute right-3 top-14 w-36 bg-white border border-gray-100 shadow-xl rounded-lg py-1.5 z-50 flex flex-col"
                  >
                    <button 
                      onClick={(e) => handleShare(itinerary.id, e)} 
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-black"
                    >
                      <Share className="size-4" /> 分享行程
                    </button>
                    <button 
                      onClick={(e) => handlePin(itinerary.id, itinerary.isPinned, e)} 
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-black"
                    >
                      <Pin className={`size-4 ${itinerary.isPinned ? 'fill-black' : ''}`} /> 
                      {itinerary.isPinned ? '取消釘選' : '釘選行程'}
                    </button>
                    <div className="h-px bg-gray-100 my-1 mx-2"></div>
                    <button 
                      onClick={(e) => handleDelete(itinerary.id, e)} 
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-4" /> 刪除行程
                    </button>
                  </div>
                )}

                <div className="p-5">
                  <h3 className="text-lg font-medium text-slate-900 mb-1.5 tracking-wide truncate group-hover:text-amber-600 transition-colors duration-300">
                    {itinerary.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono tracking-wider">
                    {itinerary.startDate} - {itinerary.endDate}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新增行程 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 tracking-widest uppercase">Start Planning</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-amber-600 transition-colors duration-300 hover:rotate-90">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateItinerary} className="p-8 space-y-6">
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Destination / Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：一個人漫步京都秋季追楓" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-all duration-300" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Start Date</label>
                  <input 
                    type="date" 
                    required
                    min={new Date().toISOString().split('T')[0]} 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-all duration-300 text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">End Date</label>
                  <input 
                    type="date" 
                    required
                    min={startDate || new Date().toISOString().split('T')[0]} 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-all duration-300 text-slate-700" 
                  />
                </div>
              </div>

              {/* 重構：圖示化卡片點擊選單 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Transportation</label>
                <div className="grid grid-cols-4 gap-3 mt-1">
                  {transportOptions.map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setTransport(opt.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                        transport === opt.id
                          ? 'border-amber-600 bg-amber-50 text-amber-600 shadow-sm'
                          : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                      }`}
                    >
                      <opt.icon className="w-5 h-5 mb-1.5" />
                      <span className="text-[11px] font-medium tracking-wide">{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-4 mt-4 bg-slate-900 text-white font-medium tracking-wide rounded-xl transition-all duration-300 hover:bg-amber-600 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isSubmitting ? <><Loader2 className="size-4 animate-spin" /> 處理中...</> : "建立專屬行程"}
              </button>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}