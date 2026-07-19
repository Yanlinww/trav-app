'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { 
  Map as MapIcon, Calendar, DollarSign, BaggageClaim, Ticket, 
  GripVertical, Plus, Train, Hotel, Coffee, Camera,
  ChevronLeft, Wallet, Loader2, MapPin, Trash2, Check, Edit2,Copy, Link2, Share2,
  LayoutGrid, Folder, Image as ImageIcon, MapPinned, 
  ChevronUp, ChevronDown, XCircle, Save,
  Receipt, Utensils, TrainFront, Bed, ShoppingBag, MoreHorizontal, X, User
} from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import PlaceAutocomplete from '../../components/PlaceAutocomplete';


import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ================= 記帳獨立模組 (BudgetPanel CRUD 完整版) =================
function BudgetPanel({ itineraryId }: { itineraryId: string }) {
  const [activeTab, setActiveTab] = useState<'group' | 'personal' | 'pending'>('group');
  const [expenses, setExpenses] = useState<any[]>([]); 
  const [members, setMembers] = useState<any[]>([]); // 新增：群組成員狀態
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  
  // 新增狀態
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 就地編輯狀態 (Inline Editing)
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editExpTitle, setEditExpTitle] = useState("");
  const [editExpAmount, setEditExpAmount] = useState("");
  
  // 表單資料狀態
  const [category, setCategory] = useState("food");
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("TWD");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("");
  const [payer, setPayer] = useState("User (自己)");
  const [isSplit, setIsSplit] = useState(false);
  const [splitUsers, setSplitUsers] = useState([{ name: "User (自己)", id: "u1" }]);
  
  // ================= 新增：邀請模組狀態 =================
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isFetchingCode, setIsFetchingCode] = useState(false);
  const [copiedType, setCopiedType] = useState<'none' | 'code' | 'link'>('none');
  // =====================================================

// ================= 新增：成員簡介浮窗狀態 =================
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    name: string;
    role: string;
    avatar?: string; // 新增：允許接收頭像網址屬性
  } | null>(null);
  // =========================================================

  const categories = [
    { id: 'food', icon: Utensils, label: '食', color: 'bg-[#BCA484]' },
    { id: 'hotel', icon: Bed, label: '住宿', color: 'bg-[#9079D6]' },
    { id: 'transport', icon: TrainFront, label: '交通', color: 'bg-[#69C773]' },
    { id: 'ticket', icon: Ticket, label: '門票', color: 'bg-[#8BB1AA]' },
    { id: 'shopping', icon: ShoppingBag, label: '購物', color: 'bg-[#4585C4]' },
    { id: 'other', icon: Receipt, label: '其他', color: 'bg-[#909090]' }
  ];

// 1. 讀取資料庫帳單與群組成員
  const fetchData = useCallback(async () => {
    try {
      // ===== 讀取帳單 =====
      const expRes = await fetch("http://localhost:8080/itinerary/get_expenses.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Itinerary_ID: itineraryId })
      });
      // 防呆：先讀取為純文字，確認可被解析再轉 JSON
      const expText = await expRes.text();
      try {
        const expData = JSON.parse(expText);
        if (expData.status === 'success') setExpenses(expData.data);
      } catch (e) {
        console.error("帳單 API 回傳錯誤格式:", expText);
      }

      // ===== 讀取群組成員 =====
      const memRes = await fetch("http://localhost:8080/itinerary/get_itinerary_members.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Itinerary_ID: itineraryId })
      });
      // 防呆：先讀取為純文字，確認可被解析再轉 JSON
      const memText = await memRes.text();
      try {
        const memData = JSON.parse(memText);
        if (memData.status === 'success') setMembers(memData.data);
      } catch (e) {
        console.error("成員 API 回傳錯誤格式:", memText);
      }

    } catch (error) { 
      console.error("網路請求失敗", error); 
    } finally { 
      setIsLoadingExpenses(false); 
    }
  }, [itineraryId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 監聽 members 變化，自動將真實成員帶入分帳名單與付款人選項
  useEffect(() => {
    if (members && members.length > 0) {
      const defaultUsers = members.map(m => ({ name: m.name, id: m.id }));
      setSplitUsers(defaultUsers);
      setPayer(defaultUsers[0].name); // 預設付款人設為第一位成員
    }
  }, [members]);

  // 開啟邀請浮框並取得邀請碼
  const handleOpenInviteModal = async () => {
    setIsInviteModalOpen(true);
    if (inviteCode) return; // 如果已經拿過就不用重拿

    setIsFetchingCode(true);
    try {
      const res = await fetch("http://localhost:8080/itinerary/get_or_create_invite_code.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Itinerary_ID: itineraryId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setInviteCode(data.code);
      } else {
        alert("無法獲取邀請碼：" + data.message);
      }
    } catch (error) {
      console.error("獲取邀請碼失敗", error);
    } finally {
      setIsFetchingCode(false);
    }
  };

  // 處理複製至剪貼簿
  const handleCopy = (type: 'code' | 'link', text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType('none'), 2000); // 2 秒後重置複製狀態
    }).catch(() => {
      alert("瀏覽器不支援自動複製，請手動複製。");
    });
  };


  const handleCategorySelect = (catId: string) => { setCategory(catId); setAddStep(2); };
const closeAndResetForm = () => {
    setIsAddOpen(false);
    setTimeout(() => {
      setAddStep(1); setAmount(""); setTitle(""); setLocation(""); setIsSplit(false); setIsSubmitting(false);
      
      // 動態重置為真實成員
      if (members.length > 0) {
        setSplitUsers(members.map(m => ({ name: m.name, id: m.id })));
        setPayer(members[0].name);
      } else {
        setSplitUsers([{ name: "User (自己)", id: "u1" }]);
        setPayer("User (自己)");
      }
    }, 200); 
  };
  const handleAddFriend = () => {
    const name = window.prompt("請輸入朋友名稱：");
    if (name && name.trim()) setSplitUsers([...splitUsers, { name: name.trim(), id: `u_${Date.now()}` }]);
  };

