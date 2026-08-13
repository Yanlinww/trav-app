'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, Marker, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import { CalendarDays, Clock3, Copy, Eye, Globe2, Loader2, Map as MapIcon, MapPin, Pencil, Search, Settings2, SlidersHorizontal, Sparkles, Upload, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type PublicItinerary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  transport: string;
  coverImage: string;
  description?: string | null;
  tags: string[];
  copyCount: number;
  itemCount: number;
  dayCount: number;
  owner: { account: string; name: string; avatar?: string | null };
};

type OwnedItinerary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  transport: string;
  coverImage?: string | null;
  isPublic: boolean;
  publicTitle?: string | null;
  publicCoverImage?: string | null;
  publicDescription?: string | null;
  tags: string[];
  itemCount: number;
  dayCount: number;
};

type PreviewItem = {
  id: string;
  dayNumber: number;
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  latitude: number | null;
  longitude: number | null;
};

type ItineraryPreview = Omit<PublicItinerary, 'itemCount' | 'dayCount'> & { items: PreviewItem[] };

const transportLabel: Record<string, string> = {
  public: '大眾運輸',
  car: '開車',
  motorcycle: '機車',
  train: '大眾運輸',
  other: '其他',
};

const fallbackCover = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop';

const publicTagOptions = ['獨旅', '慢遊', '美食', '咖啡', '自然景點', '文化歷史', '親子', '寵物友善', '低預算'];

const durationFilterOptions = [
  { value: 'all', label: '不限天數' },
  { value: '1-2', label: '1–2 天' },
  { value: '3-4', label: '3–4 天' },
  { value: '5+', label: '5 天以上' },
];

const transportFilterOptions = [
  { value: '', label: '不限交通' },
  { value: 'public', label: '大眾運輸' },
  { value: 'car', label: '開車' },
  { value: 'motorcycle', label: '機車' },
  { value: 'train', label: '火車／高鐵' },
  { value: 'other', label: '其他' },
];

function ItineraryPreviewMap({ items }: { items: PreviewItem[] }) {
  const mapPoints = useMemo(() => items.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)), [items]);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    language: 'zh-TW',
    region: 'TW',
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!map || !isLoaded || mapPoints.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    mapPoints.forEach((item) => bounds.extend({ lat: Number(item.latitude), lng: Number(item.longitude) }));
    map.fitBounds(bounds, mapPoints.length === 1 ? 150 : 72);
  }, [isLoaded, map, mapPoints]);

  if (mapPoints.length === 0) return <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-[#cbdce7] bg-[#f5f9fb] px-6 text-center text-sm leading-6 text-[#849cad]">這份行程目前沒有可顯示的座標點位。</div>;
  if (loadError) return <div className="flex min-h-72 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 px-6 text-center text-sm text-rose-600">地圖暫時無法載入，仍可查看行程內容。</div>;
  if (!isLoaded) return <div className="flex min-h-72 items-center justify-center rounded-2xl border border-[#dce7ef] bg-white"><Loader2 className="size-7 animate-spin text-[#9fb5c4]" /></div>;

  return <div className="overflow-hidden rounded-2xl border border-[#dce7ef] bg-white"><GoogleMap mapContainerStyle={{ width: '100%', height: '440px' }} center={{ lat: Number(mapPoints[0].latitude), lng: Number(mapPoints[0].longitude) }} zoom={11} onLoad={setMap} options={{ disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false, styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }] }}>
    {mapPoints.length > 1 && <PolylineF path={mapPoints.map((item) => ({ lat: Number(item.latitude), lng: Number(item.longitude) }))} options={{ strokeColor: '#5e7891', strokeOpacity: 0.75, strokeWeight: 4 }} />}
    {mapPoints.map((item, index) => <Marker key={item.id} position={{ lat: Number(item.latitude), lng: Number(item.longitude) }} label={{ text: String(index + 1), color: '#ffffff', fontWeight: '700' }} title={`Day ${item.dayNumber} · ${item.title || '未命名地點'}`} />)}
  </GoogleMap></div>;
}

