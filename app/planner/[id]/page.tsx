'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { 
  Map as MapIcon, Calendar, BaggageClaim,
  GripVertical, Plus, Train, Hotel, Coffee, Camera, Search,
  ChevronLeft, Wallet, Loader2, MapPin, Trash2, Check, Edit2,Copy,
  LayoutGrid,
  ChevronUp, ChevronDown, XCircle, Save,
  Receipt, TrainFront, Bed, X, User
} from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, MarkerClustererF } from '@react-google-maps/api';
import PlaceAutocomplete from '../../components/PlaceAutocomplete';

import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const MAX_COVER_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_COVER_DIMENSION = 1920;
const FALLBACK_COVER_IMAGE = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop";

function coverImageWithVersion(imageUrl: string, version: number) {
  if (!imageUrl || imageUrl.startsWith("blob:") || imageUrl.startsWith("data:")) return imageUrl || FALLBACK_COVER_IMAGE;
  const localCoverMatch = imageUrl.match(/\/uploads\/covers\/([^/?#]+)/i);
  if (localCoverMatch) return `/api/cover?file=${encodeURIComponent(localCoverMatch[1])}&v=${version}`;
  return `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${version}`;
}

async function optimizeCoverImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('請選擇圖片檔案。');
  if (file.size > MAX_COVER_SOURCE_BYTES) throw new Error('原始圖片超過 15MB，請選擇較小的圖片。');

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('無法讀取這張圖片。'));
      nextImage.src = sourceUrl;
    });
    const scale = Math.min(1, MAX_COVER_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('圖片最佳化暫時無法使用。');
    context.drawImage(image, 0, 0, width, height);
    const optimizedBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.84));
    if (!optimizedBlob) throw new Error('圖片最佳化失敗，請再試一次。');
    return new File([optimizedBlob], `${file.name.replace(/\.[^.]+$/, '') || 'cover'}.webp`, { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

type PersonalExpense = {
  id: number;
  title: string;
  amount: number | string;
  currency: string;
  category: string;
  location: string | null;
  date: string;
};

function BudgetPanel({ itineraryId, currentUserId }: { itineraryId: string; currentUserId: string }) {
  const categories = [
    { value: 'food', label: '餐飲' },
    { value: 'hotel', label: '住宿' },
    { value: 'transport', label: '交通' },
    { value: 'ticket', label: '門票' },
    { value: 'shopping', label: '購物' },
    { value: 'other', label: '其他' },
  ];
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [category, setCategory] = useState('food');
  const [location, setLocation] = useState('');

  const loadExpenses = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('http://localhost:8080/itinerary/expenses.php?action=list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'success') throw new Error(result.message || '無法讀取記帳資料');
      setExpenses(Array.isArray(result.data) ? result.data : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '無法讀取記帳資料');
    } finally {
      setLoading(false);
    }
  }, [itineraryId, currentUserId]);

  useEffect(() => { void loadExpenses(); }, [loadExpenses]);

  const openNew = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setCurrency('TWD');
    setCategory('food');
    setLocation('');
    setError('');
    setFormOpen(true);
  };

  const openEdit = (expense: PersonalExpense) => {
    setEditingId(expense.id);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setCurrency(expense.currency);
    setCategory(expense.category);
    setLocation(expense.location || '');
    setError('');
    setFormOpen(true);
  };

  const saveExpense = async () => {
    const numericAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('請輸入名稱與大於 0 的金額');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:8080/itinerary/expenses.php?action=${editingId === null ? 'create' : 'update'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Itinerary_ID: itineraryId,
          Account: currentUserId,
          Expense_ID: editingId,
          Title: title.trim(),
          Amount: numericAmount,
          Currency: currency,
          Category: category,
          Location: location.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'success') throw new Error(result.message || '儲存失敗');
      setFormOpen(false);
      await loadExpenses();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (expense: PersonalExpense) => {
    if (!window.confirm(`確定刪除「${expense.title}」？`)) return;
    try {
      setError('');
      const response = await fetch('http://localhost:8080/itinerary/expenses.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Expense_ID: expense.id, Account: currentUserId }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'success') throw new Error(result.message || '刪除失敗');
      await loadExpenses();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '刪除失敗');
    }
  };

  const shownExpenses = expenses.filter((expense) =>
    `${expense.title} ${expense.location || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );
  const totals = expenses.reduce<Record<string, number>>((result, expense) => {
    result[expense.currency] = (result[expense.currency] || 0) + Number(expense.amount);
    return result;
  }, {});

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#FAFAFA]">
      <div className="space-y-3 border-b border-slate-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">個人記帳</h3>
          <button type="button" onClick={openNew} className="flex items-center gap-1 rounded-lg bg-[#F04D79] px-3 py-2 text-xs font-bold text-white"><Plus size={15} />新增花費</button>
        </div>
        <div className="text-xs text-slate-500">共 {expenses.length} 筆{Object.entries(totals).map(([unit, total]) => <span key={unit} className="ml-2 font-bold text-slate-700">{unit} {total.toLocaleString()}</span>)}</div>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋花費或地點" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#F04D79]" />
      </div>

      {error && <p className="mx-4 mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? <div className="py-10 text-center text-sm text-slate-400">載入中...</div> : shownExpenses.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">{search ? '找不到符合的花費' : '尚未新增個人花費'}</div>
        ) : shownExpenses.map((expense) => (
          <div key={expense.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-800">{expense.title}</div>
                <div className="mt-1 text-xs text-slate-400">{categories.find((item) => item.value === expense.category)?.label || expense.category}{expense.location ? ` · ${expense.location}` : ''}{expense.date ? ` · ${expense.date.slice(0, 10)}` : ''}</div>
              </div>
              <div className="shrink-0 text-right"><div className="font-mono text-sm font-bold text-slate-800">{expense.currency} {Number(expense.amount).toLocaleString()}</div></div>
            </div>
            <div className="mt-3 flex justify-end gap-3 text-xs font-bold">
              <button type="button" onClick={() => openEdit(expense)} className="text-slate-500 hover:text-[#F04D79]">修改</button>
              <button type="button" onClick={() => void deleteExpense(expense)} className="text-red-500 hover:text-red-600">刪除</button>
            </div>
          </div>
        ))}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={(event) => { event.preventDefault(); void saveExpense(); }} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">{editingId === null ? '新增個人花費' : '修改個人花費'}</h3>
            <label className="block text-sm text-slate-600">名稱<input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[#F04D79]" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-slate-600">金額<input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[#F04D79]" /></label>
              <label className="block text-sm text-slate-600">幣別<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"><option value="TWD">TWD</option><option value="JPY">JPY</option><option value="AED">AED</option></select></label>
            </div>
            <label className="block text-sm text-slate-600">類別<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="block text-sm text-slate-600">地點（選填）<input value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[#F04D79]" /></label>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-3 pt-2 text-sm font-bold"><button type="button" onClick={() => setFormOpen(false)} disabled={saving} className="px-4 py-2 text-slate-500">取消</button><button type="submit" disabled={saving} className="rounded-lg bg-[#F04D79] px-4 py-2 text-white disabled:opacity-50">{saving ? '儲存中...' : '儲存'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

// ================= 行李清單獨立模組 =================
function LuggagePanel({ itineraryId, currentUserId }: { itineraryId: string; currentUserId: string }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const syncStatusRef = useRef(syncStatus);
  useEffect(() => { syncStatusRef.current = syncStatus; }, [syncStatus]);

  const defaultTemplate = [
    { id: 'c1', title: '重要證件', isExpanded: true, items: [{ id: 'i1', name: '護照', isChecked: false }, { id: 'i2', name: '信用卡', isChecked: false }, { id: 'i3', name: '外幣', isChecked: false }, { id: 'i4', name: '國際駕照', isChecked: false }, { id: 'i5', name: '線上投保旅平險！再送LINE點數', isChecked: false }] },
    { id: 'c2', title: '衣物類', isExpanded: true, items: [{ id: 'i6', name: '上服', isChecked: false }, { id: 'i7', name: '褲子', isChecked: false }, { id: 'i8', name: '內衣褲', isChecked: false }, { id: 'i9', name: '睡衣', isChecked: false }, { id: 'i10', name: '鞋子與拖鞋', isChecked: false }, { id: 'i11', name: '襪子', isChecked: false }] },
    { id: 'c3', title: '3C物品', isExpanded: true, items: [{ id: 'i12', name: '手機', isChecked: false }, { id: 'i13', name: '行動電源', isChecked: false }, { id: 'i14', name: '手機充電器', isChecked: false }, { id: 'i15', name: 'Wi-Fi分享器/上網卡', isChecked: false }, { id: 'i16', name: '耳機', isChecked: false }] },
    { id: 'c4', title: '日常盥洗用品', isExpanded: true, items: [{ id: 'i17', name: '牙刷/牙膏/毛巾', isChecked: false }, { id: 'i18', name: '洗面乳/沐浴乳', isChecked: false }, { id: 'i19', name: '防曬油', isChecked: false }, { id: 'i20', name: '隨身藥品', isChecked: false }] },
    { id: 'c5', title: '其他物品', isExpanded: true, items: [{ id: 'i21', name: '水瓶或保溫瓶', isChecked: false }, { id: 'i22', name: '筆', isChecked: false }, { id: 'i23', name: '塑膠袋', isChecked: false }, { id: 'i24', name: '雨傘', isChecked: false }, { id: 'i25', name: '環保餐具', isChecked: false }] }
  ];

  const refreshLuggage = useCallback(async () => {
    if (syncStatusRef.current === 'saving') return;
    try {
      const res = await fetch("http://localhost:8080/itinerary/luggage.php?action=get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId }),
      });
      const data = await res.json();
      const incomingCategories = data.status === 'success' && data.data ? JSON.parse(data.data) : defaultTemplate;
      setCategories((currentCategories) => (
        JSON.stringify(currentCategories) === JSON.stringify(incomingCategories) ? currentCategories : incomingCategories
      ));
      setIsLoaded(true);
    } catch {
      setCategories((currentCategories) => currentCategories.length ? currentCategories : defaultTemplate);
      setIsLoaded(true);
    }
  }, [itineraryId, currentUserId]);

  useEffect(() => { refreshLuggage(); }, [refreshLuggage]);

  useEffect(() => {
    const refreshTimer = window.setInterval(refreshLuggage, 5000);
    return () => window.clearInterval(refreshTimer);
  }, [refreshLuggage]);

  useEffect(() => {
    if (!isLoaded) return; setSyncStatus('saving');
    const timer = setTimeout(() => {
      fetch("http://localhost:8080/itinerary/luggage.php?action=update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId, LuggageData: JSON.stringify(categories) }) })
      .then(res => res.json()).then(data => { if (data.status === 'success') setSyncStatus('saved'); else setSyncStatus('error'); }).catch(() => setSyncStatus('error'));
    }, 1000);
    return () => clearTimeout(timer);
  }, [categories, isLoaded, itineraryId, currentUserId]);

  const toggleCheck = (categoryId: string, itemId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.map((i: any) => i.id === itemId ? { ...i, isChecked: !i.isChecked } : i) } : cat));
  const toggleCategoryChecks = (categoryId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.map((i: any) => ({ ...i, isChecked: !cat.items.every((item: any) => item.isChecked) })) } : cat));
  const toggleExpand = (categoryId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat));
  const deleteItem = (categoryId: string, itemId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.filter((i: any) => i.id !== itemId) } : cat));
  const deleteCategory = (categoryId: string) => { if(window.confirm("確定要刪除整個類別嗎？")) setCategories(cats => cats.filter(cat => cat.id !== categoryId)); };
  const renameCategory = (categoryId: string, currentTitle: string) => { const title = window.prompt('請輸入新的分類名稱：', currentTitle); if (title?.trim()) setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, title: title.trim() } : cat)); };
  const handleAddItem = (categoryId: string) => { if (!newItemName.trim()) { setAddingToCategory(null); return; } setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: [...cat.items, { id: `i_${Date.now()}`, name: newItemName, isChecked: false }] } : cat)); setNewItemName(""); setAddingToCategory(null); };
  const clearChecked = () => setCategories(cats => cats.map(cat => ({ ...cat, items: cat.items.map((i: any) => ({ ...i, isChecked: false })) })));
  const checkAll = () => setCategories(cats => cats.map(cat => ({ ...cat, items: cat.items.map((i: any) => ({ ...i, isChecked: true })) })));
  const addNewCategory = () => { const title = window.prompt("請輸入新類別名稱："); if (title && title.trim()) setCategories([...categories, { id: `c_${Date.now()}`, title, isExpanded: true, items: [] }]); };

  if (!isLoaded) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200 pb-20 relative px-1">
      <div className="flex justify-between items-center mb-4 px-1 mt-2">
        <div className={`text-[10px] font-bold flex items-center gap-1.5 ${syncStatus === 'error' ? 'text-red-500' : 'text-slate-400'}`}>{syncStatus === 'saving' && <><Loader2 size={12} className="animate-spin" /> 儲存中...</>}{syncStatus === 'error' && <>儲存失敗，請稍後再試</>}</div>
        <div className="flex items-center gap-3"><button onClick={checkAll} className="text-sm font-bold text-[#F04D79] hover:opacity-70 transition-opacity">全部勾選</button><button onClick={clearChecked} className="text-sm font-bold text-slate-400 hover:text-[#F04D79] transition-colors">全部取消</button></div>
      </div>
      <div className="space-y-4">
        {categories.map((cat) => {
          const checkedCount = cat.items.filter((i: any) => i.isChecked).length; const totalCount = cat.items.length;
          return (
            <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-white"><div className="flex items-center gap-2"><h3 className="text-[15px] font-bold text-slate-800">{cat.title}</h3><span className="text-[11px] font-bold text-slate-400 font-mono mt-0.5">{checkedCount}/{totalCount}</span></div><div className="flex items-center gap-1.5"><button onClick={() => toggleCategoryChecks(cat.id)} className="rounded px-1.5 py-1 text-[10px] font-bold text-[#F04D79] hover:bg-pink-50">{totalCount > 0 && checkedCount === totalCount ? '取消' : '全選'}</button><button onClick={() => renameCategory(cat.id, cat.title)} className="p-1 text-slate-400 hover:bg-pink-50 hover:text-[#F04D79] rounded transition-colors"><Edit2 size={15} /></button><button onClick={() => deleteCategory(cat.id)} className="p-1 text-[#F04D79] hover:bg-pink-50 rounded transition-colors"><Trash2 size={18} /></button><button onClick={() => toggleExpand(cat.id)} className="p-1 text-slate-600 hover:bg-slate-50 rounded transition-colors">{cat.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button></div></div>
              <div className="h-1 bg-slate-100"><div className="h-full bg-[#F04D79] transition-all" style={{ width: `${totalCount ? checkedCount / totalCount * 100 : 0}%` }} /></div>
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
const formatTimeInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length >= 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

const normalizeLoadedTime = (value: unknown) => {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return '';
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return '';
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
};

const getTimeFlags = (items: any[], index: number) => {
  const current = items[index];
  const currentStart = normalizeLoadedTime(current?.startTime);
  const currentEnd = normalizeLoadedTime(current?.endTime);
  const parse = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const isOvernight = Boolean(currentStart && currentEnd && parse(currentEnd) < parse(currentStart));
  if (!currentStart || !currentEnd) return { isOvernight, hasConflict: false };

  const previous = [...items.slice(0, index)].reverse().find((item) => normalizeLoadedTime(item.startTime) && normalizeLoadedTime(item.endTime));
  if (!previous) return { isOvernight, hasConflict: false };

  const previousStart = parse(normalizeLoadedTime(previous.startTime));
  const previousEnd = parse(normalizeLoadedTime(previous.endTime));
  const currentStartMinutes = parse(currentStart);
  const previousOvernight = previousEnd < previousStart;
  const adjustedCurrentStart = previousOvernight && currentStartMinutes < previousStart ? currentStartMinutes + 1440 : currentStartMinutes;
  const adjustedPreviousEnd = previousOvernight ? previousEnd + 1440 : previousEnd;
  return { isOvernight, hasConflict: adjustedCurrentStart < adjustedPreviousEnd };
};

type MarkerStatus = 'added' | 'completed' | 'mustVisit' | 'optional';

const markerStatusOptions: Array<{ value: MarkerStatus; label: string; color: string; fill: string }> = [
  { value: 'added', label: '已加入行程', color: '#F04D79', fill: '#F04D79' },
  { value: 'completed', label: '已完成', color: '#16A34A', fill: '#16A34A' },
  { value: 'mustVisit', label: '必去', color: '#DC2626', fill: '#DC2626' },
  { value: 'optional', label: '備選', color: '#64748B', fill: '#94A3B8' },
];

const getMarkerStatusOption = (status: MarkerStatus) => (
  markerStatusOptions.find((option) => option.value === status) || markerStatusOptions[0]
);

function SortableItem({ 
  item, editingItemId, editingTitle, setEditingItemId, setEditingTitle, handleUpdateTitle,
  editingTimeId, editStartTime, editEndTime, setEditingTimeId, setEditStartTime, setEditEndTime, handleUpdateTime, handleDeleteItem, handleDuplicateItem, onFocusItem, isMapItemSelected, savingTimeId, timeFlags, markerStatus, onMarkerStatusChange
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.5 : 1 };

  return (
    <div id={`itinerary-item-${item.id}`} ref={setNodeRef} style={style} className={`group flex bg-white border ${isDragging ? 'border-[#F04D79] shadow-lg scale-[1.02]' : isMapItemSelected ? 'border-[#F04D79] shadow-md ring-2 ring-pink-100' : 'border-slate-100 shadow-sm'} rounded-2xl p-3 transition-all duration-300 hover:shadow-md hover:border-[#F04D79]/30 relative`}>
      <div {...attributes} {...listeners} className="flex items-center text-slate-200 group-hover:text-[#F04D79]/50 pr-2 transition-colors cursor-grab active:cursor-grabbing"><GripVertical size={16} /></div>
      <div className="flex-1 min-w-0 flex items-start gap-3.5" onClick={() => onFocusItem?.(item)}>
        <div className="size-11 mt-0.5 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-pink-50 group-hover:text-[#F04D79] transition-colors"><MapPin size={20} /></div>
        <div className="flex-1 min-w-0">
          {item.hasInvalidTime && (
            <div className="mb-1 text-[10px] font-bold text-amber-500">時間待修正，請雙擊重新輸入</div>
          )}
          {editingTimeId === item.id ? (
            <div className="flex items-center gap-1.5 mb-1 w-full" onKeyDown={(e) => e.key === 'Enter' && handleUpdateTime(item.id)}>
              <input disabled={savingTimeId === item.id} type="text" inputMode="numeric" placeholder="HH:mm" maxLength={5} value={editStartTime} onChange={(e) => setEditStartTime(formatTimeInput(e.target.value))} className="w-[4.5rem] shrink-0 text-[10px] font-bold font-mono bg-slate-50 border border-slate-200 rounded px-1 py-1 focus:outline-none focus:border-[#F04D79] disabled:opacity-50" />
              <span className="text-slate-300 text-[10px]">-</span>
              <input disabled={savingTimeId === item.id} type="text" inputMode="numeric" placeholder="HH:mm" maxLength={5} value={editEndTime} onChange={(e) => setEditEndTime(formatTimeInput(e.target.value))} className="w-[4.5rem] shrink-0 text-[10px] font-bold font-mono bg-slate-50 border border-slate-200 rounded px-1 py-1 focus:outline-none focus:border-[#F04D79] disabled:opacity-50" />
              <button disabled={savingTimeId === item.id} onClick={(event) => { event.stopPropagation(); handleUpdateTime(item.id); }} className="ml-auto size-7 shrink-0 flex items-center justify-center text-[#F04D79] hover:bg-pink-50 rounded-full transition-colors disabled:opacity-50" aria-label="儲存時間">{savingTimeId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}</button>
            </div>
          ) : (
            <div onDoubleClick={() => { setEditingTimeId(item.id); setEditStartTime(item.startTime || ""); setEditEndTime(item.endTime || ""); }} className="text-xs font-bold text-slate-400 font-mono mb-1 tracking-wide cursor-text hover:text-[#F04D79] transition-colors" title="雙擊以編輯時間">
              {(item.startTime || item.endTime) ? `${item.startTime} ${item.endTime ? `- ${item.endTime}` : ''}` : <span className="opacity-0 group-hover:opacity-100">+ 新增時間</span>}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {timeFlags?.hasConflict && <span className="text-[10px] font-bold text-red-500 bg-red-50 rounded-full px-2 py-0.5">時間重疊</span>}
            {timeFlags?.isOvernight && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 rounded-full px-2 py-0.5">跨午夜</span>}
            {!item.startTime && !item.endTime && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">未設定時間</span>}
            {(!Number.isFinite(Number(item.Latitude)) || !Number.isFinite(Number(item.Longitude))) && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">自訂地點</span>}
          </div>
          {editingItemId === item.id ? (
            <input type="text" autoFocus value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onBlur={() => handleUpdateTitle(item.id)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTitle(item.id); if (e.key === 'Escape') setEditingItemId(null); }} className="text-sm font-bold text-slate-700 bg-white border border-pink-300 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-[#F04D79]/20 shadow-sm" />
          ) : (
            <div onDoubleClick={() => { setEditingItemId(item.id); setEditingTitle(item.title); }} className="text-[15px] leading-6 font-bold text-slate-700 whitespace-normal break-words tracking-wide cursor-text hover:text-[#F04D79] transition-colors" title="雙擊以編輯名稱">{item.title}</div>
          )}
          
          <select
            value={markerStatus}
            onChange={(event) => { event.stopPropagation(); onMarkerStatusChange?.(item.id, event.target.value as MarkerStatus); }}
            onClick={(event) => event.stopPropagation()}
            className="hidden"
            aria-label="標點狀態"
          >
            {markerStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className={`flex flex-col gap-1.5 pt-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 ${editingTimeId === item.id ? 'hidden' : ''}`}>
          <button onClick={(event) => { event.stopPropagation(); setEditingItemId(item.id); setEditingTitle(item.title); }} className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#F04D79] hover:text-white transition-colors shrink-0 shadow-sm" title="編輯行程名稱" aria-label="編輯行程名稱"><Edit2 size={14} /></button>
          <button onClick={() => handleDeleteItem(item.id)} className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-red-500 hover:text-white transition-colors shrink-0 shadow-sm" title="刪除此行程"><Trash2 size={14} /></button>
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
  const currentAccount = String(user?.id || (user as any)?.Account || '');
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    language: 'zh-TW',
    region: 'TW',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [itineraryData, setItineraryData] = useState<any>(null);
  
  const [coverImage, setCoverImage] = useState("");
  const [coverImageVersion, setCoverImageVersion] = useState(0);
  const [hasRetriedCoverImage, setHasRetriedCoverImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editInfoTitle, setEditInfoTitle] = useState("");
  const [editInfoStart, setEditInfoStart] = useState("");
  const [editInfoEnd, setEditInfoEnd] = useState("");

  const [activeDay, setActiveDay] = useState(1);
  const [mobilePlannerView, setMobilePlannerView] = useState<'list' | 'map'>('list');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [addItemMode, setAddItemMode] = useState<'choose' | 'search' | 'custom'>('choose');
  
  const [rightPanelTab, setRightPanelTab] = useState<'budget' | 'luggage'>('budget');
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const preferencesHydratedRef = useRef(false);

  useEffect(() => {
    const savedTab = window.localStorage.getItem(`trav-app:right-panel:${params.id}`);
    if (savedTab === 'budget' || savedTab === 'luggage') setRightPanelTab(savedTab);
    const savedDay = window.localStorage.getItem(`trav-app:active-day:${params.id}`);
    if (savedDay) setActiveDay(Math.max(1, Number(savedDay) || 1));
    preferencesHydratedRef.current = true;
  }, [params.id]);

  useEffect(() => {
    if (!preferencesHydratedRef.current) return;
    window.localStorage.setItem(`trav-app:right-panel:${params.id}`, rightPanelTab);
    window.localStorage.setItem(`trav-app:active-day:${params.id}`, String(activeDay));
  }, [activeDay, params.id, rightPanelTab]);

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemStartTime, setNewItemStartTime] = useState("");
  const [newItemEndTime, setNewItemEndTime] = useState("");
  const [newItemLat, setNewItemLat] = useState<number | null>(null);
  const [newItemLng, setNewItemLng] = useState<number | null>(null);

  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  const [itineraryItems, setItineraryItems] = useState<any[]>([]);
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [savingTimeId, setSavingTimeId] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const placeSelectionRequestRef = useRef(0);
  const [placeDetailsLoading, setPlaceDetailsLoading] = useState<string | null>(null);
  const placeDetailsCacheRef = useRef<Record<string, any>>({});
  const placeDetailsRequestsRef = useRef<Map<string, Promise<any>>>(new Map());
  const [selectedMapItem, setSelectedMapItem] = useState<any | null>(null);
  const [editingLocationItemId, setEditingLocationItemId] = useState<string | null>(null);
  const [searchMarkers, setSearchMarkers] = useState<any[]>([]);
  const [placeTags, setPlaceTags] = useState<Record<string, string[]>>({});
  const [placeTagsSaving, setPlaceTagsSaving] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 25.0478, lng: 121.5170 });
  const [mapZoom, setMapZoom] = useState(12);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapStatusMessage, setMapStatusMessage] = useState<string | null>(null);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const lastAutoFitDayRef = useRef<number | null>(null);
  const [markerStatuses, setMarkerStatuses] = useState<Record<string, MarkerStatus>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`trav-app:marker-statuses:${params.id}`);
      if (saved) setMarkerStatuses(JSON.parse(saved));
    } catch {
      setMarkerStatuses({});
    }
  }, [params.id]);

  const updateMarkerStatus = useCallback((itemId: string, status: MarkerStatus) => {
    setMarkerStatuses((current) => {
      const next = { ...current, [String(itemId)]: status };
      window.localStorage.setItem(`trav-app:marker-statuses:${params.id}`, JSON.stringify(next));
      return next;
    });
  }, [params.id]);

  const getItemMarkerStatus = useCallback((item: any): MarkerStatus => {
    if (item.completed || item.isCompleted) return 'completed';
    return markerStatuses[String(item.id)] || 'added';
  }, [markerStatuses]);

  const fetchPlaceDetailsOnce = useCallback(async (placeId: string) => {
    const normalizedPlaceId = String(placeId || '');
    if (!normalizedPlaceId) throw new Error('Missing place id');

    const cached = placeDetailsCacheRef.current[normalizedPlaceId];
    if (cached) return cached;

    const existingRequest = placeDetailsRequestsRef.current.get(normalizedPlaceId);
    if (existingRequest) return existingRequest;

    const request = fetch('/api/placedetails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: normalizedPlaceId }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Place details request failed');
        placeDetailsCacheRef.current[normalizedPlaceId] = data;
        return data;
      })
      .finally(() => {
        placeDetailsRequestsRef.current.delete(normalizedPlaceId);
      });

    placeDetailsRequestsRef.current.set(normalizedPlaceId, request);
    return request;
  }, []);

  const loadPlaceDetails = useCallback(async (place: any) => {
    const placeId = String(place?.id || '');
    if (!placeId || place?.isMapPoint) return;

    setPlaceDetailsLoading(placeId);
    try {
      const data = await fetchPlaceDetailsOnce(placeId);
      setSelectedPlace((current: any) => current?.id === placeId ? { ...current, ...data } : current);
    } catch (error) {
      console.error('Place details error:', error);
      setMapStatusMessage('地點詳細資料載入失敗，請稍後再試。');
    } finally {
      setPlaceDetailsLoading((current) => current === placeId ? null : current);
    }
  }, [fetchPlaceDetailsOnce]);

  const getPlaceMapTags = (place: any) => {
    const tags = new Set<string>([
      ...(Array.isArray(place?.tags) ? place.tags : []),
      ...(Array.isArray(placeTags[String(place?.id || '')]) ? placeTags[String(place?.id || '')] : []),
    ]);
    const types = Array.isArray(place?.types) ? place.types : [];

    if (types.includes('restaurant') || types.includes('meal_takeaway') || types.includes('meal_delivery')) tags.add('餐廳');
    if (types.includes('cafe')) tags.add('咖啡廳');
    if (types.includes('lodging')) tags.add('住宿');
    if (types.includes('tourist_attraction') || types.includes('museum') || types.includes('park')) tags.add('景點');
    if (['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'].includes(place?.priceLevel)) tags.add('平價');
    if (types.some((type: string) => ['restaurant', 'cafe', 'meal_takeaway', 'meal_delivery', 'lodging'].includes(type))) tags.add('單人友善');

    return tags;
  };

  const focusMapOnItem = useCallback((item: any) => {
    const lat = Number(item.Latitude);
    const lng = Number(item.Longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setSelectedPlace(null);
    setSelectedMapItem(item);
    setMapCenter({ lat, lng });
    setMapZoom(16);
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(16);
    requestAnimationFrame(() => {
      document.getElementById(`itinerary-item-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  useEffect(() => {
    if (selectedMapItem && !itineraryItems.some((item) => String(item.id) === String(selectedMapItem.id))) {
      setSelectedMapItem(null);
    }
  }, [itineraryItems, selectedMapItem]);

  const resetMapView = useCallback(() => {
    const destination = {
      lat: Number(itineraryData?.destLat) || 25.0478,
      lng: Number(itineraryData?.destLng) || 121.5170,
    };
    mapRef.current?.setCenter(destination);
    mapRef.current?.setZoom(12);
    mapRef.current?.setTilt(0);
    mapRef.current?.setHeading(0);
    setMapCenter(destination);
    setMapZoom(12);
  }, [itineraryData]);

  const fitCurrentDayPlaces = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    const points = itineraryItems
      .filter((item) => item.dayNumber === activeDay && Number.isFinite(Number(item.Latitude)) && Number.isFinite(Number(item.Longitude)))
      .map((item) => ({ lat: Number(item.Latitude), lng: Number(item.Longitude) }));

    if (points.length === 0) {
      resetMapView();
      return;
    }

    if (points.length === 1) {
      mapRef.current.setCenter(points[0]);
      mapRef.current.setZoom(15);
      setMapCenter(points[0]);
      setMapZoom(15);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    mapRef.current.fitBounds(bounds, 64);
  }, [activeDay, itineraryItems, resetMapView]);

  const switchMobilePlannerView = useCallback((view: 'list' | 'map') => {
    setMobilePlannerView(view);
    if (view !== 'map') return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!mapRef.current || !window.google) return;
        window.google.maps.event.trigger(mapRef.current, 'resize');
        fitCurrentDayPlaces();
      });
    });
  }, [fitCurrentDayPlaces]);

  const loadPlaceTags = useCallback(async (places: any[]) => {
    const placeIds = places.map((place) => String(place?.id || '')).filter(Boolean);
    if (!placeIds.length || !currentAccount) return;
    try {
      const response = await fetch('http://localhost:8080/itinerary/places.php?action=get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: params.id, Account: currentAccount, PlaceIds: placeIds }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') setPlaceTags((current) => ({ ...current, ...(data.data || {}) }));
    } catch (error) {
      console.warn('Place tags load failed:', error);
    }
  }, [currentAccount, params.id]);

  const savePlaceTags = useCallback(async (place: any, tags: string[]) => {
    if (!place?.id || !currentAccount) return;
    setPlaceTagsSaving(true);
    try {
      const response = await fetch('http://localhost:8080/itinerary/places.php?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Itinerary_ID: params.id,
          Account: currentAccount,
          Place: {
            GooglePlaceID: place.id,
            Name: place.displayName?.text || place.name || '未命名地點',
            Address: place.formattedAddress || '',
            Latitude: place.location?.latitude,
            Longitude: place.location?.longitude,
          },
          Tags: tags,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '標籤儲存失敗');
      setPlaceTags((current) => ({ ...current, [String(place.id)]: tags }));
    } catch (error) {
      alert(error instanceof Error ? error.message : '標籤儲存失敗');
    } finally {
      setPlaceTagsSaving(false);
    }
  }, [currentAccount, params.id]);

  useEffect(() => {
    routePolylineRef.current?.setMap(null);
    routePolylineRef.current = null;

    if (!mapReady || !window.google || !mapRef.current) return;

    const routeItems = itineraryItems
      .filter((item) => item.dayNumber === activeDay)
      .filter((item) => Number.isFinite(Number(item.Latitude)) && Number.isFinite(Number(item.Longitude)))
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));

    if (routeItems.length < 2) return;

    const path = routeItems.map((item) => ({
      lat: Number(item.Latitude),
      lng: Number(item.Longitude),
    }));

    routePolylineRef.current = new window.google.maps.Polyline({
      path,
      strokeColor: '#F04D79',
      strokeOpacity: 0.85,
      strokeWeight: 5,
      clickable: false,
      map: mapRef.current,
    });

    return () => {
      routePolylineRef.current?.setMap(null);
      routePolylineRef.current = null;
    };
  }, [activeDay, isLoaded, itineraryItems, mapReady]);

  useEffect(() => {
    if (itineraryData) {
      setMapCenter({
        lat: Number(itineraryData.destLat) || 25.0478,
        lng: Number(itineraryData.destLng) || 121.5170,
      });
      setMapZoom(12);
    }
  }, [itineraryData?.destLat, itineraryData?.destLng]);

  useEffect(() => {
    if (!mapReady || !window.google || !mapRef.current || !itineraryData) return;
    if (!itemsLoaded || lastAutoFitDayRef.current === activeDay) return;

    const points = itineraryItems
      .filter((item) => item.dayNumber === activeDay)
      .filter((item) => Number.isFinite(Number(item.Latitude)) && Number.isFinite(Number(item.Longitude)))
      .map((item) => ({ lat: Number(item.Latitude), lng: Number(item.Longitude) }));

    if (points.length === 0) {
      const destination = {
        lat: Number(itineraryData.destLat) || 25.0478,
        lng: Number(itineraryData.destLng) || 121.5170,
      };
      mapRef.current.setCenter(destination);
      mapRef.current.setZoom(12);
      setMapCenter(destination);
      setMapZoom(12);
      lastAutoFitDayRef.current = activeDay;
      return;
    }

    if (points.length === 1) {
      mapRef.current.setCenter(points[0]);
      mapRef.current.setZoom(16);
      setMapCenter(points[0]);
      setMapZoom(16);
      lastAutoFitDayRef.current = activeDay;
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    mapRef.current.fitBounds(bounds, 80);
    lastAutoFitDayRef.current = activeDay;
  }, [activeDay, itineraryData, itineraryItems, itemsLoaded, mapReady]);

const handleKeywordSearch = async (keyword: string, searchCenter = mapCenter) => {
    if (!keyword.trim()) return;
    setNewItemLat(null);
    setNewItemLng(null);
    setIsAddItemOpen(false);

    try {
      const res = await fetch('/api/textsearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: keyword.trim(),
          lat: Number(searchCenter.lat) || Number(itineraryData?.destLat) || 25.0478,
          lng: Number(searchCenter.lng) || Number(itineraryData?.destLng) || 121.5170
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Text search failed');
      
      setSelectedPlace(null);
      setSelectedMapItem(null);
      if (data.places && data.places.length > 0) {
        setMapStatusMessage(null);
        setSearchMarkers(data.places);
        void loadPlaceTags(data.places);
        
        if (mapRef.current && window.google) {
          const bounds = new window.google.maps.LatLngBounds();
          data.places.forEach((place: any) => {
            if (place.location?.latitude && place.location?.longitude) {
              bounds.extend(
                new window.google.maps.LatLng(place.location.latitude, place.location.longitude)
              );
            }
          });
          
          mapRef.current.fitBounds(bounds);
          if (data.places.length === 1) {
            setMapCenter({
              lat: data.places[0].location.latitude,
              lng: data.places[0].location.longitude,
            });
            mapRef.current.setCenter({
              lat: data.places[0].location.latitude,
              lng: data.places[0].location.longitude,
            });
          }
          
          if (data.places.length === 1) {
            setTimeout(() => {
              setMapZoom(16);
              if (mapRef.current) mapRef.current.setZoom(16);
            }, 100);
          }
        }
      } else {
        setSearchMarkers([]);
        setMapStatusMessage('找不到符合條件的地點，請換個關鍵字。');
      }
    } catch (error) {
      console.error("Text search error:", error);
      setSearchMarkers([]);
      setMapStatusMessage('地點搜尋服務暫時無法使用，請稍後再試。');
    }
  };

  const handlePlaceSelect = async (placeId: string) => {
    const selectionRequestId = placeSelectionRequestRef.current + 1;
    placeSelectionRequestRef.current = selectionRequestId;
    try {
      const data = await fetchPlaceDetailsOnce(placeId);
      if (selectionRequestId !== placeSelectionRequestRef.current) return;
      
      if (data.location) {
        const selectedPosition = {
          lat: data.location.latitude,
          lng: data.location.longitude,
        };
        setSearchMarkers([{
          id: data.id || placeId,
          displayName: data.displayName,
          location: data.location,
        }]);
        setSelectedMapItem(null);
        setNewItemLat(data.location.latitude);
        setNewItemLng(data.location.longitude);
        setNewItemTitle(data.displayName?.text || '');

        if (editingLocationItemId) {
          const updateResponse = await fetch('http://localhost:8080/itinerary/items.php?action=update_location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Item_ID: editingLocationItemId,
              Title: data.displayName?.text || '',
              Latitude: data.location.latitude,
              Longitude: data.location.longitude,
            }),
          });
          const updateData = await updateResponse.json();
          if (!updateResponse.ok || updateData.status !== 'success') {
            throw new Error(updateData.message || 'Failed to update item location');
          }
          setEditingLocationItemId(null);
          setSelectedPlace(null);
          await fetchItems(params.id as string);
          return;
        }

        setMapCenter(selectedPosition);
        setMapZoom(16);
        
        if (mapRef.current) {
          mapRef.current.setCenter(selectedPosition);
          mapRef.current.panTo({
            lat: data.location.latitude,
            lng: data.location.longitude
          });
          mapRef.current.setZoom(16);
        }
      } else {
        alert("無法取得地點座標");
      }
    } catch (error) {
      console.error("Fetch place details error:", error);
      setMapStatusMessage('地點詳細資料載入失敗，請稍後再試。');
    }
  };

  const handleNewItemTitleChange = (value: string) => {
    setNewItemTitle(value);
    if (addItemMode === 'search') {
      setNewItemLat(null);
      setNewItemLng(null);
      setSelectedPlace(null);
    }
  };

  const handleMapPoiClick = async (placeId: string) => {
    try {
      const data = await fetchPlaceDetailsOnce(placeId);
      if (!data.location) throw new Error('Place details request did not include a location');

      setSelectedMapItem(null);
      setSearchMarkers([]);
      setSelectedPlace({ ...data, isMapPoint: false });
      setMapCenter({ lat: data.location.latitude, lng: data.location.longitude });
      setMapZoom(17);
    } catch (error) {
      console.error('Map POI details error:', error);
      setMapStatusMessage('地圖地點資料載入失敗，請稍後再試。');
    }
  };

  const findItineraryItemForPlace = (place: any) => {
    const latitude = Number(place?.location?.latitude);
    const longitude = Number(place?.location?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return itineraryItems.find((item) => {
      const itemLatitude = Number(item.Latitude);
      const itemLongitude = Number(item.Longitude);
      return Number.isFinite(itemLatitude)
        && Number.isFinite(itemLongitude)
        && Math.abs(itemLatitude - latitude) < 0.00015
        && Math.abs(itemLongitude - longitude) < 0.00015;
    }) || null;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = useCallback(async (id: string) => {
    try {
      const res = await fetch("http://localhost:8080/itinerary/items.php?action=list", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: id }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setItemsLoaded(true);
        const nextItems = data.data.map((item: any) => {
          const startTime = normalizeLoadedTime(item.startTime);
          const endTime = normalizeLoadedTime(item.endTime);
          return {
            ...item,
            id: String(item.id),
            startTime,
            endTime,
            hasInvalidTime: Boolean((item.startTime && !startTime) || (item.endTime && !endTime)),
            Latitude: item.Latitude === null ? null : Number(item.Latitude),
            Longitude: item.Longitude === null ? null : Number(item.Longitude),
          };
        });
        setItineraryItems((currentItems) => (
          JSON.stringify(currentItems) === JSON.stringify(nextItems) ? currentItems : nextItems
        ));
      }
    } catch (error) { console.error(error); }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth/login"); return; }
    const fetchDetail = async () => {
      try {
        const res = await fetch("http://localhost:8080/itinerary/core.php?action=detail", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: params.id, Account: user.id || (user as any).Account }),
        });
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new Error("伺服器發生內部錯誤");
        const data = await res.json();
        if (data.status === 'success') {
          setItineraryData(data.data);
          setCoverImage(data.data.coverImage || FALLBACK_COVER_IMAGE);
          setCoverImageVersion(Date.now());
          setHasRetriedCoverImage(false);
        } else { alert(data.message); router.push("/planner"); }
      } catch (error) { alert("資料讀取失敗"); } finally { setIsLoading(false); }
    };
    if (params.id) { fetchDetail(); fetchItems(params.id as string); }
  }, [params.id, user, authLoading, router, fetchItems]);

  useEffect(() => {
    if (authLoading || !user || !params.id) return;
    const refreshTimer = window.setInterval(() => fetchItems(params.id as string), 5000);
    return () => window.clearInterval(refreshTimer);
  }, [params.id, user, authLoading, fetchItems]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const previousCoverImage = coverImage;
    const previewUrl = URL.createObjectURL(file); setCoverImage(previewUrl); setIsUploading(true);
    try {
      const optimizedFile = await optimizeCoverImage(file);
      const formData = new FormData(); formData.append("cover_image", optimizedFile); formData.append("Itinerary_ID", params.id as string); formData.append("Account", user?.id || (user as any)?.Account);
      const res = await fetch("http://localhost:8080/itinerary/uploads/upload.php?action=cover", { method: "POST", body: formData });
      const data = await res.json(); if (data.status === 'success') { setCoverImage(data.new_image_url); setCoverImageVersion(Date.now()); setHasRetriedCoverImage(false); } else { alert(data.message); setCoverImage(previousCoverImage); }
    } catch (error) { alert(error instanceof Error ? error.message : "圖片上傳失敗"); setCoverImage(previousCoverImage); } 
    finally { URL.revokeObjectURL(previewUrl); setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleUpdateItineraryInfo = async () => {
    if (!editInfoTitle.trim() || !editInfoStart || !editInfoEnd) { alert("請完整填寫標題與日期"); return; }
    if (new Date(editInfoStart) > new Date(editInfoEnd)) { alert("結束日期不能早於開始日期"); return; }
    try {
      const res = await fetch("http://localhost:8080/itinerary/core.php?action=update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: params.id, Title: editInfoTitle, StartDate: editInfoStart, EndDate: editInfoEnd }) });
      const data = await res.json(); if (data.status === 'success') { setItineraryData({ ...itineraryData, title: editInfoTitle, startDate: editInfoStart, endDate: editInfoEnd }); setIsEditingInfo(false); } else alert(data.message);
    } catch(error) { alert("更新失敗"); }
  };

  const timeToMinutes = (value: string) => {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const getScheduleError = (dayNumber: number, start: string, end: string, itemId?: string, sortOrder?: number) => {
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    if (startMinutes === null || endMinutes === null) return null;
    if (startMinutes === endMinutes) return "開始與結束時間不能相同。";

    const items = itineraryItems
      .filter((item) => item.dayNumber === dayNumber && item.id !== itemId)
      .map((item) => ({ ...item, _sortOrder: Number(item.sortOrder ?? 0) }))
      .concat([{ id: itemId ?? "new", dayNumber, startTime: start, endTime: end, _sortOrder: sortOrder ?? Number.MAX_SAFE_INTEGER }])
      .sort((a, b) => a._sortOrder - b._sortOrder);

    let previous: { clockStart: number; end: number; overnight: boolean } | null = null;
    for (const item of items) {
      const itemStart = timeToMinutes(item.startTime || "");
      const itemEnd = timeToMinutes(item.endTime || "");
      if (itemStart === null || itemEnd === null) continue;

      let timelineStart = itemStart;
      if (previous?.overnight && timelineStart < previous.clockStart) timelineStart += 1440;
      if (previous && timelineStart < previous.end) {
        return `行程時間重疊：${item.startTime} 早於前一個行程結束時間。`;
      }

      previous = {
        clockStart: itemStart,
        end: timelineStart + (itemEnd < itemStart ? itemEnd + 1440 - itemStart : itemEnd - itemStart),
        overnight: itemEnd < itemStart,
      };
    }
    return null;
  };

  const getSuggestedStartTime = (dayNumber: number) => {
    const lastTimedItem = itineraryItems
      .filter((item) => item.dayNumber === dayNumber && timeToMinutes(item.endTime || '') !== null)
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
      .at(-1);
    return lastTimedItem?.endTime || '';
  };

  const openAddItemModal = (mode: 'choose' | 'search' | 'custom' = 'choose') => {
    setAddItemMode(mode);
    setNewItemStartTime(getSuggestedStartTime(activeDay));
    setNewItemEndTime('');
    setIsAddItemOpen(true);
  };

  const handleCreateItem = async () => {
    if (!newItemTitle.trim()) {
      alert("請先選擇或輸入地點");
      return;
    }
    if (addItemMode === 'search' && (!Number.isFinite(newItemLat) || !Number.isFinite(newItemLng))) {
      alert("請先從地圖搜尋結果選擇一個地點，才能儲存座標");
      return;
    }
    const startMinutes = timeToMinutes(newItemStartTime);
    const endMinutes = timeToMinutes(newItemEndTime);
    if ((newItemStartTime && startMinutes === null) || (newItemEndTime && endMinutes === null)) {
      alert("時間格式不正確，請使用 24 小時制（例如 09:30）。");
      return;
    }
    if (startMinutes !== null && endMinutes !== null && startMinutes === endMinutes) {
      alert("開始與結束時間不能相同");
      return;
    }
    const scheduleError = getScheduleError(activeDay, newItemStartTime, newItemEndTime, undefined, Number.MAX_SAFE_INTEGER);
    if (scheduleError) {
      alert(scheduleError);
      return;
    }
    if (!newItemTitle.trim()) return alert("請輸入行程標題"); setIsSubmittingItem(true);
    try {
      const res = await fetch("http://localhost:8080/itinerary/items.php?action=create", {
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          Itinerary_ID: params.id, 
          Day_Number: activeDay, 
          Title: newItemTitle, 
          StartTime: newItemStartTime, 
          EndTime: newItemEndTime,
          Latitude: newItemLat,
          Longitude: newItemLng
        }), 
      });
      const data = await res.json(); 
      if (data.status === 'success') { 
        setNewItemTitle(""); 
        setNewItemStartTime(""); 
        setNewItemEndTime(""); 
        setNewItemLat(null); 
        setNewItemLng(null); 
        setSearchMarkers([]);
        setSelectedPlace(null);
        setIsAddItemOpen(false); 
        fetchItems(params.id as string); 
      } else alert(data.message);
    } catch (error) { alert("連線異常"); } finally { setIsSubmittingItem(false); }
  };

  const handleUpdateTitle = async (itemId: string) => {
    if (!editingTitle.trim()) return setEditingItemId(null);
    try {
      const res = await fetch("http://localhost:8080/itinerary/items.php?action=update_title", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId, Title: editingTitle }) });
      const data = await res.json(); if (data.status === 'success') fetchItems(params.id as string); else alert(data.message);
    } catch(error) { alert("更新失敗"); } finally { setEditingItemId(null); }
  };

  const handleUpdateTime = async (itemId: string) => {
    if (savingTimeId === itemId) return;
    const startMinutes = timeToMinutes(editStartTime);
    const endMinutes = timeToMinutes(editEndTime);
    if ((editStartTime && startMinutes === null) || (editEndTime && endMinutes === null)) {
      alert("時間格式不正確，請使用 24 小時制（例如 09:30）。");
      return;
    }
    if (startMinutes !== null && endMinutes !== null && startMinutes === endMinutes) {
      alert("開始與結束時間不能相同");
      return;
    }
    const currentItem = itineraryItems.find((item) => item.id === itemId);
    const scheduleError = getScheduleError(activeDay, editStartTime, editEndTime, itemId, Number(currentItem?.sortOrder ?? 0));
    if (scheduleError) {
      alert(scheduleError);
      return;
    }
    setSavingTimeId(itemId);
    try {
      const res = await fetch("http://localhost:8080/itinerary/items.php?action=update_time", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId, StartTime: editStartTime, EndTime: editEndTime }) });
      const data = await res.json(); if (data.status === 'success') fetchItems(params.id as string); else alert(data.message);
    } catch(error) { alert("更新失敗"); } finally { setEditingTimeId(null); }
    setSavingTimeId(null);
    setEditingTimeId(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("確定要刪除此行程嗎？")) return;
    setSelectedMapItem((current: any) => current?.id === itemId ? null : current);
    setMarkerStatuses((current) => {
      const next = { ...current };
      delete next[String(itemId)];
      window.localStorage.setItem(`trav-app:marker-statuses:${params.id}`, JSON.stringify(next));
      return next;
    });
    setItineraryItems(items => items.filter(item => item.id !== itemId));
    try {
      const res = await fetch("http://localhost:8080/itinerary/items.php?action=delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId }) });
      const data = await res.json(); if (data.status !== 'success') { alert(data.message); fetchItems(params.id as string); }
    } catch(error) { alert("刪除失敗"); fetchItems(params.id as string); }
  };

  const handleDuplicateItem = async (item: any) => {
    try {
      const res = await fetch("http://localhost:8080/itinerary/items.php?action=create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Itinerary_ID: params.id,
          Day_Number: item.dayNumber,
          Title: `${item.title}（複製）`,
          StartTime: "",
          EndTime: "",
          Latitude: item.Latitude,
          Longitude: item.Longitude,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') fetchItems(params.id as string);
      else alert(data.message);
    } catch (error) {
      alert("複製行程失敗");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItineraryItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id); const newIndex = items.findIndex((item) => item.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return items;
        const oldDayItems = items.filter(item => item.dayNumber === activeDay);
        const newItems = arrayMove(items, oldIndex, newIndex);
        const currentDayItems = newItems.filter(item => item.dayNumber === activeDay);
        const timeSlots = oldDayItems.map(item => ({ startTime: item.startTime || "", endTime: item.endTime || "" }));
        const itemsWithSwappedTimes = newItems.map((item) => {
          const dayIndex = currentDayItems.findIndex(dayItem => dayItem.id === item.id);
          if (item.dayNumber !== activeDay || dayIndex < 0) return item;
          return { ...item, startTime: timeSlots[dayIndex].startTime, endTime: timeSlots[dayIndex].endTime };
        });
        const sortUpdates = currentDayItems.map((item, index) => ({ id: item.id, sortOrder: index }));
        fetch("http://localhost:8080/itinerary/items.php?action=sort", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates: sortUpdates }) }).catch(err => console.error(err));
        const timeUpdates = currentDayItems.map((item, index) => ({ item, slot: timeSlots[index] }))
          .filter(({ item, slot }) => item.startTime !== slot.startTime || item.endTime !== slot.endTime);
        Promise.all(timeUpdates.map(({ item, slot }) => fetch("http://localhost:8080/itinerary/items.php?action=update_time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Item_ID: item.id, StartTime: slot.startTime, EndTime: slot.endTime }),
        }))).catch(() => fetchItems(params.id as string));
        return itemsWithSwappedTimes;
      });
    }
  };

  if (authLoading || isLoading) return <div className="h-screen w-full flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin text-slate-300 size-8" /></div>;
  
  if (!itineraryData) {
    return (
      <div className="h-[60vh] w-full flex flex-col items-center justify-center bg-[#FAFAFA]">
        <p className="text-slate-500 mb-4 font-bold tracking-wide">
          無法載入行程。該行程可能不存在或您沒有讀取權限。
        </p>
        <button onClick={() => router.push('/planner')} className="px-6 py-2 bg-[#F04D79] text-white rounded-lg font-bold shadow-sm hover:bg-pink-600 transition-colors">
          返回行程列表
        </button>
      </div>
    );
  }

  const currentDayItems = itineraryItems.filter((item) => item.dayNumber === activeDay);

  return (
    <div className={`itinerary-page fixed inset-0 ${isMobilePanelOpen ? 'z-[60]' : 'z-40'} flex flex-col bg-[#F4F2ED] font-sans text-slate-800`}>
      
      <header className="hidden md:flex h-16 bg-white border-b border-slate-100 items-center justify-between px-6 shrink-0 z-50">
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

      <div className="flex flex-1 overflow-visible xl:overflow-hidden">
        <div className={`${mobilePlannerView === 'list' ? 'flex' : 'hidden'} w-full md:flex md:w-[380px] shrink-0 bg-white border-r border-slate-100 flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.01)] relative`}>
          <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-slate-100 group md:h-40 md:aspect-auto">
            <img
              src={coverImageWithVersion(coverImage, coverImageVersion)}
              alt="行程封面"
              onError={() => {
                if (!hasRetriedCoverImage && coverImage && !coverImage.startsWith("blob:")) {
                  setHasRetriedCoverImage(true);
                  setCoverImageVersion(Date.now());
                  return;
                }
                if (coverImage !== FALLBACK_COVER_IMAGE) {
                  setCoverImage(FALLBACK_COVER_IMAGE);
                  setCoverImageVersion(Date.now());
                }
              }}
              className={`h-full w-full object-cover object-center transition-all duration-700 ${isUploading ? 'opacity-50 grayscale blur-sm' : 'group-hover:scale-105 group-hover:brightness-90'}`}
            />
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="absolute inset-0 flex cursor-pointer items-end justify-end p-3 text-white transition hover:bg-slate-950/10 disabled:cursor-wait md:m-auto md:size-12 md:items-center md:justify-center md:rounded-full md:bg-slate-900/60 md:p-0 md:opacity-0 md:group-hover:opacity-100 md:hover:scale-110 md:hover:bg-[#F04D79]">
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <><Camera size={18} /><span className="ml-1.5 rounded-full bg-slate-900/65 px-2.5 py-1 text-xs font-bold backdrop-blur-sm md:hidden">更換封面</span></>}
            </button>
            <button onClick={() => router.push('/planner')} className="absolute top-4 left-4 z-10 flex size-8 items-center justify-center rounded-full bg-slate-900/40 text-white backdrop-blur-sm transition-colors hover:bg-[#F04D79]">
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
                <h1 className="text-xl font-bold text-slate-900 tracking-wide mb-2 truncate">{itineraryData.title}</h1>
                <div className="flex items-center text-xs font-medium text-slate-400 tracking-wide">
                  <Calendar size={14} className="mr-2 opacity-70" />
                  {itineraryData.startDate} - {itineraryData.endDate}
                </div>
                <button onClick={() => { setEditInfoTitle(itineraryData.title); setEditInfoStart(itineraryData.startDate.replace(/\//g, '-')); setEditInfoEnd(itineraryData.endDate.replace(/\//g, '-')); setIsEditingInfo(true); }} className="absolute right-4 top-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#F04D79] md:right-6 md:bg-slate-50 md:p-2 md:text-slate-400 md:opacity-0 md:group-hover/header:opacity-100 md:hover:text-white" title="編輯行程名稱與日期" aria-label="編輯行程名稱與日期"><Edit2 size={16} /><span className="md:hidden">編輯</span></button>
              </>
            )}
          </div>

          <div className="flex gap-1 border-b border-slate-100 bg-white p-3 md:hidden">
            <button type="button" onClick={() => switchMobilePlannerView('list')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${mobilePlannerView === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}><LayoutGrid size={16} />清單</button>
            <button type="button" onClick={() => switchMobilePlannerView('map')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${mobilePlannerView === 'map' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}><MapIcon size={16} />地圖</button>
          </div>

          <div className="flex overflow-x-auto hide-scrollbar px-6 border-b border-slate-100 gap-6">
            {(() => {
              const start = new Date(itineraryData.startDate); const end = new Date(itineraryData.endDate);
              const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
              return Array.from({ length: totalDays }, (_, i) => i + 1).map((dayIndex) => {
                const dayCount = itineraryItems.filter((item) => item.dayNumber === dayIndex).length;
                return (
                <button key={dayIndex} onClick={() => { setActiveDay(dayIndex); setSelectedMapItem(null); setSelectedPlace(null); setSearchMarkers([]); }} className={`pb-3 text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeDay === dayIndex ? 'font-bold text-[#F04D79] border-b-2 border-[#F04D79]' : 'font-medium text-slate-400 hover:text-slate-600'}`}>
                  <span>Day {dayIndex}</span><span className={`text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center ${activeDay === dayIndex ? 'bg-pink-100 text-[#F04D79]' : 'bg-slate-100 text-slate-400'}`}>{dayCount}</span>
                </button>
                );
              });
            })()}
          </div>

          <div className="px-6 py-2.5 bg-white border-b border-slate-100 text-[11px] font-bold tracking-wide">
            <span className="text-slate-500">Day {activeDay} 行程摘要</span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/30">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={currentDayItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                {currentDayItems.map((item, index) => {
                  const timeFlags = getTimeFlags(currentDayItems, index);
                  return (
                    <div key={item.id} className="relative">
                      {index < currentDayItems.length - 1 && <div className="absolute left-[2.1rem] top-full z-0 h-3.5 border-l-2 border-dashed border-slate-200" />}
                      <SortableItem key={item.id} item={item} editingItemId={editingItemId} editingTitle={editingTitle} setEditingItemId={setEditingItemId} setEditingTitle={setEditingTitle} handleUpdateTitle={handleUpdateTitle} editingTimeId={editingTimeId} editStartTime={editStartTime} editEndTime={editEndTime} setEditingTimeId={setEditingTimeId} setEditStartTime={setEditStartTime} setEditEndTime={setEditEndTime} handleUpdateTime={handleUpdateTime} handleDeleteItem={handleDeleteItem} handleDuplicateItem={handleDuplicateItem} onFocusItem={focusMapOnItem} isMapItemSelected={selectedMapItem?.id === item.id} savingTimeId={savingTimeId} timeFlags={timeFlags} markerStatus={getItemMarkerStatus(item)} onMarkerStatusChange={updateMarkerStatus} />
                    </div>
                  );
                })}
              </SortableContext>
            </DndContext>
            {currentDayItems.length === 0 && (
              <div className="text-center py-8 px-5 border border-dashed border-slate-200 rounded-2xl bg-white/70">
                <div className="mx-auto mb-3 size-11 rounded-full bg-pink-50 flex items-center justify-center text-[#F04D79]"><MapPin size={20} /></div>
                <p className="text-sm font-bold text-slate-600">Day {activeDay} 還沒有行程</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">從地圖搜尋景點，或建立一個自訂地點開始規劃。</p>
              </div>
            )}
            <div className="sticky bottom-0 z-10 -mx-5 mt-2 px-5 pt-3 pb-1 bg-slate-50/95 backdrop-blur-sm">
              <button onClick={() => openAddItemModal()} className="w-full py-3.5 bg-[#F04D79] text-white rounded-2xl hover:bg-pink-600 flex items-center justify-center gap-2 text-sm font-bold tracking-wide shadow-md transition-all duration-300"><Plus size={17} /> 新增地點</button>
            </div>
          </div>
        </div>

        <div className={`${mobilePlannerView === 'map' && !isMobilePanelOpen ? 'flex' : 'hidden'} md:flex flex-1 relative items-center justify-center overflow-hidden bg-slate-100`}>
          {loadError ? (
            <div className="max-w-sm px-6 text-center text-sm text-slate-500">
              <MapPin className="mx-auto mb-3 text-[#F04D79]" size={28} />
              <p className="font-bold text-slate-700">地圖載入失敗</p>
              <p className="mt-1">請確認 Google Maps API Key 與網路連線後重新整理。</p>
            </div>
          ) : !isLoaded ? (
            <Loader2 className="animate-spin text-slate-300 size-8" />
          ) : (
            <>
              <div className="absolute left-4 top-4 z-[50] hidden w-80 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-md md:block">
                <PlaceAutocomplete
                  value={newItemTitle}
                  onChange={setNewItemTitle}
                  locationBias={{
                    lat: Number(itineraryData?.destLat) || 25.0478,
                    lng: Number(itineraryData?.destLng) || 121.5170,
                  }}
                  onPlaceSelect={handlePlaceSelect}
                  onKeywordSearch={handleKeywordSearch}
                />
              </div>

              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={mapZoom}
                options={{ disableDefaultUI: true, zoomControl: mobilePlannerView !== 'map', gestureHandling: 'greedy', draggable: true, scrollwheel: true }}
                onClick={(event) => {
                  const mapEvent = event as google.maps.MapMouseEvent & { placeId?: string };
                  if (mapEvent.placeId) {
                    event.stop();
                    void handleMapPoiClick(mapEvent.placeId);
                    return;
                  }
                  const lat = event.latLng?.lat();
                  const lng = event.latLng?.lng();
                  if (typeof lat !== 'number' || typeof lng !== 'number') return;
                  setSelectedMapItem(null);
                  setSearchMarkers([]);
                  setSelectedPlace({
                    id: `map-${Date.now()}`,
                    displayName: { text: '地圖位置' },
                    formattedAddress: `座標 ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                    location: { latitude: lat, longitude: lng },
                    isMapPoint: true,
                  });
                }}
                onLoad={(map) => { mapRef.current = map; setMapReady(true); }}
                onIdle={() => {
                  const center = mapRef.current?.getCenter();
                  if (!center) return;
                  const nextCenter = { lat: center.lat(), lng: center.lng() };
                  setMapCenter((current) => (
                    Math.abs(current.lat - nextCenter.lat) < 0.000001 && Math.abs(current.lng - nextCenter.lng) < 0.000001
                      ? current
                      : nextCenter
                  ));
                }}
                onUnmount={() => { routePolylineRef.current?.setMap(null); routePolylineRef.current = null; mapRef.current = null; setMapReady(false); }}
              >
                {mapStatusMessage && (
                  <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-xl border border-amber-200 bg-white/95 px-4 py-2.5 text-center text-xs font-semibold text-slate-600 shadow-lg backdrop-blur-md">
                    {mapStatusMessage}
                  </div>
                )}
                <MarkerClustererF options={{ gridSize: 48, minimumClusterSize: 2, maxZoom: 15, zoomOnClick: true }}>
                  {(clusterer) => (
                    <>
                      {currentDayItems
                        .filter((item) => Number.isFinite(Number(item.Latitude)) && Number.isFinite(Number(item.Longitude)))
                        .map((item, index) => (
                          <Marker
                            key={`itinerary-${item.id}`}
                            clusterer={clusterer}
                            position={{ lat: Number(item.Latitude), lng: Number(item.Longitude) }}
                            title={`${item.title || '行程地點'} · ${getMarkerStatusOption(getItemMarkerStatus(item)).label}`}
                            label={{ text: String(index + 1), color: "white", fontWeight: "bold" }}
                            icon={isLoaded && window.google ? {
                              path: window.google.maps.SymbolPath.CIRCLE,
                              fillColor: getMarkerStatusOption(getItemMarkerStatus(item)).fill,
                              fillOpacity: 1,
                              strokeColor: 'white',
                              strokeWeight: 2,
                              scale: selectedMapItem?.id === item.id ? 13 : 10,
                            } : undefined}
                            onClick={() => focusMapOnItem(item)}
                          />
                        ))}

                      {searchMarkers.map((place) => (
                        <Marker
                          key={`search-${place.id}`}
                          clusterer={clusterer}
                          position={{
                            lat: place.location.latitude,
                            lng: place.location.longitude
                          }}
                          label={{
                            text: place.displayName?.text?.charAt(0) || "?",
                            color: "black",
                            fontWeight: "bold"
                          }}
                          icon={{
                            url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                          }}
                          onClick={() => { setSelectedMapItem(null); setSelectedPlace(place); void loadPlaceDetails(place); }}
                        />
                      ))}
                    </>
                  )}
                </MarkerClustererF>

                {selectedMapItem && (
                  <InfoWindow
                    position={{ lat: Number(selectedMapItem.Latitude), lng: Number(selectedMapItem.Longitude) }}
                    onCloseClick={() => setSelectedMapItem(null)}
                  >
                    <div className="p-1 max-w-[220px] text-slate-800">
                      <h3 className="font-bold text-base mb-1">{selectedMapItem.title}</h3>
                      {(selectedMapItem.startTime || selectedMapItem.endTime) && (
                        <p className="text-xs text-slate-500">
                          {selectedMapItem.startTime || ''}{selectedMapItem.endTime ? ` - ${selectedMapItem.endTime}` : ''}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-400">Day {selectedMapItem.dayNumber}</p>
                      <button
                        type="button"
                        onClick={() => focusMapOnItem(selectedMapItem)}
                        className="mb-2 w-full rounded-md border border-slate-200 py-1.5 text-xs font-bold text-slate-600 hover:border-[#F04D79] hover:text-[#F04D79]"
                      >
                        查看行程
                      </button>
                      <button
                        onClick={() => {
                          setEditingLocationItemId(selectedMapItem.id);
                          setSelectedMapItem(null);
                          setSearchMarkers([]);
                          setNewItemTitle('');
                        }}
                        className="w-full mt-3 bg-slate-900 text-white py-1.5 rounded-md text-xs font-bold hover:bg-[#F04D79] transition-colors"
                      >
                        重新選擇地點
                      </button>
                    </div>
                  </InfoWindow>
                )}

                {selectedPlace && (
                  <InfoWindow
                    position={{
                      lat: selectedPlace.location.latitude,
                      lng: selectedPlace.location.longitude
                    }}
                    onCloseClick={() => setSelectedPlace(null)}
                  >
                    <div className="p-1 max-w-[200px] text-slate-800">
                      <h3 className="font-bold text-base mb-1">{selectedPlace.displayName?.text}</h3>
                      {(() => {
                        const tagOptions = ['單人友善', '寵物友善', '餐廳', '咖啡廳'];
                        const savedTags = placeTags[String(selectedPlace.id)];
                        const inferredTags = Array.from(getPlaceMapTags(selectedPlace));
                        const currentTags = savedTags || inferredTags;
                        return <div className="mb-2 flex flex-wrap gap-1">
                          {tagOptions.map((tag) => {
                            const selected = currentTags.includes(tag);
                            return <button key={tag} type="button" disabled={placeTagsSaving} onClick={() => savePlaceTags(selectedPlace, selected ? currentTags.filter((item) => item !== tag) : [...currentTags, tag])} className={`rounded-full border px-2 py-1 text-[10px] font-bold transition ${selected ? 'border-[#F04D79] bg-pink-50 text-[#F04D79]' : 'border-slate-200 text-slate-400 hover:border-[#F04D79] hover:text-[#F04D79]'} disabled:opacity-50`}>{selected ? '✓ ' : '+ '}{tag}</button>;
                          })}
                        </div>;
                      })()}
                      {placeDetailsLoading === selectedPlace.id && (
                        <p className="mb-2 text-[10px] font-semibold text-slate-400">載入地點詳細資料…</p>
                      )}
                      {selectedPlace.photos?.[0]?.name && (
                        <img
                          src={`/api/placephoto?name=${encodeURIComponent(selectedPlace.photos[0].name)}`}
                          alt={`${selectedPlace.displayName?.text || '地點'}圖片`}
                          className="mb-2 h-24 w-full rounded-lg object-cover"
                          loading="lazy"
                        />
                      )}
                      {typeof selectedPlace.currentOpeningHours?.openNow === 'boolean' && (
                        <p className={`mb-1 text-xs font-bold ${selectedPlace.currentOpeningHours.openNow ? 'text-emerald-600' : 'text-red-500'}`}>
                          {selectedPlace.currentOpeningHours.openNow ? '目前營業中' : '目前休息中'}
                        </p>
                      )}
                      {selectedPlace.regularOpeningHours?.weekdayDescriptions?.length > 0 && (
                        <details className="mb-2 text-[10px] text-slate-500">
                          <summary className="cursor-pointer font-bold text-slate-600">查看營業時間</summary>
                          <div className="mt-1 space-y-0.5">
                            {selectedPlace.regularOpeningHours.weekdayDescriptions.slice(0, 7).map((hours: string) => <p key={hours}>{hours}</p>)}
                          </div>
                        </details>
                      )}
                      {selectedPlace.isMapPoint && (
                        <p className="mb-3 text-xs text-slate-500">已選取地圖位置，可直接加入 Day {activeDay} 行程</p>
                      )}
                      {selectedPlace.rating && (
                        <p className="text-xs text-amber-500 font-bold mb-1">★ {selectedPlace.rating}</p>
                      )}
                      {selectedPlace.nationalPhoneNumber && <p className="mb-1 text-xs text-slate-500">電話：{selectedPlace.nationalPhoneNumber}</p>}
                      {selectedPlace.formattedAddress && (
                        <p className="text-xs text-slate-500 mb-3">{selectedPlace.formattedAddress}</p>
                      )}
                      {(selectedPlace.websiteUri || selectedPlace.googleMapsUri) && (
                        <div className="mb-2 flex gap-2 text-[10px] font-bold">
                          {selectedPlace.websiteUri && <a href={selectedPlace.websiteUri} target="_blank" rel="noreferrer" className="text-[#F04D79] hover:underline">官方網站</a>}
                          {selectedPlace.googleMapsUri && <a href={selectedPlace.googleMapsUri} target="_blank" rel="noreferrer" className="text-[#F04D79] hover:underline">Google Maps</a>}
                        </div>
                      )}
                      {(() => {
                        const itineraryItem = findItineraryItemForPlace(selectedPlace);
                        return itineraryItem ? (
                          <button
                            type="button"
                            onClick={() => { setSelectedPlace(null); focusMapOnItem(itineraryItem); }}
                            className="mb-2 w-full rounded-md border border-[#F04D79] py-1.5 text-xs font-bold text-[#F04D79] hover:bg-pink-50"
                          >
                            已加入 Day {itineraryItem.dayNumber} · 查看行程
                          </button>
                        ) : (
                          <p className="mb-2 rounded-md bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-500">尚未加入 Day {activeDay}</p>
                        );
                      })()}
                      
                      <button
                        disabled={Boolean(findItineraryItemForPlace(selectedPlace))}
                        onClick={() => {
                          setNewItemTitle(selectedPlace.displayName?.text || '');
                          setNewItemLat(selectedPlace.location.latitude);
                          setNewItemLng(selectedPlace.location.longitude);
                          setSelectedPlace(null); 
                          openAddItemModal('search');
                        }}
                        className="w-full bg-[#F04D79] text-white py-1.5 rounded-md text-xs font-bold hover:bg-pink-600 transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        設定為行程地點
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
              {mobilePlannerView === 'map' && (
                <div className="absolute bottom-24 right-4 z-[100] flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg md:hidden">
                  <button type="button" onClick={() => { const zoom = mapRef.current?.getZoom(); if (typeof zoom !== 'number') return; const nextZoom = Math.min(20, zoom + 1); mapRef.current?.setZoom(nextZoom); setMapZoom(nextZoom); }} className="flex size-10 items-center justify-center border-b border-slate-200 text-2xl font-light text-slate-600 transition hover:bg-slate-50" aria-label="放大地圖">+</button>
                  <button type="button" onClick={() => { const zoom = mapRef.current?.getZoom(); if (typeof zoom !== 'number') return; const nextZoom = Math.max(3, zoom - 1); mapRef.current?.setZoom(nextZoom); setMapZoom(nextZoom); }} className="flex size-10 items-center justify-center text-2xl font-light text-slate-600 transition hover:bg-slate-50" aria-label="縮小地圖">−</button>
                </div>
              )}
              <div className="absolute left-4 top-20 z-[110] md:top-4 md:hidden">
                <button type="button" onClick={() => switchMobilePlannerView('list')} className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-lg backdrop-blur transition hover:bg-slate-100" aria-label="切換至清單"><LayoutGrid size={18} /></button>
              </div>
              <div className="absolute left-1/2 top-20 z-[100] w-[calc(100%-8rem)] max-w-sm -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-2 shadow-lg backdrop-blur md:hidden">
                <PlaceAutocomplete
                  value={newItemTitle}
                  onChange={setNewItemTitle}
                  locationBias={{
                    lat: Number(itineraryData?.destLat) || 25.0478,
                    lng: Number(itineraryData?.destLng) || 121.5170,
                  }}
                  onPlaceSelect={handlePlaceSelect}
                  onKeywordSearch={handleKeywordSearch}
                />
              </div>
              </>
            )}
          </div>

          <div className={`${isMobilePanelOpen ? 'flex' : 'hidden'} xl:flex absolute xl:static inset-0 xl:inset-auto z-[70] xl:z-auto h-full xl:h-auto w-full xl:w-[340px] shrink-0 flex-col bg-white border-0 xl:border-l xl:border-slate-100 shadow-2xl xl:shadow-[-4px_0_24px_rgba(0,0,0,0.01)]`}>
            <div className="xl:hidden flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4">
              <button type="button" onClick={() => setIsMobilePanelOpen(false)} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600" aria-label="返回行程"><ChevronLeft size={20} /></button>
              <div className="min-w-0"><p className="truncate text-[11px] font-bold tracking-[0.14em] text-slate-400">{itineraryData?.title || '行程'}</p><h2 className="truncate text-base font-bold text-slate-800">{rightPanelTab === 'budget' ? '旅程記帳' : '行李清單'}</h2></div>
            </div>
            <div className="hidden xl:flex pt-2 px-2 border-b border-slate-100 gap-1 shrink-0">
              {[
                { id: 'budget' as const, icon: Wallet, label: '記帳' },
                { id: 'luggage' as const, icon: BaggageClaim, label: '行李' },
              ].map((tab) => (
                <button key={tab.id} type="button" className={`flex-1 py-3 flex flex-col items-center gap-1.5 transition-colors ${rightPanelTab === tab.id ? 'text-[#F04D79] border-b-2 border-[#F04D79]' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => setRightPanelTab(tab.id)}>
                  <tab.icon size={16} />
                  <span className="text-[10px] font-bold tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50/30">
              {rightPanelTab === 'budget' && <BudgetPanel itineraryId={params.id as string} currentUserId={String(user?.id || (user as any)?.Account || '')}  />}
              {rightPanelTab === 'luggage' && <div className="p-4"><LuggagePanel itineraryId={params.id as string} currentUserId={String(user?.id || (user as any)?.Account || '')} /></div>}
            </div>
          </div>
        </div>

        <nav className={`${mobilePlannerView === 'map' ? 'hidden' : 'grid'} fixed inset-x-0 bottom-0 z-40 grid-cols-3 gap-1 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden`}>
          <button type="button" onClick={() => setIsMobilePanelOpen(false)} className={`flex min-w-0 flex-col items-center gap-1 py-1 text-[10px] font-bold ${!isMobilePanelOpen ? 'text-[#F04D79]' : 'text-slate-400'}`}><LayoutGrid size={18} />行程</button>
          {[
            { id: 'budget' as const, label: '記帳', icon: Wallet },
            { id: 'luggage' as const, label: '行李', icon: BaggageClaim },
          ].map((tab) => {
            const Icon = tab.icon;
            return <button key={tab.id} type="button" onClick={() => { setRightPanelTab(tab.id); setIsMobilePanelOpen(true); }} className={`flex min-w-0 flex-col items-center gap-1 py-1 text-[10px] font-bold ${isMobilePanelOpen && rightPanelTab === tab.id ? 'text-[#F04D79]' : 'text-slate-400'}`}><Icon size={18} />{tab.label}</button>;
          })}
        </nav>

        {isAddItemOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddItemOpen(false)}></div>
            
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 tracking-widest">新增 Day {activeDay} 行程</h3>
                <button onClick={() => setIsAddItemOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              {addItemMode === 'choose' && (
                <div className="grid gap-3">
                  <button onClick={() => openAddItemModal('search')} className="w-full rounded-2xl border border-pink-100 bg-pink-50/60 p-4 text-left hover:border-[#F04D79] hover:bg-pink-50 transition-colors">
                    <div className="flex items-center gap-3"><MapPin className="text-[#F04D79]" size={22} /><span><span className="block text-sm font-bold text-slate-800">搜尋地點</span><span className="block mt-1 text-xs text-slate-400">從地圖或 Google Maps 選擇景點</span></span></div>
                  </button>
                  <button onClick={() => openAddItemModal('custom')} className="w-full rounded-2xl border border-slate-200 p-4 text-left hover:border-pink-200 hover:bg-pink-50/40 transition-colors">
                    <div className="flex items-center gap-3"><Edit2 className="text-slate-500" size={22} /><span><span className="block text-sm font-bold text-slate-800">自訂地點</span><span className="block mt-1 text-xs text-slate-400">輸入名稱後再補上地圖位置</span></span></div>
                  </button>
                </div>
              )}

              <div className={addItemMode !== 'choose' ? 'space-y-4' : 'hidden'}>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">
                    <span className="text-[#F04D79] mr-1">*</span> {addItemMode === 'custom' ? '地點名稱' : '已選地點'}
                  </label>
                  {addItemMode === 'custom' ? (
                    <input autoFocus type="text" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} placeholder="例如：台北車站" className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#F04D79]" />
                  ) : (
                    <>
                      <div className="block">
                        <PlaceAutocomplete
                          value={newItemTitle}
                          onChange={handleNewItemTitleChange}
                          locationBias={{
                            lat: Number(itineraryData?.destLat) || 25.0478,
                            lng: Number(itineraryData?.destLng) || 121.5170,
                          }}
                          onPlaceSelect={handlePlaceSelect}
                          onKeywordSearch={handleKeywordSearch}
                        />
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-bold text-slate-600">開始時間</label>
                    <input 
                      type="text" inputMode="numeric" placeholder="HH:mm" maxLength={5} value={newItemStartTime} onChange={(e) => setNewItemStartTime(formatTimeInput(e.target.value))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#F04D79]"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-bold text-slate-600">結束時間</label>
                    <input 
                      type="text" inputMode="numeric" placeholder="HH:mm" maxLength={5} value={newItemEndTime} onChange={(e) => setNewItemEndTime(formatTimeInput(e.target.value))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#F04D79]"
                    />
                  </div>
                </div>
                {newItemStartTime && (
                  <p className="mt-2 text-xs font-medium text-slate-400">已自動帶入上一個行程的結束時間，可直接修改。</p>
                )}
              </div>

              <div className={addItemMode !== 'choose' ? 'mt-8 flex justify-end gap-3' : 'hidden'}>
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
    </div>
  );
}
