'use client';

/**
 * 中文閱讀導覽：封面工具 → 記帳 → 行李 → 時間與標記 → 可拖曳卡片 → 主編輯器 → JSX。
 * [id] 是動態路由行程 ID，useParams 讀取，useRouter 導航。
 * core.php 管主資料；items.php 管項目；expenses.php 管花費；luggage.php 管行李。
 * 天數與面板使用預設值，行程標點統一顏色，不保存本機畫面偏好或標記狀態。
 * state 更新畫面，ref 保存物件但不重繪，Effect 負責外部同步及清理。
 * 檢查注意標示仍待處理的既有風險。
 * 依據：此檔與對應 API、專案 Next.js use-client/use-params 文件。
 */

// 這頁會讀取登入狀態、操作地圖和表單，因此必須是 Client Component。
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { 
  Map as MapIcon, Calendar, BaggageClaim,
  GripVertical, Plus, Camera,
  ChevronLeft, Wallet, Loader2, MapPin, Trash2, Check, Edit2,
  LayoutGrid,
  XCircle,
  X, User
} from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import PlaceAutocomplete from '../../components/PlaceAutocomplete';

import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 原圖直接上傳，大小限制與後端一致，最多 10 MiB。
const MAX_COVER_SOURCE_BYTES = 10 * 1024 * 1024;
// 無封面或載入失敗時的備用圖片，仍需網路。
const FALLBACK_COVER_IMAGE = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop";

/**
 * 將儲存的封面來源轉成實際顯示網址，不修改資料庫中的原始網址。
 * blob/data 已指向當次內容，直接保留；uploads/covers 則只抽出檔名交給同源 /api/cover。
 * 一般網址依是否已有查詢參數選擇 ? 或 & 加上版本；空來源回傳備用圖。
 */