export default function DestinationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [itineraries, setItineraries] = useState<PublicItinerary[]>([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [transportFilter, setTransportFilter] = useState('');
  const [durationFilter, setDurationFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [ownedItineraries, setOwnedItineraries] = useState<OwnedItinerary[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedOwnedId, setSelectedOwnedId] = useState<string | null>(null);
  const [publicTitle, setPublicTitle] = useState('');
  const [publicCoverImage, setPublicCoverImage] = useState('');
  const [publicDescription, setPublicDescription] = useState('');
  const [publicTags, setPublicTags] = useState<string[]>([]);
  const [isSavingPublic, setIsSavingPublic] = useState(false);
  const [manageError, setManageError] = useState('');
  const [preview, setPreview] = useState<ItineraryPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [copiedItineraryId, setCopiedItineraryId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'schedule' | 'map'>('schedule');

  const currentAccount = (user as any)?.id || (user as any)?.Account || '';

  const selectedOwnedItinerary = ownedItineraries.find((itinerary) => itinerary.id === selectedOwnedId) || null;

  const fetchPublicItineraries = async (
    keyword = '',
    tags = selectedTags,
    transport = transportFilter,
    duration = durationFilter,
  ) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:8080/destinations/get_public_itineraries.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Search: keyword, Tags: tags, Transport: transport, Duration: duration, Limit: 24 }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '載入公開行程失敗');
      setItineraries(Array.isArray(data.data) ? data.data : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '載入公開行程失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPublicItineraries(); }, []);

  const fetchOwnedItineraries = async () => {
    if (!currentAccount) return [] as OwnedItinerary[];
    const response = await fetch('http://localhost:8080/destinations/get_publishable_itineraries.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Account: currentAccount }),
    });
    const data = await response.json();
    if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法取得你的行程。');
    const rows = Array.isArray(data.data) ? data.data as OwnedItinerary[] : [];
    setOwnedItineraries(rows);
    return rows;
  };

  const selectOwnedItinerary = (itinerary: OwnedItinerary) => {
    setSelectedOwnedId(itinerary.id);
    setPublicTitle(itinerary.publicTitle || itinerary.title || '');
    setPublicCoverImage(itinerary.publicCoverImage || itinerary.coverImage || '');
    setPublicDescription(itinerary.publicDescription || '');
    setPublicTags(itinerary.tags || []);
    setManageError('');
  };

  const openManage = async (itineraryId?: string) => {
    if (!currentAccount) {
      router.push('/auth/login');
      return;
    }
    setIsManageOpen(true);
    setManageError('');
    try {
      const rows = await fetchOwnedItineraries();
      const target = itineraryId ? rows.find((itinerary) => itinerary.id === itineraryId) : null;
      if (target) selectOwnedItinerary(target);
      else if (!itineraryId) {
        setSelectedOwnedId(null);
        setPublicTitle('');
        setPublicCoverImage('');
        setPublicDescription('');
        setPublicTags([]);
      }
    } catch (requestError) {
      setManageError(requestError instanceof Error ? requestError.message : '無法取得你的行程。');
    }
  };

  const closeManage = () => {
    setIsManageOpen(false);
    setSelectedOwnedId(null);
    setManageError('');
  };

  const savePublicSettings = async (isPublic: boolean) => {
    if (!selectedOwnedItinerary || !currentAccount) return;
    if (isPublic && !publicTitle.trim()) {
      setManageError('請填寫公開行程標題。');
      return;
    }

    setIsSavingPublic(true);
    setManageError('');
    try {
      const response = await fetch('http://localhost:8080/destinations/save_public_itinerary.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Account: currentAccount,
          Itinerary_ID: selectedOwnedItinerary.id,
          Is_Public: isPublic,
          Public_Title: publicTitle.trim(),
          Public_Cover_Image: publicCoverImage.trim(),
          Public_Description: publicDescription.trim(),
          Tags: publicTags,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法儲存公開設定。');
      await fetchOwnedItineraries();
      await fetchPublicItineraries(appliedSearch);
      closeManage();
    } catch (requestError) {
      setManageError(requestError instanceof Error ? requestError.message : '無法儲存公開設定。');
    } finally {
      setIsSavingPublic(false);
    }
  };

  const unpublish = () => {
    if (!selectedOwnedItinerary || !window.confirm('確定要從旅遊景點下架這份行程嗎？原本的私人行程與地點都會保留。')) return;
    void savePublicSettings(false);
  };

  const heading = useMemo(() => appliedSearch ? `「${appliedSearch}」的行程靈感` : '公開行程靈感', [appliedSearch]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = search.trim();
    setAppliedSearch(keyword);
    fetchPublicItineraries(keyword);
  };

  const toggleDiscoveryTag = (tag: string) => {
    const nextTags = selectedTags.includes(tag)
      ? selectedTags.filter((item) => item !== tag)
      : [...selectedTags, tag];
    setSelectedTags(nextTags);
    void fetchPublicItineraries(search.trim(), nextTags, transportFilter, durationFilter);
  };

  const updateTransportFilter = (value: string) => {
    setTransportFilter(value);
    void fetchPublicItineraries(search.trim(), selectedTags, value, durationFilter);
  };

  const updateDurationFilter = (value: string) => {
    setDurationFilter(value);
    void fetchPublicItineraries(search.trim(), selectedTags, transportFilter, value);
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setTransportFilter('');
    setDurationFilter('all');
    void fetchPublicItineraries(search.trim(), [], '', 'all');
  };

  const togglePublicTag = (tag: string) => {
    if (publicTags.includes(tag)) {
      setPublicTags(publicTags.filter((item) => item !== tag));
      return;
    }
    if (publicTags.length >= 5) {
      setManageError('最多可選擇 5 個旅遊標籤。');
      return;
    }
    setManageError('');
    setPublicTags([...publicTags, tag]);
  };

  const openPreview = async (itineraryId: string) => {
    setPreview(null);
    setPreviewError('');
    setCopiedItineraryId(null);
    setPreviewTab('schedule');
    setIsPreviewLoading(true);
    try {
      const response = await fetch('http://localhost:8080/destinations/get_public_itinerary_preview.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itineraryId }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法載入行程預覽。');
      setPreview(data.data as ItineraryPreview);
    } catch (requestError) {
      setPreviewError(requestError instanceof Error ? requestError.message : '無法載入行程預覽。');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreview(null);
    setPreviewError('');
    setCopiedItineraryId(null);
    setPreviewTab('schedule');
  };

  const handleCopy = async (itinerary: Pick<PublicItinerary, 'id'>) => {
    if (!currentAccount) {
      router.push('/auth/login');
      return;
    }

    setCopyingId(itinerary.id);
    try {
      const response = await fetch('http://localhost:8080/destinations/copy_public_itinerary.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itinerary.id, Account: currentAccount }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '複製行程失敗');
      setCopiedItineraryId(String(data.itineraryId));
      await fetchPublicItineraries(appliedSearch);
    } catch (requestError) {
      window.alert(requestError instanceof Error ? requestError.message : '複製行程失敗，請稍後再試。');
    } finally {
      setCopyingId(null);
    }
  };

  const previewDays = useMemo(() => {
    if (!preview) return [] as Array<[number, PreviewItem[]]>;
    const groups = new Map<number, PreviewItem[]>();
    preview.items.forEach((item) => groups.set(item.dayNumber, [...(groups.get(item.dayNumber) || []), item]));
    return Array.from(groups.entries()).sort(([firstDay], [secondDay]) => firstDay - secondDay);
  }, [preview]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] pb-16 text-[#31485f]">
      <section className="border-b border-[#dbe7ef] bg-white px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-[#d8e6ef] bg-[#eef5f9] text-[#607d96] shadow-sm"><Sparkles size={22} /></div>
            <p className="text-xs font-bold tracking-[0.22em] text-[#8aa0b2]">TRAVMATE INSPIRATION</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#263e55] sm:text-4xl">看看其他旅人怎麼安排</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6d8498] sm:text-base">探索公開行程、找到適合自己的旅行節奏，再複製成可自由修改的私人行程。</p>
            </div>
            <button type="button" onClick={() => void openManage()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#c9dbe7] bg-[#eef5f9] px-4 py-3 text-sm font-bold text-[#4e6d86] shadow-sm transition hover:border-[#aebfd0] hover:bg-white"><Upload size={17} />上傳行程</button>
          </div>

          <form onSubmit={submitSearch} className="mt-8 flex max-w-3xl flex-col gap-3 rounded-2xl border border-[#d8e5ee] bg-[#f6fafc] p-3 shadow-[inset_0_1px_2px_rgba(82,111,136,0.05)] sm:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-[#7790a4]">
              <Search size={19} className="shrink-0" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋行程名稱或目的地" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-[#a4b5c3]" />
            </label>
            <button type="submit" className="rounded-xl bg-[#5e7891] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#4d677f]">搜尋行程</button>
          </form>

          <div className="mt-4 max-w-4xl rounded-2xl border border-[#d8e5ee] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-[#4e697e]"><SlidersHorizontal size={16} />探索篩選</div>
              {(selectedTags.length > 0 || transportFilter || durationFilter !== 'all') && <button type="button" onClick={clearFilters} className="text-xs font-bold text-[#628097] transition hover:text-[#365168]">清除篩選</button>}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#7891a4]">旅行天數<select value={durationFilter} onChange={(event) => updateDurationFilter(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d6e3eb] bg-[#f8fbfd] px-3 py-2.5 text-sm font-medium text-[#4e697e] outline-none focus:border-[#7d9aaf]">{durationFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="text-xs font-bold text-[#7891a4]">交通方式<select value={transportFilter} onChange={(event) => updateTransportFilter(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d6e3eb] bg-[#f8fbfd] px-3 py-2.5 text-sm font-medium text-[#4e697e] outline-none focus:border-[#7d9aaf]">{transportFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{publicTagOptions.map((tag) => <button type="button" key={tag} onClick={() => toggleDiscoveryTag(tag)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${selectedTags.includes(tag) ? 'border-[#5e7891] bg-[#5e7891] text-white shadow-sm' : 'border-[#d6e3eb] bg-[#f8fbfd] text-[#668096] hover:border-[#a9bfce] hover:bg-[#f0f6f9]'}`}>#{tag}</button>)}</div>
            <p className="mt-3 text-xs leading-5 text-[#91a6b7]">多選標籤會以「同時符合」搜尋，方便找出真正符合旅行偏好的公開行程。</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-[#dce8ef] bg-[#f1f7fa] px-3 py-1.5 font-medium text-[#688198]">完整行程可複製</span>
            <span className="rounded-full border border-[#dce8ef] bg-[#f1f7fa] px-3 py-1.5 font-medium text-[#688198]">不含記帳、票券與私人備忘錄</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#8aa0b2]">COMMUNITY PLANS</p>
            <h2 className="mt-2 text-2xl font-bold text-[#30485f]">{heading}</h2>
          </div>
          {!isLoading && <span className="text-sm text-[#91a6b7]">共 {itineraries.length} 份</span>}
        </div>

        {isLoading || authLoading ? (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border border-[#dce7ef] bg-white shadow-sm"><Loader2 className="size-7 animate-spin text-[#b2c3cf]" /></div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 px-6 py-12 text-center"><p className="font-bold text-rose-700">暫時無法載入行程靈感</p><p className="mt-2 text-sm text-rose-500">{error}</p><button type="button" onClick={() => fetchPublicItineraries(appliedSearch)} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-700 shadow-sm">重新整理</button></div>
        ) : itineraries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cbdce7] bg-white px-6 py-20 text-center shadow-sm"><Globe2 className="mx-auto text-[#b2c5d2]" size={32} /><h3 className="mt-5 text-lg font-bold text-[#4c657b]">目前還沒有公開行程</h3><p className="mt-2 text-sm text-[#91a6b7]">完成一份行程後，可在「行程規劃」將它公開分享。</p></div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {itineraries.map((itinerary) => (
              <article key={itinerary.id} className="group overflow-hidden rounded-2xl border border-[#dce7ef] bg-white shadow-[0_6px_18px_rgba(66,96,120,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#c4d8e6] hover:shadow-[0_14px_28px_rgba(66,96,120,0.12)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#edf4f8]">
                  <img src={itinerary.coverImage || fallbackCover} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.src = fallbackCover; }} />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent px-4 pb-3 pt-12 text-xs font-bold text-white"><span className="inline-flex items-center gap-1"><MapPin size={13} /> {transportLabel[itinerary.transport] || '自助旅行'}</span></div>
                </div>
                <div className="p-5">
                  <h3 className="line-clamp-2 min-h-12 text-lg font-bold leading-6 text-[#30485f]">{itinerary.title}</h3>
                  {itinerary.description && <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#7690a3]">{itinerary.description}</p>}
                  {itinerary.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{itinerary.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-[#edf4f8] px-2 py-1 text-[11px] font-bold text-[#5f7c94]">#{tag}</span>)}</div>}
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#91a6b7]"><span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {itinerary.dayCount} 天</span><span>{itinerary.itemCount} 個地點</span><span>{itinerary.copyCount} 次複製</span></div>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf2f5] pt-4">
                    <div className="flex min-w-0 items-center gap-2"><div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#edf4f8] text-[10px] font-bold text-[#688198]">{itinerary.owner.avatar ? <img src={itinerary.owner.avatar} alt="" className="size-full object-cover" /> : itinerary.owner.name.slice(0, 1)}</div><span className="truncate text-xs font-medium text-[#688198]">{itinerary.owner.name}</span></div>
                    {currentAccount === itinerary.owner.account ? (
                      <button type="button" onClick={() => void openManage(itinerary.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#c9dbe7] bg-[#f4f8fb] px-3 py-2 text-xs font-bold text-[#58758c] transition hover:bg-[#eaf2f7]"><Settings2 size={14} />管理</button>
                    ) : (
                      <button type="button" onClick={() => void openPreview(itinerary.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#5e7891] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#4d677f]"><Eye size={14} />預覽行程</button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-[#dce7ef] bg-white px-5 py-4 text-sm leading-6 text-[#6d8498] shadow-sm"><Users className="mr-2 inline text-[#8ca4b6]" size={17} />複製後的行程只屬於你；你可以自行調整時間、地點與封面，原作者的行程不會受到影響。</div>
      </section>

      {isManageOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#d7e4ec] bg-[#f8fbfd] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce7ef] bg-white/95 px-6 py-5 backdrop-blur">
              <div><p className="text-xs font-bold tracking-[0.18em] text-[#8aa0b2]">MY PUBLIC PLANS</p><h2 className="mt-1 text-xl font-bold text-[#30485f]">上傳與公開設定</h2></div>
              <button type="button" onClick={closeManage} className="rounded-xl p-2 text-[#89a0b1] transition hover:bg-[#eef5f9] hover:text-[#4e6d86]" aria-label="關閉"><X size={21} /></button>
            </div>

            <div className="p-6">
              {manageError && <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{manageError}</div>}
              {!selectedOwnedItinerary ? (
                <>
                  <p className="mb-4 text-sm leading-6 text-[#71899b]">選擇一份你建立的行程，設定公開標題與封面後即可上傳。公開內容不會包含記帳、票券、備忘錄、聊天或旅伴資料。</p>
                  <div className="space-y-3">
                    {ownedItineraries.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cbdce7] bg-white px-5 py-12 text-center text-sm text-[#91a6b7]">你目前還沒有可上傳的行程。<button type="button" onClick={() => router.push('/planner')} className="ml-2 font-bold text-[#5e7891] hover:underline">先建立行程</button></div> : ownedItineraries.map((itinerary) => (
                      <button type="button" key={itinerary.id} onClick={() => selectOwnedItinerary(itinerary)} className="flex w-full items-center gap-4 rounded-2xl border border-[#dce7ef] bg-white p-4 text-left shadow-sm transition hover:border-[#bcd2e0] hover:bg-[#fbfdfe]">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#edf4f8] text-[#66839b]"><MapPin size={20} /></div>
                        <div className="min-w-0 flex-1"><div className="truncate font-bold text-[#365168]">{itinerary.title}</div><div className="mt-1 text-xs text-[#8aa0b2]">{itinerary.dayCount} 天 · {itinerary.itemCount} 個地點 · {itinerary.startDate}</div></div>
                        {itinerary.isPublic && <span className="rounded-full bg-[#eaf4ef] px-2.5 py-1 text-[11px] font-bold text-emerald-600">已公開</span>}
                        <Pencil size={17} className="text-[#95aaba]" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  <button type="button" onClick={() => setSelectedOwnedId(null)} className="text-sm font-bold text-[#648096] hover:text-[#3f6079]">← 返回選擇其他行程</button>
                  <div className="rounded-2xl border border-[#dce7ef] bg-white p-4"><div className="text-xs font-bold tracking-wide text-[#8aa0b2]">原始行程</div><div className="mt-1 flex items-center justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-bold text-[#365168]">{selectedOwnedItinerary.title}</h3><p className="mt-1 text-xs text-[#8aa0b2]">{selectedOwnedItinerary.dayCount} 天 · {selectedOwnedItinerary.itemCount} 個地點</p></div><button type="button" onClick={() => router.push(`/planner/${selectedOwnedItinerary.id}`)} className="shrink-0 rounded-lg bg-[#eef5f9] px-3 py-2 text-xs font-bold text-[#58758c] hover:bg-[#e3eef4]">編輯原行程</button></div></div>
                  <label className="block text-sm font-bold text-[#4e697e]">公開標題<input value={publicTitle} onChange={(event) => setPublicTitle(event.target.value)} maxLength={255} placeholder="例如：台北三天兩夜慢遊行程" className="mt-2 w-full rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm text-[#365168] outline-none transition focus:border-[#7d9aaf]" /></label>
                  <label className="block text-sm font-bold text-[#4e697e]">公開封面連結 <span className="font-medium text-[#9aafbd]">（選填）</span><input value={publicCoverImage} onChange={(event) => setPublicCoverImage(event.target.value)} type="url" placeholder="https://..." className="mt-2 w-full rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm text-[#365168] outline-none transition focus:border-[#7d9aaf]" /></label>
                  <label className="block text-sm font-bold text-[#4e697e]">行程簡介 <span className="font-medium text-[#9aafbd]">（選填，最多 1000 字）</span><textarea value={publicDescription} onChange={(event) => setPublicDescription(event.target.value)} maxLength={1000} rows={4} placeholder="分享這趟旅行的亮點、適合什麼樣的旅人，或行前注意事項…" className="mt-2 w-full resize-none rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm leading-6 text-[#365168] outline-none transition focus:border-[#7d9aaf]" /><span className="mt-1 block text-right text-xs font-medium text-[#9aafbd]">{publicDescription.length}/1000</span></label>
                  <p className="rounded-xl border border-[#dce8ef] bg-[#f1f7fa] px-4 py-3 text-xs leading-5 text-[#698398]">公開後，其他旅人可以複製行程結構與地點；你的私人功能資料不會被複製。</p>
                  <div className="rounded-2xl border border-[#dce7ef] bg-white p-4">
                    <div className="flex items-center justify-between gap-3"><div className="text-sm font-bold text-[#4e697e]">旅遊標籤</div><span className="text-xs font-medium text-[#8da3b3]">{publicTags.length}/5</span></div>
                    <p className="mt-1 text-xs leading-5 text-[#91a6b7]">選擇能描述這份行程的標籤，讓其他旅人更容易找到它。</p>
                    <div className="mt-3 flex flex-wrap gap-2">{publicTagOptions.map((tag) => <button type="button" key={tag} onClick={() => togglePublicTag(tag)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${publicTags.includes(tag) ? 'border-[#5e7891] bg-[#5e7891] text-white' : 'border-[#d6e3eb] bg-[#f8fbfd] text-[#668096] hover:border-[#a9bfce]'}`}>#{tag}</button>)}</div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dce7ef] pt-5">
                    {selectedOwnedItinerary.isPublic ? <button type="button" onClick={unpublish} disabled={isSavingPublic} className="rounded-xl px-4 py-3 text-sm font-bold text-rose-500 transition hover:bg-rose-50 disabled:opacity-50">從旅遊景點下架</button> : <span className="text-xs font-medium text-[#8aa0b2]">這份行程目前尚未公開</span>}
                    <button type="button" onClick={() => void savePublicSettings(true)} disabled={isSavingPublic} className="inline-flex items-center gap-2 rounded-xl bg-[#5e7891] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#4d677f] disabled:cursor-wait disabled:opacity-60"><Upload size={16} />{isSavingPublic ? '儲存中…' : selectedOwnedItinerary.isPublic ? '更新公開內容' : '上傳行程'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(isPreviewLoading || preview || previewError) && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#d7e4ec] bg-[#f8fbfd] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#dce7ef] bg-white px-6 py-5">
              <div><p className="text-xs font-bold tracking-[0.18em] text-[#8aa0b2]">ITINERARY PREVIEW</p><h2 className="mt-1 text-xl font-bold text-[#30485f]">行程預覽</h2></div>
              <button type="button" onClick={closePreview} className="rounded-xl p-2 text-[#89a0b1] transition hover:bg-[#eef5f9] hover:text-[#4e6d86]" aria-label="關閉"><X size={21} /></button>
            </div>

            {isPreviewLoading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="size-8 animate-spin text-[#9fb5c4]" /></div> : previewError ? <div className="p-6"><div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-600">{previewError}</div></div> : preview && (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  <div className="overflow-hidden rounded-2xl border border-[#dce7ef] bg-white">
                    <div className="relative h-48 bg-[#edf4f8] sm:h-56"><img src={preview.coverImage || fallbackCover} alt="" className="size-full object-cover" onError={(event) => { event.currentTarget.src = fallbackCover; }} /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" /><div className="absolute bottom-4 left-5 right-5 text-white"><h3 className="text-2xl font-bold">{preview.title}</h3><p className="mt-1 flex items-center gap-2 text-sm text-white/85"><CalendarDays size={15} />{preview.startDate} 至 {preview.endDate}</p></div></div>
                    <div className="p-5"><div className="flex items-center gap-2 text-sm font-medium text-[#6b8599]"><div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-[#edf4f8] text-xs font-bold text-[#66839b]">{preview.owner.avatar ? <img src={preview.owner.avatar} alt="" className="size-full object-cover" /> : preview.owner.name.slice(0, 1)}</div>{preview.owner.name}</div>{preview.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{preview.tags.map((tag) => <span key={tag} className="rounded-full bg-[#edf4f8] px-2.5 py-1 text-[11px] font-bold text-[#5f7c94]">#{tag}</span>)}</div>}{preview.description && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#6d8498]">{preview.description}</p>}</div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-[#dce7ef] bg-white p-5">
                    <div className="mb-5 flex gap-2 border-b border-[#e8f0f4] pb-3"><button type="button" onClick={() => setPreviewTab('schedule')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${previewTab === 'schedule' ? 'bg-[#eaf3f8] text-[#52738c]' : 'text-[#91a6b7] hover:bg-[#f3f8fb]'}`}><Clock3 size={14} />行程內容</button><button type="button" onClick={() => setPreviewTab('map')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${previewTab === 'map' ? 'bg-[#eaf3f8] text-[#52738c]' : 'text-[#91a6b7] hover:bg-[#f3f8fb]'}`}><MapIcon size={14} />點位地圖</button></div>
                    {previewTab === 'map' ? <ItineraryPreviewMap items={preview.items} /> : <>
                    <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-[#365168]">每日安排</h3><span className="text-xs font-medium text-[#8aa0b2]">{preview.items.length} 個地點</span></div>
                    {previewDays.length === 0 ? <p className="rounded-xl bg-[#f3f8fb] px-4 py-8 text-center text-sm text-[#8aa0b2]">作者尚未加入可預覽的地點。</p> : <div className="space-y-5">{previewDays.map(([dayNumber, items]) => <section key={dayNumber}><div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#58758c]"><span className="flex size-7 items-center justify-center rounded-full bg-[#edf4f8] text-xs">{dayNumber}</span>Day {dayNumber}</div><div className="ml-3 border-l border-[#d9e7ef] pl-5">{items.map((item) => <div key={item.id} className="relative py-2.5"><span className="absolute -left-[26px] top-5 size-2.5 rounded-full border-2 border-white bg-[#7d9aaf]" /><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="inline-flex items-center gap-1 text-xs font-medium text-[#87a0b1]"><Clock3 size={13} />{item.startTime || '未設定'}{item.endTime ? ` - ${item.endTime}` : ''}</span><span className="font-medium text-[#405d73]">{item.title || '未命名地點'}</span></div></div>)}</div></section>)}</div>}
                    </>}
                  </div>
                </div>
                <div className="border-t border-[#dce7ef] bg-white px-6 py-4">
                  {copiedItineraryId ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-emerald-600">已複製為你的私人行程，可隨時到行程規劃編輯。</p><button type="button" onClick={closePreview} className="rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#4d677f]">完成</button></div> : <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-[#8aa0b2]">複製後不會帶入記帳、票券、備忘錄、聊天或旅伴資料。</p><button type="button" onClick={() => handleCopy(preview)} disabled={copyingId === preview.id} className="inline-flex items-center gap-2 rounded-xl bg-[#5e7891] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#4d677f] disabled:cursor-wait disabled:opacity-60"><Copy size={16} />{copyingId === preview.id ? '複製中…' : '確認複製行程'}</button></div>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
