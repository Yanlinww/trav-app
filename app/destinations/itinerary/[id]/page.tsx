'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Loader2, MapPin, Share2, X } from 'lucide-react';

type PreviewItem = { id: string; dayNumber: number; title: string; startTime: string; endTime: string; sortOrder: number };
type PublicItinerary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  description?: string | null;
  location?: string | null;
  copyCount: number;
  likeCount: number;
  viewCount: number;
  owner: { account: string; name: string; avatar?: string | null };
  items: PreviewItem[];
};

const fallbackCover = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop';

export default function PublicItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [itinerary, setItinerary] = useState<PublicItinerary | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('http://localhost:8080/destinations/public_itineraries.php?action=preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Itinerary_ID: id }) });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') throw new Error(data.message || '找不到這份公開行程。');
        if (isActive) setItinerary(data.data as PublicItinerary);
      } catch (requestError) {
        if (isActive) setError(requestError instanceof Error ? requestError.message : '公開行程暫時無法載入。');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    void load();
    return () => { isActive = false; };
  }, [id]);

  const days = useMemo(() => {
    const grouped = new Map<number, PreviewItem[]>();
    itinerary?.items.forEach((item) => grouped.set(item.dayNumber, [...(grouped.get(item.dayNumber) || []), item]));
    return Array.from(grouped.entries()).sort(([first], [second]) => first - second);
  }, [itinerary]);

  const share = async () => {
    if (!itinerary) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: itinerary.title, text: `一起看看「${itinerary.title}」這份旅行行程`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice('已複製分享連結');
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      try { await navigator.clipboard.writeText(url); setNotice('已複製分享連結'); } catch { window.prompt('請複製這份公開行程連結：', url); }
    }
  };

  if (isLoading) return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f3f8fb]"><Loader2 className="size-8 animate-spin text-[#8fa9ba]" /></main>;
  if (error || !itinerary) return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f3f8fb] p-6"><div className="max-w-md rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm"><p className="font-bold text-rose-600">{error || '找不到這份公開行程。'}</p><Link href="/destinations" className="mt-5 inline-flex rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white">回到旅遊景點</Link></div></main>;

  return <main className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] px-4 py-8 text-[#30485f] sm:px-6 lg:py-12"><div className="mx-auto max-w-4xl"><div className="mb-5 flex items-center justify-between gap-3"><Link href="/destinations" className="inline-flex items-center gap-2 rounded-xl border border-[#d3e1e9] bg-white px-3.5 py-2.5 text-sm font-bold text-[#5e7891] shadow-sm transition hover:bg-[#eef5f9]"><ArrowLeft size={16} />旅遊景點</Link><div className="flex items-center gap-2"><button type="button" onClick={() => void share()} className="inline-flex items-center gap-2 rounded-xl border border-[#d3e1e9] bg-white px-3.5 py-2.5 text-sm font-bold text-[#5e7891] shadow-sm transition hover:bg-[#eef5f9]"><Share2 size={16} />分享</button></div></div><article className="overflow-hidden rounded-3xl border border-[#d7e4ec] bg-white shadow-[0_18px_50px_rgba(66,96,120,0.10)]"><div className="relative h-64 sm:h-80"><img src={itinerary.coverImage || fallbackCover} alt="" className="size-full object-cover" onError={(event) => { event.currentTarget.src = fallbackCover; }} /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" /><div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8"><p className="text-xs font-bold tracking-[0.16em] text-white/70">PUBLIC ITINERARY</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{itinerary.title}</h1><p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/85"><span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />{itinerary.startDate} 至 {itinerary.endDate}</span>{itinerary.location && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{itinerary.location}</span>}</p></div></div><div className="p-6 sm:p-8"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#edf4f8] text-sm font-bold text-[#66839b]">{itinerary.owner.avatar ? <img src={itinerary.owner.avatar} alt="" className="size-full object-cover" /> : itinerary.owner.name.slice(0, 1)}</div><div><p className="text-sm font-bold text-[#49657b]">{itinerary.owner.name}</p><p className="mt-0.5 text-xs text-[#91a6b7]">公開分享的旅行安排</p></div></div>{itinerary.description && <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#698398]">{itinerary.description}</p>}<div className="mt-8 border-t border-[#e8f0f4] pt-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-[#365168]">行程安排</h2><span className="text-xs font-medium text-[#8ca3b3]">{itinerary.items.length} 個地點</span></div>{days.length === 0 ? <p className="mt-4 rounded-2xl bg-[#f3f8fb] px-4 py-8 text-center text-sm text-[#8aa0b2]">作者尚未加入可預覽的地點。</p> : <div className="mt-5 space-y-6">{days.map(([dayNumber, items]) => <section key={dayNumber}><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#58758c]"><span className="flex size-7 items-center justify-center rounded-full bg-[#edf4f8] text-xs">{dayNumber}</span>Day {dayNumber}</h3><div className="ml-3 border-l border-[#d9e7ef] pl-5">{items.map((item) => <div key={item.id} className="relative py-2.5"><span className="absolute -left-[26px] top-5 size-2.5 rounded-full border-2 border-white bg-[#7d9aaf]" /><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="min-w-24 text-xs font-medium text-[#87a0b1]">{item.startTime || '未設定'}{item.endTime ? ` - ${item.endTime}` : ''}</span><span className="font-medium text-[#405d73]">{item.title || '未命名地點'}</span></div></div>)}</div></section>)}</div>}</div></div></article></div>{notice && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#30485f] px-4 py-3 text-sm font-bold text-white shadow-xl"><div className="flex items-center gap-3"><span>{notice}</span><button type="button" onClick={() => setNotice('')} className="rounded-md p-0.5 text-white/70 transition hover:bg-white/15 hover:text-white" aria-label="關閉提示"><X size={15} /></button></div></div>}</main>;
}
