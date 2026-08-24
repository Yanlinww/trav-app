'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, ChevronDown, Eye, Loader2, MapPin, Sparkles, X } from 'lucide-react';

type ItinerarySort = 'popular' | 'newest' | 'copied';

type PublicItinerary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  transport: string;
  coverImage: string;
  description?: string | null;
  location?: string | null;
  tags: string[];
  copyCount: number;
  likeCount: number;
  viewCount: number;
  itemCount: number;
  dayCount: number;
  owner: { account: string; name: string; avatar?: string | null };
};

type PreviewItem = {
  id: string;
  dayNumber: number;
  title: string;
  startTime: string;
  endTime: string;
};

type ItineraryPreview = PublicItinerary & { items: PreviewItem[] };

const publicTagOptions = ['獨旅', '慢遊', '美食', '咖啡', '自然景點', '文化歷史', '親子', '寵物友善', '低預算'];
const sortOptions: Array<{ value: ItinerarySort; label: string }> = [
  { value: 'popular', label: '熱門' },
  { value: 'newest', label: '最新公開' },
  { value: 'copied', label: '最多複製' },
];
const fallbackCover = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop';

function readableTag(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}

export default function TagDestinationPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: rawTag } = use(params);
  const tag = readableTag(rawTag);
  const isValidTag = publicTagOptions.includes(tag);
  const [sortBy, setSortBy] = useState<ItinerarySort>('popular');
  const [itineraries, setItineraries] = useState<PublicItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ItineraryPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const previewDays = useMemo(() => {
    if (!preview) return [] as Array<[number, PreviewItem[]]>;
    const groups = new Map<number, PreviewItem[]>();
    preview.items.forEach((item) => groups.set(item.dayNumber, [...(groups.get(item.dayNumber) || []), item]));
    return Array.from(groups.entries()).sort(([left], [right]) => left - right);
  }, [preview]);

  useEffect(() => {
    if (!isValidTag) {
      setItineraries([]);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError('');
    fetch('http://localhost:8080/destinations/get_public_itineraries.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Tags: [tag], Sort: sortBy, Limit: 48 }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法載入標籤行程。');
        setItineraries(Array.isArray(data.data) ? data.data : []);
      })
      .catch((requestError) => {
        if ((requestError as Error)?.name !== 'AbortError') setError(requestError instanceof Error ? requestError.message : '無法載入標籤行程。');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [isValidTag, sortBy, tag]);

  const openPreview = async (itineraryId: string) => {
    setIsPreviewLoading(true);
    setPreviewError('');
    try {
      const response = await fetch('http://localhost:8080/destinations/get_public_itinerary_preview.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itineraryId }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法載入行程內容。');
      setPreview(data.data as ItineraryPreview);
    } catch (requestError) {
      setPreviewError(requestError instanceof Error ? requestError.message : '無法載入行程內容。');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  if (!isValidTag) return <main className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] px-4 py-24 text-center text-[#31485f]"><div className="mx-auto max-w-lg rounded-3xl border border-[#dce7ef] bg-white p-10 shadow-sm"><Sparkles className="mx-auto text-[#8da7b9]" size={30} /><h1 className="mt-4 text-2xl font-bold">找不到這個旅遊標籤</h1><p className="mt-3 text-sm leading-6 text-[#849cad]">請從公開行程上的既有標籤重新選擇。</p><Link href="/destinations" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white">回到旅遊景點<ArrowLeft className="rotate-180" size={16} /></Link></div></main>;

  return <main className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] pb-16 text-[#31485f]">
    <section className="border-b border-[#d8e5ed] bg-[linear-gradient(135deg,#46677f_0%,#628198_56%,#8eabbc_100%)] px-4 py-12 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl"><Link href="/destinations" className="inline-flex items-center gap-2 text-sm font-bold text-white/75 transition hover:text-white"><ArrowLeft size={16} />回到旅遊景點</Link><p className="mt-9 text-xs font-bold tracking-[0.2em] text-white/65">TRAVMATE TAG GUIDE</p><h1 className="mt-3 text-4xl font-bold tracking-tight">#{tag} 行程靈感</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">聚合所有標記「{tag}」的公開行程，從不同旅人的安排中找到適合自己的旅遊節奏。</p></div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-[0.18em] text-[#8aa0b2]">TAG COLLECTION</p><h2 className="mt-2 text-2xl font-bold text-[#30485f]">#{tag} 公開行程</h2></div><label className="inline-flex items-center rounded-xl border border-[#d7e4ec] bg-white px-3 text-xs font-bold text-[#698499] shadow-sm"><span className="mr-2">排序</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as ItinerarySort)} className="cursor-pointer bg-transparent py-2.5 text-xs font-bold outline-none">{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>

      {isLoading ? <div className="flex min-h-72 items-center justify-center rounded-3xl border border-[#dce7ef] bg-white shadow-sm"><Loader2 className="size-7 animate-spin text-[#9fb6c5]" /></div> : error ? <div className="rounded-3xl border border-rose-100 bg-rose-50 px-6 py-16 text-center"><p className="font-bold text-rose-700">標籤行程暫時無法載入</p><p className="mt-2 text-sm text-rose-500">{error}</p></div> : itineraries.length === 0 ? <div className="rounded-3xl border border-dashed border-[#cbdce7] bg-white px-6 py-20 text-center shadow-sm"><Sparkles className="mx-auto text-[#b2c5d2]" size={32} /><h3 className="mt-5 text-lg font-bold text-[#4c657b]">目前還沒有 #{tag} 行程</h3><p className="mt-2 text-sm text-[#91a6b7]">你可以先探索其他主題，或公開自己的第一份行程。</p><Link href="/destinations" className="mt-5 inline-flex rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white">探索其他行程</Link></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{itineraries.map((itinerary) => <article key={itinerary.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce7ef] bg-white shadow-[0_6px_18px_rgba(66,96,120,0.06)]"><div className="relative aspect-[4/3] overflow-hidden bg-[#edf4f8]"><img src={itinerary.coverImage || fallbackCover} alt="" className="size-full object-cover" onError={(event) => { event.currentTarget.src = fallbackCover; }} />{itinerary.location && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent px-4 pb-3 pt-12 text-xs font-bold text-white"><span className="inline-flex items-center gap-1"><MapPin size={13} />{itinerary.location}</span></div>}</div><div className="flex flex-1 flex-col p-5"><h3 className="line-clamp-2 min-h-12 break-words text-lg font-bold leading-6 text-[#30485f]">{itinerary.title}</h3><p className="mt-2 min-h-10 break-all text-sm leading-5 text-[#7690a3] line-clamp-2">{itinerary.description || ''}</p><div className="mt-3 min-h-7 overflow-hidden">{itinerary.tags.length > 0 && <div className="flex flex-nowrap gap-1.5">{itinerary.tags.slice(0, 3).map((itemTag) => <Link href={`/destinations/tag/${encodeURIComponent(itemTag)}`} key={itemTag} className="shrink-0 rounded-full bg-[#edf4f8] px-2 py-1 text-[11px] font-bold text-[#5f7c94] transition hover:bg-[#dcecf4]">#{itemTag}</Link>)}</div>}</div><div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs text-[#91a6b7]"><span className="inline-flex items-center gap-1"><CalendarDays size={13} />{itinerary.dayCount} 天</span><span>{itinerary.itemCount} 個地點</span><span>{itinerary.copyCount} 次複製</span><span className="inline-flex items-center gap-1"><Eye size={13} />{itinerary.viewCount}</span></div><div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf2f5] pt-4"><div className="flex min-w-0 items-center gap-2"><div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#edf4f8] text-[10px] font-bold text-[#688198]">{itinerary.owner.avatar ? <img src={itinerary.owner.avatar} alt="" className="size-full object-cover" /> : itinerary.owner.name.slice(0, 1)}</div><span className="truncate text-xs font-medium text-[#688198]">{itinerary.owner.name}</span></div><button type="button" onClick={() => void openPreview(itinerary.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#5e7891] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#4d677f]"><Eye size={14} />預覽</button></div></div></article>)}</div>}
    </section>

    {(isPreviewLoading || previewError || preview) && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#d7e4ec] bg-[#f8fbfd] shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce7ef] bg-white/95 px-5 py-4 backdrop-blur"><div><p className="text-xs font-bold tracking-[0.16em] text-[#8aa0b2]">ITINERARY PREVIEW</p><h2 className="mt-1 text-lg font-bold text-[#30485f]">行程預覽</h2></div><button type="button" onClick={() => { setPreview(null); setPreviewError(''); }} className="rounded-xl p-2 text-[#89a0b1] transition hover:bg-[#eef5f9]" aria-label="關閉"><X size={20} /></button></div>{isPreviewLoading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="size-7 animate-spin text-[#9fb6c5]" /></div> : previewError ? <div className="p-8 text-center"><p className="font-bold text-rose-600">{previewError}</p></div> : preview && <div className="p-5 sm:p-6"><div className="overflow-hidden rounded-2xl border border-[#dce7ef] bg-white"><div className="relative h-48"><img src={preview.coverImage || fallbackCover} alt="" className="size-full object-cover" onError={(event) => { event.currentTarget.src = fallbackCover; }} /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 to-transparent" /><div className="absolute bottom-4 left-5 right-5 text-white"><h3 className="text-2xl font-bold">{preview.title}</h3><p className="mt-1 text-sm text-white/85">{preview.startDate} 至 {preview.endDate}</p></div></div><div className="p-5">{preview.description && <p className="whitespace-pre-line text-sm leading-6 text-[#6d8498]">{preview.description}</p>}{previewDays.map(([dayNumber, items]) => <div key={dayNumber} className="mt-5"><h4 className="text-sm font-bold text-[#4d6a80]">Day {dayNumber}</h4><div className="mt-2 space-y-2">{items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-[#f3f8fb] px-3 py-3"><span className="min-w-24 text-xs font-bold text-[#728ca0]">{item.startTime || '未設定'}{item.endTime ? ` – ${item.endTime}` : ''}</span><span className="min-w-0 flex-1 truncate text-sm font-bold text-[#405d73]">{item.title || '未命名地點'}</span></div>)}</div></div>)}</div></div></div>}</div></div>}
  </main>;
}
