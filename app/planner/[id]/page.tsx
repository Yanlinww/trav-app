'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { 
  Map as MapIcon, Calendar, DollarSign, BaggageClaim, Ticket, 
  GripVertical, Plus, Train, Hotel, Coffee, Camera, Search,
  ChevronLeft, Wallet, Loader2, MapPin, Trash2, Check, Edit2,Copy,
  LayoutGrid, MapPinned, Layers, Eye, EyeOff,
  ChevronUp, ChevronDown, XCircle, Save,
  Receipt, Utensils, TrainFront, Bed, ShoppingBag, MoreHorizontal, X, User, LocateFixed, MessageCircle, Send, Clock, ExternalLink, FileText, RefreshCw
} from "lucide-react";
// 注意：已徹底移除舊版 Autocomplete
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, MarkerClustererF } from '@react-google-maps/api';
import PlaceAutocomplete from '../../components/PlaceAutocomplete';

import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* Legacy single-note panel retained only in history; the active UI uses ManualNotesPanel.
function NotesPanel({ itineraryId, currentUserId }: { itineraryId: string; currentUserId: string }) {
  const [content, setContent] = useState('');
  const [syncStatus, setSyncStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const refreshNotes = useCallback(async () => {
    if (dirtyRef.current || savingRef.current) return;
    try {
      const res = await fetch('http://localhost:8080/itinerary/get_itinerary_notes.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Itinerary_ID: itineraryId }) });
      const data = await res.json();
      if (data.status === 'success') { setContent(data.data?.content || ''); setSyncStatus('saved'); }
    } catch { setSyncStatus('error'); }
  }, [itineraryId]);

  useEffect(() => {
    refreshNotes();
    const refreshTimer = window.setInterval(refreshNotes, 5000);
    return () => window.clearInterval(refreshTimer);
  }, [refreshNotes]);

  const saveNotes = async (nextContent: string) => {
    if (!currentUserId) return;
    savingRef.current = true; setSyncStatus('saving');
    try {
      const res = await fetch('http://localhost:8080/itinerary/update_itinerary_notes.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId, Content: nextContent }) });
      const data = await res.json();
      if (data.status === 'success') { dirtyRef.current = false; setSyncStatus('saved'); } else setSyncStatus('error');
    } catch { setSyncStatus('error'); }
    finally { savingRef.current = false; }
  };

  return (
    <div className="flex min-h-full flex-col bg-[#FAFAFA] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div><div className="text-xs font-bold tracking-wide text-slate-400">共享備忘錄</div><div className="mt-1 text-2xl font-bold text-slate-800">旅程記事</div></div>
        <div className={`text-[11px] font-bold ${syncStatus === 'error' ? 'text-red-500' : syncStatus === 'saving' ? 'text-amber-500' : 'text-emerald-500'}`}>{syncStatus === 'loading' ? '載入中' : syncStatus === 'saving' ? '儲存中…' : syncStatus === 'error' ? '同步失敗' : '已同步'}</div>
      </div>
      <textarea value={content} onChange={(event) => { const nextContent = event.target.value; dirtyRef.current = true; setContent(nextContent); if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current); saveTimerRef.current = window.setTimeout(() => saveNotes(nextContent), 800); }} placeholder="記下集合地點、注意事項、營業時間或旅伴共識…" className="min-h-[320px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700 shadow-sm outline-none focus:border-pink-300" />
      <p className="mt-3 text-center text-[11px] text-slate-400">輸入後會自動儲存並同步給旅伴</p>
    </div>
  );
}
*/

function MultiNotesPanel({ itineraryId, currentUserId }: { itineraryId: string; currentUserId: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const creatingDefaultRef = useRef(false);

  const refreshNotes = useCallback(async () => {
    if (dirtyRef.current) return;
    try {
      const res = await fetch('http://localhost:8080/itinerary/get_itinerary_note_list.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Itinerary_ID: itineraryId }) });
      const data = await res.json();
      if (data.status !== 'success') return;
      const nextNotes = data.data || [];
      if (nextNotes.length === 0 && currentUserId && !creatingDefaultRef.current) {
        creatingDefaultRef.current = true;
        try {
          await fetch('http://localhost:8080/itinerary/create_itinerary_note.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId, Title: '備忘錄', Content: '' }) });
        } finally {
          creatingDefaultRef.current = false;
        }
        return refreshNotes();
      }
      setNotes(nextNotes);
      setActiveId((currentId) => currentId ?? nextNotes[0]?.id ?? null);
      const active = nextNotes.find((note: any) => note.id === activeId);
      if (active && !isAdding) { setTitle(active.title); setContent(active.content || ''); }
      setSyncStatus('saved');
    } catch { setSyncStatus('error'); }
  }, [activeId, currentUserId, isAdding, itineraryId]);

  useEffect(() => { refreshNotes(); const timer = window.setInterval(refreshNotes, 5000); return () => window.clearInterval(timer); }, [refreshNotes]);

  const selectNote = (note: any) => { dirtyRef.current = false; setIsAdding(false); setActiveId(note.id); setTitle(note.title); setContent(note.content || ''); };
  const startNewNote = () => { dirtyRef.current = false; setIsAdding(true); setActiveId(null); setTitle(''); setContent(''); };
  const saveNote = async (nextTitle = title, nextContent = content) => {
    if (!nextTitle.trim() || !currentUserId) return;
    setSyncStatus('saving');
    const endpoint = isAdding ? 'create_itinerary_note.php' : 'update_itinerary_note.php';
    try {
      const res = await fetch(`http://localhost:8080/itinerary/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Itinerary_ID: itineraryId, Note_ID: activeId, Account: currentUserId, Title: nextTitle, Content: nextContent }) });
      const data = await res.json();
      if (data.status === 'success') { dirtyRef.current = false; setIsAdding(false); if (data.Note_ID) setActiveId(data.Note_ID); setSyncStatus('saved'); refreshNotes(); } else setSyncStatus('error');
    } catch { setSyncStatus('error'); }
  };
  const scheduleSave = (nextTitle: string, nextContent: string) => { dirtyRef.current = true; if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current); saveTimerRef.current = window.setTimeout(() => saveNote(nextTitle, nextContent), 800); setTitle(nextTitle); setContent(nextContent); };
  const deleteNote = async () => {
    if (!activeId || !window.confirm('確定要刪除這份備忘錄嗎？')) return;
    try {
      const res = await fetch('http://localhost:8080/itinerary/delete_itinerary_note.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Note_ID: activeId, Itinerary_ID: itineraryId, Account: currentUserId }) });
      if (!res.ok) throw new Error(`刪除備忘錄失敗（${res.status}）`);
      dirtyRef.current = false; setActiveId(null); setTitle(''); setContent(''); await refreshNotes();
    } catch { setSyncStatus('error'); }
  };

  return (
    <div className="flex min-h-full flex-col bg-[#FAFAFA] p-4">
      <div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-bold tracking-wide text-slate-400">共享備忘錄</div><div className="mt-1 text-2xl font-bold text-slate-800">{notes.length} 份</div></div><button onClick={startNewNote} className="flex size-10 items-center justify-center rounded-xl bg-[#F04D79] text-white shadow-sm"><Plus size={20} /></button></div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{notes.map((note) => <button key={note.id} onClick={() => selectNote(note)} className={`max-w-32 shrink-0 truncate rounded-full px-3 py-1.5 text-xs font-bold ${activeId === note.id ? 'bg-pink-100 text-[#F04D79]' : 'bg-white text-slate-500 shadow-sm'}`}>{note.title}</button>)}</div>
      {(activeId || isAdding) ? <div className="flex flex-1 flex-col gap-3"><div className="flex items-center justify-between"><span className={`text-[11px] font-bold ${syncStatus === 'error' ? 'text-red-500' : syncStatus === 'saving' ? 'text-amber-500' : 'text-emerald-500'}`}>{syncStatus === 'saving' ? '儲存中…' : syncStatus === 'error' ? '同步失敗' : '已同步'}</span>{!isAdding && <button onClick={deleteNote} className="text-xs font-bold text-slate-300 hover:text-red-500">刪除</button>}</div><input value={title} onChange={(event) => scheduleSave(event.target.value, content)} placeholder="備忘錄標題" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-pink-300" /><textarea value={content} onChange={(event) => scheduleSave(title, event.target.value)} placeholder="記下集合地點、注意事項、營業時間或旅伴共識…" className="min-h-[300px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700 shadow-sm outline-none focus:border-pink-300" /></div> : <div className="flex flex-1 items-center justify-center rounded-2xl bg-white text-sm text-slate-400 shadow-sm">點擊上方 + 建立第一份備忘錄</div>}
    </div>
  );
}

function ManualNotesPanel({ itineraryId, currentUserId }: { itineraryId: string; currentUserId: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [noteSearch, setNoteSearch] = useState('');
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const [dirty, setDirty] = useState(false);
  const defaultCreatingRef = useRef(false);
  const activeIdRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const isAddingRef = useRef(false);
  const requestIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const notePreferencesHydratedRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(`trav-app:note-preferences:${itineraryId}`);
    if (typeof saved === 'string') setNoteSearch(saved);
    notePreferencesHydratedRef.current = true;
  }, [itineraryId]);

  useEffect(() => {
    if (!notePreferencesHydratedRef.current) return;
    window.localStorage.setItem(`trav-app:note-preferences:${itineraryId}`, noteSearch);
  }, [itineraryId, noteSearch]);

  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  useEffect(() => { isAddingRef.current = isAdding; }, [isAdding]);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  const refresh = useCallback(async () => {
    if (dirtyRef.current) return;
    requestControllerRef.current?.abort();
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const res = await fetch('http://localhost:8080/itinerary/get_itinerary_note_list.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId }), signal: controller.signal });
      const data = await res.json();
      if (requestId !== requestIdRef.current) return;
      if (data.status !== 'success') throw new Error('note list failed');
      const nextNotes = data.data || [];
      if (!nextNotes.length && currentUserId && !defaultCreatingRef.current) {
        defaultCreatingRef.current = true;
        try { await fetch('http://localhost:8080/itinerary/create_itinerary_note.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId, Title: '備忘錄', Content: '' }) }); } finally { defaultCreatingRef.current = false; }
        return refresh();
      }
      if (requestId !== requestIdRef.current) return;
      setNotes(nextNotes);
      const selectedId = activeIdRef.current ?? nextNotes[0]?.id ?? null;
      activeIdRef.current = selectedId;
      setActiveId(selectedId);
      const selected = nextNotes.find((note: any) => note.id === selectedId);
      if (selected && !isAddingRef.current) { setTitle(selected.title); setContent(selected.content || ''); }
      setStatus('saved');
    } catch (error) { if ((error as Error).name !== 'AbortError' && requestId === requestIdRef.current) setStatus('error'); }
  }, [currentUserId, itineraryId]);

  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 5000); return () => window.clearInterval(timer); }, [refresh]);

  const save = async () => {
    if (!title.trim() || !currentUserId || status === 'saving') return;
    setStatus('saving');
    const endpoint = isAdding ? 'create_itinerary_note.php' : 'update_itinerary_note.php';
    try {
      const res = await fetch(`http://localhost:8080/itinerary/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Itinerary_ID: itineraryId, Note_ID: activeId, Account: currentUserId, Title: title.trim(), Content: content }) });
      const data = await res.json();
      if (data.status !== 'success') throw new Error('note save failed');
      dirtyRef.current = false; setDirty(false); setIsAdding(false); if (data.Note_ID) { activeIdRef.current = Number(data.Note_ID); setActiveId(Number(data.Note_ID)); } setStatus('saved'); await refresh();
    } catch { setStatus('error'); }
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && dirtyRef.current) {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  });

  const hasUnsavedChanges = () => dirtyRef.current && Boolean(title.trim() || content.trim());
  const activeNote = notes.find((note: any) => note.id === activeId);
  const visibleNotes = notes.filter((note: any) => {
    const keyword = noteSearch.trim().toLowerCase();
    return !keyword || `${note.title || ''} ${note.content || ''}`.toLowerCase().includes(keyword);
  });
  const select = (note: any) => { if (note.id === activeIdRef.current) return; if (hasUnsavedChanges() && !window.confirm('目前備忘錄尚未同步，確定要放棄修改嗎？')) return; dirtyRef.current = false; activeIdRef.current = note.id; setDirty(false); setIsAdding(false); setActiveId(note.id); setTitle(note.title); setContent(note.content || ''); setStatus('saved'); };
  const add = () => { if (hasUnsavedChanges() && !window.confirm('目前備忘錄尚未同步，確定要放棄修改並新增嗎？')) return; dirtyRef.current = true; activeIdRef.current = null; setDirty(true); setIsAdding(true); setActiveId(null); setTitle(''); setContent(''); setStatus('saved'); };
  const remove = async () => {
    if (!activeId || !window.confirm('確定要刪除這份備忘錄嗎？')) return;
    try {
      const res = await fetch('http://localhost:8080/itinerary/delete_itinerary_note.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Note_ID: activeId, Itinerary_ID: itineraryId, Account: currentUserId }) });
      if (!res.ok) throw new Error('delete failed');
      dirtyRef.current = false; activeIdRef.current = null; setDirty(false); setActiveId(null); setTitle(''); setContent(''); await refresh();
    } catch { setStatus('error'); }
  };

  return <div className="flex min-h-full flex-col bg-[#FAFAFA] p-4">
    <div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-bold tracking-wide text-slate-400">共享備忘錄</div><div className="mt-1 text-2xl font-bold text-slate-800">{notes.length} 份</div></div><button type="button" onClick={add} className="flex size-10 items-center justify-center rounded-xl bg-[#F04D79] text-white shadow-sm"><Plus size={20} /></button></div>
    <div className="mb-2 flex items-center gap-2"><input value={noteSearch} onChange={(event) => setNoteSearch(event.target.value)} placeholder="搜尋備忘錄…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-pink-300" />{noteSearch && <button type="button" onClick={() => setNoteSearch('')} className="rounded-lg p-1.5 text-slate-400 hover:text-[#F04D79]" aria-label="清除備忘錄搜尋"><X size={14} /></button>}</div>
    <div className="mb-3 flex items-center gap-2"><div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">{visibleNotes.map((note) => <button type="button" key={note.id} onClick={() => select(note)} className={`max-w-32 shrink-0 truncate rounded-full px-3 py-1.5 text-xs font-bold ${activeId === note.id ? 'bg-pink-100 text-[#F04D79]' : 'bg-white text-slate-500 shadow-sm'}`}>{note.title}</button>)}</div>{noteSearch && <span className="shrink-0 text-[10px] font-bold text-slate-400">{visibleNotes.length} 份</span>}</div>
    {noteSearch && visibleNotes.length === 0 && <div className="mb-3 rounded-xl bg-white px-3 py-4 text-center text-xs text-slate-400 shadow-sm">找不到符合的備忘錄</div>}
    {noteSearch && activeId && !visibleNotes.some((note) => note.id === activeId) && <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700">目前編輯中的備忘錄未符合搜尋條件</div>}
    {activeNote?.updatedAt && <div className="mb-2 text-right text-[10px] text-slate-400">最後更新：{new Date(activeNote.updatedAt).toLocaleString('zh-TW', { hour12: false })}</div>}
    {(activeId || isAdding) ? <div className="flex flex-1 flex-col gap-3"><div className="flex items-center justify-between"><span className={`text-[11px] font-bold ${dirty ? 'text-amber-500' : status === 'error' ? 'text-red-500' : status === 'saving' ? 'text-amber-500' : 'text-emerald-500'}`}>{dirty ? '尚未同步' : status === 'saving' ? '同步中…' : status === 'error' ? '同步失敗' : '已同步'}</span><div className="flex items-center gap-3">{!isAdding && <button type="button" onClick={remove} className="text-xs font-bold text-slate-300 hover:text-red-500">刪除</button>}<button type="button" onClick={save} disabled={!title.trim() || !dirty || status === 'saving'} className="rounded-lg bg-[#F04D79] px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">{status === 'saving' ? '同步中…' : '同步'}</button></div></div><input maxLength={150} value={title} onChange={(event) => { setDirty(true); setTitle(event.target.value); }} placeholder="備忘錄標題" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-pink-300" /><textarea value={content} onChange={(event) => { setDirty(true); setContent(event.target.value); }} placeholder="記下集合地點、注意事項、營業時間或旅伴共識…" className="min-h-[300px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700 shadow-sm outline-none focus:border-pink-300" /><div className="flex items-center justify-between text-[11px] text-slate-400"><span>輸入完成後按「同步」才會分享給旅伴</span><span>{content.length} 字</span></div></div> : <div className="flex flex-1 items-center justify-center rounded-2xl bg-white text-sm text-slate-400 shadow-sm">點擊上方 + 建立第一份備忘錄</div>}
  </div>;
}

function ReservationsPanel({ itineraryId, currentUserId, itineraryItems, onFocusItem }: { itineraryId: string; currentUserId: string; itineraryItems: any[]; onFocusItem: (item: any) => void }) {
  const [reservations, setReservations] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [form, setForm] = useState({ type: 'hotel', title: '', eventDate: '', referenceNo: '', link: '', notes: '', itemId: '' });
  const [reservationFilter, setReservationFilter] = useState('all');
  const [reservationSearch, setReservationSearch] = useState('');
  const [isRefreshingReservations, setIsRefreshingReservations] = useState(false);
  const [reservationError, setReservationError] = useState('');
  const reservationRefreshLockRef = useRef(false);
  const reservationPreferencesHydratedRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(`trav-app:reservation-preferences:${itineraryId}`);
    if (saved) {
      try {
        const preferences = JSON.parse(saved);
        if (typeof preferences.filter === 'string') setReservationFilter(preferences.filter);
        if (typeof preferences.search === 'string') setReservationSearch(preferences.search);
      } catch {}
    }
    reservationPreferencesHydratedRef.current = true;
  }, [itineraryId]);

  useEffect(() => {
    if (!reservationPreferencesHydratedRef.current) return;
    window.localStorage.setItem(`trav-app:reservation-preferences:${itineraryId}`, JSON.stringify({ filter: reservationFilter, search: reservationSearch }));
  }, [itineraryId, reservationFilter, reservationSearch]);

  useEffect(() => () => { if (screenshotPreview.startsWith('blob:')) URL.revokeObjectURL(screenshotPreview); }, [screenshotPreview]);

  const handleScreenshotChange = (file: File | null) => {
    if (!file) { setScreenshot(null); setScreenshotPreview(''); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setReservationError('圖片格式只支援 JPG、PNG 或 WebP'); return; }
    if (file.size > 10 * 1024 * 1024) { setReservationError('圖片大小不可超過 10MB'); return; }
    setReservationError('');
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const refreshReservations = useCallback(async () => {
    if (reservationRefreshLockRef.current) return;
    reservationRefreshLockRef.current = true;
    setReservationError('');
    try {
      const res = await fetch('http://localhost:8080/itinerary/get_reservations.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId }),
      });
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`預訂 API 回應格式錯誤（${res.status}）`);
      }
      if (!res.ok) throw new Error(data.message || `預訂 API 錯誤（${res.status}）`);
      if (data.status === 'success') setReservations(data.data || []);
    } catch (error) {
      console.warn('Reservations sync error:', error);
      setReservationError('預訂同步失敗，請稍後再試');
    } finally {
      reservationRefreshLockRef.current = false;
    }
  }, [itineraryId]);

  useEffect(() => {
    refreshReservations();
    const refreshTimer = window.setInterval(refreshReservations, 5000);
    return () => window.clearInterval(refreshTimer);
  }, [refreshReservations]);

  const handleRefreshReservations = async () => { if (isRefreshingReservations) return; setIsRefreshingReservations(true); try { await refreshReservations(); } finally { setIsRefreshingReservations(false); } };

  const saveReservation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !currentUserId || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:8080/itinerary/${editingId ? 'update_reservation.php' : 'create_reservation.php'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId, Reservation_ID: editingId, Item_ID: form.itemId ? Number(form.itemId) : 0, Type: form.type, Title: form.title, Event_Date: form.eventDate, Reference_No: form.referenceNo, Link: form.link, Notes: form.notes }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        const reservationId = editingId || data.Reservation_ID;
        if (screenshot && reservationId) {
          const imageForm = new FormData();
          imageForm.append('Reservation_ID', String(reservationId));
          imageForm.append('Itinerary_ID', itineraryId);
          imageForm.append('Account', currentUserId);
          imageForm.append('screenshot', screenshot);
          const uploadRes = await fetch('http://localhost:8080/itinerary/upload_reservation_screenshot.php', { method: 'POST', body: imageForm });
          const uploadText = await uploadRes.text();
          let uploadData;
          try { uploadData = JSON.parse(uploadText); } catch { throw new Error(`圖片上傳 API 回應格式錯誤（${uploadRes.status}）`); }
          if (!uploadRes.ok || uploadData.status !== 'success') throw new Error(uploadData.message || '圖片上傳失敗');
        }
        setForm({ type: 'hotel', title: '', eventDate: '', referenceNo: '', link: '', notes: '', itemId: '' });
        setEditingId(null);
        setScreenshot(null);
        setScreenshotPreview('');
        setIsAdding(false);
        refreshReservations();
      }
    } catch (error) {
      console.error('Create reservation error:', error);
      setReservationError('預訂儲存失敗，請檢查資料後再試');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (reservation: any) => {
    setEditingId(reservation.id);
    setForm({ type: reservation.type || 'other', title: reservation.title || '', eventDate: reservation.eventDate || '', referenceNo: reservation.referenceNo || '', link: reservation.link || '', notes: reservation.notes || '', itemId: reservation.itemId ? String(reservation.itemId) : '' });
    setScreenshot(null);
    setScreenshotPreview(reservation.screenshotUrl || '');
    setIsAdding(true);
  };

  const deleteReservation = async (reservation: any) => {
    if (!window.confirm('確定要刪除這筆預訂嗎？')) return;
    await fetch('http://localhost:8080/itinerary/delete_reservation.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Reservation_ID: reservation.id, Itinerary_ID: itineraryId, Account: currentUserId }),
    });
    refreshReservations();
  };

  const typeLabels: Record<string, string> = { hotel: '住宿', transport: '交通', ticket: '票券', food: '餐廳', other: '其他' };
  const visibleReservations = reservations
    .filter((reservation) => {
      const keyword = reservationSearch.trim().toLowerCase();
      const reservationType = String(reservation.type ?? reservation.Type ?? 'other').toLowerCase();
      const matchesType = reservationFilter === 'all' || reservationType === reservationFilter;
      const matchesSearch = !keyword || `${reservation.title || reservation.Title || ''} ${reservation.notes || reservation.Notes || ''} ${reservation.referenceNo || reservation.Reference_No || ''} ${reservation.link || reservation.Link || ''}`.toLowerCase().includes(keyword);
      return matchesType && matchesSearch;
    })
    .sort((a, b) => String(a.eventDate || '9999-12-31').localeCompare(String(b.eventDate || '9999-12-31')));
  const reservationDateStatus = (eventDate: string) => {
    if (!eventDate) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (eventDate < today) return { label: '已過期', className: 'bg-slate-100 text-slate-400' };
    if (eventDate === today) return { label: '今天', className: 'bg-amber-100 text-amber-700' };
    return { label: '即將到來', className: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <div className="min-h-full bg-[#FAFAFA] p-4">
      {reservationError && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-500">{reservationError}</div>}
      <div className="mb-4 flex items-center justify-between">
        <div><div className="text-xs font-bold tracking-wide text-slate-400">預訂與票券</div><div className="mt-1 text-2xl font-bold text-slate-800">{reservations.length} 筆</div></div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => void handleRefreshReservations()} disabled={isRefreshingReservations} title="重新整理預訂" aria-label="重新整理預訂" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#F04D79] disabled:cursor-wait disabled:opacity-50"><RefreshCw size={16} className={isRefreshingReservations ? 'animate-spin' : ''} /></button><button onClick={() => setIsAdding((value) => !value)} className="flex size-10 items-center justify-center rounded-xl bg-[#F04D79] text-white shadow-sm hover:bg-pink-600"><Plus size={20} /></button></div>
      </div>

      {isAdding && (
        <form onSubmit={saveReservation} className="mb-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-pink-300">
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={form.itemId} onChange={(event) => setForm({ ...form, itemId: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-pink-300">
            <option value="">關聯行程（選填）</option>
            {itineraryItems.map((item) => <option key={item.id} value={item.id}>Day {item.dayNumber} · {item.title || item.Title}</option>)}
          </select>
          <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="預訂名稱，例如：京都飯店" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-300" />
          <input type="date" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none focus:border-pink-300" />
          <input value={form.referenceNo} onChange={(event) => setForm({ ...form, referenceNo: event.target.value })} placeholder="訂位編號／票券號碼" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-300" />
          <input type="url" value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} placeholder="相關連結（選填）" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-300" />
          <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500 hover:border-pink-300 hover:text-[#F04D79]">
            <span>上傳票券截圖（選填，最大 10MB）</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => handleScreenshotChange(event.target.files?.[0] || null)} />
          </label>
          {screenshotPreview && <img src={screenshotPreview} alt="票券截圖預覽" className="max-h-32 w-full rounded-xl object-contain" />}
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} placeholder="備註（選填）" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-300" />
          <div className="flex justify-end gap-2"><button type="button" onClick={() => { setIsAdding(false); setEditingId(null); }} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500">取消</button><button type="submit" disabled={isSaving} className="rounded-xl bg-[#F04D79] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isSaving ? '儲存中…' : editingId ? '更新' : '儲存'}</button></div>
        </form>
      )}

      <div className="mb-3 flex items-center gap-2">
        <input value={reservationSearch} onChange={(event) => setReservationSearch(event.target.value)} placeholder="搜尋預訂…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-pink-300" />
        <select value={reservationFilter} onChange={(event) => setReservationFilter(event.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-pink-300">
          <option value="all">全部預訂</option>
          {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span className="text-xs font-bold text-slate-400">{reservationSearch || reservationFilter !== 'all' ? `${visibleReservations.length}/${reservations.length}` : `${visibleReservations.length}`} 筆</span>
      </div>

      <div className="space-y-3">
        {visibleReservations.length === 0 ? <div className="rounded-2xl bg-white py-12 text-center text-sm text-slate-400 shadow-sm">{reservations.length === 0 ? '還沒有預訂或票券' : '沒有符合條件的預訂'}</div> : visibleReservations.map((reservation) => (
          <div key={reservation.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-[#F04D79]"><Ticket size={19} /></div>
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="truncate text-sm font-bold text-slate-800">{reservation.title}</h3><div className="flex shrink-0 items-center gap-1.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{typeLabels[reservation.type] || '其他'}</span>{reservation.eventDate && (() => { const dateStatus = reservationDateStatus(reservation.eventDate); return dateStatus ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${dateStatus.className}`}>{dateStatus.label}</span> : null; })()}</div></div>
                {reservation.eventDate && <div className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-400"><Calendar size={13} />{reservation.eventDate}</div>}
                {reservation.itemId && (() => { const item = itineraryItems.find((entry) => String(entry.id) === String(reservation.itemId)); return item ? <button type="button" onClick={() => onFocusItem(item)} className="mt-1 text-left text-xs font-bold text-[#F04D79] hover:underline">Day {item.dayNumber} · {item.title || item.Title}（查看地圖）</button> : null; })()}
                {reservation.referenceNo && <div className="mt-1 truncate font-mono text-xs text-slate-500">編號：{reservation.referenceNo}</div>}
                {reservation.notes && <div className="mt-2 text-xs leading-relaxed text-slate-500">{reservation.notes}</div>}
                {reservation.screenshotUrl && <a href={reservation.screenshotUrl} target="_blank" rel="noreferrer" className="mt-3 block"><img src={reservation.screenshotUrl} alt="票券截圖" className="max-h-36 w-full rounded-xl border border-slate-100 object-contain" /></a>}
          <div className="mt-3 flex items-center gap-3">{reservation.link && <a href={reservation.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-[#F04D79]">開啟連結 <ExternalLink size={12} /></a>}<button onClick={() => startEditing(reservation)} className="ml-auto text-xs font-bold text-slate-400 hover:text-[#F04D79]">編輯</button><button onClick={() => deleteReservation(reservation)} className="text-xs font-bold text-slate-300 hover:text-red-500">刪除</button></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TravelersPanel({ itineraryId, currentUserId }: { itineraryId: string; currentUserId: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [presence, setPresence] = useState<Record<string, number>>({});
  const [syncError, setSyncError] = useState(false);
  const [isRefreshingTravelers, setIsRefreshingTravelers] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [travelerSearch, setTravelerSearch] = useState('');
  const travelerRefreshLockRef = useRef(false);
  const travelerPreferencesHydratedRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(`trav-app:traveler-preferences:${itineraryId}`);
    if (saved) {
      try {
        const preferences = JSON.parse(saved);
        if (typeof preferences.onlineOnly === 'boolean') setOnlineOnly(preferences.onlineOnly);
        if (typeof preferences.search === 'string') setTravelerSearch(preferences.search);
      } catch {}
    }
    travelerPreferencesHydratedRef.current = true;
  }, [itineraryId]);

  useEffect(() => {
    if (!travelerPreferencesHydratedRef.current) return;
    window.localStorage.setItem(`trav-app:traveler-preferences:${itineraryId}`, JSON.stringify({ onlineOnly, search: travelerSearch }));
  }, [itineraryId, onlineOnly, travelerSearch]);

  const refreshTravelers = useCallback(async () => {
    if (travelerRefreshLockRef.current) return;
    travelerRefreshLockRef.current = true;
    setSyncError(false);
    try {
      const [membersRes, presenceRes] = await Promise.all([
        fetch('http://localhost:8080/itinerary/get_itinerary_members.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId }),
        }),
        fetch('http://localhost:8080/itinerary/get_chat_presence.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId }),
        }),
      ]);
      const membersData = await membersRes.json();
      const presenceData = await presenceRes.json();
      if (membersData.status === 'success') setMembers(membersData.data || []);
      if (presenceData.status === 'success') setPresence(presenceData.data || {});
    } catch (error) {
      console.error('Travelers sync error:', error);
      setSyncError(true);
    } finally {
      travelerRefreshLockRef.current = false;
    }
  }, [itineraryId]);

  useEffect(() => {
    refreshTravelers();
    const refreshTimer = window.setInterval(refreshTravelers, 5000);
    return () => window.clearInterval(refreshTimer);
  }, [refreshTravelers]);

  const handleRefreshTravelers = async () => { if (isRefreshingTravelers) return; setIsRefreshingTravelers(true); try { await refreshTravelers(); } finally { setIsRefreshingTravelers(false); } };

  const isOnline = (account: string) => Boolean(presence[account] && (Date.now() / 1000 - presence[account] < 45));
  const onlineCount = members.filter((member) => isOnline(member.id)).length;
  const sortedMembers = [...members].sort((a, b) => Number(isOnline(b.id)) - Number(isOnline(a.id)));
  const visibleMembers = sortedMembers.filter((member) => {
    const matchesOnline = !onlineOnly || isOnline(member.id);
    const search = travelerSearch.trim().toLowerCase();
    const matchesSearch = !search || `${member.name || ''} ${member.role || ''}`.toLowerCase().includes(search);
    return matchesOnline && matchesSearch;
  });

  return (
    <div className="min-h-full bg-[#FAFAFA] p-4">
      {syncError && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-500">旅伴狀態同步失敗，請稍後再試</div>}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-wide text-slate-400">旅伴成員</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">{members.length} 人</div>
          </div>
          <div className="flex items-center gap-2"><button type="button" onClick={() => void handleRefreshTravelers()} disabled={isRefreshingTravelers} title="重新整理旅伴" aria-label="重新整理旅伴" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#F04D79] disabled:cursor-wait disabled:opacity-50"><RefreshCw size={16} className={isRefreshingTravelers ? 'animate-spin' : ''} /></button><div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
            <div className="text-[10px] font-bold text-emerald-600">目前在線</div>
            <div className="font-mono text-lg font-bold text-emerald-600">{onlineCount}</div>
          </div></div>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2"><div className="flex min-w-0 flex-1 items-center rounded-xl border border-slate-200 bg-white focus-within:border-pink-300"><input value={travelerSearch} onChange={(event) => setTravelerSearch(event.target.value)} placeholder="搜尋旅伴…" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs text-slate-600 outline-none" />{travelerSearch && <button type="button" onClick={() => setTravelerSearch('')} className="p-1.5 text-slate-400 hover:text-[#F04D79]" aria-label="清除旅伴搜尋"><X size={14} /></button>}</div><button type="button" onClick={() => setOnlineOnly((value) => !value)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition ${onlineOnly ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 shadow-sm'}`}>{onlineOnly ? '全部' : '在線'}</button></div>
      {(travelerSearch.trim() || onlineOnly) && <div className="mb-2 text-right text-[10px] font-bold text-slate-400">顯示 {visibleMembers.length} / {members.length} 位</div>}
      <div className="space-y-2">
        {visibleMembers.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">{travelerSearch.trim() ? '找不到符合的旅伴' : onlineOnly ? '目前沒有在線中的旅伴' : '目前沒有旅伴資料'}</div>
        ) : visibleMembers.map((member) => {
          const online = isOnline(member.id);
          return (
            <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink-100 font-bold text-[#F04D79]">
                {member.avatar ? <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" /> : member.name?.charAt(0)}
                <span className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-700">{member.name}</div>
                <div className="mt-1 text-[11px] font-medium text-slate-400">{member.role === 'Owner' ? '行程建立者' : (member.role || '旅伴')} · {online ? '在線中' : '離線'}</div>
              </div>
              <span className={`size-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TodayPanel({ dayNumber, items, onFocusItem }: { dayNumber: number; items: any[]; onFocusItem: (item: any) => void }) {
  const [now, setNow] = useState(() => new Date());
  const toMinutes = (value: string) => {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const orderedItems = [...items].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const timedItems = orderedItems.filter((item) => toMinutes(item.startTime) !== null && toMinutes(item.endTime) !== null);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const timelineNow = nowMinutes < 6 * 60 ? nowMinutes + 24 * 60 : nowMinutes;
  const getRange = (item: any) => {
    const start = toMinutes(item.startTime) ?? 0;
    const rawEnd = toMinutes(item.endTime) ?? start;
    return { start, end: rawEnd < start ? rawEnd + 24 * 60 : rawEnd };
  };
  const currentItem = timedItems.find((item) => {
    const range = getRange(item);
    return (range.start <= timelineNow && range.end >= timelineNow) || (range.start <= nowMinutes && range.end >= nowMinutes);
  });
  const nextItem = currentItem || timedItems.find((item) => getRange(item).start >= timelineNow) || timedItems[0];
  const finishedCount = timedItems.filter((item) => getRange(item).end < timelineNow).length;

  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#FAFAFA]">
      <div className="border-b border-slate-100 bg-white px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold tracking-wide text-slate-400">目前查看</div>
            <div className="mt-1 text-xl font-bold text-slate-800">Day {dayNumber} 行程</div>
            <div className="mt-1 text-[11px] font-mono font-bold text-slate-400">現在 {now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
          </div>
          <div className="rounded-xl bg-pink-50 px-3 py-2 text-right">
            <div className="text-[10px] font-bold text-[#F04D79]">時間進度</div>
            <div className="font-mono text-lg font-bold text-[#F04D79]">{finishedCount}/{timedItems.length || 0}</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#F04D79] transition-all" style={{ width: `${timedItems.length ? Math.min(100, finishedCount / timedItems.length * 100) : 0}%` }} />
        </div>
      </div>

      {nextItem && (
        <button onClick={() => onFocusItem(nextItem)} className="m-4 rounded-2xl bg-[#F04D79] p-4 text-left text-white shadow-md transition hover:bg-pink-600">
          <div className="flex items-center gap-2 text-xs font-bold text-pink-100"><Clock size={14} /> {currentItem ? '進行中' : '下一站'}</div>
          <div className="mt-2 truncate text-lg font-bold">{nextItem.title || nextItem.Title}</div>
          <div className="mt-1 font-mono text-sm text-pink-100">{nextItem.startTime || '--:--'} - {nextItem.endTime || '--:--'}</div>
        </button>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {orderedItems.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">今天還沒有安排行程<div className="mt-2 text-xs text-slate-300">可從左側新增地點開始安排</div></div>
        ) : (
          <div className="relative space-y-2">
            <div className="absolute bottom-4 left-[7px] top-4 border-l-2 border-dashed border-slate-200" />
            {orderedItems.map((item) => {
              const start = toMinutes(item.startTime);
              const end = toMinutes(item.endTime);
              const isFinished = end !== null && end < nowMinutes;
              const isCurrent = start !== null && end !== null && start <= nowMinutes && end >= nowMinutes;
              return (
                <button key={item.id} onClick={() => onFocusItem(item)} className={`relative flex w-full items-center gap-3 rounded-xl p-3 text-left shadow-sm transition hover:border-pink-200 hover:shadow-md ${isCurrent ? 'bg-pink-50 ring-1 ring-pink-200' : isFinished ? 'bg-emerald-50/60' : 'bg-white'}`}>
                  <span className={`z-10 size-4 shrink-0 rounded-full border-4 border-white shadow-sm ${isCurrent ? 'bg-amber-400' : isFinished ? 'bg-emerald-400' : 'bg-[#F04D79]'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-700">{item.title || item.Title}</span>
                    <span className="mt-1 block font-mono text-[11px] font-bold text-slate-400">{item.startTime || '--:--'} - {item.endTime || '--:--'}</span>
                  </span>
                  <MapPin size={16} className="shrink-0 text-slate-300" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatPanel({ itineraryId, currentUserId, isActive, onUnreadChange }: { itineraryId: string; currentUserId: string; isActive: boolean; onUnreadChange: (count: number) => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [presence, setPresence] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const messagesRef = useRef<any[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const lastSeenMessageIdRef = useRef<number | null>(null);

  const refreshChat = useCallback(async () => {
    try {
      const [messageRes, presenceRes] = await Promise.all([
        fetch('http://localhost:8080/itinerary/get_chat_messages.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId }),
        }),
        fetch('http://localhost:8080/itinerary/get_chat_presence.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId }),
        }),
      ]);
      const messageData = await messageRes.json();
      const presenceData = await presenceRes.json();
      if (messageData.status === 'success') {
        const nextMessages = messageData.data || [];
        const newestMessageId = nextMessages.length ? Number(nextMessages[nextMessages.length - 1].id) : null;
        if (lastSeenMessageIdRef.current === null) lastSeenMessageIdRef.current = newestMessageId;
        const seenMessageId = lastSeenMessageIdRef.current;
        if (isActive) {
          lastSeenMessageIdRef.current = newestMessageId;
          onUnreadChange(0);
        } else if (seenMessageId !== null) {
          onUnreadChange(nextMessages.filter((message: any) => Number(message.id) > seenMessageId && message.account !== currentUserId).length);
        }
        if (JSON.stringify(messagesRef.current) !== JSON.stringify(nextMessages)) {
          messagesRef.current = nextMessages;
          setMessages(nextMessages);
        }
      }
      if (presenceData.status === 'success') setPresence(presenceData.data || {});
    } catch (error) {
      console.error('Chat sync error:', error);
    }
  }, [currentUserId, isActive, itineraryId, onUnreadChange]);

  useEffect(() => {
    if (isActive) onUnreadChange(0);
  }, [isActive, onUnreadChange]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await fetch('http://localhost:8080/itinerary/get_itinerary_members.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId }),
        });
        const data = await res.json();
        if (data.status === 'success') setMembers(data.data || []);
      } catch (error) {
        console.error('Chat members error:', error);
      }
    };
    loadMembers();
  }, [itineraryId]);

  useEffect(() => {
    refreshChat();
    const refreshTimer = window.setInterval(refreshChat, 3000);
    return () => window.clearInterval(refreshTimer);
  }, [refreshChat]);

  useEffect(() => {
    if (!currentUserId) return;
    const heartbeat = () => fetch('http://localhost:8080/itinerary/update_chat_presence.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId }),
    }).catch(() => {});
    heartbeat();
    const heartbeatTimer = window.setInterval(heartbeat, 15000);
    return () => window.clearInterval(heartbeatTimer);
  }, [itineraryId, currentUserId]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !currentUserId || isSending) return;
    setIsSending(true);
    setSendError('');
    try {
      const res = await fetch('http://localhost:8080/itinerary/send_chat_message.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId, Message: message }),
      });
      const data = await res.json();
      if (data.status !== 'success') throw new Error(data.message || '訊息發送失敗');
      setDraft('');
      await refreshChat();
    } catch (error) {
      console.error('Send chat message error:', error);
      setSendError(error instanceof Error ? error.message : '訊息發送失敗，請稍後再試');
    } finally {
      setIsSending(false);
    }
  };

  const isOnline = (account: string) => Boolean(presence[account] && (Date.now() / 1000 - presence[account] < 45));

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#FAFAFA]">
      <div className="border-b border-slate-100 bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wide text-slate-500">旅伴在線狀態</span>
          <span className="text-[11px] text-slate-400">{members.filter((member) => isOnline(member.id)).length} 人在線</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1" title={isOnline(member.id) ? '在線' : '離線'}>
              <span className={`size-2 rounded-full ${isOnline(member.id) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="max-w-20 truncate text-[11px] font-bold text-slate-600">{member.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={messagesContainerRef} onScroll={(event) => { const element = event.currentTarget; shouldAutoScrollRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 72; }} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">還沒有訊息，開始討論旅程吧！</div>
        ) : messages.map((message) => {
          const isMine = message.account === currentUserId;
          return (
            <div key={message.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
              <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink-100 text-xs font-bold text-[#F04D79]">
                {message.avatar ? <img src={message.avatar} alt={message.name} className="h-full w-full object-cover" /> : message.name?.charAt(0)}
              </div>
              <div className={`max-w-[78%] ${isMine ? 'items-end' : ''}`}>
                <div className={`mb-1 text-[10px] font-bold text-slate-400 ${isMine ? 'text-right' : ''}`}>{message.name}</div>
                <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${isMine ? 'rounded-tr-sm bg-[#F04D79] text-white' : 'rounded-tl-sm bg-white text-slate-700 shadow-sm'}`}>{message.message}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={sendMessage} className="border-t border-slate-100 bg-white p-3">
        {sendError && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500">{sendError}</div>}
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-pink-300">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} placeholder="輸入訊息..." className="max-h-24 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-700 outline-none" />
          <button type="submit" disabled={!draft.trim() || isSending} className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F04D79] text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"><Send size={16} /></button>
        </div>
      </form>
    </div>
  );
}

// ================= 記帳獨立模組 (BudgetPanel CRUD 完整版) =================
function BudgetPanel({ itineraryId, currentUserId, itineraryItems, onTotalChange }: { itineraryId: string; currentUserId: string; itineraryItems: any[]; onTotalChange?: (total: number) => void }) {
  const [activeTab, setActiveTab] = useState<'group' | 'personal' | 'pending'>('group');
  const [expenses, setExpenses] = useState<any[]>([]); 
  const [members, setMembers] = useState<any[]>([]); 
  const [expenseSearch, setExpenseSearch] = useState('');
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [budgetSyncStatus, setBudgetSyncStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isManualRefreshingBudget, setIsManualRefreshingBudget] = useState(false);
  const isRefreshingExpensesRef = useRef(false);
  const budgetPreferencesHydratedRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(`trav-app:budget-preferences:${itineraryId}`);
    if (saved) {
      try {
        const preferences = JSON.parse(saved);
        if (['group', 'personal', 'pending'].includes(preferences.activeTab)) setActiveTab(preferences.activeTab);
        if (typeof preferences.expenseSearch === 'string') setExpenseSearch(preferences.expenseSearch);
      } catch {}
    }
    budgetPreferencesHydratedRef.current = true;
  }, [itineraryId]);

  useEffect(() => {
    if (!budgetPreferencesHydratedRef.current) return;
    window.localStorage.setItem(`trav-app:budget-preferences:${itineraryId}`, JSON.stringify({ activeTab, expenseSearch }));
  }, [activeTab, expenseSearch, itineraryId]);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editExpTitle, setEditExpTitle] = useState("");
  const [editExpAmount, setEditExpAmount] = useState("");
  
  const [category, setCategory] = useState("food");
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("TWD");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("");
  const [payer, setPayer] = useState("User (自己)");
  const [isSplit, setIsSplit] = useState(false);
  const [splitUsers, setSplitUsers] = useState([{ name: "User (自己)", id: "u1" }]);
  const [expenseMode, setExpenseMode] = useState<'personal' | 'group' | 'collector'>('personal');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isFetchingCode, setIsFetchingCode] = useState(false);
  const [copiedType, setCopiedType] = useState<'none' | 'code'>('none');

  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    name: string;
    role: string;
    avatar?: string; 
  } | null>(null);

  const categories = [
    { id: 'food', icon: Utensils, label: '食', color: 'bg-[#BCA484]' },
    { id: 'hotel', icon: Bed, label: '住宿', color: 'bg-[#9079D6]' },
    { id: 'transport', icon: TrainFront, label: '交通', color: 'bg-[#69C773]' },
    { id: 'ticket', icon: Ticket, label: '門票', color: 'bg-[#8BB1AA]' },
    { id: 'shopping', icon: ShoppingBag, label: '購物', color: 'bg-[#4585C4]' },
    { id: 'other', icon: Receipt, label: '其他', color: 'bg-[#909090]' }
  ];

  const fetchData = useCallback(async () => {
    if (isRefreshingExpensesRef.current) return;
    isRefreshingExpensesRef.current = true;
    setBudgetSyncStatus('idle');
    try {
      const expRes = await fetch("http://localhost:8080/itinerary/get_expenses.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId })
      });
      const expText = await expRes.text();
      try {
        const expData = JSON.parse(expText);
        if (expData.status === 'success') setExpenses(expData.data);
      } catch (e) {
        console.error("帳單 API 回傳錯誤格式:", expText);
      }

      const memRes = await fetch("http://localhost:8080/itinerary/get_itinerary_members.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId })
      });
      const memText = await memRes.text();
      try {
        const memData = JSON.parse(memText);
        if (memData.status === 'success') setMembers(memData.data);
      } catch (e) {
        console.error("成員 API 回傳錯誤格式:", memText);
      }

    } catch (error) { 
      console.error("網路請求失敗", error); 
      setBudgetSyncStatus('error');
    } finally { 
      setIsLoadingExpenses(false); 
      isRefreshingExpensesRef.current = false;
    }
  }, [itineraryId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const refreshTimer = window.setInterval(fetchData, 5000);
    return () => window.clearInterval(refreshTimer);
  }, [fetchData]);

  const handleManualRefreshBudget = async () => { if (isManualRefreshingBudget) return; setIsManualRefreshingBudget(true); try { await fetchData(); } finally { setIsManualRefreshingBudget(false); } };

  useEffect(() => {
    onTotalChange?.(expenses.reduce((total, expense) => total + Number(expense.amount ?? expense.Amount ?? 0), 0));
  }, [expenses, onTotalChange]);

  useEffect(() => {
    if (members && members.length > 0) {
      const defaultUsers = members.map(m => ({ name: m.name, id: m.id }));
      setSplitUsers(defaultUsers);
      setPayer(defaultUsers[0].name); 
    }
  }, [members]);

  const handleOpenInviteModal = async () => {
    setIsInviteModalOpen(true);
    if (inviteCode) return; 

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

  const handleCopy = (type: 'code', text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType('none'), 2000); 
    }).catch(() => {
      alert("瀏覽器不支援自動複製，請手動複製。");
    });
  };

  const handleCategorySelect = (catId: string) => { setCategory(catId); setAddStep(2); };

  const closeAndResetForm = () => {
    setIsAddOpen(false);
    setTimeout(() => {
      setAddStep(1); setAmount(""); setTitle(""); setLocation(""); setIsSplit(false); setExpenseMode('personal'); setSplitMethod('equal'); setCustomShares({}); setIsSubmitting(false);
      
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

  const toggleSplitUser = (user: { name: string; id: string }) => {
    setSplitUsers((users) => users.some((selected) => selected.id === user.id) ? users.filter((selected) => selected.id !== user.id) : [...users, user]);
  };

  const handleSaveExpense = async () => {
    if (!title.trim()) {
      alert("請輸入標題");
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      alert("請輸入有效的金額");
      return;
    }
    
    if (expenseMode !== 'personal' && splitUsers.length <= 1) {
      alert("開啟分帳時，請至少新增一位參與分帳的朋友。若僅為個人花費，請關閉分帳開關。");
      return;
    }

    if (expenseMode !== 'personal' && splitMethod === 'custom') {
      const shareTotal = splitUsers.reduce((total, user) => total + Number(customShares[user.id] || 0), 0);
      if (Math.abs(shareTotal - Number(amount)) > 0.01) {
        alert(`自訂分帳金額需加總為 ${amount} ${currency}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const expenseData = {
              Itinerary_ID: itineraryId,
              Account: currentUserId,
              Category: category,
              Title: title,
              Currency: currency,
              Amount: Number(amount),
              Location: location,
              Payer: payer,
              IsSplit: expenseMode !== 'personal',
              SplitUsers: expenseMode !== 'personal' ? splitUsers.map(u => u.name) : [],
              SplitShares: expenseMode !== 'personal' ? (splitMethod === 'equal' ? Object.fromEntries(splitUsers.map((u) => [u.name, Number(amount) / splitUsers.length])) : Object.fromEntries(splitUsers.map((u) => [u.name, Number(customShares[u.id] || 0)]))) : {},
              Type: expenseMode === 'collector' ? 'collector' : expenseMode === 'group' ? 'group' : 'personal'
            };

      const res = await fetch("http://localhost:8080/itinerary/create_expense.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData)
      });

      const data = await res.json();

      if (data.status === 'success') {
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

  const handleToggleShare = async (shareId: string, isSettled: boolean) => {
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_expense_share.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Share_ID: shareId, Account: currentUserId, Is_Settled: !isSettled }) });
      const data = await res.json();
      if (data.status === 'success') fetchData(); else alert(data.message || "更新付款狀態失敗");
    } catch (error) {
      alert("更新付款狀態失敗");
    }
  };

  const handleUpdateExpense = async (expenseId: string) => {
    if (!editExpTitle.trim() || !editExpAmount) {
      alert("請輸入標題與金額");
      return;
    }

    try {
      const currentExpense = expenses.find((expense) => String(expense.id || expense.Expense_ID) === String(expenseId));
      const previousAmount = Number(currentExpense?.amount ?? currentExpense?.Amount ?? 0);
      const nextAmount = Number(editExpAmount);
      const shareAmounts = previousAmount > 0
        ? (currentExpense?.shares || []).map((share: any) => ({
            Share_ID: share.id,
            Amount: Math.round((Number(share.amount || 0) * nextAmount / previousAmount) * 100) / 100
          }))
        : [];
      const res = await fetch("http://localhost:8080/itinerary/update_expense.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Expense_ID: expenseId,
          Account: currentUserId,
          Title: editExpTitle,
          Amount: nextAmount,
          ShareAmounts: shareAmounts
        })
      });
      
      const data = await res.json();
      
      if (data.status === 'success') {
        setEditingExpId(null); 
        fetchData();           
      } else {
        alert("更新失敗：" + data.message);
      }
    } catch (error) {
      console.error("更新異常", error);
      alert("後端伺服器連線異常");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm("確定要刪除這筆帳單嗎？此動作無法復原。")) {
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/itinerary/delete_expense.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Expense_ID: expenseId, Account: currentUserId })
      });
      
      const data = await res.json();
      
      if (data.status === 'success') {
        fetchData(); 
      } else {
        alert("刪除失敗：" + data.message);
      }
    } catch (error) {
      console.error("刪除異常", error);
      alert("後端伺服器連線異常");
    }
  };

  const currentCategoryObj = categories.find(c => c.id === category) || categories[0];
  const currentTabExpenses = expenses.filter((exp) => {
    const keyword = expenseSearch.trim().toLowerCase();
    if (keyword && !`${exp.title ?? exp.Title ?? ''} ${exp.location ?? exp.Location ?? ''} ${exp.payer ?? exp.Payer ?? ''} ${exp.referenceNo ?? exp.Reference_No ?? ''}`.toLowerCase().includes(keyword)) return false;
    if (activeTab === 'pending') return (exp.shares || []).some((share: any) => !share.isSettled);
    const isGroupExp = exp.Type === 'group' || exp.Type === 'collector' || exp.type === 'group' || exp.type === 'collector' || exp.Is_Split == 1 || exp.IsSplit == 1 || exp.Is_Split === true;
    return (isGroupExp ? 'group' : 'personal') === activeTab;
  });
  const totalExpenseAmount = expenses.reduce((total, expense) => total + Number(expense.amount ?? expense.Amount ?? 0), 0);
  const pendingShareAmount = expenses.reduce((total, expense) => total + (expense.shares || []).filter((share: any) => !share.isSettled).reduce((shareTotal: number, share: any) => shareTotal + Number(share.amount || 0), 0), 0);
  const expenseTabCounts = {
    group: expenses.filter((exp) => exp.Type === 'group' || exp.type === 'group' || exp.Type === 'collector' || exp.type === 'collector' || exp.Is_Split == 1 || exp.IsSplit == 1 || exp.Is_Split === true).length,
    personal: expenses.filter((exp) => !(exp.Type === 'group' || exp.type === 'group' || exp.Type === 'collector' || exp.type === 'collector' || exp.Is_Split == 1 || exp.IsSplit == 1 || exp.Is_Split === true)).length,
    pending: expenses.filter((exp) => (exp.shares || []).some((share: any) => !share.isSettled)).length,
  };

  return (
    <div className="h-full flex flex-col relative animate-in fade-in slide-in-from-right-4 duration-200 bg-[#FAFAFA]">
      {budgetSyncStatus === 'error' && <div className="mx-4 mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-500">記帳同步失敗，請稍後再試</div>}
      
      {/* 頂部資訊區 */}
      <div className="flex justify-between items-end px-4 pt-2 pb-4 shrink-0">
        <div>
          <div className="text-xs font-bold text-slate-500 mb-2 tracking-wide">分帳群組</div>
          
          <div className="flex items-center">
            {members.length > 0 ? (
              <div className="flex -space-x-3 mr-3 relative z-0 hover:z-10">
                  {members.map((member, index) => (
                    <div 
                      key={member.id} 
                      onClick={() => setSelectedMember(member)} 
                      className="size-10 rounded-full border-2 border-white bg-pink-100 text-[#F04D79] flex items-center justify-center text-sm font-bold shadow-sm relative hover:scale-110 hover:z-50 transition-all cursor-pointer uppercase overflow-hidden" 
                      title={`${member.name} (${member.role})`}
                      style={{ zIndex: members.length - index }}
                    >
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
            
            <button type="button" onClick={() => void handleManualRefreshBudget()} disabled={isManualRefreshingBudget} title="重新整理記帳" aria-label="重新整理記帳" className="mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-[#F04D79] disabled:cursor-wait disabled:opacity-50"><RefreshCw size={16} className={isManualRefreshingBudget ? 'animate-spin' : ''} /></button>
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

      <div className="grid grid-cols-2 gap-2 px-4 pb-3 shrink-0">
        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
          <div className="text-[11px] font-bold tracking-wide text-slate-400">總花費（未換算）</div>
          <div className="mt-1 text-lg font-mono font-bold text-slate-800">NT$ {totalExpenseAmount.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5 shadow-sm">
          <div className="text-[11px] font-bold tracking-wide text-amber-600">待結清</div>
          <div className={`mt-1 text-lg font-mono font-bold ${pendingShareAmount > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
            NT$ {pendingShareAmount.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex px-4 border-b border-slate-200 shrink-0">
        <button onClick={() => setActiveTab('group')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'group' ? 'text-[#F04D79] border-b-2 border-[#F04D79]' : 'text-slate-400'}`}>群組花費 <span className="text-[10px]">({expenseTabCounts.group})</span></button>
        <button onClick={() => setActiveTab('personal')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'personal' ? 'text-[#F04D79] border-b-2 border-[#F04D79]' : 'text-slate-400'}`}>個人花費 <span className="text-[10px]">({expenseTabCounts.personal})</span></button>
        <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'pending' ? 'text-[#F04D79] border-b-2 border-[#F04D79]' : 'text-slate-400'}`}>待收付款項 <span className="text-[10px]">({expenseTabCounts.pending})</span></button>
      </div>

      <div className="flex items-center gap-2 px-4 pt-3"><input value={expenseSearch} onChange={(event) => setExpenseSearch(event.target.value)} placeholder="搜尋標題、地點、付款人或編號…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-pink-300" />{expenseSearch && <button type="button" onClick={() => setExpenseSearch('')} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#F04D79]" aria-label="清除記帳搜尋"><X size={14} /></button>}<span className="shrink-0 text-[11px] font-bold text-slate-400">{expenseSearch ? `${currentTabExpenses.length}/${expenses.length}` : `${currentTabExpenses.length}`} 筆</span></div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoadingExpenses ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300 size-8" /></div>
        ) : currentTabExpenses.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm font-medium tracking-wide">{expenseSearch ? '找不到符合的消費' : activeTab === 'pending' ? '目前沒有待收付款項' : activeTab === 'group' ? '目前尚無群組花費' : '目前尚無個人花費'}</div>
        ) : (
          <div className="space-y-3">
            {currentTabExpenses.map((exp) => {
              const catObj = categories.find(c => c.id === (exp.category || exp.Category)) || categories[0];
              const expenseShares = exp.shares || [];
              const settledShareCount = expenseShares.filter((share: any) => share.isSettled).length;
              const expenseType = exp.Type || exp.type;
              
              return (
                <div key={exp.id || exp.Expense_ID} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:border-[#F04D79]/30 transition-all">
                  <div className={`size-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${catObj.color}`}>
                    <catObj.icon size={22} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingExpId === (exp.id || exp.Expense_ID) ? (
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
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex min-w-0 items-center gap-2 pr-2">
                            <h4 className="text-[15px] font-bold text-slate-800 truncate">{exp.title || exp.Title}</h4>
                            {expenseType === 'collector' && <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">代收</span>}
                            {expenseType === 'group' && <span className="shrink-0 rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-bold text-[#F04D79]">共同</span>}
                          </div>
                          <div className="text-[15px] font-bold font-mono text-slate-800 shrink-0">
                            <span className="text-[10px] text-slate-400 mr-1">{exp.currency || exp.Currency}</span>
                            {exp.amount || exp.Amount}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-400">
                          <span className="flex items-center gap-1.5 truncate">
                            <User size={12} className="text-slate-300" /> {exp.payer || exp.Payer} 付款
                          </span>
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
                        {expenseShares.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-400">
                              <span>分帳進度</span>
                              <span>{settledShareCount}/{expenseShares.length} 已結清</span>
                            </div>
                            {expenseShares.map((share: any) => (
                              <div key={share.id} className="flex items-center justify-between text-[11px]">
                                <span className={share.isSettled ? 'text-slate-400 line-through' : 'text-slate-600'}>{share.participant} · {share.amount} {exp.currency || exp.Currency}</span>
                                <button onClick={() => handleToggleShare(share.id, share.isSettled)} className={`rounded-full px-2 py-0.5 font-bold ${share.isSettled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 hover:bg-emerald-50 hover:text-emerald-600'}`}>{share.isSettled ? '已結清' : '標記已付款'}</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="absolute bottom-6 right-6 z-30">
        <button onClick={() => setIsAddOpen(true)} className="size-14 bg-[#F04D79] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-pink-600 hover:scale-105 transition-all">
          <Plus size={28} />
        </button>
      </div>

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsInviteModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full p-1">
              <X size={20} />
            </button>
            <div className="text-center mb-6 mt-2">
              <div className="size-12 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Copy className="text-[#F04D79] size-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">邀請旅伴加入</h3>
              <p className="text-sm text-slate-500 mt-1">選擇適合的方式分享給朋友</p>
            </div>
            <div className="space-y-4">
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
            </div>
          </div>
        </div>
      )}

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
                      <select value={location} onChange={(e) => { const value = e.target.value; setLocation(value); const selectedItem = itineraryItems.find((item) => item.id === value); if (selectedItem && !title.trim()) setTitle(selectedItem.title); }} className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm text-slate-500 bg-transparent focus:outline-none cursor-pointer"><option value="" disabled hidden>請選擇地點</option>{itineraryItems.map((item) => <option key={item.id} value={item.id}>Day {item.dayNumber} · {item.title}</option>)}<option value="other">其他地點</option></select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F04D79] pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-600"><span className="text-[#F04D79] mr-1">*</span>付款人</label>
                    <div className="relative border border-slate-300 rounded-md bg-white">
                      <select value={payer} onChange={(e) => setPayer(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm text-slate-700 bg-transparent focus:outline-none cursor-pointer">
                        {splitUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F04D79] pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div><h4 className="text-lg font-bold text-slate-800 mb-1">消費方式</h4><p className="text-[12px] text-slate-400">選擇這筆花費如何分配。</p></div>
                    <div className="grid grid-cols-3 gap-2">
                      {[['personal', '個人花費'], ['group', '共同消費'], ['collector', '代收付款']].map(([mode, label]) => (
                        <button key={mode} onClick={() => { setExpenseMode(mode as 'personal' | 'group' | 'collector'); setIsSplit(mode !== 'personal'); }} className={`rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${expenseMode === mode ? 'border-[#F04D79] bg-pink-50 text-[#F04D79]' : 'border-slate-200 text-slate-500 hover:border-pink-200'}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  {expenseMode !== 'personal' && (
                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200 mt-2">
                      <div><label className="text-sm font-bold text-slate-600">參與分帳成員</label><div className="flex flex-wrap gap-2 mt-2">{(members.length ? members : splitUsers).map((u) => { const selected = splitUsers.some((item) => item.id === u.id); return <button key={u.id} onClick={() => toggleSplitUser({ name: u.name, id: u.id })} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${selected ? 'bg-pink-100 text-[#F04D79] ring-1 ring-pink-200' : 'bg-slate-100 text-slate-400'}`}>{selected ? '✓ ' : ''}{u.name}</button>; })}</div></div>
                      <button onClick={handleAddFriend} className="flex items-center gap-2 text-sm text-[#F04D79] font-bold hover:opacity-70 transition-opacity"><Plus size={18} /> 新增朋友</button>
                      <div className="flex items-center justify-between"><label className="text-sm font-bold text-slate-600">分帳方式</label><select value={splitMethod} onChange={(e) => setSplitMethod(e.target.value as 'equal' | 'custom')} className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-600"><option value="equal">平均分帳</option><option value="custom">自訂金額</option></select></div>
                      <div className="space-y-2 rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">分帳預覽</p>{splitUsers.map((u) => { const share = splitMethod === 'equal' ? (Number(amount || 0) / Math.max(splitUsers.length, 1)) : Number(customShares[u.id] || 0); return <div key={u.id} className="flex items-center justify-between gap-2 text-sm"><span className="font-bold text-slate-700">{u.name}</span>{splitMethod === 'custom' ? <input type="number" value={customShares[u.id] || ''} onChange={(e) => setCustomShares({ ...customShares, [u.id]: e.target.value })} placeholder="0" className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm" /> : <span className="font-mono text-slate-600">{share.toFixed(0)} {currency}</span>}</div>; })}</div>
                    </div>
                  )}
                  <hr className="border-slate-100" />
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

      {selectedMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 text-center">
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full p-1 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="size-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm mt-4 overflow-hidden">
               {selectedMember?.avatar ? (
                 <img src={selectedMember.avatar} alt={selectedMember.name} className="w-full h-full object-cover" />
               ) : (
                 <span className="text-4xl font-bold text-[#F04D79] uppercase">
                   {selectedMember?.name?.charAt(0)}
                 </span>
               )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-wide">
              {selectedMember?.name}
            </h3>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
              selectedMember?.role === 'Owner' 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {selectedMember?.role === 'Owner' ? '行程建立者 (Owner)' : '旅伴 (Member)'}
            </span>
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl text-left space-y-3 border border-slate-100">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-white rounded-lg shadow-sm">
                   <User className="size-4 text-[#F04D79]" />
                 </div>
                 <div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">帳號 ID</div>
                   <div className="text-sm font-medium text-slate-700">
                     {selectedMember?.id}
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= 行李清單獨立模組 =================
function LuggagePanel({ itineraryId, currentUserId, onCountChange }: { itineraryId: string; currentUserId: string; onCountChange?: (counts: { checked: number; total: number }) => void }) {
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
      const res = await fetch("http://localhost:8080/itinerary/get_luggage.php", {
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
  }, [itineraryId]);

  useEffect(() => { refreshLuggage(); }, [refreshLuggage]);

  useEffect(() => {
    const refreshTimer = window.setInterval(refreshLuggage, 5000);
    return () => window.clearInterval(refreshTimer);
  }, [refreshLuggage]);

  useEffect(() => {
    if (!isLoaded) return; setSyncStatus('saving');
    const timer = setTimeout(() => {
      fetch("http://localhost:8080/itinerary/update_luggage.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: itineraryId, Account: currentUserId, LuggageData: JSON.stringify(categories) }) })
      .then(res => res.json()).then(data => { if (data.status === 'success') setSyncStatus('saved'); else setSyncStatus('error'); }).catch(() => setSyncStatus('error'));
    }, 1000);
    return () => clearTimeout(timer);
  }, [categories, isLoaded, itineraryId]);

  useEffect(() => {
    if (isLoaded) {
      const items = categories.flatMap((category) => category.items);
      onCountChange?.({ checked: items.filter((item: any) => item.isChecked).length, total: items.length });
    }
  }, [categories, isLoaded, onCountChange]);

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
        <div className={`text-[10px] font-bold flex items-center gap-1.5 ${syncStatus === 'error' ? 'text-red-500' : 'text-slate-400'}`}>{syncStatus === 'saving' && <><Loader2 size={12} className="animate-spin" /> 儲存中...</>}{syncStatus === 'saved' && <><Save size={12} className="text-green-500" /> 已同步</>}{syncStatus === 'error' && <>同步失敗，請稍後再試</>}</div>
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

const calculateStraightLineDistanceKm = (items: any[]) => {
  const points = [...items]
    .filter((item) => Number.isFinite(Number(item.Latitude)) && Number.isFinite(Number(item.Longitude)))
    .sort((a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0) || Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  if (points.length < 2) return 0;

  const toRadians = (value: number) => value * Math.PI / 180;
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previousLat = toRadians(Number(points[index - 1].Latitude));
    const currentLat = toRadians(Number(points[index].Latitude));
    const deltaLat = currentLat - previousLat;
    const deltaLng = toRadians(Number(points[index].Longitude) - Number(points[index - 1].Longitude));
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(previousLat) * Math.cos(currentLat) * Math.sin(deltaLng / 2) ** 2;
    distance += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return distance;
};

type RouteMode = 'walking' | 'driving' | 'transit';

const routeModeOptions: Array<{ value: RouteMode; label: string; speedKmh: number }> = [
  { value: 'walking', label: '步行', speedKmh: 5 },
  { value: 'driving', label: '開車', speedKmh: 30 },
  { value: 'transit', label: '大眾運輸', speedKmh: 22 },
];

const calculateRouteSegments = (items: any[]) => {
  const points = [...items]
    .filter((item) => Number.isFinite(Number(item.Latitude)) && Number.isFinite(Number(item.Longitude)))
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  if (points.length < 2) return [];

  const toRadians = (value: number) => value * Math.PI / 180;
  const getDistance = (from: any, to: any) => {
    const lat1 = toRadians(Number(from.Latitude));
    const lat2 = toRadians(Number(to.Latitude));
    const deltaLat = lat2 - lat1;
    const deltaLng = toRadians(Number(to.Longitude) - Number(from.Longitude));
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return points.slice(1).map((to, index) => ({
    from: points[index],
    to,
    distanceKm: getDistance(points[index], to),
  }));
};

type MarkerStatus = 'added' | 'completed' | 'mustVisit' | 'optional' | 'companionAdded';

const markerStatusOptions: Array<{ value: MarkerStatus; label: string; color: string; fill: string }> = [
  { value: 'added', label: '已加入行程', color: '#F04D79', fill: '#F04D79' },
  { value: 'completed', label: '已完成', color: '#16A34A', fill: '#16A34A' },
  { value: 'mustVisit', label: '必去', color: '#DC2626', fill: '#DC2626' },
  { value: 'optional', label: '備選', color: '#64748B', fill: '#94A3B8' },
  { value: 'companionAdded', label: '旅伴新增', color: '#7C3AED', fill: '#7C3AED' },
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
            className="mt-1 rounded-full border-0 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 outline-none focus:ring-2 focus:ring-pink-100"
            aria-label="標點狀態"
          >
            {markerStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className={`flex gap-1.5 pt-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 ${editingTimeId === item.id ? 'hidden' : ''}`}>
          <button onClick={(event) => { event.stopPropagation(); setEditingItemId(item.id); setEditingTitle(item.title); }} className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#F04D79] hover:text-white transition-colors shrink-0 shadow-sm" title="編輯行程名稱" aria-label="編輯行程名稱"><Edit2 size={14} /></button>
          <button onClick={(event) => { event.stopPropagation(); handleDuplicateItem(item); }} className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors shrink-0 shadow-sm" title="複製行程" aria-label="複製行程"><Copy size={14} /></button>
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
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    language: 'zh-TW',
    region: 'TW',
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
  const [travelStyle, setTravelStyle] = useState('自助旅行');
  const [isEditingStyle, setIsEditingStyle] = useState(false);

  const [activeDay, setActiveDay] = useState(1);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [addItemMode, setAddItemMode] = useState<'choose' | 'search' | 'custom'>('choose');
  
  const [rightPanelTab, setRightPanelTab] = useState('overview');
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [luggageCount, setLuggageCount] = useState<{ checked: number; total: number } | null>(null);
  const [budgetTotal, setBudgetTotal] = useState<number | null>(null);
  const preferencesHydratedRef = useRef(false);

  useEffect(() => {
    const savedTab = window.localStorage.getItem(`trav-app:right-panel:${params.id}`);
    if (savedTab) setRightPanelTab(savedTab);
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
  const availableTags = ["適合獨旅", "單人吧台", "寵物友善", "深夜營業", "有插座"];
  const mapFilterTagOptions = ["餐廳", "咖啡廳", "住宿", "景點", "平價"];
  // 左側標籤是搜尋條件；右側標籤只篩選已載入的地圖結果，避免兩個區域互相干擾。
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [mapFilterTags, setMapFilterTags] = useState<string[]>([]);
  const [lastSearchKeyword, setLastSearchKeyword] = useState("");
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
  const [placeDetailsLoading, setPlaceDetailsLoading] = useState<string | null>(null);
  const placeDetailsCacheRef = useRef<Record<string, any>>({});
  const placeDetailsRequestsRef = useRef<Map<string, Promise<any>>>(new Map());
  const [selectedMapItem, setSelectedMapItem] = useState<any | null>(null);
  const [editingLocationItemId, setEditingLocationItemId] = useState<string | null>(null);
  const [searchMarkers, setSearchMarkers] = useState<any[]>([]);
  const [routeMode, setRouteMode] = useState<RouteMode>('driving');
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 25.0478, lng: 121.5170 });
  const [mapZoom, setMapZoom] = useState(12);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const [isRouteVisible, setIsRouteVisible] = useState(true);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [mapLayers, setMapLayers] = useState({ itinerary: true, search: true, userLocation: true });
  const [mapReady, setMapReady] = useState(false);
  const [isMapFocusMode, setIsMapFocusMode] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [mapStatusMessage, setMapStatusMessage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
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
    const tags = new Set<string>(Array.isArray(place?.tags) ? place.tags : []);
    const types = Array.isArray(place?.types) ? place.types : [];

    if (types.includes('restaurant') || types.includes('meal_takeaway') || types.includes('meal_delivery')) tags.add('餐廳');
    if (types.includes('cafe')) tags.add('咖啡廳');
    if (types.includes('lodging')) tags.add('住宿');
    if (types.includes('tourist_attraction') || types.includes('museum') || types.includes('park')) tags.add('景點');
    if (['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'].includes(place?.priceLevel)) tags.add('平價');

    return tags;
  };

  const filteredSearchMarkers = searchMarkers.filter((place) =>
    mapFilterTags.every((tag) => getPlaceMapTags(place).has(tag))
  );

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

  const handleLocateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setMapStatusMessage('此瀏覽器不支援目前位置功能。');
      return;
    }

    setMapStatusMessage(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position = { lat: coords.latitude, lng: coords.longitude };
        setUserLocation(position);
        setMapCenter(position);
        setMapZoom(15);
        mapRef.current?.panTo(position);
        mapRef.current?.setZoom(15);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setMapStatusMessage('無法取得目前位置，請允許瀏覽器使用定位權限後再試。');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const fitAllPlaces = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    const points = itineraryItems
      .filter((item) => Number.isFinite(Number(item.Latitude)) && Number.isFinite(Number(item.Longitude)))
      .map((item) => ({ lat: Number(item.Latitude), lng: Number(item.Longitude) }));

    if (points.length === 0) {
      const destination = {
        lat: Number(itineraryData?.destLat) || 25.0478,
        lng: Number(itineraryData?.destLng) || 121.5170,
      };
      mapRef.current.setCenter(destination);
      mapRef.current.setZoom(12);
      setMapCenter(destination);
      setMapZoom(12);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    mapRef.current.fitBounds(bounds, 80);
  }, [itineraryData, itineraryItems]);

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

  const clearMapSelection = useCallback(() => {
    setSelectedPlace(null);
    setSelectedMapItem(null);
    setSearchMarkers([]);
  }, []);

  const clearSearchResults = useCallback(() => {
    setSearchMarkers([]);
    setSelectedPlace(null);
  }, []);

  useEffect(() => {
    routePolylineRef.current?.setMap(null);
    routePolylineRef.current = null;

    if (!mapReady || !window.google || !mapRef.current || !isRouteVisible) return;

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
  }, [activeDay, isLoaded, isRouteVisible, itineraryItems, mapReady]);

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

const handleKeywordSearch = async (keyword: string) => {
    if (!keyword.trim() && searchTags.length === 0) return;
    setLastSearchKeyword(keyword.trim());
    
    setIsAddItemOpen(false);

    const tagString = searchTags.join(" ");
    // 策略：利用字串權重覆蓋座標權重，強制引導 Google 進行全台檢索
    const finalQuery = `${keyword} ${tagString}`.trim(); 

    try {
      const res = await fetch('/api/textsearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: finalQuery,
          lat: Number(itineraryData?.destLat) || 25.0478, 
          lng: Number(itineraryData?.destLng) || 121.5170
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Text search failed');
      
      setSelectedPlace(null);
      setSelectedMapItem(null);
      if (data.places && data.places.length > 0) {
        setMapStatusMessage(null);
        setSearchMarkers(data.places);
        
        // 👇 核心邏輯：計算所有地標的邊界，並讓地圖自動縮放包覆
        if (mapRef.current && window.google) {
          const bounds = new window.google.maps.LatLngBounds();
          data.places.forEach((place: any) => {
            if (place.location?.latitude && place.location?.longitude) {
              bounds.extend(
                new window.google.maps.LatLng(place.location.latitude, place.location.longitude)
              );
            }
          });
          
          // 自動縮放以適應所有標記點
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
          
          // 防呆：如果搜尋結果只有一個，避免地圖被放得太大
          if (data.places.length === 1) {
            // fitBounds 執行後會有延遲，需透過 listener 或簡單延遲設定 zoom
            setTimeout(() => {
              setMapZoom(16);
              if (mapRef.current) mapRef.current.setZoom(16);
            }, 100);
          }
        }
      } else {
        setSearchMarkers([]);
        setMapStatusMessage('找不到符合條件的地點，請換個關鍵字或移除部分標籤。');
      }
    } catch (error) {
      console.error("Text search error:", error);
      setSearchMarkers([]);
      setMapStatusMessage('地點搜尋服務暫時無法使用，請稍後再試。');
    }
  };

  // 把這段貼在 handleKeywordSearch 結束的大括號下方
  const handlePlaceSelect = async (placeId: string) => {
    try {
      const data = await fetchPlaceDetailsOnce(placeId);
      
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
          const updateResponse = await fetch('http://localhost:8080/itinerary/update_item_location.php', {
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
        
        // 精確選擇單一地點時，平滑移動並放大
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
      const res = await fetch("http://localhost:8080/itinerary/get_itinerary_items.php", {
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
        const res = await fetch("http://localhost:8080/itinerary/get_itinerary_detail.php", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: params.id, Account: user.id || (user as any).Account }),
        });
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new Error("伺服器發生內部錯誤");
        const data = await res.json();
        if (data.status === 'success') {
          setItineraryData(data.data);
          setCoverImage(data.data.coverImage || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop");
          fetch("http://localhost:8080/itinerary/get_itinerary_style.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: params.id }) })
            .then((styleRes) => styleRes.json()).then((styleData) => { if (styleData.status === 'success') setTravelStyle(styleData.style); }).catch(() => {});
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
    const previewUrl = URL.createObjectURL(file); setCoverImage(previewUrl); setIsUploading(true);
    const formData = new FormData(); formData.append("cover_image", file); formData.append("Itinerary_ID", params.id as string); formData.append("Account", user?.id || (user as any)?.Account);
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_cover_image.php", { method: "POST", body: formData });
      const data = await res.json(); if (data.status === 'success') setCoverImage(data.new_image_url); else { alert(data.message); setCoverImage(itineraryData.coverImage); }
    } catch (error) { alert("圖片上傳失敗"); setCoverImage(itineraryData.coverImage); } 
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleUpdateStyle = async (style: string) => {
    setTravelStyle(style);
    setIsEditingStyle(false);
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_itinerary_style.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: params.id, Style: style }) });
      const data = await res.json();
      if (data.status !== 'success') alert(data.message || "儲存行程風格失敗");
    } catch (error) {
      alert("儲存行程風格失敗");
    }
  };

  const handleUpdateItineraryInfo = async () => {
    if (!editInfoTitle.trim() || !editInfoStart || !editInfoEnd) { alert("請完整填寫標題與日期"); return; }
    if (new Date(editInfoStart) > new Date(editInfoEnd)) { alert("結束日期不能早於開始日期"); return; }
    try {
      const res = await fetch("http://localhost:8080/itinerary/update_itinerary_info.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Itinerary_ID: params.id, Title: editInfoTitle, StartDate: editInfoStart, EndDate: editInfoEnd }) });
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
      const res = await fetch("http://localhost:8080/itinerary/create_itinerary_item.php", { 
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
      const res = await fetch("http://localhost:8080/itinerary/update_item_title.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId, Title: editingTitle }) });
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
      const res = await fetch("http://localhost:8080/itinerary/update_item_time.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId, StartTime: editStartTime, EndTime: editEndTime }) });
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
      const res = await fetch("http://localhost:8080/itinerary/delete_itinerary_item.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Item_ID: itemId }) });
      const data = await res.json(); if (data.status !== 'success') { alert(data.message); fetchItems(params.id as string); }
    } catch(error) { alert("刪除失敗"); fetchItems(params.id as string); }
  };

  const handleDuplicateItem = async (item: any) => {
    try {
      const res = await fetch("http://localhost:8080/itinerary/create_itinerary_item.php", {
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
        fetch("http://localhost:8080/itinerary/update_sort_order.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates: sortUpdates }) }).catch(err => console.error(err));
        const timeUpdates = currentDayItems.map((item, index) => ({ item, slot: timeSlots[index] }))
          .filter(({ item, slot }) => item.startTime !== slot.startTime || item.endTime !== slot.endTime);
        Promise.all(timeUpdates.map(({ item, slot }) => fetch("http://localhost:8080/itinerary/update_item_time.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Item_ID: item.id, StartTime: slot.startTime, EndTime: slot.endTime }),
        }))).catch(() => fetchItems(params.id as string));
        return itemsWithSwappedTimes;
      });
    }
  };

// 1. 保留這行 (載入中的防呆)
  if (authLoading || isLoading) return <div className="h-screen w-full flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin text-slate-300 size-8" /></div>;
  
  // 2. 將原本的 if (!itineraryData) return null; 刪除，替換成下面這整段：
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

  // 3. 下方保留原狀不動
  const currentDayItems = itineraryItems.filter((item) => item.dayNumber === activeDay);
  const routeSegments = calculateRouteSegments(currentDayItems);
  const selectedRouteMode = routeModeOptions.find((option) => option.value === routeMode) || routeModeOptions[1];
  const routeDistanceKm = routeSegments.reduce((total, segment) => total + segment.distanceKm, 0);
  const routeDurationMinutes = routeSegments.length > 0
    ? Math.max(1, Math.round((routeDistanceKm / selectedRouteMode.speedKmh) * 60))
    : 0;
  const totalStraightLineDistanceKm = calculateStraightLineDistanceKm(itineraryItems);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#FAFAFA] font-sans text-slate-800">
      
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

      <div className="flex-1 flex overflow-hidden">
        <div className="w-full md:w-[380px] shrink-0 bg-white border-r border-slate-100 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.01)] relative">
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
                {isEditingStyle ? (
                  <select autoFocus value={travelStyle} onChange={(e) => handleUpdateStyle(e.target.value)} onBlur={() => setIsEditingStyle(false)} className="mb-3 rounded-md border border-pink-200 bg-pink-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#F04D79] focus:outline-none">
                    {['自助旅行', '親子旅行', '情侶旅行', '朋友出遊', '商務出差', '自訂'].map((style) => <option key={style} value={style}>{style}</option>)}
                  </select>
                ) : (
                  <button onClick={() => setIsEditingStyle(true)} className="inline-block px-2.5 py-1 bg-pink-50 text-[#F04D79] text-[10px] font-bold tracking-wide rounded-md mb-3 hover:bg-pink-100 transition-colors" title="點擊修改行程風格">{travelStyle}</button>
                )}
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

          <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-slate-100 text-[11px] font-bold tracking-wide">
            <span className="text-slate-500">Day {activeDay} 行程摘要</span>
            <span className="text-slate-400">{currentDayItems.length} 個行程 · {currentDayItems.filter((item) => !item.startTime || !item.endTime).length} 項待完成</span>
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

{/* 中欄：動態地圖區域 */}
        <div className="hidden md:flex flex-1 relative items-center justify-center overflow-hidden bg-slate-100">
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
{/* 👇 新增：地圖左側浮動搜尋面板 */}
              {!isMapFocusMode && (
              <div className="absolute top-4 left-4 z-[50] w-80 bg-white/95 backdrop-blur-md shadow-xl rounded-2xl p-4 border border-slate-200 flex flex-col gap-3">
                <div className="text-sm font-bold text-slate-800 tracking-widest flex items-center justify-between gap-2">
                  {searchMarkers.length > 0 && (
                    <button type="button" onClick={clearSearchResults} className="order-2 flex items-center gap-1 text-[10px] font-medium tracking-normal text-slate-400 hover:text-[#F04D79] transition-colors">
                      <X size={12} /> 清除結果
                    </button>
                  )}
                  <Search size={16} className="text-[#F04D79]"/> 探索地點
                </div>
                
                  <PlaceAutocomplete 
                  value={newItemTitle} 
                  onChange={setNewItemTitle} 
                  locationBias={{
                    lat: Number(itineraryData?.destLat) || 25.0478,
                    lng: Number(itineraryData?.destLng) || 121.5170,
                  }}
                  // 請將這行的屬性名稱，改為與 PlaceAutocomplete.tsx 完全一致的名字
                  onPlaceSelect={handlePlaceSelect}
                  onKeywordSearch={handleKeywordSearch} 
                />

                {/* 快速標籤篩選器 */}
                <div className="pt-1">
                  <p className="text-[11px] font-bold text-slate-400 mb-2 tracking-widest uppercase">附加搜尋特徵</p>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => {
                      const isSelected = searchTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSearchTags(searchTags.filter(t => t !== tag));
                            } else {
                              setSearchTags([...searchTags, tag]);
                            }
                          }}
                          className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                            isSelected 
                              ? "bg-[#F04D79] text-white shadow-sm" 
                              : "bg-slate-50 text-slate-500 border border-slate-200 hover:border-[#F04D79]"
                          }`}
                        >
                          # {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              )}

              <div className="absolute top-4 right-4 z-[50] flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/90 p-1 shadow-xl backdrop-blur-md">
                <button type="button" onClick={() => { setIsMapFocusMode((focused) => !focused); setIsLayerMenuOpen(false); }} aria-pressed={isMapFocusMode} className={`flex size-9 items-center justify-center rounded-xl transition-colors ${isMapFocusMode ? 'bg-pink-50 text-[#F04D79]' : 'text-slate-500 hover:bg-pink-50 hover:text-[#F04D79]'}`} title={isMapFocusMode ? '顯示地圖面板' : '專注地圖'} aria-label={isMapFocusMode ? '顯示地圖面板' : '專注地圖'}>
                  {isMapFocusMode ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
                <button type="button" onClick={() => setIsLayerMenuOpen((open) => !open)} aria-expanded={isLayerMenuOpen} className={`flex size-9 items-center justify-center rounded-xl transition-colors ${isLayerMenuOpen ? 'bg-pink-50 text-[#F04D79]' : 'text-slate-500 hover:bg-pink-50 hover:text-[#F04D79]'}`} title="地圖圖層" aria-label="地圖圖層"><Layers size={17} /></button>
                <button type="button" onClick={fitAllPlaces} className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-pink-50 hover:text-[#F04D79]" title="顯示全部地點" aria-label="顯示全部地點"><MapPinned size={17} /></button>
                <button type="button" onClick={resetMapView} className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-pink-50 hover:text-[#F04D79]" title="重置地圖視角" aria-label="重置地圖視角"><RefreshCw size={17} /></button>
                <button type="button" onClick={clearMapSelection} className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-pink-50 hover:text-[#F04D79]" title="清除地圖選取" aria-label="清除地圖選取"><XCircle size={17} /></button>
                <button type="button" onClick={() => setIsRouteVisible((visible) => !visible)} aria-pressed={isRouteVisible} className={`flex size-9 items-center justify-center rounded-xl transition-colors ${isRouteVisible ? 'bg-pink-50 text-[#F04D79]' : 'text-slate-400 hover:bg-pink-50 hover:text-[#F04D79]'}`} title={isRouteVisible ? '隱藏目前 Day 路線' : '顯示目前 Day 路線'} aria-label={isRouteVisible ? '隱藏目前 Day 路線' : '顯示目前 Day 路線'}><MapIcon size={17} /></button>
              <button
                type="button"
                onClick={handleLocateUser}
                disabled={isLocating}
                className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-pink-50 hover:text-[#F04D79] disabled:opacity-60"
                title="定位目前位置"
                aria-label="定位目前位置"
              >
                <LocateFixed size={18} className={isLocating ? 'animate-pulse text-[#F04D79]' : ''} />
              </button>
              </div>

              {isLayerMenuOpen && (
                <div className="absolute right-4 top-[4.25rem] z-[50] w-52 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-xl backdrop-blur-md">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wide text-slate-700">地圖圖層</span>
                    <button type="button" onClick={() => setIsLayerMenuOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="關閉圖層選單"><X size={14} /></button>
                  </div>
                  <div className="space-y-1">
                    <div className="mb-2 border-b border-slate-100 pb-2">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">獨旅特色標籤</span>
                        {mapFilterTags.length > 0 && <button type="button" onClick={() => setMapFilterTags([])} className="text-[10px] font-semibold text-slate-400 hover:text-[#F04D79]">清除</button>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {mapFilterTagOptions.map((tag) => {
                          const selected = mapFilterTags.includes(tag);
                          return <button key={tag} type="button" onClick={() => setMapFilterTags((current) => selected ? current.filter((item) => item !== tag) : [...current, tag])} className={`rounded-full px-2 py-1 text-[10px] font-semibold transition-colors ${selected ? 'bg-[#F04D79] text-white' : 'bg-slate-100 text-slate-500 hover:bg-pink-50 hover:text-[#F04D79]'}`}>#{tag}</button>;
                        })}
                      </div>
                      <p className="mt-2 text-[10px] leading-4 text-slate-400">選取後會立即篩選目前地圖上的搜尋結果，不會重新搜尋。</p>
                    </div>
                    {[
                      { key: 'itinerary', label: '行程地點', color: 'bg-[#F04D79]' },
                      { key: 'search', label: '搜尋結果', color: 'bg-blue-500' },
                      { key: 'userLocation', label: '目前位置', color: 'bg-cyan-500' },
                    ].map((layer) => {
                      const checked = mapLayers[layer.key as keyof typeof mapLayers];
                      return (
                        <button key={layer.key} type="button" onClick={() => setMapLayers((current) => ({ ...current, [layer.key]: !checked }))} className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50">
                          <span className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${layer.color}`} />{layer.label}</span>
                          <span className={`flex size-4 items-center justify-center rounded border text-[10px] ${checked ? 'border-[#F04D79] bg-[#F04D79] text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
                        </button>
                      );
                    })}
                    <button type="button" onClick={() => setIsRouteVisible((visible) => !visible)} className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      <span className="flex items-center gap-2"><span className="h-0.5 w-3 rounded-full bg-[#F04D79]" />目前 Day 路線</span>
                      <span className={`flex size-4 items-center justify-center rounded border text-[10px] ${isRouteVisible ? 'border-[#F04D79] bg-[#F04D79] text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
                    </button>
                  </div>
                </div>
              )}

              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={mapZoom}
                options={{ disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', draggable: true, scrollwheel: true }}
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
                // 👇 關鍵：綁定地圖實例，讓前面的 panTo 能正常運作
                onLoad={(map) => { mapRef.current = map; setMapReady(true); }}
                onUnmount={() => { routePolylineRef.current?.setMap(null); routePolylineRef.current = null; mapRef.current = null; setMapReady(false); }}
            >
              {mapStatusMessage && (
                <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-xl border border-amber-200 bg-white/95 px-4 py-2.5 text-center text-xs font-semibold text-slate-600 shadow-lg backdrop-blur-md">
                  {mapStatusMessage}
                </div>
              )}
              {userLocation && mapLayers.userLocation && (
                <Marker
                  position={userLocation}
                  title="目前位置"
                  icon={{
                    url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  }}
                />
              )}

              <MarkerClustererF options={{ gridSize: 48, minimumClusterSize: 2, maxZoom: 15, zoomOnClick: true }}>
                {(clusterer) => (
                  <>
                    {mapLayers.itinerary && currentDayItems
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

                    {mapLayers.search && filteredSearchMarkers.map((place) => (
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
              {!isMapFocusMode && (
              <div className="absolute bottom-4 right-4 z-30 w-64 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-lg backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">Day {activeDay} 路線資訊</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{routeSegments.length > 0 ? `${routeDistanceKm.toFixed(1)} 公里 · 約 ${routeDurationMinutes} 分鐘` : '至少需要兩個有座標的地點'}</p>
                  </div>
                  <MapIcon size={16} className="text-[#F04D79]" />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                  {routeModeOptions.map((option) => (
                    <button key={option.value} type="button" onClick={() => setRouteMode(option.value)} className={`rounded-md px-1 py-1.5 text-[10px] font-bold transition-colors ${routeMode === option.value ? 'bg-white text-[#F04D79] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
                {routeSegments.length > 0 && (
                  <div className="mt-2 max-h-28 space-y-1 overflow-y-auto pr-1">
                    {routeSegments.map((segment, index) => (
                      <button key={`${segment.from.id}-${segment.to.id}`} type="button" onClick={() => focusMapOnItem(segment.to)} className="flex w-full items-center justify-between rounded-lg px-1.5 py-1 text-left hover:bg-pink-50">
                        <span className="min-w-0 truncate text-[10px] font-semibold text-slate-500">{index + 1}. {segment.from.title || '地點'} → {segment.to.title || '地點'}</span>
                        <span className="ml-2 shrink-0 text-[10px] font-bold text-slate-400">{segment.distanceKm.toFixed(1)} km</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )}
              {!isMapFocusMode && (
              <div className="pointer-events-none absolute bottom-4 left-4 z-30 hidden rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-lg backdrop-blur-md sm:block">
                <p className="mb-2 text-[10px] font-bold tracking-wide text-slate-500">標點狀態</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {markerStatusOptions.map((option) => (
                    <span key={option.value} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span className="size-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: option.fill }} />
                      {option.label}
                    </span>
                  ))}
                </div>
              </div>
              )}
            </GoogleMap>
            </>
          )}
        </div>

        <div className={`${isMobilePanelOpen ? 'flex' : 'hidden'} xl:flex fixed xl:static inset-x-0 bottom-0 z-50 h-[78vh] xl:h-auto w-full xl:w-[340px] shrink-0 bg-white border-t xl:border-t-0 xl:border-l border-slate-100 flex-col rounded-t-3xl xl:rounded-none shadow-2xl xl:shadow-[-4px_0_24px_rgba(0,0,0,0.01)] relative`}>
          <div className="flex pt-2 px-2 border-b border-slate-100 gap-1 overflow-x-auto hide-scrollbar shrink-0">
            <button type="button" onClick={() => setIsMobilePanelOpen(false)} className="xl:hidden flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-label="關閉側欄"><X size={16} /></button>
            {[
              { id: 'overview', icon: LayoutGrid, label: '總覽' },
              { id: 'budget', icon: Wallet, label: '記帳' },
              { id: 'luggage', icon: BaggageClaim, label: '行李' },
              { id: 'chat', icon: MessageCircle, label: '聊天' },
              { id: 'travelers', icon: User, label: '旅伴' },
              { id: 'today', icon: Clock, label: '今日' },
              { id: 'reservations', icon: Ticket, label: '預訂' },
              { id: 'notes', icon: FileText, label: '備忘' },
            ].map((tab) => (
              <button 
                key={tab.id}
                className={`flex-1 min-w-[60px] py-3 flex flex-col items-center gap-1.5 transition-colors ${rightPanelTab === tab.id ? 'text-[#F04D79] border-b-2 border-[#F04D79]' : 'text-slate-400 hover:text-slate-600'}`}
                onClick={() => { setRightPanelTab(tab.id); setIsMobilePanelOpen(true); }}
              >
                <span className="relative"><tab.icon size={16} />{tab.id === 'chat' && chatUnreadCount > 0 && <span className="absolute -right-3 -top-2 flex min-w-4 items-center justify-center rounded-full bg-[#F04D79] px-1 text-[9px] font-bold leading-4 text-white">{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</span>}</span>
                <span className="text-[10px] font-bold tracking-widest">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/30">
            {rightPanelTab === 'overview' && (
              <div className="p-5 grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="col-span-1 row-span-2 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer">
                  <MapPinned size={26} className="text-[#F04D79] mb-4" />
                  <div><div className="text-xs font-bold text-slate-600 mb-1">直線距離</div><div className="text-2xl font-bold font-mono text-slate-900">{totalStraightLineDistanceKm.toFixed(1)} <span className="text-[10px] text-slate-400 font-sans tracking-wide">公里</span></div><div className="mt-1 text-[10px] text-slate-400">{itineraryItems.length} 個地點</div></div>
                </div>
                <div onClick={() => setRightPanelTab('luggage')} className="col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer group"><div className="text-[11px] font-bold text-slate-600 mb-2">行李完成度</div><div className="flex items-end justify-between"><BaggageClaim size={18} className="text-slate-300 group-hover:text-[#F04D79] transition-colors" /><div className="text-xl font-bold font-mono text-slate-900">{luggageCount ? `${luggageCount.checked}/${luggageCount.total}` : '—'}</div></div></div>
                <div onClick={() => setRightPanelTab('budget')} className="col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-[#F04D79]/30 transition-all cursor-pointer group"><div className="text-[11px] font-bold text-slate-600 mb-2">記帳總額</div><div className="flex items-end justify-between"><DollarSign size={18} className="text-slate-300 group-hover:text-[#F04D79] transition-colors" /><div className="text-xl font-bold font-mono text-slate-900">{budgetTotal === null ? '—' : `$${budgetTotal.toLocaleString()}`}</div></div></div>
              </div>
            )}

            {rightPanelTab === 'overview' && (
              <div className="px-5 pb-5">
                <button type="button" onClick={() => setRightPanelTab('today')} className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-[#F04D79]/30 hover:shadow-md">
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-500">Day {activeDay} 行程摘要</span><span className="text-[11px] font-bold text-[#F04D79]">查看今日</span></div>
                  {currentDayItems.length > 0 ? <><div className="truncate text-base font-bold text-slate-800">{currentDayItems[0].Title || currentDayItems[0].title || '未命名地點'}</div><div className="mt-1 text-xs text-slate-400">共 {currentDayItems.length} 個行程項目</div></> : <div className="text-sm text-slate-400">今天尚未安排行程</div>}
                </button>
              </div>
            )}

            {rightPanelTab === 'budget' && <BudgetPanel itineraryId={params.id as string} currentUserId={String(user?.id || (user as any)?.Account || '')} itineraryItems={itineraryItems} onTotalChange={setBudgetTotal} />}
            {rightPanelTab === 'today' && <TodayPanel dayNumber={activeDay} items={currentDayItems} onFocusItem={focusMapOnItem} />}
            {rightPanelTab === 'reservations' && <ReservationsPanel itineraryId={params.id as string} currentUserId={String(user?.id || (user as any)?.Account || '')} itineraryItems={itineraryItems} onFocusItem={focusMapOnItem} />}
            {rightPanelTab === 'notes' && <ManualNotesPanel itineraryId={params.id as string} currentUserId={String(user?.id || (user as any)?.Account || '')} />}
            {rightPanelTab === 'travelers' && <TravelersPanel itineraryId={params.id as string} currentUserId={String(user?.id || (user as any)?.Account || '')} />}
            {rightPanelTab === 'luggage' && <div className="p-4"><LuggagePanel itineraryId={params.id as string} currentUserId={String(user?.id || (user as any)?.Account || '')} onCountChange={setLuggageCount} /></div>}
            <div className={rightPanelTab === 'chat' ? 'flex h-full min-h-0' : 'hidden'}><ChatPanel itineraryId={params.id as string} currentUserId={String(user?.id || (user as any)?.Account || '')} isActive={rightPanelTab === 'chat'} onUnreadChange={setChatUnreadCount} /></div>

          </div>
        </div>
      </div>

      <nav className="xl:hidden fixed bottom-0 inset-x-0 z-40 flex gap-1 overflow-x-auto border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur">
        {[
          { id: 'overview', label: '總覽', icon: LayoutGrid },
          { id: 'budget', label: '記帳', icon: Wallet },
          { id: 'luggage', label: '行李', icon: BaggageClaim },
          { id: 'chat', label: '聊天', icon: MessageCircle },
          { id: 'travelers', label: '旅伴', icon: User },
          { id: 'today', label: '今日', icon: Clock },
          { id: 'reservations', label: '預訂', icon: Ticket },
          { id: 'notes', label: '備忘', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return <button key={tab.id} type="button" onClick={() => { setRightPanelTab(tab.id); setIsMobilePanelOpen(true); }} className={`relative flex min-w-[58px] flex-1 flex-col items-center gap-1 py-1 text-[10px] font-bold ${rightPanelTab === tab.id && isMobilePanelOpen ? 'text-[#F04D79]' : 'text-slate-400'}`}><Icon size={18} />{tab.label}{tab.id === 'chat' && chatUnreadCount > 0 && <span className="absolute right-2 top-0 min-w-4 rounded-full bg-[#F04D79] px-1 text-[9px] leading-4 text-white">{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</span>}</button>;
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
