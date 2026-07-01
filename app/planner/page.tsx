'use client';

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { Plus, Link as LinkIcon, MoreHorizontal, Map, Calendar, Loader2, Plane, Car, Train, X, Share, Trash2, Pin } from "lucide-react";

// 定義行程資料結構
interface Itinerary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  isPinned?: boolean; 
}

export default function PlannerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]); // 預設為空，等待資料載入
  const [isFetching, setIsFetching] = useState(true);

  // 權限檢查
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    } else if (user) {
      // 這裡之後會接上 fetch 撈取後端行程資料
      setIsFetching(false);
    }
  }, [user, loading, router]);

  if (loading || isFetching) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin size-8" /></div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 標題區域 */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">我的行程</h1>
          <div className="flex gap-3">
          </div>
        </div>

        {/* 行程列表區域 (空狀態時顯示提示) */}
        {itineraries.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-gray-100 rounded-2xl">
            <p className="text-gray-500 mb-6">立即體驗行程規劃的樂趣，讓成為你為旅遊輕鬆做準備。</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-black text-white rounded-lg">開始規劃</button>
              <button className="px-6 py-3 border border-gray-200 rounded-lg">透過邀請碼加入</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 行程卡片 */}
          </div>
        )}
      </div>

      {/* 新增行程 Modal (你現在看到的樣式) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-medium text-gray-900 tracking-wide">START PLANNING</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">Destination / Title</label>
                <input type="text" placeholder="例如：台南週末洗滌心靈之旅" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">Start Date</label>
                  <input type="date" onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">End Date</label>
                  <input type="date" onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer" />
                </div>
              </div>
              <button className="w-full py-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">建立行程</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}