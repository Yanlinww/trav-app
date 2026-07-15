'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { 
  Map as MapIcon, Calendar, DollarSign, BaggageClaim, Ticket, 
  GripVertical, Plus, Train, Hotel, Coffee, Camera,
  ChevronLeft, Wallet, Loader2, MapPin, Trash2, Check, Edit2,
  LayoutGrid, Folder, Image as ImageIcon, MapPinned, 
  ChevronUp, ChevronDown, XCircle, Save,
  Receipt, Utensils, TrainFront, Bed, ShoppingBag, MoreHorizontal, UserPlus, X // 新增記帳模組所需圖示
} from "lucide-react";

import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ================= 記帳獨立模組 (BudgetPanel) =================
function BudgetPanel({ itineraryId }: { itineraryId: string }) {
  const [activeTab, setActiveTab] = useState<'group' | 'personal' | 'pending'>('group');
  const [expenses, setExpenses] = useState<any[]>([]); // 暫存前端記帳陣列
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // 新增記帳表單狀態
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");

  const categories = [
    { id: 'food', icon: Utensils, label: '食物' },
    { id: 'ticket', icon: Ticket, label: '門票' },
    { id: 'transport', icon: TrainFront, label: '交通' },
    { id: 'hotel', icon: Bed, label: '住宿' },
    { id: 'shopping', icon: ShoppingBag, label: '購物' },
    { id: 'other', icon: MoreHorizontal, label: '其他' }
  ];

  const handleSaveExpense = () => {
    if (!amount || isNaN(Number(amount))) { alert("請輸入有效的金額"); return; }
    
    const newExpense = {
      id: `exp_${Date.now()}`,
      amount: Number(amount),
      category,
      note,
      type: activeTab === 'personal' ? 'personal' : 'group',
      date: new Date().toISOString()
    };
    
    setExpenses([newExpense, ...expenses]);
    setIsAddOpen(false);
    setAmount(""); setNote(""); setCategory("food");
  };

  return (
    <div className="h-full flex flex-col relative animate-in fade-in slide-in-from-right-4 duration-200 bg-[#FAFAFA]">
      
      {/* 頂部：群組與帳單統計 */}
      <div className="flex justify-between items-end px-4 pt-2 pb-4 shrink-0">
        <div>
          <div className="text-xs font-bold text-slate-500 mb-2 tracking-wide">分帳群組</div>
          <div className="flex items-center gap-2">
            <div className="size-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400">
              {/* 預設自己的大頭貼佔位 */}
              <div className="size-8 rounded-full bg-slate-100"></div>
            </div>
            <button className="size-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
              <Plus size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <div className="text-center px-4">
          <div className="text-xs font-bold text-slate-500 mb-1 tracking-wide">帳單</div>
          <div className="text-2xl font-mono text-slate-800">{expenses.length}</div>
        </div>
      </div>

      {/* 頁籤切換 */}
      <div className="flex border-b border-slate-200 px-4 shrink-0">
        {[
          { id: 'group', label: '群組花費' },
          { id: 'personal', label: '個人花費' },
          { id: 'pending', label: '待收付款項' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 pb-2.5 text-sm font-bold transition-colors relative ${
              activeTab === tab.id ? 'text-[#F04D79]' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#F04D79] rounded-t-full"></div>}
          </button>
        ))}
      </div>

      {/* 列表內容區與空白佔位符 */}
      <div className="flex-1 overflow-y-auto p-4">
        {expenses.filter(e => activeTab === 'pending' ? false : e.type === activeTab).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
            <div className="size-24 rounded-full bg-slate-200/50 flex items-center justify-center mb-4">
              <Receipt size={40} className="text-slate-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-slate-500 tracking-wide leading-relaxed max-w-[200px]">
              這趟行程還沒有任何花費喔，按下「＋」來記錄第一筆帳吧！
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.filter(e => activeTab === 'pending' ? false : e.type === activeTab).map((exp) => {
              const catInfo = categories.find(c => c.id === exp.category) || categories[5];
              return (
                <div key={exp.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-pink-50 text-[#F04D79] flex items-center justify-center">
                      <catInfo.icon size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{catInfo.label}</div>
                      {exp.note && <div className="text-xs text-slate-400 mt-0.5">{exp.note}</div>}
                    </div>
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-800">${exp.amount}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 懸浮新增按鈕 (FAB) */}
      <button 
        onClick={() => setIsAddOpen(true)}
        className="absolute bottom-6 right-6 size-14 rounded-full bg-[#F04D79] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(240,77,121,0.3)] hover:scale-105 transition-all"
      >
        <Plus size={28} strokeWidth={2} />
      </button>

      {/* ================= 新增記帳表單 (Slide-up Panel) ================= */}
      {isAddOpen && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsAddOpen(false)}></div>
          <div className="bg-white rounded-t-3xl shadow-2xl relative z-30 animate-in slide-in-from-bottom-full duration-300 flex flex-col max-h-[90%]">
            <div className="flex justify-between items-center p-5 border-b border-slate-50 shrink-0">
              <h3 className="text-base font-bold text-slate-800">新增花費</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-[#F04D79]"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-6 flex items-center border-b border-slate-200 pb-2">
                <span className="text-2xl font-bold text-slate-400 mr-2">$</span>
                <input 
                  type="number" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full text-4xl font-bold font-mono text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-200"
                />
              </div>

              <div className="mb-6">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest mb-3 block">選擇類別</label>
                <div className="grid grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button 
                      key={cat.id} onClick={() => setCategory(cat.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                        category === cat.id ? 'border-[#F04D79] bg-pink-50 text-[#F04D79]' : 'border-slate-100 bg-white text-slate-500 hover:border-pink-200'
                      }`}
                    >
                      <cat.icon size={24} strokeWidth={1.5} className="mb-2" />
                      <span className="text-xs font-bold">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-2">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest mb-2 block">備註 (選填)</label>
                <input 
                  type="text" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="例如：晚餐拉麵、新幹線車票..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#F04D79]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-50 shrink-0 bg-white">
              <button onClick={handleSaveExpense} className="w-full py-3.5 bg-slate-900 hover:bg-[#F04D79] text-white rounded-xl text-sm font-bold shadow-md transition-colors">
                儲存紀錄
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= 行李清單獨立模組 (LuggagePanel) =================
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
    fetch("http://localhost:8080/itinerary/get_luggage.php", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: itineraryId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success' && data.data) setCategories(JSON.parse(data.data));
      else setCategories(defaultTemplate);
      setIsLoaded(true);
    })
    .catch(() => { setCategories(defaultTemplate); setIsLoaded(true); });
  }, [itineraryId]);

  useEffect(() => {
    if (!isLoaded) return;
    setSyncStatus('saving');
    const timer = setTimeout(() => {
      fetch("http://localhost:8080/itinerary/update_luggage.php", {
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ Itinerary_ID: itineraryId, LuggageData: JSON.stringify(categories) })
      })
      .then(res => res.json())
      .then(data => { if (data.status === 'success') setSyncStatus('saved'); })
      .catch(() => setSyncStatus('idle'));
    }, 1000);
    return () => clearTimeout(timer);
  }, [categories, isLoaded, itineraryId]);

  const toggleCheck = (categoryId: string, itemId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.map((i: any) => i.id === itemId ? { ...i, isChecked: !i.isChecked } : i) } : cat));
  const toggleExpand = (categoryId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat));
  const deleteItem = (categoryId: string, itemId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.filter((i: any) => i.id !== itemId) } : cat));
  const deleteCategory = (categoryId: string) => { if(window.confirm("確定要刪除整個類別嗎？")) setCategories(cats => cats.filter(cat => cat.id !== categoryId)); };
  const handleAddItem = (categoryId: string) => {
    if (!newItemName.trim()) { setAddingToCategory(null); return; }
    setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: [...cat.items, { id: `i_${Date.now()}`, name: newItemName, isChecked: false }] } : cat));
    setNewItemName(""); setAddingToCategory(null);
  };
  const clearChecked = () => setCategories(cats => cats.map(cat => ({ ...cat, items: cat.items.map((i: any) => ({ ...i, isChecked: false })) })));
  const addNewCategory = () => {
    const title = window.prompt("請輸入新類別名稱：");
    if (title && title.trim()) setCategories([...categories, { id: `c_${Date.now()}`, title, isExpanded: true, items: [] }]);
  };

  if (!isLoaded) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200 pb-20 relative px-1">
      <div className="flex justify-between items-center mb-4 px-1 mt-2">
        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
          {syncStatus === 'saving' && <><Loader2 size={12} className="animate-spin" /> 儲存中...</>}
          {syncStatus === 'saved' && <><Save size={12} className="text-green-500" /> 已同步</>}
        </div>
        <button onClick={clearChecked} className="text-sm font-bold text-[#F04D79] hover:opacity-70 transition-opacity">取消已選取項目</button>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const checkedCount = cat.items.filter((i: any) => i.isChecked).length; const totalCount = cat.items.length;
          return (
            <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2"><h3 className="text-[15px] font-bold text-slate-800">{cat.title}</h3><span className="text-[11px] font-bold text-slate-400 font-mono mt-0.5">{checkedCount}/{totalCount}</span></div>
                <div className="flex items-center gap-2"><button onClick={() => deleteCategory(cat.id)} className="p-1 text-[#F04D79] hover:bg-pink-50 rounded transition-colors"><Trash2 size={18} /></button><button onClick={() => toggleExpand(cat.id)} className="p-1 text-slate-600 hover:bg-slate-50 rounded transition-colors">{cat.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button></div>
              </div>
              {cat.isExpanded && (
                <div className="p-2">
                  {cat.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between group p-2 hover:bg-slate-50/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleCheck(cat.id, item.id)}>
                        <div className={`size-[18px] rounded-[4px] border-[1.5px] flex items-center justify-center transition-colors ${item.isChecked ? 'bg-[#F04D79] border-[#F04D79]' : 'border-[#F04D79]'}`}>{item.isChecked && <Check size={12} className="text-white" strokeWidth={3} />}</div>
                        <span className={`text-[15px] ${item.isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.name}</span>
                      </div>
                      <button onClick={() => deleteItem(cat.id, item.id)} className="text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all px-2"><XCircle size={18} className="fill-slate-200 stroke-white" /></button>
                    </div>
                  ))}
                  {addingToCategory === cat.id ? (
                    <div className="p-2 flex items-center gap-2"><input type="text" autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)} onBlur={() => handleAddItem(cat.id)} onKeyDown={e => { if(e.key === 'Enter') handleAddItem(cat.id); if(e.key === 'Escape') setAddingToCategory(null); }} className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-[#F04D79]" placeholder="輸入項目名稱..." /></div>
                  ) : (
                    <button onClick={() => setAddingToCategory(cat.id)} className="flex items-center gap-2 p-2 mt-1 text-[#F04D79] hover:opacity-70 transition-opacity"><Plus size={18} strokeWidth={2.5} /><span className="text-[15px] font-bold text-slate-400">新增項目</span></button>
                  )}
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
  editingTimeId, editStartTime, editEndTime, setEditingTimeId, setEditStartTime, setEditEndTime, handleUpdateTime,
  handleDeleteItem 
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
  
  // 右側面板狀態 (預設切換到 budget 方便你預覽)
  const [rightPanelTab, setRightPanelTab] = useState('budget'); 

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemStartTime, setNewItemStartTime] = useState("");
  const [newItemEndTime, setNewItemEndTime] = useState("");
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
        if (data.status === 'success') {
          setItineraryData(data.data);
          setCoverImage(data.data.coverImage || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop");
        } else { alert(data.message); router.push("/planner"); }
      } catch (error) { alert("資料讀取失敗"); } finally { setIsLoading(false); }
    };
    if (params.id) { fetchDetail(); fetchItems(params.id as string); }
  }, [params.id, user, authLoading, router, fetchItems]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => { /* 省略內容保持不變 */ 
    const file = e.target.files?.[0]; if (!file) return;
    const previewUrl = URL.createObjectURL(file); setCoverImage(previewUrl); setIsUploading(true);
    const formData = new FormData(); formData.append("cover_image", file); formData.append("Itinerary_ID", params.id as string); formData.append("Account", user?.id || (user as any)?.Account);
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_cover_image.php", { method: "POST", body: formData });
      const data = await res.json();
      if (data.status === 'success') setCoverImage(data.new_image_url);
      else { alert(data.message); setCoverImage(itineraryData.coverImage); }
    } catch (error) { alert("圖片上傳失敗"); setCoverImage(itineraryData.coverImage); } 
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleUpdateItineraryInfo = async () => { /* 省略內容保持不變 */ 
    if (!editInfoTitle.trim() || !editInfoStart || !editInfoEnd) { alert("請完整填寫標題與日期"); return; }
    if (new Date(editInfoStart) > new Date(editInfoEnd)) { alert("結束日期不能早於開始日期"); return; }
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_itinerary_info.php", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: params.id, Title: editInfoTitle, StartDate: editInfoStart, EndDate: editInfoEnd })
      });
      const data = await res.json();
      if (data.status === 'success') { setItineraryData({ ...itineraryData, title: editInfoTitle, startDate: editInfoStart, endDate: editInfoEnd }); setIsEditingInfo(false); } else alert(data.message);
    } catch(error) { alert("更新失敗"); }
  };

  const handleCreateItem = async () => { /* 省略內容保持不變 */ 
    if (!newItemTitle.trim()) return alert("請輸入行程標題"); setIsSubmittingItem(true);
    try {
      const res = await fetch("http://localhost:8080/itinerary/create_itinerary_item.php", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: params.id, Day_Number: activeDay, Title: newItemTitle, StartTime: newItemStartTime, EndTime: newItemEndTime }),
      });
      const data = await res.json();
      if (data.status === 'success') { setNewItemTitle(""); setNewItemStartTime(""); setNewItemEndTime(""); setIsAddItemOpen(false); fetchItems(params.id as string); } else alert(data.message);
    } catch (error) { alert("連線異常"); } finally { setIsSubmittingItem(false); }
  };

  const handleUpdateTitle = async (itemId: string) => { /* 省略內容保持不變 */ 
    if (!editingTitle.trim()) return setEditingItemId(null);
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_item_title.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId, Title: editingTitle }) });
      const data = await res.json();
      if (data.status === 'success') fetchItems(params.id as string); else alert(data.message);
    } catch(error) { alert("更新失敗"); } finally { setEditingItemId(null); }
  };

  const handleUpdateTime = async (itemId: string) => { /* 省略內容保持不變 */ 
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_item_time.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId, StartTime: editStartTime, EndTime: editEndTime }) });
      const data = await res.json();
      if (data.status === 'success') fetchItems(params.id as string); else alert(data.message);
    } catch(error) { alert("更新失敗"); } finally { setEditingTimeId(null); }
  };

  const handleDeleteItem = async (itemId: string) => { /* 省略內容保持不變 */ 
    if (!window.confirm("確定要刪除此行程嗎？")) return;
    setItineraryItems(items => items.filter(item => item.id !== itemId));
    try {
      const res = await fetch("http://localhost:8080/itinerary/delete_itinerary_item.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId }) });
      const data = await res.json(); if (data.status !== 'success') { alert(data.message); fetchItems(params.id as string); }
    } catch(error) { alert("刪除失敗"); fetchItems(params.id as string); }
  };

  const handleDragEnd = (event: DragEndEvent) => { /* 省略內容保持不變 */ 
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
    <div className="h-screen w-full flex bg-[#FAFAFA] overflow-hidden font-sans text-slate-800 relative">
      
      {/* ================= 左欄：行程時間軸 (保持不變) ================= */}
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

      {/* ================= 中欄：Map Placeholder ================= */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-100/50">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
        <div className="relative z-10 flex flex-col items-center gap-4 opacity-30">
          <div className="size-16 rounded-full border-2 border-slate-300 border-dashed flex items-center justify-center text-slate-400"><MapIcon size={28} strokeWidth={1.5} /></div>
          <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Map Visualizer</p>
        </div>
      </div>

      {/* ================= 右欄：動態模組中樞 ================= */}
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
              <div onClick={() => setRightPanelTab('notes')} className="col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer group">
                <div className="text-[11px] font-bold text-slate-600 mb-2">檔案與筆記</div><div className="flex items-end justify-between"><Folder size={18} className="text-slate-300 group-hover:text-[#F04D79] transition-colors" /><div className="text-xl font-bold font-mono text-slate-900">0</div></div>
              </div>
              <div onClick={() => setRightPanelTab('luggage')} className="col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer group">
                <div className="text-[11px] font-bold text-slate-600 mb-2">行李清單</div><div className="flex items-end justify-between"><BaggageClaim size={18} className="text-slate-300 group-hover:text-[#F04D79] transition-colors" /><div className="text-xl font-bold font-mono text-slate-900">0<span className="text-[10px] text-slate-400 font-sans">/24</span></div></div>
              </div>
              <div onClick={() => setRightPanelTab('budget')} className="col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer group">
                <div className="text-[11px] font-bold text-slate-600 mb-2">記帳分帳</div><div className="flex items-end justify-between"><DollarSign size={18} className="text-slate-300 group-hover:text-[#F04D79] transition-colors" /><div className="text-xl font-bold font-mono text-slate-900">0</div></div>
              </div>
              <div onClick={() => setRightPanelTab('memories')} className="col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer group">
                <div className="text-[11px] font-bold text-slate-600 mb-2">旅遊回憶</div><div className="flex items-end justify-between"><ImageIcon size={18} className="text-slate-300 group-hover:text-[#F04D79] transition-colors" /><div className="text-xl font-bold font-mono text-slate-900">0</div></div>
              </div>
            </div>
          )}

          {/* ================= 狀態: 記帳模組 ================= */}
          {rightPanelTab === 'budget' && <BudgetPanel itineraryId={params.id as string} />}

          {/* ================= 狀態: 行李清單 ================= */}
          {rightPanelTab === 'luggage' && <div className="p-4"><LuggagePanel itineraryId={params.id as string} /></div>}

          {['notes', 'memories'].includes(rightPanelTab) && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in duration-200">
              <LayoutGrid size={48} strokeWidth={1} className="mb-4 opacity-20" />
              <p className="text-xs font-bold tracking-widest uppercase">Module Under Construction</p>
            </div>
          )}

        </div>
      </div>

      {/* ================= 新增行程項目 Modal (省略內部細節保持不變) ================= */}
      {isAddItemOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center"><h3 className="text-sm font-bold text-slate-800 tracking-wide">新增 Day {activeDay} 行程</h3><button onClick={() => setIsAddItemOpen(false)} className="text-slate-400 hover:text-[#F04D79]"><Plus size={20} className="rotate-45" /></button></div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400">Item Title</label><input type="text" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-[#F04D79] transition-colors" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400">Start Time</label><input type="time" step={300} value={newItemStartTime} onChange={(e) => setNewItemStartTime(e.target.value)} onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err){} }} className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm cursor-pointer focus:outline-none focus:border-[#F04D79] transition-colors" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400">End Time</label><input type="time" step={300} value={newItemEndTime} onChange={(e) => setNewItemEndTime(e.target.value)} onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err){} }} className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm cursor-pointer focus:outline-none focus:border-[#F04D79] transition-colors" /></div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3"><button onClick={() => setIsAddItemOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200/50 rounded-xl">取消</button><button onClick={handleCreateItem} disabled={isSubmittingItem} className="flex-[2] py-3 text-sm font-bold text-white bg-slate-900 hover:bg-[#F04D79] rounded-xl flex justify-center items-center gap-2">{isSubmittingItem ? <Loader2 size={16} className="animate-spin" /> : "儲存至行程表"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}