function coverImageWithVersion(imageUrl: string, version: number) {
  if (!imageUrl || imageUrl.startsWith("blob:") || imageUrl.startsWith("data:")) return imageUrl || FALLBACK_COVER_IMAGE;
  const localCoverMatch = imageUrl.match(/\/uploads\/covers\/([^/?#]+)/i);
  if (localCoverMatch) return `/api/cover?file=${encodeURIComponent(localCoverMatch[1])}&v=${version}`;
  return `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${version}`;
}

type PersonalExpense = {
  id: number;
  title: string;
  amount: number | string;
  category: string;
  location: string | null;
  date: string;
};

// 個人記帳獨立成面板：用行程 ID 和目前帳號向 PHP 讀寫，避免與主編輯器的地圖狀態混在一起。
/**
 * 個人記帳面板的資料流：掛載讀清單 → 新增／修改草稿 → 驗證後送出 → 重讀清單。
 * editingId 決定同一表單要新增還是修改，列表本身不會隨草稿輸入而變動。
 * API 同時檢查 HTTP 狀態與 JSON 的 status；錯誤留在面板或表單中顯示。
 */
function BudgetPanel({ itineraryId, currentUserId }: { itineraryId: string; currentUserId: string }) {
  const categories = [
    { value: 'food', label: '餐飲' },
    { value: 'hotel', label: '住宿' },
    { value: 'transport', label: '交通' },
    { value: 'ticket', label: '門票' },
    { value: 'shopping', label: '購物' },
    { value: 'other', label: '其他' },
  ];
  // 後端回傳的花費清單；列表與總金額都以這份資料為準。
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  // 記帳首次讀取是否尚未結束；與主頁及 Google Maps 的載入狀態分開管理。
  const [loading, setLoading] = useState(true);
  // 記帳表單是否正在送出；期間停用儲存與取消按鈕，避免重複操作。
  const [saving, setSaving] = useState(false);
  // 記帳讀寫或欄位驗證的錯誤訊息；空字串表示沒有要顯示的錯誤。
  const [error, setError] = useState('');
  // 新增／修改花費共用視窗的開關；切換模式時會另外初始化草稿。
  const [formOpen, setFormOpen] = useState(false);
  // 正在修改的花費 ID；null 代表新增，送出時據此選擇 create 或 update。
  const [editingId, setEditingId] = useState<number | null>(null);
  // 花費名稱草稿；編輯時先複製原資料，只有儲存成功才重新讀取清單。
  const [title, setTitle] = useState('');
  // 金額輸入草稿以字串保存，允許使用者輸入中間狀態；送出時再轉數字驗證。
  const [amount, setAmount] = useState('');
  // 花費分類代碼，對應上方 categories 的 value；新增預設為餐飲 food。
  const [category, setCategory] = useState('food');
  // 選填的消費地點草稿；送出前會移除首尾空白。
  const [location, setLocation] = useState('');

  // useCallback 讓讀取函式只在行程或帳號變動時更新，下面的 effect 才不會每次 render 都重新請求。
  // 讀費用 API，HTTP 與 status 都成功才更新；useCallback 依行程和帳號穩定函式參考。
  const loadExpenses = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/backend/itinerary/expenses.php?action=list', {
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

  // 清空舊草稿和修改 ID，設定預設值，再開新增表單。
  const openNew = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setCategory('food');
    setLocation('');
    setError('');
    setFormOpen(true);
  };

  // 既有費用帶入草稿，金額轉字串配合 input；保留 ID 以執行修改。
  const openEdit = (expense: PersonalExpense) => {
    setEditingId(expense.id);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setLocation(expense.location || '');
    setError('');
    setFormOpen(true);
  };

  // 驗證名稱與正數金額，選 create/update，成功後重讀清單與總額。
  const saveExpense = async () => {
    const numericAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('請輸入名稱與大於 0 的金額');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/backend/itinerary/expenses.php?action=${editingId === null ? 'create' : 'update'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Itinerary_ID: itineraryId,
          Account: currentUserId,
          Expense_ID: editingId,
          Title: title.trim(),
          Amount: numericAmount,
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

  // 確認後刪費用，成功再重讀，失敗只顯示錯誤。
  const deleteExpense = async (expense: PersonalExpense) => {
    if (!window.confirm(`確定刪除「${expense.title}」？`)) return;
    try {
      setError('');
      const response = await fetch('/backend/itinerary/expenses.php?action=delete', {
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

  // 將全部花費的金額加總。
  const totalAmount = expenses.reduce((total, expense) => total + Number(expense.amount), 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#FAFAFA]">
      <div className="space-y-3 border-b border-slate-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">個人記帳</h3>
          <button type="button" onClick={openNew} className="flex items-center gap-1 rounded-lg bg-[#F04D79] px-3 py-2 text-xs font-bold text-white"><Plus size={15} />新增花費</button>
        </div>
        <div className="text-xs text-slate-500">共 {expenses.length} 筆<span className="ml-2 font-bold text-slate-700">總計 {totalAmount.toLocaleString()}</span></div>
      </div>

      {error && <p className="mx-4 mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? <div className="py-10 text-center text-sm text-slate-400">載入中...</div> : expenses.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">尚未新增個人花費</div>
        ) : expenses.map((expense) => (
          <div key={expense.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-800">{expense.title}</div>
                <div className="mt-1 text-xs text-slate-400">{categories.find((item) => item.value === expense.category)?.label || expense.category}{expense.location ? ` · ${expense.location}` : ''}{expense.date ? ` · ${expense.date.slice(0, 10)}` : ''}</div>
              </div>
              <div className="shrink-0 text-right"><div className="font-mono text-sm font-bold text-slate-800">{Number(expense.amount).toLocaleString()}</div></div>
            </div>
            <div className="mt-3 flex justify-end gap-3 text-xs font-bold">
              <button type="button" onClick={() => openEdit(expense)} className="text-slate-500 hover:text-[#F04D79]">修改</button>
              <button type="button" onClick={() => void deleteExpense(expense)} className="text-red-500 hover:text-red-600">刪除</button>
            </div>
          </div>
        ))}
      </div>

      {/* 新增與修改共用記帳表單，preventDefault 避免提交後整頁重新整理。 */}
      {formOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={(event) => { event.preventDefault(); void saveExpense(); }} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">{editingId === null ? '新增個人花費' : '修改個人花費'}</h3>
            <label className="block text-sm text-slate-600">名稱<input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[#F04D79]" /></label>
            <label className="block text-sm text-slate-600">金額<input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[#F04D79]" /></label>
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
// 行李分類是一份可編輯的清單資料；留在獨立面板，主頁只需傳入行程和帳號。
// 分類與物品組成 JSON 清單；勾選、新增分類及增刪物品由 Effect 自動儲存。
/**
 * 行李面板以分類陣列作為單一資料來源；各操作只更新 categories，由 Effect 統一儲存。
 * 讀取回應的 data 是 JSON 字串，因此外層 res.json() 之後仍需再 JSON.parse。
 * 更新時相反：先將陣列序列化成 LuggageData 字串，再包進整份請求的 JSON。
 * 沒有清單或讀取失敗時使用預設模板；儲存錯誤只寫入主控台，沒有儲存狀態提示。
 */
function LuggagePanel({ itineraryId, currentUserId }: { itineraryId: string; currentUserId: string }) {
  // 整份行李資料：每個分類包含 id、title 與 items；物品包含 id、name、isChecked。
  const [categories, setCategories] = useState<any[]>([]);
  // 行李首次讀取完成的旗標，避免初始空陣列直接觸發自動儲存；讀取失敗也會設為 true。
  const [isLoaded, setIsLoaded] = useState(false);
  // 目前顯示新增物品輸入框的分類 ID；null 表示所有分類都顯示新增按鈕。
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  // 目前新增物品的文字草稿；各分類共用同一份輸入狀態。
  const [newItemName, setNewItemName] = useState("");

  // 沒有已存清單時用預設分類，首次讀取失敗也可能使用模板。
  const defaultTemplate = [
    { id: 'c1', title: '重要證件', items: [{ id: 'i1', name: '護照', isChecked: false }, { id: 'i2', name: '信用卡', isChecked: false }, { id: 'i3', name: '外幣', isChecked: false }, { id: 'i4', name: '國際駕照', isChecked: false }, { id: 'i5', name: '線上投保旅平險！再送LINE點數', isChecked: false }] },
    { id: 'c2', title: '衣物類', items: [{ id: 'i6', name: '上服', isChecked: false }, { id: 'i7', name: '褲子', isChecked: false }, { id: 'i8', name: '內衣褲', isChecked: false }, { id: 'i9', name: '睡衣', isChecked: false }, { id: 'i10', name: '鞋子與拖鞋', isChecked: false }, { id: 'i11', name: '襪子', isChecked: false }] },
    { id: 'c3', title: '3C物品', items: [{ id: 'i12', name: '手機', isChecked: false }, { id: 'i13', name: '行動電源', isChecked: false }, { id: 'i14', name: '手機充電器', isChecked: false }, { id: 'i15', name: 'Wi-Fi分享器/上網卡', isChecked: false }, { id: 'i16', name: '耳機', isChecked: false }] },
    { id: 'c4', title: '日常盥洗用品', items: [{ id: 'i17', name: '牙刷/牙膏/毛巾', isChecked: false }, { id: 'i18', name: '洗面乳/沐浴乳', isChecked: false }, { id: 'i19', name: '防曬油', isChecked: false }, { id: 'i20', name: '隨身藥品', isChecked: false }] },
    { id: 'c5', title: '其他物品', items: [{ id: 'i21', name: '水瓶或保溫瓶', isChecked: false }, { id: 'i22', name: '筆', isChecked: false }, { id: 'i23', name: '塑膠袋', isChecked: false }, { id: 'i24', name: '雨傘', isChecked: false }, { id: 'i25', name: '環保餐具', isChecked: false }] }
  ];

  // 開啟清單或切換行程、使用者時讀取資料，不再定時讀取。
  // 讀取後解析 JSON 字串，直接更新清單資料。
  const refreshLuggage = useCallback(async () => {
    try {
      const res = await fetch("/backend/itinerary/luggage.php?action=get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId }),
      });
      const data = await res.json();
      // data 內是 JSON 字串，需再解析；目前沒有驗證分類與物品結構。
      const incomingCategories = data.status === 'success' && data.data ? JSON.parse(data.data) : defaultTemplate;
      setCategories(incomingCategories);
      setIsLoaded(true);
    } catch {
      setCategories((currentCategories) => currentCategories.length ? currentCategories : defaultTemplate);
      setIsLoaded(true);
    }
  }, [itineraryId, currentUserId]);

  useEffect(() => { refreshLuggage(); }, [refreshLuggage]);

  // 載入 categories 並設 isLoaded 後也會觸發此 Effect，並非只有使用者修改才會儲存。
  // 等初次讀取完成後才儲存；延遲一秒可將連續勾選合併成一次請求。
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      fetch("http://localhost:8080/itinerary/luggage.php?action=update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId, LuggageData: JSON.stringify(categories) }) })
      .then(res => res.json()).then(data => { if (data.status === 'success') setSyncStatus('saved'); else setSyncStatus('error'); }).catch(() => setSyncStatus('error'));
    }, 1000);
    // 下一次變更或卸載時取消尚未發出的計時器；已送出的 fetch 不會因此取消。
    // 若切換分頁時仍在等待一秒，最後一批修改不會在卸載時額外補送。
    return () => clearTimeout(timer);
  }, [categories, isLoaded, itineraryId, currentUserId]);

  // 用 map 與展開運算子建立新物件，只反轉指定物品，不能直接改舊 state。
  const toggleCheck = (categoryId: string, itemId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.map((i: any) => i.id === itemId ? { ...i, isChecked: !i.isChecked } : i) } : cat));
  // filter 移除指定物品，新的分類資料由自動儲存 Effect 同步。
  const deleteItem = (categoryId: string, itemId: string) => setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.filter((i: any) => i.id !== itemId) } : cat));
  // 時間戳作本機 ID，加入分類尾端；失焦與 Enter 都會呼叫。
  const handleAddItem = (categoryId: string) => { if (!newItemName.trim()) { setAddingToCategory(null); return; } setCategories(cats => cats.map(cat => cat.id === categoryId ? { ...cat, items: [...cat.items, { id: `i_${Date.now()}`, name: newItemName, isChecked: false }] } : cat)); setNewItemName(""); setAddingToCategory(null); };
  // 新增分類使用時間戳 ID 與空物品陣列；所有分類固定展開。
  const addNewCategory = () => { const title = window.prompt("請輸入新類別名稱："); if (title && title.trim()) setCategories([...categories, { id: `c_${Date.now()}`, title, items: [] }]); };

  if (!isLoaded) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200 pb-20 relative px-1">
      <div className="space-y-4">
        {categories.map((cat) => {
          // 計算已勾數，配合總數呈現進度；空分類避免除以零。
          const checkedCount = cat.items.filter((i: any) => i.isChecked).length; const totalCount = cat.items.length;
          return (
            <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-50 flex items-center gap-2 bg-white"><h3 className="text-[15px] font-bold text-slate-800">{cat.title}</h3><span className="text-[11px] font-bold text-slate-400 font-mono mt-0.5">{checkedCount}/{totalCount}</span></div>
              <div className="h-1 bg-slate-100"><div className="h-full bg-[#F04D79] transition-all" style={{ width: `${totalCount ? checkedCount / totalCount * 100 : 0}%` }} /></div>
              {/* 分類固定展開；失焦或 Enter 新增物品，Escape 取消。 */}
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
            </div>
          );
        })}
        <button onClick={addNewCategory} className="w-full bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center justify-between text-slate-400 hover:text-[#F04D79] hover:border-pink-200 hover:bg-pink-50/50 transition-all"><span className="text-[15px] font-bold">新增類別</span><Plus size={20} /></button>
      </div>
    </div>
  );
}

// ================= 單一可拖曳卡片組件 =================
// 輸入時補上冒號；真正的 24 小時制合法性留給儲存前的檢查。
const formatTimeInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length >= 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

// PHP 可能回傳 HH:mm:ss，畫面統一成 HH:mm；不合法的時間保留為空並另行標記。
const normalizeLoadedTime = (value: unknown) => {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return '';
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return '';
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
};

// 清單顯示用的時間提示：跨午夜時把隔日分鐘數加 1440，才可和前一項比較。
/**
 * 只產生卡片上的「跨日／時間重疊」提示，不參與新增或修改時間的儲存阻擋。
 * 例如前一筆為 23:00–01:00，會把其結束時間視為隔日 01:00（1500 分鐘）。
 * 比較對象是顯示順序中最近一筆具有完整合法時間的項目，不是逐一檢查所有項目。
 */
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

// 單筆卡片同時支援拖曳、標題與時間編輯；拖曳只綁在握把，避免點擊表單時誤觸。
/**
 * 卡片只負責顯示與觸發事件；項目資料、編輯草稿及儲存請求由主編輯器管理。
 * setNodeRef 綁定整張卡片以計算位置，attributes/listeners 只放在拖曳握把。
 * 名稱／時間輸入區阻止事件冒泡，避免編輯時同時觸發卡片的地圖定位。
 */
function SortableItem({ 
  item, editingItemId, editingTitle, setEditingItemId, setEditingTitle, handleUpdateTitle,
  editingTimeId, editStartTime, editEndTime, setEditingTimeId, setEditStartTime, setEditEndTime, handleUpdateTime, handleDeleteItem, onFocusItem, isMapItemSelected, savingTimeId, timeFlags
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  // 套用拖曳位移與動畫，拖曳時提高層級、降低透明度。
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`group flex bg-white border ${isDragging ? 'border-[#F04D79] shadow-lg scale-[1.02]' : isMapItemSelected ? 'border-[#F04D79] shadow-md ring-2 ring-pink-100' : 'border-slate-100 shadow-sm'} rounded-2xl p-3 transition-all duration-300 hover:shadow-md hover:border-[#F04D79]/30 relative`}>
      <div {...attributes} {...listeners} className="flex items-center text-slate-200 group-hover:text-[#F04D79]/50 pr-2 transition-colors cursor-grab active:cursor-grabbing"><GripVertical size={16} /></div>
      <div className="flex-1 min-w-0 flex items-start gap-3.5" onClick={() => onFocusItem?.(item)}>
        <div className="size-11 mt-0.5 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-pink-50 group-hover:text-[#F04D79] transition-colors"><MapPin size={20} /></div>
        <div className="flex-1 min-w-0">
          {item.hasInvalidTime && (
            <div className="mb-1 text-[10px] font-bold text-amber-500">時間待修正，請雙擊重新輸入</div>
          )}
          {/* 雙擊編輯時間，儲存時禁用，stopPropagation 避免按鈕操作也選取卡片。 */}
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
          {/* 雙擊名稱編輯，失焦或 Enter 儲存，Escape 取消。 */}
          {editingItemId === item.id ? (
            <input type="text" autoFocus value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onBlur={() => handleUpdateTitle(item.id)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTitle(item.id); if (e.key === 'Escape') setEditingItemId(null); }} className="text-sm font-bold text-slate-700 bg-white border border-pink-300 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-[#F04D79]/20 shadow-sm" />
          ) : (
            <div onDoubleClick={() => { setEditingItemId(item.id); setEditingTitle(item.title); }} className="text-[15px] leading-6 font-bold text-slate-700 whitespace-normal break-words tracking-wide cursor-text hover:text-[#F04D79] transition-colors" title="雙擊以編輯名稱">{item.title}</div>
          )}
          
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
// [id] 是網址中的行程 ID；頁面以它讀取詳情、每日項目與各面板資料。
export default function ItineraryEditor() {
  const router = useRouter();
  const params = useParams(); 
  const { user, loading: authLoading } = useAuth();
  
  // Google Maps 需要在瀏覽器載入，載入成功後才渲染地圖與標記。
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    language: 'zh-TW',
    region: 'TW',
  });

  // 行程主資料首次載入的旗標；每日項目及地圖 SDK 另有各自的讀取流程。
  const [isLoading, setIsLoading] = useState(true);
  // 行程主資料，如名稱、起訖日期與目的地座標；每日景點另存於 itineraryItems。
  const [itineraryData, setItineraryData] = useState<any>(null);
  
  // 目前封面的來源：可為後端網址、本機 blob 預覽網址或備用圖片網址。
  const [coverImage, setCoverImage] = useState("");
  // 附在封面網址上的版本值；載入、上傳或重試時更新，讓瀏覽器重新取圖。
  const [coverImageVersion, setCoverImageVersion] = useState(0);
  // 目前封面是否已用新版本重試過；限制原圖重試次數，之後才改用備用圖。
  const [hasRetriedCoverImage, setHasRetriedCoverImage] = useState(false);
  // 封面上傳中的旗標；控制按鈕停用、轉圈，以及封面的模糊與透明效果。
  const [isUploading, setIsUploading] = useState(false);
  // 取得隱藏檔案欄位的 DOM，讓封面按鈕能開啟選檔器，並在上傳結束後清空選取值。
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 是否顯示行程名稱／日期編輯區；取消只關閉編輯區，不送出 API。
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  // 行程名稱草稿；開啟編輯時從 itineraryData 複製，儲存成功後才回寫主資料。
  const [editInfoTitle, setEditInfoTitle] = useState("");
  // 開始日期草稿，配合 date 輸入欄使用 YYYY-MM-DD 格式。
  const [editInfoStart, setEditInfoStart] = useState("");
  // 結束日期草稿；送出時與開始日期比較，避免結束早於開始。
  const [editInfoEnd, setEditInfoEnd] = useState("");

  // 目前選取的行程天數，從 1 開始；同時控制左側清單、地圖標記與路線折線。
  const [activeDay, setActiveDay] = useState(1);
  // 手機目前顯示清單或地圖；桌面透過響應式樣式同時呈現兩者。
  const [mobilePlannerView, setMobilePlannerView] = useState<'list' | 'map'>('list');
  // 新增行程項目視窗的開關；關閉視窗本身不等於清空所有草稿。
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  // 新增流程的模式：choose 選入口、search 選有座標的地點、custom 輸入自訂名稱。
  const [addItemMode, setAddItemMode] = useState<'choose' | 'search' | 'custom'>('choose');
  
  // 目前掛載的輔助面板：budget 記帳或 luggage 行李；切換會卸載前一個面板。
  const [rightPanelTab, setRightPanelTab] = useState<'budget' | 'luggage'>('budget');
  // 小螢幕是否以覆蓋方式顯示輔助面板；超寬桌面則由樣式固定顯示側欄。
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  // 切換行程時回到第一天與記帳面板，不再讀寫本機畫面偏好。
  useEffect(() => {
    setActiveDay(1);
    setRightPanelTab('budget');
  }, [params.id]);

  // 新增地點名稱草稿，也供地圖搜尋欄共用；搜尋結果選取後會帶入地點名稱。
  const [newItemTitle, setNewItemTitle] = useState("");
  // 新增項目的開始時間草稿；開啟視窗時預填當天最後一筆合法結束時間。
  const [newItemStartTime, setNewItemStartTime] = useState("");
  // 新增項目的結束時間草稿；開啟視窗先清空，允許留空。
  const [newItemEndTime, setNewItemEndTime] = useState("");
  // 新增地點的緯度；null 表示尚未取得位置，搜尋模式送出前必須有有效座標。
  const [newItemLat, setNewItemLat] = useState<number | null>(null);
  // 新增地點的經度，須與緯度一起使用；自訂模式允許沒有座標。
  const [newItemLng, setNewItemLng] = useState<number | null>(null);

  // 新增項目請求的進行狀態，用來停用視窗按鈕並顯示處理中圖示。
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // 整份行程所有天數的項目；載入時統一 ID、時間與座標格式，再按 activeDay 篩選。
  const [itineraryItems, setItineraryItems] = useState<any[]>([]);
  
  // 目前編輯名稱的項目 ID；null 代表所有卡片都以文字呈現名稱。
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  // 卡片名稱的編輯草稿；與新增視窗的 newItemTitle 分開，避免互相影響。
  const [editingTitle, setEditingTitle] = useState("");
  // 目前編輯時間的項目 ID；配合共用時間草稿，只開啟對應卡片的輸入欄。
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  // 既有項目的開始時間草稿；進入卡片時間編輯時由該項目帶入。
  const [editStartTime, setEditStartTime] = useState("");
  // 既有項目的結束時間草稿；與開始時間一同驗證並送出 update_time。
  const [editEndTime, setEditEndTime] = useState("");
  // 正在儲存時間的項目 ID，用來略過同筆重複送出並停用對應卡片的儲存操作。
  const [savingTimeId, setSavingTimeId] = useState<string | null>(null);

  // 目前預覽的候選地點，可能來自搜尋、內建景點或空白地圖；尚未因此寫入行程。
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  // 遞增序號只保護選地點詳情，沒有保護文字搜尋。
  const placeSelectionRequestRef = useRef(0);
  // 正在補齊詳細資訊的候選地點 ID；只讓對應資訊框顯示載入提示。
  const [placeDetailsLoading, setPlaceDetailsLoading] = useState<string | null>(null);
  // 目前選中的既有行程項目；供地圖資訊框與清單卡片的選取樣式共用。
  const [selectedMapItem, setSelectedMapItem] = useState<any | null>(null);
  // 等待重新指定位置的既有項目 ID；選取地點後改走 update_location。
  const [editingLocationItemId, setEditingLocationItemId] = useState<string | null>(null);
  // 文字搜尋的候選標記，與已儲存行程標記分開；清除候選不會刪除行程。
  const [searchMarkers, setSearchMarkers] = useState<any[]>([]);
  // 保存 Google Maps 實例，供移動、縮放、fitBounds 等命令操作。
  const mapRef = useRef<google.maps.Map | null>(null);
  // 受控的地圖中心；載入目的地、選地點及地圖閒置時都可能更新。
  const [mapCenter, setMapCenter] = useState({ lat: 25.0478, lng: 121.5170 });
  // 程式指定的縮放級別；選景點時放大，載入行程目的地時回到城市尺度。
  const [mapZoom, setMapZoom] = useState(12);
  // 保存折線，重畫或卸載時 setMap(null) 移除。
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  // GoogleMap 實例是否已掛載；SDK 載入成功不代表實例已可供折線綁定。
  const [mapReady, setMapReady] = useState(false);
  // 搜尋或地點詳情的地圖提示；null 表示不顯示提示浮層。
  const [mapStatusMessage, setMapStatusMessage] = useState<string | null>(null);
  // 每次呼叫都直接請求地點詳情，不保存快取或共用進行中的請求。
  const fetchPlaceDetails = useCallback(async (placeId: string) => {
    const normalizedPlaceId = String(placeId || '');
    if (!normalizedPlaceId) throw new Error('Missing place id');

    const response = await fetch('/api/placedetails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: normalizedPlaceId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Place details request failed');
    return data;
  }, []);

  /**
   * 先使用候選資料顯示資訊框，再非同步補照片、地址、營業時間等詳情。
   * 以函式型 setter 檢查目前候選 ID，避免 A 地點的回應覆蓋已切換到 B 的資訊框。
   * finally 也比對 ID，避免較舊請求關閉另一個地點的載入提示。
   */
  const loadPlaceDetails = useCallback(async (place: any) => {
    const placeId = String(place?.id || '');
    if (!placeId || place?.isMapPoint) return;

    setPlaceDetailsLoading(placeId);
    try {
      const data = await fetchPlaceDetails(placeId);
      setSelectedPlace((current: any) => current?.id === placeId ? { ...current, ...data } : current);
    } catch (error) {
      console.error('Place details error:', error);
      setMapStatusMessage('地點詳細資料載入失敗，請稍後再試。');
    } finally {
      setPlaceDetailsLoading((current) => current === placeId ? null : current);
    }
  }, [fetchPlaceDetails]);

  // 點清單項目時選取標點並移動地圖中心，不自動捲動清單。
  // 檢查注意：Number(null)=0，尚未明確排除空座標。
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
  }, []);

  useEffect(() => {
    if (selectedMapItem && !itineraryItems.some((item) => String(item.id) === String(selectedMapItem.id))) {
      setSelectedMapItem(null);
    }
  }, [itineraryItems, selectedMapItem]);

  // 手機切到地圖後，等容器顯示再觸發 resize，避免地圖尺寸算錯；不自動調整地點範圍。
  // 兩層 requestAnimationFrame 留出畫面更新的機會，再通知地圖重新計算可見容器尺寸。
  const switchMobilePlannerView = useCallback((view: 'list' | 'map') => {
    setMobilePlannerView(view);
    if (view !== 'map') return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!mapRef.current || !window.google) return;
        window.google.maps.event.trigger(mapRef.current, 'resize');
      });
    });
  }, []);

  // 每次切換天數或順序，先移除舊線，再依當天 sortOrder 重畫各地點間的連線。
  useEffect(() => {
    routePolylineRef.current?.setMap(null);
    routePolylineRef.current = null;

    if (!mapReady || !window.google || !mapRef.current) return;

    // 按 sortOrder 直接連線，這不是實際道路導航或交通路徑。
    const routeItems = itineraryItems
      .filter((item) => item.dayNumber === activeDay)
      .filter((item) => Number.isFinite(Number(item.Latitude)) && Number.isFinite(Number(item.Longitude)))
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));

    if (routeItems.length < 2) return;

    // 篩選後至少保留兩個位置才建立線段；此處沿用 Number 轉型後的有限值檢查。
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