const handleSaveExpense = async () => {
    // 1. 防呆驗證：檢查必填欄位
    if (!title.trim()) {
      alert("請輸入標題");
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      alert("請輸入有效的金額");
      return;
    }
    
    // 2. 邏輯防呆：若開啟分帳，人數必須大於 1
    if (isSplit && splitUsers.length <= 1) {
      alert("開啟分帳時，請至少新增一位參與分帳的朋友。若僅為個人花費，請關閉分帳開關。");
      return;
    }

    setIsSubmitting(true);

    try {
      // 3. 組合傳送至後端的資料結構
      const expenseData = {
              Itinerary_ID: itineraryId,
              Category: category,
              Title: title,
              Currency: currency,
              Amount: Number(amount),
              Location: location,
              Payer: payer,
              IsSplit: isSplit, // 修改：移除底線，對齊 PHP 的 $data->IsSplit
              SplitUsers: isSplit ? splitUsers.map(u => u.name) : [], // 預防性修改：移除底線以維持駝峰式命名的一致性
              Type: isSplit ? 'group' : 'personal' // 預防性防呆：若後端需要，直接由前端明確給定此筆帳單的 Type
            };

      // 4. 呼叫後端 API (請確保此 PHP 檔名與你的後端實際名稱相符)
      const res = await fetch("http://localhost:8080/itinerary/create_expense.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData)
      });

      const data = await res.json();

      if (data.status === 'success') {
        // 5. 儲存成功：關閉 Modal、重置表單並重新抓取最新帳單列表
        closeAndResetForm();
        fetchData();
      } else {
        alert("新增失敗：" + data.message);
      }
    } catch (error) {
      console.error("儲存帳單異常", error);
      alert("後端伺服器連線異常，請檢查 API 狀態");
    } finally {
      setIsSubmitting(false);
    }
  };
  // 處理更新帳單
  const handleUpdateExpense = async (expenseId: string) => {
    // 防呆驗證：確保有輸入修改內容
    if (!editExpTitle.trim() || !editExpAmount) {
      alert("請輸入標題與金額");
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/itinerary/update_expense.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Expense_ID: expenseId,
          Title: editExpTitle,
          Amount: Number(editExpAmount)
        })
      });
      
      const data = await res.json();
      
      if (data.status === 'success') {
        setEditingExpId(null); // 關閉編輯模式
        fetchData();           // 重新讀取資料庫，刷新畫面
      } else {
        alert("更新失敗：" + data.message);
      }
    } catch (error) {
      console.error("更新異常", error);
      alert("後端伺服器連線異常");
    }
  };

  // 處理刪除帳單
  const handleDeleteExpense = async (expenseId: string) => {
    // 邏輯防呆：防止誤觸刪除
    if (!window.confirm("確定要刪除這筆帳單嗎？此動作無法復原。")) {
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/itinerary/delete_expense.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Expense_ID: expenseId })
      });
      
      const data = await res.json();
      
      if (data.status === 'success') {
        fetchData(); // 重新讀取資料庫，刷新畫面以移除該項目
      } else {
        alert("刪除失敗：" + data.message);
      }
    } catch (error) {
      console.error("刪除異常", error);
      alert("後端伺服器連線異常");
    }
  };

  const currentCategoryObj = categories.find(c => c.id === category) || categories[0];
  const currentTabExpenses = expenses.filter(e => activeTab === 'pending' ? false : e.type === activeTab);

  return (
    <div className="h-full flex flex-col relative animate-in fade-in slide-in-from-right-4 duration-200 bg-[#FAFAFA]">
      
      {/* 頂部資訊區 (成員與帳單總數) */}
      <div className="flex justify-between items-end px-4 pt-2 pb-4 shrink-0">
        <div>
          <div className="text-xs font-bold text-slate-500 mb-2 tracking-wide">分帳群組</div>
          
          <div className="flex items-center">
            {/* 動態群組頭像區塊 */}
            {members.length > 0 ? (
              <div className="flex -space-x-3 mr-3 relative z-0 hover:z-10">
                  {members.map((member, index) => (
                    <div 
                      key={member.id} 
                      onClick={() => setSelectedMember(member)} 
                      // 這裡加上了 overflow-hidden 確保圖片被裁切成完美的圓形
                      className="size-10 rounded-full border-2 border-white bg-pink-100 text-[#F04D79] flex items-center justify-center text-sm font-bold shadow-sm relative hover:scale-110 hover:z-50 transition-all cursor-pointer uppercase overflow-hidden" 
                      title={`${member.name} (${member.role})`}
                      style={{ zIndex: members.length - index }}
                    >
                      {/* 條件渲染：如果有 avatar 屬性就顯示 img，否則顯示名字的第一個字 */}
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="size-10 rounded-full border-2 border-white bg-slate-100 animate-pulse mr-3"></div>
            )}
            
            {/* 邀請按鈕 */}
            <button 
              onClick={handleOpenInviteModal}
              className="size-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-[#F04D79] transition-colors z-20"
            >
              <Plus size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        
        <div className="text-center px-4">
          <div className="text-xs font-bold text-slate-500 mb-1 tracking-wide">帳單</div>
          <div className="text-2xl font-mono text-slate-800">{expenses.length}</div>
        </div>
      </div>

      {/* 頁籤區塊 */}
      <div className="flex px-4 border-b border-slate-200 shrink-0">
        <button onClick={() => setActiveTab('group')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'group' ? 'text-[#F04D79] border-b-2 border-[#F04D79]' : 'text-slate-400'}`}>群組花費</button>
        <button onClick={() => setActiveTab('personal')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'personal' ? 'text-[#F04D79] border-b-2 border-[#F04D79]' : 'text-slate-400'}`}>個人花費</button>
        <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'pending' ? 'text-[#F04D79] border-b-2 border-[#F04D79]' : 'text-slate-400'}`}>待收付款項</button>
      </div>

      {/* 帳單列表 (此處保留空殼供你填入原本渲染列表的邏輯) */}
<div className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoadingExpenses ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300 size-8" /></div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm font-medium tracking-wide">目前尚無帳單紀錄</div>
        ) : (
          <div className="space-y-3">
            {expenses
              .filter((exp) => {
                // 1. 若為「待收付款項」頁籤，先暫不顯示 (保留擴充空間)
                if (activeTab === 'pending') return false; 
                
                // 2. 判斷帳單屬性：優先抓取 Type，若無 Type 則透過 Is_Split 反推
                // (相容後端可能回傳的 1/0, true/false 或字串 '1')
                const isGroupExp = exp.Type === 'group' || exp.type === 'group' || exp.Is_Split == 1 || exp.IsSplit == 1 || exp.Is_Split === true;
                const expType = isGroupExp ? 'group' : 'personal';
                
                // 3. 只保留與目前頁籤狀態相符的帳單
                return expType === activeTab;
              })
              .map((exp) => {
              // 匹配對應的分類圖示與顏色 (容錯處理大小寫屬性)
              const catObj = categories.find(c => c.id === (exp.category || exp.Category)) || categories[0];
              
              return (
                <div key={exp.id || exp.Expense_ID} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:border-[#F04D79]/30 transition-all">
                  
                  {/* 左側 Icon */}
                  <div className={`size-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${catObj.color}`}>
                    <catObj.icon size={22} strokeWidth={1.5} />
                  </div>
                  
                  {/* 右側資訊與編輯區 */}
                  <div className="flex-1 min-w-0">
                    {editingExpId === (exp.id || exp.Expense_ID) ? (
                      // ===== 編輯模式 =====
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" value={editExpTitle} onChange={(e) => setEditExpTitle(e.target.value)} 
                          className="flex-1 w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#F04D79]" placeholder="標題" 
                        />
                        <input 
                          type="number" value={editExpAmount} onChange={(e) => setEditExpAmount(e.target.value)} 
                          className="w-20 text-sm font-bold text-slate-700 font-mono bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#F04D79]" placeholder="金額" 
                        />
                        <button onClick={() => handleUpdateExpense(exp.id || exp.Expense_ID)} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"><Check size={16} /></button>
                        <button onClick={() => setEditingExpId(null)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"><X size={16} /></button>
                      </div>
                    ) : (
                      // ===== 瀏覽模式 =====
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-[15px] font-bold text-slate-800 truncate pr-2">{exp.title || exp.Title}</h4>
                          <div className="text-[15px] font-bold font-mono text-slate-800 shrink-0">
                            <span className="text-[10px] text-slate-400 mr-1">{exp.currency || exp.Currency}</span>
                            {exp.amount || exp.Amount}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-400">
                          <span className="flex items-center gap-1.5 truncate">
                            <User size={12} className="text-slate-300" /> {exp.payer || exp.Payer} 付款
                          </span>
                          
                          {/* 隱藏的編輯/刪除按鈕 (Hover 時顯示) */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { 
                                setEditingExpId(exp.id || exp.Expense_ID); 
                                setEditExpTitle(exp.title || exp.Title); 
                                setEditExpAmount(exp.amount || exp.Amount); 
                              }} 
                              className="p-1.5 bg-slate-50 rounded-md hover:text-[#F04D79] transition-colors"
                            ><Edit2 size={14} /></button>
                            <button 
                              onClick={() => handleDeleteExpense(exp.id || exp.Expense_ID)} 
                              className="p-1.5 bg-slate-50 rounded-md hover:text-red-500 transition-colors"
                            ><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 新增帳單按鈕 (FAB) */}
      <div className="absolute bottom-6 right-6 z-30">
        <button onClick={() => setIsAddOpen(true)} className="size-14 bg-[#F04D79] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-pink-600 hover:scale-105 transition-all">
          <Plus size={28} />
        </button>
      </div>

      {/* ================= 邀請朋友 Modal ================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsInviteModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full p-1">
              <X size={20} />
            </button>

            <div className="text-center mb-6 mt-2">
              <div className="size-12 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="text-[#F04D79] size-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">邀請旅伴加入</h3>
              <p className="text-sm text-slate-500 mt-1">選擇適合的方式分享給朋友</p>
            </div>

            <div className="space-y-4">
              {/* 方法一：邀請碼 */}
              <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50">
                <div className="text-xs font-bold text-slate-500 mb-2 tracking-widest uppercase">Method 1: Invite Code</div>
                <div className="flex items-center justify-between">
                  {isFetchingCode ? (
                    <Loader2 className="animate-spin text-slate-400 size-5" />
                  ) : (
                    <span className="text-2xl font-mono font-bold tracking-[0.2em] text-slate-800">
                      {inviteCode}
                    </span>
                  )}
                  <button 
                    onClick={() => handleCopy('code', inviteCode)}
                    disabled={isFetchingCode || !inviteCode}
                    className={`flex items-center justify-center p-2 rounded-xl transition-all ${copiedType === 'code' ? 'bg-green-100 text-green-600' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#F04D79] hover:text-[#F04D79]'}`}
                  >
                    {copiedType === 'code' ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              {/* 方法二：專屬連結 */}
              <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50">
                <div className="text-xs font-bold text-slate-500 mb-2 tracking-widest uppercase">Method 2: Share Link</div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 truncate bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 font-mono">
                    {`${window.location.origin}/planner/${itineraryId}`}
                  </div>
                  <button 
                    onClick={() => handleCopy('link', `${window.location.origin}/planner/${itineraryId}`)}
                    className={`shrink-0 flex items-center justify-center p-2 rounded-xl transition-all ${copiedType === 'link' ? 'bg-green-100 text-green-600' : 'bg-[#F04D79] text-white hover:bg-pink-600 shadow-sm'}`}
                  >
                    {copiedType === 'link' ? <Check size={18} /> : <Link2 size={18} />}
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* ================= 雙階段 Modal ================= */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeAndResetForm}></div>
          <div className={`bg-white rounded-2xl shadow-2xl relative z-30 overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh] ${addStep === 1 ? 'w-full max-w-[340px] animate-in zoom-in-95 fade-in' : 'w-full max-w-[500px] animate-in slide-in-from-right-8 fade-in'}`}>
            
            {addStep === 1 && (
              <div className="p-6 pb-8 text-center overflow-y-auto">
                <div className="flex justify-between items-center mb-6"><div className="w-6"></div><h3 className="text-[17px] font-bold text-slate-800 tracking-widest">請選擇分類</h3><button onClick={closeAndResetForm} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
                <div className="grid grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => handleCategorySelect(cat.id)} className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${cat.color} text-white shadow-sm hover:scale-105 hover:shadow-md opacity-90 hover:opacity-100`}><cat.icon size={32} strokeWidth={1.5} /><span className="text-[13px] font-bold tracking-widest">{cat.label}</span></button>
                  ))}
                </div>
              </div>
            )}

            {addStep === 2 && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-6 pb-2 border-b border-slate-50 flex justify-between items-center shrink-0">
                  <h3 className="text-[17px] font-bold text-slate-800 tracking-widest">新增花費</h3><button onClick={closeAndResetForm} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-5 overflow-y-auto">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-sm font-bold text-slate-600"><span className="text-[#F04D79] mr-1">*</span>分類</label>
                      <div className="relative border border-slate-300 rounded-md bg-white">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 size-6 rounded-full text-white flex items-center justify-center transform scale-75 origin-center" style={{ backgroundColor: currentCategoryObj.color.replace('bg-[', '').replace(']', '') }}><currentCategoryObj.icon size={14} /></div>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full appearance-none pl-10 pr-8 py-2.5 text-sm text-slate-700 bg-transparent focus:outline-none cursor-pointer">{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}</select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F04D79] pointer-events-none" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5"><label className="text-sm font-bold text-slate-600"><span className="text-[#F04D79] mr-1">*</span>標題</label><input type="text" placeholder="請輸入標題" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#F04D79]" /></div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-600"><span className="text-[#F04D79] mr-1">*</span>金額</label>
                    <div className="flex gap-3">
                      <div className="w-[120px] relative border border-slate-300 rounded-md bg-white shrink-0">
                        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"><option value="TWD">TWD</option><option value="JPY">JPY</option><option value="AED">AED</option></select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F04D79] pointer-events-none" />
                      </div>
                      <input type="number" placeholder="請輸入金額" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#F04D79]" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-600">地點</label>
                    <div className="relative border border-slate-300 rounded-md bg-white">
                      <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm text-slate-500 bg-transparent focus:outline-none cursor-pointer"><option value="" disabled hidden>請選擇地點</option><option value="tokyo">東京</option><option value="osaka">大阪</option><option value="other">其他</option></select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F04D79] pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-600"><span className="text-[#F04D79] mr-1">*</span>付款人</label>
                    <div className="relative border border-slate-300 rounded-md bg-white">
                      <select value={payer} onChange={(e) => setPayer(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm text-slate-700 bg-transparent focus:outline-none cursor-pointer">
                        {/* 移除寫死的 User (自己)，直接動態渲染所有群組成員 */}
                        {splitUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F04D79] pointer-events-none" />
                    </div>
                  </div>
                  <hr className="border-slate-100" />
                  <div className="flex items-start justify-between pt-1">
                    <div><h4 className="text-lg font-bold text-slate-800 mb-1">與朋友分帳</h4><p className="text-[12px] text-slate-400">{isSplit ? '已開啟分帳：請新增參與分帳的朋友。' : '未分帳：此筆為你的個人花費，只有你看得到。'}</p></div>
                    <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0"><input type="checkbox" className="sr-only peer" checked={isSplit} onChange={() => setIsSplit(!isSplit)} /><div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F04D79]"></div></label>
                  </div>
                  {isSplit && (
                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200 mt-2">
                      {splitUsers.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 p-2 border border-slate-100 rounded-lg">
                          <div className="size-8 rounded-full bg-pink-100 text-[#F04D79] flex items-center justify-center text-xs font-bold uppercase">{u.name[0]}</div><span className="text-sm font-bold text-slate-700">{u.name}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between mt-2 pt-2"><button onClick={handleAddFriend} className="flex items-center gap-2 text-sm text-[#F04D79] font-bold hover:opacity-70 transition-opacity"><Plus size={18} /> 新增朋友</button><button className="flex items-center gap-2 text-sm text-slate-400 font-bold hover:text-slate-600 transition-colors"><Edit2 size={14} /> 自行輸入分帳金額</button></div>
                    </div>
                  )}
                </div>
                <div className="p-4 px-6 border-t border-slate-100 flex justify-end items-center gap-4 bg-white shrink-0">
                  <button onClick={closeAndResetForm} disabled={isSubmitting} className="text-[15px] font-bold text-[#F04D79] hover:opacity-70 transition-opacity">取消</button>
                  <button onClick={handleSaveExpense} disabled={isSubmitting} className="px-6 py-2.5 bg-[#F04D79] hover:bg-pink-600 text-white rounded-md text-[15px] font-bold tracking-widest shadow-sm transition-colors flex items-center gap-2">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "完成"}</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ================= 成員簡介 Modal ================= */}
      {selectedMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 text-center">
            
            {/* 關閉按鈕 */}
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full p-1 transition-colors"
            >
              <X size={20} />
            </button>

            {/* 大頭像 */}
            {/* 新增 overflow-hidden 屬性 */}
            <div className="size-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm mt-4 overflow-hidden">
               {/* 條件渲染：有圖片就顯示圖片，沒有就顯示首字母 */}
               {selectedMember?.avatar ? (
                 <img src={selectedMember.avatar} alt={selectedMember.name} className="w-full h-full object-cover" />
               ) : (
                 <span className="text-4xl font-bold text-[#F04D79] uppercase">
                   {selectedMember?.name?.charAt(0)}
                 </span>
               )}
            </div>

            {/* 名稱與角色 */}
            <h3 className="text-xl font-bold text-slate-800 tracking-wide">
              {/* 加上 ?. 確保安全讀取 */}
              {selectedMember?.name}
            </h3>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
              selectedMember?.role === 'Owner' 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {selectedMember?.role === 'Owner' ? '行程建立者 (Owner)' : '旅伴 (Member)'}
            </span>

            {/* 詳細資訊卡片 */}
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl text-left space-y-3 border border-slate-100">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-white rounded-lg shadow-sm">
                   {/* 如果有引入 User Icon 記得保留，沒有的話這行可刪或換成別的 Icon */}
                   <User className="size-4 text-[#F04D79]" />
                 </div>
                 <div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">帳號 ID</div>
                   <div className="text-sm font-medium text-slate-700">
                     {/* 加上 ?. 確保安全讀取 */}
                     {selectedMember?.id}
                   </div>
                 </div>
               </div>
            </div>
            
          </div>
        </div>
      )}
      {/* ================================================== */}

      

    </div>
  );
}



