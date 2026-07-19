'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { 
  Plus, UserPlus, X, Calendar, MapPin, Share2, Loader2, User, Pin, Trash2, MoreHorizontal, Train, Car, Bike, Compass, ChevronLeft, CheckCircle2
} from "lucide-react";

interface Itinerary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  isPinned: boolean;
  Account: string;
}

export default function PlannerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // ================= 狀態管理 =================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transport, setTransport] = useState("public"); 
  // 【新增】綁定使用者選擇的地點
  const [destination, setDestination] = useState("taipei");

  // 【新增】預設城市座標字典
const CITY_COORDINATES: Record<string, { lat: number, lng: number }> = {
    "keelung": { lat: 25.1276, lng: 121.7392 },
    "taipei": { lat: 25.0478, lng: 121.5170 },
    "new_taipei": { lat: 25.0119, lng: 121.4654 },
    "taoyuan": { lat: 24.9936, lng: 121.3010 },
    "hsinchu_city": { lat: 24.8138, lng: 120.9675 },
    "hsinchu_county": { lat: 24.8383, lng: 121.0177 },
    "miaoli": { lat: 24.5602, lng: 120.8214 },
    "taichung": { lat: 24.1477, lng: 120.6736 },
    "changhua": { lat: 24.0755, lng: 120.5447 },
    "nantou": { lat: 23.9111, lng: 120.6872 },
    "yunlin": { lat: 23.7092, lng: 120.4313 },
    "chiayi_city": { lat: 23.4795, lng: 120.4414 },
    "chiayi_county": { lat: 23.4518, lng: 120.2555 },
    "tainan": { lat: 22.9997, lng: 120.2270 },
    "kaohsiung": { lat: 22.6273, lng: 120.3014 },
    "pingtung": { lat: 22.6690, lng: 120.4862 },
    "yilan": { lat: 24.7570, lng: 121.7530 },
    "hualien": { lat: 23.9872, lng: 121.6016 },
    "taitung": { lat: 22.7583, lng: 121.1444 },
    "penghu": { lat: 23.5711, lng: 119.5815 },
    "kinmen": { lat: 24.4327, lng: 118.3225 },
    "matsu": { lat: 26.1505, lng: 119.9334 },
    
    // 保留國際常用選項供防呆或擴充
    "tokyo": { lat: 35.6812, lng: 139.7671 },
    "osaka": { lat: 34.6937, lng: 135.5023 },
  };

  const [itineraries, setItineraries] = useState<Itinerary[]>([]);

  // 加入行程 (6 宮格) 狀態
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false); 
  const [inviteCodeArray, setInviteCodeArray] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 顯示邀請碼狀態
  const [generatedCodeInfo, setGeneratedCodeInfo] = useState<{ isOpen: boolean; code: string; copied: boolean }>({
    isOpen: false, code: "", copied: false
  });

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

  // ================= 邀請碼邏輯 (自訂 Modal 版) =================
  const handleGetInviteCode = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch("http://localhost:8080/itinerary/get_or_create_invite_code.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Itinerary_ID: id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setGeneratedCodeInfo({ isOpen: true, code: data.code, copied: false });
        navigator.clipboard.writeText(data.code).then(() => {
          setGeneratedCodeInfo(prev => ({ ...prev, copied: true }));
          setTimeout(() => setGeneratedCodeInfo(prev => ({ ...prev, copied: false })), 3000);
        });
      } else { alert(data.message); }
    } catch (error) { alert("獲取邀請碼失敗"); }
    setActiveDropdown(null);
  };

  // 6 宮格輸入與貼上處理邏輯
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault(); // 阻擋原生貼上行為以突破 maxLength 限制
    const pastedText = e.clipboardData.getData('text/plain');
    const cleanedText = pastedText.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();

    if (cleanedText) {
      const newArray = [...inviteCodeArray];
      for (let i = 0; i < cleanedText.length; i++) {
        newArray[i] = cleanedText[i];
      }
      setInviteCodeArray(newArray);

      // 將焦點移至最後一個輸入框，或下一個空白框
      const nextIndex = Math.min(cleanedText.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // 確保只取最後輸入的單一字元
    const char = value.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, '');

    const newArray = [...inviteCodeArray];
    newArray[index] = char;
    setInviteCodeArray(newArray);

    // 如果有輸入且不是最後一格，自動跳下一格
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !inviteCodeArray[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoinItinerary = async () => {
    const finalCode = inviteCodeArray.join('');
    if (finalCode.length < 6) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:8080/itinerary/join_itinerary.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Invite_Code: finalCode, Account: user?.id || (user as any)?.Account })
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert("成功加入行程！");
        setIsJoinModalOpen(false);
        setInviteCodeArray(Array(6).fill(""));
        fetchItineraries();
      } else { alert(data.message); }
    } catch (error) { alert("連線失敗"); } finally { setIsSubmitting(false); }
  };

  // ================= 行程卡片基本操作 =================
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("確定刪除此行程？此動作無法復原。")) {
      try {
        const res = await fetch("http://localhost:8080/itinerary/delete_itinerary.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Account: user?.id || (user as any)?.Account, Itinerary_ID: id }),
        });
        const data = await res.json();
        if (data.status === 'success') { setItineraries(itineraries.filter(it => it.id !== id)); } 
        else { alert(data.message); }
      } catch (error) { alert("連線異常"); }
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user?.id || (user as any)?.Account, Itinerary_ID: id, Is_Pinned: targetPinStatus }),
      });
      const data = await res.json();
      if (data.status !== 'success') {
        setItineraries(itineraries.map(it => it.id === id ? { ...it, isPinned: isCurrentlyPinned } : it));
        alert(data.message);
      }
    } catch (error) {
      setItineraries(itineraries.map(it => it.id === id ? { ...it, isPinned: isCurrentlyPinned } : it));
      alert("連線異常");
    }
  };

const handleCreateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // 【新增】透過字典取得對應經緯度
    const coords = CITY_COORDINATES[destination];

    try {
      const res = await fetch("http://localhost:8080/itinerary/create_itinerary.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          Account: user?.id || (user as any)?.Account, 
          Title: title, 
          StartDate: startDate, 
          EndDate: endDate, 
          Transport: transport,
          // 【新增】傳送座標至後端
          Dest_Lat: coords.lat, 
          Dest_Lng: coords.lng 
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
        setDestination("taipei"); // 【新增】成功後重置為預設地點
      } 
      else { alert("建立失敗：" + data.message); }
    } catch (error) { alert("系統連線異常"); } finally { setIsSubmitting(false); }
  };

  if (loading || isFetching) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin size-8 text-slate-300" /></div>;

  return (
    <div className="min-h-screen bg-[#FAFAFA] relative">
      {activeDropdown && <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />}

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 tracking-wide">我的行程</h1>
          <div className="flex gap-3">
             <button onClick={() => setIsJoinModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:border-[#F04D79] transition-all">
              <UserPlus size={16} /> 輸入邀請碼
            </button>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-all">
              <Plus size={16} /> 建立新行程
            </button>
          </div>
        </div>

        {itineraries.length === 0 ? (
          <div className="text-center py-28 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><MapPin className="text-slate-300" size={28} /></div>
            <p className="text-slate-500 mb-8 tracking-wide">立即體驗行程規劃的樂趣，為您的下一趟獨旅輕鬆做準備。</p>
            <button onClick={() => setIsModalOpen(true)} className="px-7 py-3 bg-slate-900 text-white font-medium rounded-lg">開始規劃</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
           {sortedItineraries.map((itinerary) => (
              <div key={itinerary.id} onClick={() => router.push(`/planner/${itinerary.id}`)} className="bg-white border border-slate-100 rounded-xl group cursor-pointer hover:shadow-xl relative">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 rounded-t-xl">
                  <img src={itinerary.coverImage} className="w-full h-full object-cover grayscale-[40%] group-hover:grayscale-0 transition-all" />
                  {itinerary.isPinned && <div className="absolute top-3 left-3 bg-slate-900/90 text-white p-1.5 rounded-full"><Pin className="size-3.5" /></div>}
                  <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === itinerary.id ? null : itinerary.id); }} className="absolute top-3 right-3 size-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><MoreHorizontal className="size-4" /></button>
                </div>

                {activeDropdown === itinerary.id && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-3 top-14 w-36 bg-white border border-gray-100 shadow-xl rounded-lg py-1.5 z-50">
                    <button onClick={(e) => handleGetInviteCode(itinerary.id, e)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"><Share2 className="size-4" /> 分享行程</button>
                    <button onClick={(e) => handlePin(itinerary.id, itinerary.isPinned, e)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"><Pin className="size-4" /> {itinerary.isPinned ? '取消釘選' : '釘選行程'}</button>
                    <button onClick={(e) => handleDelete(itinerary.id, e)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"><Trash2 className="size-4" /> 刪除行程</button>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-lg font-medium text-slate-900 mb-1.5 truncate">{itinerary.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-400 font-mono">{itinerary.startDate} - {itinerary.endDate}</p>
                    <span className="text-[10px] font-bold text-slate-300 uppercase">{itinerary.Account === (user?.id || (user as any)?.Account) ? 'Owner' : 'Member'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= 建立行程 Modal ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h2 className="text-sm font-bold tracking-widest uppercase">Start Planning</h2><button onClick={() => setIsModalOpen(false)}><X size={20} /></button></div>
             <form onSubmit={handleCreateItinerary} className="p-8 space-y-6">
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="行程標題" className="w-full p-4 bg-slate-50 border rounded-xl" />
                
                {/* 【新增】地點選擇下拉選單 */}
<select 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value)} 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-[#F04D79]"
                >
                  <optgroup label="北部">
                    <option value="keelung">基隆市</option>
                    <option value="taipei">台北市</option>
                    <option value="new_taipei">新北市</option>
                    <option value="taoyuan">桃園市</option>
                    <option value="hsinchu_city">新竹市</option>
                    <option value="hsinchu_county">新竹縣</option>
                  </optgroup>
                  <optgroup label="中部">
                    <option value="miaoli">苗栗縣</option>
                    <option value="taichung">台中市</option>
                    <option value="changhua">彰化縣</option>
                    <option value="nantou">南投縣</option>
                    <option value="yunlin">雲林縣</option>
                  </optgroup>
                  <optgroup label="南部">
                    <option value="chiayi_city">嘉義市</option>
                    <option value="chiayi_county">嘉義縣</option>
                    <option value="tainan">台南市</option>
                    <option value="kaohsiung">高雄市</option>
                    <option value="pingtung">屏東縣</option>
                  </optgroup>
                  <optgroup label="東部">
                    <option value="yilan">宜蘭縣</option>
                    <option value="hualien">花蓮縣</option>
                    <option value="taitung">台東縣</option>
                  </optgroup>
                  <optgroup label="外島">
                    <option value="penghu">澎湖縣</option>
                    <option value="kinmen">金門縣</option>
                    <option value="matsu">連江縣 (馬祖)</option>
                  </optgroup>
                  <optgroup label="國際">
                    <option value="tokyo">日本 - 東京</option>
                    <option value="osaka">日本 - 大阪</option>
                  </optgroup>
                </select>

                <div className="grid grid-cols-2 gap-4">
                  <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl" />
                  <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-slate-900 text-white rounded-xl">{isSubmitting ? "處理中..." : "建立行程"}</button>
             </form>
          </div>
        </div>
      )}

      {/* ================= 顯示邀請碼 Modal (取代 alert) ================= */}
      {generatedCodeInfo.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl p-8 text-center animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">專屬邀請碼</h3>
            <p className="text-sm text-slate-500 mb-6">將下方代碼分享給朋友，邀請他們加入！</p>
            <div className="bg-slate-50 py-5 rounded-2xl mb-2 flex items-center justify-center relative border border-slate-100">
              <span className="text-3xl font-mono font-bold tracking-[0.2em] text-[#F04D79] ml-2">
                {generatedCodeInfo.code}
              </span>
            </div>
            <div className="h-6 mb-4 flex items-center justify-center">
              {generatedCodeInfo.copied && (
                <span className="text-xs font-bold text-green-500 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2">
                  <CheckCircle2 size={14} /> 已自動複製到剪貼簿
                </span>
              )}
            </div>
            <button 
              onClick={() => setGeneratedCodeInfo({ isOpen: false, code: "", copied: false })} 
              className="w-full py-3.5 bg-slate-900 hover:bg-[#F04D79] text-white rounded-xl font-bold transition-colors shadow-sm"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* ================= 透過邀請碼加入 Modal (6 宮格) ================= */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-3 text-left">透過邀請碼加入</h2>
              <p className="text-sm text-slate-500 font-medium">請輸入朋友分享的 6 位數碼來加入行程</p>
            </div>

            {/* 6 宮格輸入區塊 */}
            <div className="flex justify-center gap-3 mb-10">
              {inviteCodeArray.map((char, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  value={char}
                  onPaste={handlePaste}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-2xl outline-none transition-all duration-200 shadow-sm ${
                    char 
                      ? 'border-2 border-[#F04D79] text-[#F04D79] bg-pink-50/30' 
                      : 'border-2 border-slate-200 text-slate-700 focus:border-[#F04D79] focus:ring-4 focus:ring-pink-100 bg-white'
                  }`}
                />
              ))}
            </div>

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-6 items-center">
              <button 
                onClick={() => { setIsJoinModalOpen(false); setInviteCodeArray(Array(6).fill("")); }} 
                className="text-[17px] font-bold text-[#F04D79] hover:opacity-70 transition-opacity"
              >
                取消
              </button>
              <button 
                onClick={handleJoinItinerary} 
                disabled={isSubmitting || inviteCodeArray.join('').length < 6} 
                className="px-8 py-3 rounded-xl text-[17px] font-bold transition-all shadow-sm flex items-center gap-2 disabled:bg-slate-200 disabled:text-white disabled:shadow-none bg-[#F04D79] text-white hover:bg-pink-600"
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "完成"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}