// 文字搜尋透過本專案的 API 取得候選地點；結果只先顯示在地圖，尚未建立行程項目。
// 候選只顯示地圖，未存行程。檢查注意：沒有過期回應保護，舊結果可能覆蓋新結果。
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

  /**
   * 自動完成選單的地點選取入口：先取得完整座標，再區分新增草稿或修改既有位置。
   * 每次呼叫增加請求序號，回應回來時僅接受最新一次選取；這個保護不涵蓋其他搜尋入口。
   * editingLocationItemId 有值時立即送出位置更新並重讀項目；一般選取只填草稿，仍須按新增。
   */
  const handlePlaceSelect = async (placeId: string) => {
    const selectionRequestId = placeSelectionRequestRef.current + 1;
    placeSelectionRequestRef.current = selectionRequestId;
    try {
      const data = await fetchPlaceDetails(placeId);
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
          const updateResponse = await fetch('/backend/itinerary/items.php?action=update_location', {
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

  // 使用者改寫搜尋名稱後清空原座標，避免把新名稱配上上一個搜尋結果的位置。
  const handleNewItemTitleChange = (value: string) => {
    setNewItemTitle(value);
    if (addItemMode === 'search') {
      setNewItemLat(null);
      setNewItemLng(null);
      setSelectedPlace(null);
    }
  };

  // 內建景點以 placeId 查詳情，空白地圖位置由 JSX 建立臨時點。
  const handleMapPoiClick = async (placeId: string) => {
    try {
      const data = await fetchPlaceDetails(placeId);
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

  // Google 地點和既有行程項目沒有共同 ID，這裡用接近的座標判斷是否已加入。
  // 跨所有天數以座標差各小於 0.00015 比對，近似位置不等於唯一地點 ID。
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

  // 滑鼠需移動 5px 才啟動拖曳；鍵盤感測器讓排序也能用鍵盤操作。
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 檢查注意：項目讀取沒有過期回應保護。
  /**
   * 把 PHP 回應轉成卡片、拖曳及地圖共用的資料格式，成功後取代完整項目清單。
   * ID 轉字串以配合拖曳 ID 比較；HH:mm:ss 轉 HH:mm；原始非法時間另存 hasInvalidTime。
   * 座標保留 null，其餘轉數字；這裡只正規化資料，並未檢查所有座標使用處的 null 處理。
   */
  const fetchItems = useCallback(async (id: string) => {
    try {
      const res = await fetch("/backend/itinerary/items.php?action=list", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: id }),
      });
      const data = await res.json();
      if (data.status === 'success') {
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
        setItineraryItems(nextItems);
      }
    } catch (error) { console.error(error); }
  }, []);

  // 等登入狀態確認後，依網址中的 ID 分別載入行程主資料與每日項目。
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth/login"); return; }
    // 主資料先查 Content-Type，避免解析 HTML 錯誤頁；目前沒有取消與過期回應保護。
    const fetchDetail = async () => {
      try {
        const res = await fetch("/backend/itinerary/core.php?action=detail", {
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
      } catch { alert("資料讀取失敗"); } finally { setIsLoading(false); }
    };
    // 兩個非同步函式各自啟動，不互相等待；主資料轉圈結束時，項目仍可能尚未回來。
    if (params.id) { fetchDetail(); fetchItems(params.id as string); }
  }, [params.id, user, authLoading, router, fetchItems]);

  /**
   * 封面生命週期：驗證檔案 → 建立 blob 預覽 → 上傳原檔 → 換成後端回傳網址。
   * MIME、附檔名與 10 MiB 上限是前端檢查；使用 FormData，讓瀏覽器自動產生 multipart 邊界。
   * 失敗時恢復先前封面；finally 釋放預覽網址、結束上傳狀態並清空 input，方便重選同一檔。
   */
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/') || !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      alert('請選擇 JPG、PNG 或 WEBP 圖片。');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_COVER_SOURCE_BYTES) {
      alert('圖片超過 10MB，請選擇較小的圖片。');
      e.target.value = '';
      return;
    }
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

  // 行程名稱與日期屬於 Itinerary 主資料，交由 core.php 更新，不走每日項目的 API。
  const handleUpdateItineraryInfo = async () => {
    if (!editInfoTitle.trim() || !editInfoStart || !editInfoEnd) { alert("請完整填寫標題與日期"); return; }
    if (new Date(editInfoStart) > new Date(editInfoEnd)) { alert("結束日期不能早於開始日期"); return; }
    try {
      const res = await fetch("/backend/itinerary/core.php?action=update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: params.id, Title: editInfoTitle, StartDate: editInfoStart, EndDate: editInfoEnd }) });
      const data = await res.json(); if (data.status === 'success') { setItineraryData({ ...itineraryData, title: editInfoTitle, startDate: editInfoStart, endDate: editInfoEnd }); setIsEditingInfo(false); } else alert(data.message);
    } catch { alert("更新失敗"); }
  };

  // 09:30 轉當日第 570 分鐘，非法回 null；00:00 是合法零。
  const timeToMinutes = (value: string) => {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  // 新項目預填當天最後一個有時間項目的結束時間，使用者仍可自行修改。
  const getSuggestedStartTime = (dayNumber: number) => {
    const lastTimedItem = itineraryItems
      .filter((item) => item.dayNumber === dayNumber && timeToMinutes(item.endTime || '') !== null)
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
      .at(-1);
    return lastTimedItem?.endTime || '';
  };

  // 設定模式與預填時間。檢查注意：未清空舊座標，自訂名稱可能沿用前次搜尋位置。
  const openAddItemModal = (mode: 'choose' | 'search' | 'custom' = 'choose') => {
    setAddItemMode(mode);
    setNewItemStartTime(getSuggestedStartTime(activeDay));
    setNewItemEndTime('');
    setIsAddItemOpen(true);
  };

  /**
   * 新增只使用目前 activeDay；搜尋模式必須選到座標，自訂模式可先建立無座標項目。
   * 起訖時間都可留空，有輸入就檢查 24 小時格式；兩者相同會阻擋，跨午夜與重疊則允許。
   * 成功後清空名稱、時間、座標及候選預覽，再重新讀取後端產生的項目 ID 與排序。
   */
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
    if (!newItemTitle.trim()) return alert("請輸入行程標題"); setIsSubmittingItem(true);
    try {
      const res = await fetch("/backend/itinerary/items.php?action=create", {
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
    } catch { alert("連線異常"); } finally { setIsSubmittingItem(false); }
  };

  // 空白不送，成功刷新，finally 結束名稱編輯。
  const handleUpdateTitle = async (itemId: string) => {
    if (!editingTitle.trim()) return setEditingItemId(null);
    try {
      const res = await fetch("/backend/itinerary/items.php?action=update_title", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId, Title: editingTitle }) });
      const data = await res.json(); if (data.status === 'success') fetchItems(params.id as string); else alert(data.message);
    } catch { alert("更新失敗"); } finally { setEditingItemId(null); }
  };

  // 修改時間與新增時共用格式檢查，允許與其他項目時間重疊。
  // 同筆儲存中略過，成功後重新讀取清單。
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
    setSavingTimeId(itemId);
    try {
      const res = await fetch("/backend/itinerary/items.php?action=update_time", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId, StartTime: editStartTime, EndTime: editEndTime }) });
      const data = await res.json(); if (data.status === 'success') fetchItems(params.id as string); else alert(data.message);
    } catch { alert("更新失敗"); }
    setSavingTimeId(null);
    setEditingTimeId(null);
  };

  // 先從畫面移除讓操作立即有回應；若後端刪除失敗，再重新抓取清單恢復資料。
  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("確定要刪除此行程嗎？")) return;
    setSelectedMapItem((current: any) => current?.id === itemId ? null : current);
    setItineraryItems(items => items.filter(item => item.id !== itemId));
    try {
      const res = await fetch("/backend/itinerary/items.php?action=delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId }) });
      const data = await res.json(); if (data.status !== 'success') { alert(data.message); fetchItems(params.id as string); }
    } catch { alert("刪除失敗"); fetchItems(params.id as string); }
  };

  // 複製項目時保留地點，刻意清空時間，避免複製後立刻與原項目重疊。
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

  // 拖曳改的是排列順序；原本的時間區段留在同一位置，再把新順序和需要變更的時間送往 PHP。
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItineraryItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id); const newIndex = items.findIndex((item) => item.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return items;
        const oldDayItems = items.filter(item => item.dayNumber === activeDay);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // 保留原陣列順序篩選當天，沒有再次按 sortOrder 排。
        const currentDayItems = newItems.filter(item => item.dayNumber === activeDay);
        // 先保存每個位置原時段，項目移到新位置後使用該位置的時間。
        const timeSlots = oldDayItems.map(item => ({ startTime: item.startTime || "", endTime: item.endTime || "" }));
        const itemsWithSwappedTimes = newItems.map((item) => {
          const dayIndex = currentDayItems.findIndex(dayItem => dayItem.id === item.id);
          if (item.dayNumber !== activeDay || dayIndex < 0) return item;
          return { ...item, startTime: timeSlots[dayIndex].startTime, endTime: timeSlots[dayIndex].endTime };
        });
        // 檢查注意：本機未同步 sortOrder，折線可能沿舊順序；fetch 未檢查 HTTP/JSON 業務錯誤。
        const sortUpdates = currentDayItems.map((item, index) => ({ id: item.id, sortOrder: index }));
        fetch("http://localhost:8080/itinerary/items.php?action=sort", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates: sortUpdates }) }).catch(err => console.error(err));
        const timeUpdates = currentDayItems.map((item, index) => ({ item, slot: timeSlots[index] }))
          .filter(({ item, slot }) => item.startTime !== slot.startTime || item.endTime !== slot.endTime);
        Promise.all(timeUpdates.map(({ item, slot }) => fetch("/backend/itinerary/items.php?action=update_time", {
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

  // 畫面只顯示選取天數的項目；完整清單仍保留在 itineraryItems 供切天與時間檢查使用。
  // 保留原陣列順序篩選當天，沒有再次按 sortOrder 排。
  const currentDayItems = itineraryItems.filter((item) => item.dayNumber === activeDay);

  return (
    <div className={`itinerary-page fixed inset-0 ${isMobilePanelOpen ? 'z-[60]' : 'z-40'} flex flex-col bg-[#F4F2ED] font-sans text-slate-800`}>
      
      {/* 桌面導覽按鈕目前沒有 onClick/href，只呈現文字。 */}
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

      {/* 左側是行程資料與每日清單，中央是地圖，右側是個人記帳或行李。 */}
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
            {/* 閱讀／編輯主資料切換，日期草稿使用 YYYY-MM-DD。 */}
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

          {/* Day 分頁由行程起迄日期算出，不需要另外儲存每日分頁資料。 */}
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

          {/* DndContext 管理拖曳事件；SortableContext 只接收當天 ID，避免跨天排序。 */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/30">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={currentDayItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                {currentDayItems.map((item, index) => {
                  const timeFlags = getTimeFlags(currentDayItems, index);
                  return (
                    <div key={item.id} className="relative">
                      {index < currentDayItems.length - 1 && <div className="absolute left-[2.1rem] top-full z-0 h-3.5 border-l-2 border-dashed border-slate-200" />}
                      <SortableItem key={item.id} item={item} editingItemId={editingItemId} editingTitle={editingTitle} setEditingItemId={setEditingItemId} setEditingTitle={setEditingTitle} handleUpdateTitle={handleUpdateTitle} editingTimeId={editingTimeId} editStartTime={editStartTime} editEndTime={editEndTime} setEditingTimeId={setEditingTimeId} setEditStartTime={setEditStartTime} setEditEndTime={setEditEndTime} handleUpdateTime={handleUpdateTime} handleDeleteItem={handleDeleteItem} onFocusItem={focusMapOnItem} isMapItemSelected={selectedMapItem?.id === item.id} savingTimeId={savingTimeId} timeFlags={timeFlags} />
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

        {/* 手機以清單／地圖切換，桌面則同時顯示；地圖載入失敗時改顯示提示。 */}
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

              {/* 內建景點查詳情；空白地圖先建候選座標，新增後才存行程。 */}
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
                // 使用者拖動地圖後，將最終中心同步回 state；微小差異沿用舊物件，減少重繪。
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
                // GoogleMap 卸載時一起移除命令式建立的折線，並清空實例參照。
                onUnmount={() => { routePolylineRef.current?.setMap(null); routePolylineRef.current = null; mapRef.current = null; setMapReady(false); }}
              >
                {mapStatusMessage && (
                  <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-xl border border-amber-200 bg-white/95 px-4 py-2.5 text-center text-xs font-semibold text-slate-600 shadow-lg backdrop-blur-md">
                    {mapStatusMessage}
                  </div>
                )}
                {/* 當天行程與搜尋結果各自顯示標記，縮小地圖時也不合併；搜尋結果不會因此寫進行程。 */}
                      {currentDayItems
                        .filter((item) => Number.isFinite(Number(item.Latitude)) && Number.isFinite(Number(item.Longitude)))
                        .map((item, index) => (
                          <Marker
                            key={`itinerary-${item.id}`}
                            position={{ lat: Number(item.Latitude), lng: Number(item.Longitude) }}
                            title={item.title || '行程地點'}
                            label={{ text: String(index + 1), color: "white", fontWeight: "bold" }}
                            icon={isLoaded && window.google ? {
                              path: window.google.maps.SymbolPath.CIRCLE,
                              fillColor: '#F04D79',
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

                {/* 已加入項目資訊框可查看清單或重新選位置。 */}
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

                {/* 候選資訊框依有無資料顯示照片、營業時間、電話、地址與網址。 */}
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
                      {placeDetailsLoading === selectedPlace.id && (
                        <p className="mb-2 text-[10px] font-semibold text-slate-400">載入地點詳細資料…</p>
                      )}
                      {/* 照片走同源代理，encodeURIComponent 防止資源名稱破壞網址參數。 */}
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

          {/* 面板只在選取對應分頁時掛載，記帳與行李各自處理自己的讀寫。 */}
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

        {/* 手機底部切換行程、記帳、行李，安全區內距避開裝置操作區。 */}
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

        {/* 新增視窗先選搜尋或自訂，再共用標題與時間表單。 */}
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
                {/* 時間非空即顯示提示，手動輸入也會出現，未追蹤是否真的自動帶入。 */}
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