// ================= 行李清單獨立模組 =================
function LuggagePanel({ itineraryId }: { itineraryId: string }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");

  const defaultTemplate = [
    { id: 'c1', title: '重要證件', isExpanded: true, items: [{ id: 'i1', name: '護照', isChecked: false }, { id: 'i2', name: '信用卡', isChecked: false }, { id: 'i3', name: '外幣', isChecked: false }, { id: 'i4', name: '國際駕照', isChecked: false }, { id: 'i5', name: '線上投保旅平險！再送LINE點數', isChecked: false }] },
    { id: 'c2', title: '衣物類', isExpanded: true, items: [{ id: 'i6', name: '上服', isChecked: false }, { id: 'i7', name: '褲子', isChecked: false }, { id: 'i8', name: '內衣褲', isChecked: false }, { id: 'i9', name: '睡衣', isChecked: false }, { id: 'i10', name: '鞋子與拖鞋', isChecked: false }, { id: 'i11', name: '襪子', isChecked: false }] },
    { id: 'c3', title: '3C物品', isExpanded: true, items: [{ id: 'i12', name: '手機', isChecked: false }, { id: 'i13', name: '行動電源', isChecked: false }, { id: 'i14', name: '手機充電器', isChecked: false }, { id: 'i15', name: 'Wi-Fi分享器/上網卡', isChecked: false }, { id: 'i16', name: '耳機', isChecked: false }] },
    { id: 'c4', title: '日常盥洗用品', isExpanded: true, items: [{ id: 'i17', name: '牙刷/牙膏/毛巾', isChecked: false }, { id: 'i18', name: '洗面乳/沐浴乳', isChecked: false }, { id: 'i19', name: '防曬油', isChecked: false }, { id: 'i20', name: '隨身藥品', isChecked: false }] },
    { id: 'c5', title: '其他物品', isExpanded: true, items: [{ id: 'i21', name: '水瓶或保溫瓶', isChecked: false }, { id: 'i22', name: '筆', isChecked: false }, { id: 'i23', name: '塑膠袋', isChecked: false }, { id: 'i24', name: '雨傘', isChecked: false }, { id: 'i25', name: '環保餐具', isChecked: false }] }
  ];

  useEffect(() => {
    fetch("http://localhost:8080/itinerary/get_luggage.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: itineraryId }) })
    .then(res => res.json()).then(data => { if (data.status === 'success' && data.data) setCategories(JSON.parse(data.data)); else setCategories(defaultTemplate); setIsLoaded(true); })
    .catch(() => { setCategories(defaultTemplate); setIsLoaded(true); });
  }, [itineraryId]);

  useEffect(() => {
    if (!isLoaded) return; setSyncStatus('saving');
    const timer = setTimeout(() => {
      fetch("http://localhost:8080/itinerary/update_luggage.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: itineraryId, LuggageData: JSON.stringify(categories) }) })
      .then(res => res.json()).then(data => { if (data.status === 'success') setSyncStatus('saved'); }).catch(() => setSyncStatus('idle'));
    }, 1000);
    return () => clearTimeout(timer);
  }, [categories, isLoaded, itineraryId]);

  const toggleCheck = (categoryId: string, itemId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.map((i: any) => i.id === itemId ? { ...i, isChecked: !i.isChecked } : i) } : cat));
  const toggleExpand = (categoryId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat));
  const deleteItem = (categoryId: string, itemId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.filter((i: any) => i.id !== itemId) } : cat));
  const deleteCategory = (categoryId: string) => { if(window.confirm("確定要刪除整個類別嗎？")) setCategories(cats => cats.filter(cat => cat.id !== categoryId)); };
  const handleAddItem = (categoryId: string) => { if (!newItemName.trim()) { setAddingToCategory(null); return; } setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: [...cat.items, { id: `i_${Date.now()}`, name: newItemName, isChecked: false }] } : cat)); setNewItemName(""); setAddingToCategory(null); };
  const clearChecked = () => setCategories(cats => cats.map(cat => ({ ...cat, items: cat.items.map((i: any) => ({ ...i, isChecked: false })) })));
  const addNewCategory = () => { const title = window.prompt("請輸入新類別名稱："); if (title && title.trim()) setCategories([...categories, { id: `c_${Date.now()}`, title, isExpanded: true, items: [] }]); };

  if (!isLoaded) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200 pb-20 relative px-1">
      <div className="flex justify-between items-center mb-4 px-1 mt-2">
        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">{syncStatus === 'saving' && <><Loader2 size={12} className="animate-spin" /> 儲存中...</>}{syncStatus === 'saved' && <><Save size={12} className="text-green-500" /> 已同步</>}</div>
        <button onClick={clearChecked} className="text-sm font-bold text-[#F04D79] hover:opacity-70 transition-opacity">取消已選取項目</button>
      </div>
      <div className="space-y-4">
        {categories.map((cat) => {
          const checkedCount = cat.items.filter((i: any) => i.isChecked).length; const totalCount = cat.items.length;
          return (
            <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-white"><div className="flex items-center gap-2"><h3 className="text-[15px] font-bold text-slate-800">{cat.title}</h3><span className="text-[11px] font-bold text-slate-400 font-mono mt-0.5">{checkedCount}/{totalCount}</span></div><div className="flex items-center gap-2"><button onClick={() => deleteCategory(cat.id)} className="p-1 text-[#F04D79] hover:bg-pink-50 rounded transition-colors"><Trash2 size={18} /></button><button onClick={() => toggleExpand(cat.id)} className="p-1 text-slate-600 hover:bg-slate-50 rounded transition-colors">{cat.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button></div></div>
              {cat.isExpanded && (
                <div className="p-2">
                  {cat.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between group p-2 hover:bg-slate-50/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleCheck(cat.id, item.id)}><div className={`size-[18px] rounded-[4px] border-[1.5px] flex items-center justify-center transition-colors ${item.isChecked ? 'bg-[#F04D79] border-[#F04D79]' : 'border-[#F04D79]'}`}>{item.isChecked && <Check size={12} className="text-white" strokeWidth={3} />}</div><span className={`text-[15px] ${item.isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.name}</span></div>
                      <button onClick={() => deleteItem(cat.id, item.id)} className="text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all px-2"><XCircle size={18} className="fill-slate-200 stroke-white" /></button>
                    </div>
                  ))}
                  {addingToCategory === cat.id ? (
                    <div className="p-2 flex items-center gap-2"><input type="text" autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)} onBlur={() => handleAddItem(cat.id)} onKeyDown={e => { if(e.key === 'Enter') handleAddItem(cat.id); if(e.key === 'Escape') setAddingToCategory(null); }} className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-[#F04D79]" placeholder="輸入項目名稱..." /></div>
                  ) : (<button onClick={() => setAddingToCategory(cat.id)} className="flex items-center gap-2 p-2 mt-1 text-[#F04D79] hover:opacity-70 transition-opacity"><Plus size={18} strokeWidth={2.5} /><span className="text-[15px] font-bold text-slate-400">新增項目</span></button>)}
                </div>
              )}
            </div>
          );
        })}
        <button onClick={addNewCategory} className="w-full bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center justify-between text-slate-400 hover:text-[#F04D79] hover:border-pink-200 hover:bg-pink-50/50 transition-all"><span className="text-[15px] font-bold">新增類別</span><Plus size={20} /></button>
      </div>
    </div>
  );
}

// ================= 單一可拖曳卡片組件 =================
function SortableItem({ 
  item, editingItemId, editingTitle, setEditingItemId, setEditingTitle, handleUpdateTitle,
  editingTimeId, editStartTime, editEndTime, setEditingTimeId, setEditStartTime, setEditEndTime, handleUpdateTime, handleDeleteItem 
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`group flex bg-white border ${isDragging ? 'border-[#F04D79] shadow-lg scale-[1.02]' : 'border-slate-100 shadow-sm'} rounded-2xl p-3 transition-all duration-300 hover:shadow-md hover:border-[#F04D79]/30 relative`}>
      <div {...attributes} {...listeners} className="flex items-center text-slate-200 group-hover:text-[#F04D79]/50 pr-2 transition-colors cursor-grab active:cursor-grabbing"><GripVertical size={16} /></div>
      <div className="flex-1 flex items-center gap-3.5">
        <div className="size-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-pink-50 group-hover:text-[#F04D79] transition-colors"><MapPin size={20} /></div>
        <div className="flex-1 min-w-0">
          {editingTimeId === item.id ? (
            <div className="flex items-center gap-1.5 mb-1" onKeyDown={(e) => e.key === 'Enter' && handleUpdateTime(item.id)}>
              <input type="time" step={300} value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err){} }} className="text-[10px] font-bold font-mono bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:border-[#F04D79] cursor-pointer" />
              <span className="text-slate-300 text-[10px]">-</span>
              <input type="time" step={300} value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err){} }} className="text-[10px] font-bold font-mono bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:border-[#F04D79] cursor-pointer" />
              <button onClick={() => handleUpdateTime(item.id)} className="ml-1 text-[#F04D79] hover:bg-pink-50 rounded p-0.5 transition-colors"><Check size={14} /></button>
            </div>
          ) : (
            <div onDoubleClick={() => { setEditingTimeId(item.id); setEditStartTime(item.startTime || ""); setEditEndTime(item.endTime || ""); }} className="text-[10px] font-bold text-slate-400 font-mono mb-0.5 tracking-wider cursor-text hover:text-[#F04D79] transition-colors" title="雙擊以編輯時間">
              {(item.startTime || item.endTime) ? `${item.startTime} ${item.endTime ? `- ${item.endTime}` : ''}` : <span className="opacity-0 group-hover:opacity-100">+ 新增時間</span>}
            </div>
          )}
          {editingItemId === item.id ? (
            <input type="text" autoFocus value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onBlur={() => handleUpdateTitle(item.id)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTitle(item.id); if (e.key === 'Escape') setEditingItemId(null); }} className="text-sm font-bold text-slate-700 bg-white border border-pink-300 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-[#F04D79]/20 shadow-sm" />
          ) : (
            <div onDoubleClick={() => { setEditingItemId(item.id); setEditingTitle(item.title); }} className="text-sm font-bold text-slate-700 truncate tracking-wide cursor-text hover:text-[#F04D79] transition-colors" title="雙擊以編輯名稱">{item.title}</div>
          )}
        </div>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => handleDeleteItem(item.id)} className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-red-500 hover:text-white transition-colors shrink-0 shadow-sm" title="刪除此行程"><Trash2 size={14} /></button>
          <button className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-[#F04D79] hover:text-white transition-colors shrink-0 shadow-sm" title="新增記帳"><DollarSign size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ================= 主編輯器組件 =================
export default function ItineraryEditor() {
  const router = useRouter();
  const params = useParams(); 
  const { user, loading: authLoading } = useAuth();
  const [searchMarkers, setSearchMarkers] = useState<any[]>([]);

  const handleKeywordSearch = async (keyword: string) => {
    if (!keyword.trim()) return;
    try {
      const res = await fetch('/api/textsearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: keyword,
          lat: Number(itineraryData?.destLat) || 25.0478, 
          lng: Number(itineraryData?.destLng) || 121.5170
        }),
      });
      const data = await res.json();
      if (data.places) setSearchMarkers(data.places);
      else setSearchMarkers([]);
    } catch (error) {
      console.error("Text search error:", error);
    }
  };
  

  const handlePlaceSelect = async (placeId: string) => {
    try {
      const res = await fetch('/api/placedetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId }),
      });
      const data = await res.json();
      
      if (data.location) {
        setNewItemLat(data.location.latitude);
        setNewItemLng(data.location.longitude);
        setNewItemTitle(data.displayName?.text || '');
      } else {
        alert("無法取得地點座標");
      }
    } catch (error) {
      console.error("Fetch place details error:", error);
    }
  };

  // 【核心修復】將地圖載入器放在所有 Hook 的最頂端宣告，絕對不可包覆在條件式或 () => {} 內部
// 【修改】將 libraries 參數加入載入器
const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    // 【關鍵】：完全移除 libraries: ["places"]，這是造成 Legacy API 錯誤的元兇
});

  const [isLoading, setIsLoading] = useState(true);
  const [itineraryData, setItineraryData] = useState<any>(null);
  
  const [coverImage, setCoverImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editInfoTitle, setEditInfoTitle] = useState("");
  const [editInfoStart, setEditInfoStart] = useState("");
  const [editInfoEnd, setEditInfoEnd] = useState("");

  const [activeDay, setActiveDay] = useState(1);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  
  const [rightPanelTab, setRightPanelTab] = useState('budget'); 

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemStartTime, setNewItemStartTime] = useState("");
  const [newItemEndTime, setNewItemEndTime] = useState("");
  // 【新增】管理新行程的座標與 Autocomplete 實體
  const [newItemLat, setNewItemLat] = useState<number | null>(null);
  const [newItemLng, setNewItemLng] = useState<number | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  const [itineraryItems, setItineraryItems] = useState<any[]>([]);
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = useCallback(async (id: string) => {
    try {
      const res = await fetch("http://localhost:8080/itinerary/get_itinerary_items.php", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: id }),
      });
      const data = await res.json();
      if (data.status === 'success') setItineraryItems(data.data);
    } catch (error) { console.error(error); }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth/login"); return; }
    const fetchDetail = async () => {
      try {
        const res = await fetch("http://localhost:8080/itinerary/get_itinerary_detail.php", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: params.id, Account: user.id || (user as any).Account }),
        });
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new Error("伺服器發生內部錯誤");
        const data = await res.json();
        if (data.status === 'success') { setItineraryData(data.data); setCoverImage(data.data.coverImage || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop"); } else { alert(data.message); router.push("/planner"); }
      } catch (error) { alert("資料讀取失敗"); } finally { setIsLoading(false); }
    };
    if (params.id) { fetchDetail(); fetchItems(params.id as string); }
  }, [params.id, user, authLoading, router, fetchItems]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const previewUrl = URL.createObjectURL(file); setCoverImage(previewUrl); setIsUploading(true);
    const formData = new FormData(); formData.append("cover_image", file); formData.append("Itinerary_ID", params.id as string); formData.append("Account", user?.id || (user as any)?.Account);
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_cover_image.php", { method: "POST", body: formData });
      const data = await res.json(); if (data.status === 'success') setCoverImage(data.new_image_url); else { alert(data.message); setCoverImage(itineraryData.coverImage); }
    } catch (error) { alert("圖片上傳失敗"); setCoverImage(itineraryData.coverImage); } 
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleUpdateItineraryInfo = async () => {
    if (!editInfoTitle.trim() || !editInfoStart || !editInfoEnd) { alert("請完整填寫標題與日期"); return; }
    if (new Date(editInfoStart) > new Date(editInfoEnd)) { alert("結束日期不能早於開始日期"); return; }
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_itinerary_info.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: params.id, Title: editInfoTitle, StartDate: editInfoStart, EndDate: editInfoEnd }) });
      const data = await res.json(); if (data.status === 'success') { setItineraryData({ ...itineraryData, title: editInfoTitle, startDate: editInfoStart, endDate: editInfoEnd }); setIsEditingInfo(false); } else alert(data.message);
    } catch(error) { alert("更新失敗"); }
  };

const handleCreateItem = async () => {
    if (!newItemTitle.trim()) return alert("請輸入行程標題"); setIsSubmittingItem(true);
    try {
      const res = await fetch("http://localhost:8080/itinerary/create_itinerary_item.php", { 
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          Itinerary_ID: params.id, 
          Day_Number: activeDay, 
          Title: newItemTitle, 
          StartTime: newItemStartTime, 
          EndTime: newItemEndTime,
          // 【新增】將座標送往後端
          Latitude: newItemLat,
          Longitude: newItemLng
        }), 
      });
      const data = await res.json(); 
      if (data.status === 'success') { 
        setNewItemTitle(""); 
        setNewItemStartTime(""); 
        setNewItemEndTime(""); 
        setNewItemLat(null); // 【新增】重置狀態
        setNewItemLng(null); // 【新增】重置狀態
        setIsAddItemOpen(false); 
        fetchItems(params.id as string); 
      } else alert(data.message);
    } catch (error) { alert("連線異常"); } finally { setIsSubmittingItem(false); }
  };

  const handleUpdateTitle = async (itemId: string) => {
    if (!editingTitle.trim()) return setEditingItemId(null);
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_item_title.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId, Title: editingTitle }) });
      const data = await res.json(); if (data.status === 'success') fetchItems(params.id as string); else alert(data.message);
    } catch(error) { alert("更新失敗"); } finally { setEditingItemId(null); }
  };

  const handleUpdateTime = async (itemId: string) => {
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_item_time.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId, StartTime: editStartTime, EndTime: editEndTime }) });
      const data = await res.json(); if (data.status === 'success') fetchItems(params.id as string); else alert(data.message);
    } catch(error) { alert("更新失敗"); } finally { setEditingTimeId(null); }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("確定要刪除此行程嗎？")) return;
    setItineraryItems(items => items.filter(item => item.id !== itemId));
    try {
      const res = await fetch("http://localhost:8080/itinerary/delete_itinerary_item.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId }) });
      const data = await res.json(); if (data.status !== 'success') { alert(data.message); fetchItems(params.id as string); }
    } catch(error) { alert("刪除失敗"); fetchItems(params.id as string); }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItineraryItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id); const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        const currentDayItems = newItems.filter(item => item.dayNumber === activeDay);
        const sortUpdates = currentDayItems.map((item, index) => ({ id: item.id, sortOrder: index }));
        fetch("http://localhost:8080/itinerary/update_sort_order.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates: sortUpdates }) }).catch(err => console.error(err));
        return newItems;
      });
    }
  };

  if (authLoading || isLoading) return <div className="h-screen w-full flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin text-slate-300 size-8" /></div>;
  if (!itineraryData) return null;

  const currentDayItems = itineraryItems.filter((item) => item.dayNumber === activeDay);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#FAFAFA] font-sans text-slate-800">
      
      {/* ================= 整合後的 Header ================= */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-8">
          <div className="font-bold text-xl tracking-tighter text-slate-900">TRAVMADE</div>
          <nav className="flex items-center gap-6 text-sm font-bold text-slate-500">
            <button className="hover:text-[#F04D79]">首頁</button>
            <button className="hover:text-[#F04D79]">旅遊景點</button>
            <button className="text-[#F04D79]">行程規劃</button>
            <button className="hover:text-[#F04D79]">動態牆</button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center"><User size={16} /></div>
          <span className="text-sm font-bold">{user?.name || '使用者'}</span>
        </div>
      </header>

      {/* ================= 下方編輯區域 ================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左欄：行程時間軸 */}
        <div className="w-[380px] bg-white border-r border-slate-100 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.01)] relative">
          <div className="relative h-40 w-full bg-slate-100 group overflow-hidden shrink-0">
            <img src={coverImage} alt="行程封面" className={`w-full h-full object-cover transition-all duration-700 ${isUploading ? 'opacity-50 grayscale blur-sm' : 'group-hover:scale-105 group-hover:brightness-90'}`} />
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="absolute inset-0 m-auto size-12 rounded-full bg-slate-900/60 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#F04D79] hover:scale-110 disabled:opacity-100 disabled:bg-slate-900/40">
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
            </button>
            <button onClick={() => router.push('/planner')} className="absolute top-4 left-4 flex items-center justify-center size-8 rounded-full bg-slate-900/40 backdrop-blur-sm text-white hover:bg-[#F04D79] transition-colors">
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="px-6 py-5 border-b border-slate-50 shrink-0 group/header relative">
            {isEditingInfo ? (
              <div className="space-y-3 animate-in fade-in duration-200">
                <input type="text" value={editInfoTitle} onChange={(e) => setEditInfoTitle(e.target.value)} className="w-full text-lg font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#F04D79] transition-colors" placeholder="輸入行程標題..." autoFocus />
                <div className="flex items-center gap-2">
                  <input type="date" value={editInfoStart} onChange={(e) => setEditInfoStart(e.target.value)} className="flex-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#F04D79]" />
                  <span className="text-slate-400 font-bold">-</span>
                  <input type="date" value={editInfoEnd} onChange={(e) => setEditInfoEnd(e.target.value)} className="flex-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#F04D79]" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setIsEditingInfo(false)} className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">取消</button>
                  <button onClick={handleUpdateItineraryInfo} className="flex-1 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-[#F04D79] shadow-sm rounded-xl transition-colors">儲存</button>
                </div>
              </div>
            ) : (
              <>
                <div className="inline-block px-2.5 py-1 bg-pink-50 text-[#F04D79] text-[10px] font-bold tracking-widest rounded-md mb-3">SOLO TRAVEL</div>
                <h1 className="text-xl font-bold text-slate-900 tracking-wide mb-2 truncate">{itineraryData.title}</h1>
                <div className="flex items-center text-xs font-medium text-slate-400 tracking-wide">
                  <Calendar size={14} className="mr-2 opacity-70" />
                  {itineraryData.startDate} - {itineraryData.endDate}
                </div>
                <button onClick={() => { setEditInfoTitle(itineraryData.title); setEditInfoStart(itineraryData.startDate.replace(/\//g, '-')); setEditInfoEnd(itineraryData.endDate.replace(/\//g, '-')); setIsEditingInfo(true); }} className="absolute top-5 right-6 p-2 rounded-full bg-slate-50 text-slate-400 opacity-0 group-hover/header:opacity-100 hover:bg-[#F04D79] hover:text-white transition-all duration-300" title="編輯行程資訊"><Edit2 size={16} /></button>
              </>
            )}
          </div>

          <div className="flex overflow-x-auto hide-scrollbar px-6 border-b border-slate-100 gap-6">
            {(() => {
              const start = new Date(itineraryData.startDate); const end = new Date(itineraryData.endDate);
              const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
              return Array.from({ length: totalDays }, (_, i) => i + 1).map((dayIndex) => (
                <button key={dayIndex} onClick={() => setActiveDay(dayIndex)} className={`pb-3 text-sm whitespace-nowrap transition-colors ${activeDay === dayIndex ? 'font-bold text-[#F04D79] border-b-2 border-[#F04D79]' : 'font-medium text-slate-400 hover:text-slate-600'}`}>Day {dayIndex}</button>
              ));
            })()}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/30">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={currentDayItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                {currentDayItems.map((item) => (
                  <SortableItem key={item.id} item={item} editingItemId={editingItemId} editingTitle={editingTitle} setEditingItemId={setEditingItemId} setEditingTitle={setEditingTitle} handleUpdateTitle={handleUpdateTitle} editingTimeId={editingTimeId} editStartTime={editStartTime} editEndTime={editEndTime} setEditingTimeId={setEditingTimeId} setEditStartTime={setEditStartTime} setEditEndTime={setEditEndTime} handleUpdateTime={handleUpdateTime} handleDeleteItem={handleDeleteItem} />
                ))}
              </SortableContext>
            </DndContext>
            {currentDayItems.length === 0 && (<div className="text-center py-8 text-xs font-medium text-slate-400 tracking-wide border-2 border-dashed border-slate-100 rounded-2xl">目前尚無行程，點擊下方按鈕新增</div>)}
            <button onClick={() => setIsAddItemOpen(true)} className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-[#F04D79] hover:border-pink-200 hover:bg-pink-50/50 flex items-center justify-center gap-2 text-xs font-bold tracking-widest transition-all duration-300"><Plus size={16} /> 新增行程項目</button>
          </div>
        </div>

{/* 中欄：動態地圖區域 */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-100">
          {!isLoaded ? (
            <Loader2 className="animate-spin text-slate-300 size-8" />
          ) : (
<GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={{ lat: Number(itineraryData?.destLat) || 25.0478, lng: Number(itineraryData?.destLng) || 121.5170 }} 
              zoom={12}
              options={{ disableDefaultUI: true, zoomControl: true }}
            >
              {/* 原有：渲染已加入行程的節點 */}
              {currentDayItems.map((item, index) => {
                if (item.Latitude && item.Longitude) {
                  return (
                    <Marker key={item.Item_ID || index} position={{ lat: Number(item.Latitude), lng: Number(item.Longitude) }} label={{ text: String(index + 1), color: "white", fontWeight: "bold" }} />
                  );
                }
                return null;
              })}

              {/* 👇 步驟 4 放在這裡：渲染搜尋出來的多個地點 */}
              {searchMarkers.map((place) => (
                <Marker
                  key={place.id}
                  position={{
                    lat: place.location.latitude,
                    lng: place.location.longitude
                  }}
                  label={{
                    text: place.displayName.text.charAt(0), 
                    color: "black",
                    fontWeight: "bold"
                  }}
                  icon={{
                    url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                  }}
                  onClick={() => {
                    setNewItemTitle(place.displayName.text);
                    setNewItemLat(place.location.latitude);
                    setNewItemLng(place.location.longitude);
                  }}
                />
              ))}
              {/* 確保加在 </GoogleMap> 之前 */}
            </GoogleMap>
          )}
        </div>

        {/* 右欄：動態模組中樞 */}
        <div className="w-[340px] bg-white border-l border-slate-100 flex flex-col z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.01)] relative">
          <div className="flex pt-2 px-2 border-b border-slate-100 gap-1 overflow-x-auto hide-scrollbar shrink-0">
            {[
              { id: 'overview', icon: LayoutGrid, label: '總覽' },
              { id: 'budget', icon: Wallet, label: '記帳' },
              { id: 'luggage', icon: BaggageClaim, label: '行李' },
              { id: 'notes', icon: Folder, label: '筆記' },
              { id: 'memories', icon: ImageIcon, label: '回憶' }
            ].map((tab) => (
              <button 
                key={tab.id} onClick={() => setRightPanelTab(tab.id)}
                className={`flex-1 min-w-[60px] py-3 flex flex-col items-center gap-1.5 transition-colors ${rightPanelTab === tab.id ? 'text-[#F04D79] border-b-2 border-[#F04D79]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <tab.icon size={16} />
                <span className="text-[10px] font-bold tracking-widest">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/30">
            {rightPanelTab === 'overview' && (
              <div className="p-5 grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="col-span-1 row-span-2 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer">
                  <MapPinned size={26} className="text-[#F04D79] mb-4" />
                  <div><div className="text-xs font-bold text-slate-600 mb-1">建立行程</div><div className="text-2xl font-bold font-mono text-slate-900">0 <span className="text-[10px] text-slate-400 font-sans tracking-wide">公里</span></div></div>
                </div>
                <div onClick={() => setRightPanelTab('notes')} className="col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer group"><div className="text-[11px] font-bold text-slate-600 mb-2">檔案與筆記</div><div className="flex items-end justify-between"><Folder size={18} className="text-slate-300 group-hover:text-[#F04D79] transition-colors" /><div className="text-xl font-bold font-mono text-slate-900">0</div></div></div>
                <div onClick={() => setRightPanelTab('luggage')} className="col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer group"><div className="text-[11px] font-bold text-slate-600 mb-2">行李清單</div><div className="flex items-end justify-between"><BaggageClaim size={18} className="text-slate-300 group-hover:text-[#F04D79] transition-colors" /><div className="text-xl font-bold font-mono text-slate-900">0<span className="text-[10px] text-slate-400 font-sans">/24</span></div></div></div>
                <div onClick={() => setRightPanelTab('budget')} className="col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer group"><div className="text-[11px] font-bold text-slate-600 mb-2">記帳分帳</div><div className="flex items-end justify-between"><DollarSign size={18} className="text-slate-300 group-hover:text-[#F04D79] transition-colors" /><div className="text-xl font-bold font-mono text-slate-900">0</div></div></div>
                <div onClick={() => setRightPanelTab('memories')} className="col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer group"><div className="text-[11px] font-bold text-slate-600 mb-2">旅遊回憶</div><div className="flex items-end justify-between"><ImageIcon size={18} className="text-slate-300 group-hover:text-[#F04D79] transition-colors" /><div className="text-xl font-bold font-mono text-slate-900">0</div></div></div>
              </div>
            )}

            {rightPanelTab === 'budget' && <BudgetPanel itineraryId={params.id as string} />}
            {rightPanelTab === 'luggage' && <div className="p-4"><LuggagePanel itineraryId={params.id as string} /></div>}
            
            {['notes', 'memories'].includes(rightPanelTab) && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in duration-200">
                <LayoutGrid size={48} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-xs font-bold tracking-widest uppercase">Module Under Construction</p>
              </div>
            )}
          </div>
        </div>
      </div>
{/* ================= 新增行程項目 Modal ================= */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* 點擊背景關閉 */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddItemOpen(false)}></div>
          
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 tracking-widest">新增 Day {activeDay} 行程</h3>
              <button onClick={() => setIsAddItemOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-600">
                  <span className="text-[#F04D79] mr-1">*</span> 搜尋地點 (自動完成)
                </label>
                                 
                {/* 傳入 value 與 onChange 進行雙向綁定 */}
                <PlaceAutocomplete 
                  value={newItemTitle} 
                  onChange={setNewItemTitle} 
                  onPlaceSelect={handlePlaceSelect} 
                  onKeywordSearch={handleKeywordSearch} 
                />  
                
                {/* 為了讓使用者知道目前選中的地點，可額外顯示 title 狀態 */}
                {newItemTitle && (
                  <p className="text-xs text-green-600 mt-1">已選擇: {newItemTitle}</p>
                )}
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">開始時間</label>
                  <input 
                    type="time" value={newItemStartTime} onChange={(e) => setNewItemStartTime(e.target.value)} 
                    className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#F04D79] cursor-pointer" 
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">結束時間</label>
                  <input 
                    type="time" value={newItemEndTime} onChange={(e) => setNewItemEndTime(e.target.value)} 
                    className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#F04D79] cursor-pointer" 
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsAddItemOpen(false)} disabled={isSubmittingItem} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">
                取消
              </button>
              <button onClick={handleCreateItem} disabled={isSubmittingItem} className="px-6 py-2 bg-[#F04D79] hover:bg-pink-600 text-white rounded-lg text-sm font-bold tracking-widest shadow-sm transition-colors flex items-center gap-2">
                {isSubmittingItem ? <Loader2 size={16} className="animate-spin" /> : "新增"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================== */}
      
    </div>
  );
}