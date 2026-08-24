'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ClipboardList, Eye, Globe2, Loader2, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Report = {
  id: string;
  reason: string;
  details: string;
  status: string;
  reportedAt: string;
  updatedAt: string;
  reporter: { account: string; name: string };
  itinerary: { id: string; title: string; location: string; ownerAccount: string; ownerName: string };
};

function formatTime(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === 'admin';
  const currentAccount = String(user?.id || user?.Account || '');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportError, setReportError] = useState('');

  const loadReports = useCallback(async () => {
    if (!isAdmin || !currentAccount) return;
    setIsLoadingReports(true);
    setReportError('');
    try {
      const response = await fetch('http://localhost:8080/admin/get_public_itinerary_reports.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Account: currentAccount }),
      });
      const responseText = await response.text();
      let data: { status?: string; message?: string; data?: Report[] };
      try {
        data = JSON.parse(responseText) as { status?: string; message?: string; data?: Report[] };
      } catch {
        throw new Error('檢舉服務回傳格式錯誤，請稍後重新整理。');
      }
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法讀取檢舉清單。');
      setReports(Array.isArray(data.data) ? data.data as Report[] : []);
    } catch (requestError) {
      setReportError(requestError instanceof Error ? requestError.message : '無法讀取檢舉清單。');
    } finally {
      setIsLoadingReports(false);
    }
  }, [currentAccount, isAdmin]);

  useEffect(() => { void loadReports(); }, [loadReports]);

  const pendingReports = useMemo(() => reports.filter((report) => report.status === 'pending'), [reports]);

  if (loading) return <main className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb]" />;

  if (!isAdmin) return <main className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] px-4 py-16 text-[#30485f]"><div className="mx-auto max-w-md rounded-3xl border border-[#d7e4ec] bg-white p-8 text-center shadow-[0_14px_35px_rgba(66,96,120,0.08)]"><ShieldCheck className="mx-auto size-11 text-[#9eb7c7]" /><h1 className="mt-5 text-xl font-bold">此頁面僅限管理員</h1><p className="mt-3 text-sm leading-6 text-[#7891a3]">請確認帳號已設為 admin，並登出後重新登入以更新角色資訊。</p><Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#4d677f]"><ArrowLeft size={16} />回到首頁</Link></div></main>;

  return <main className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] px-4 py-8 text-[#30485f] sm:px-6 lg:px-10 lg:py-12"><section className="mx-auto max-w-6xl"><div className="flex flex-wrap items-start justify-between gap-5"><div><div className="inline-flex items-center gap-2 rounded-full border border-[#cfe0ea] bg-white px-3 py-1.5 text-xs font-bold tracking-[0.14em] text-[#58788f] shadow-sm"><ShieldCheck size={15} />ADMIN CONSOLE</div><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">管理後台</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#7891a3]">先從檢舉中心開始：這裡只提供檢視，尚未開放下架或刪除等會修改內容的操作。</p></div><Link href="/destinations" className="inline-flex items-center gap-2 rounded-xl border border-[#d3e1e9] bg-white px-4 py-2.5 text-sm font-bold text-[#5e7891] shadow-sm transition hover:bg-[#eef5f9]"><Eye size={16} />查看公開行程</Link></div><div className="mt-8 grid gap-5 md:grid-cols-3"><article className="rounded-3xl border border-[#cfe0ea] bg-[linear-gradient(135deg,#ffffff_0%,#edf6fa_100%)] p-6 shadow-[0_14px_35px_rgba(66,96,120,0.06)]"><div className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500"><AlertTriangle size={22} /></div><p className="mt-5 text-sm font-bold text-[#6d8799]">待處理檢舉</p><p className="mt-1 text-3xl font-bold text-[#365168]">{pendingReports.length}</p></article><article className="rounded-3xl border border-[#d7e4ec] bg-white p-6 shadow-[0_10px_25px_rgba(66,96,120,0.05)]"><div className="flex size-11 items-center justify-center rounded-2xl bg-[#edf4f8] text-[#58788f]"><Globe2 size={22} /></div><p className="mt-5 text-sm font-bold text-[#6d8799]">全部檢舉</p><p className="mt-1 text-3xl font-bold text-[#365168]">{reports.length}</p></article><article className="rounded-3xl border border-[#d7e4ec] bg-white p-6 shadow-[0_10px_25px_rgba(66,96,120,0.05)]"><div className="flex size-11 items-center justify-center rounded-2xl bg-[#edf4f8] text-[#58788f]"><ClipboardList size={22} /></div><p className="mt-5 text-sm font-bold text-[#6d8799]">目前模式</p><p className="mt-2 text-lg font-bold text-[#365168]">唯讀檢視</p></article></div><section className="mt-8 overflow-hidden rounded-3xl border border-[#d7e4ec] bg-white shadow-[0_14px_35px_rgba(66,96,120,0.06)]"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5eef3] px-5 py-5 sm:px-6"><div><p className="text-xs font-bold tracking-[0.15em] text-[#8ca6b7]">REPORT CENTER</p><h2 className="mt-1 text-xl font-bold text-[#365168]">公開行程檢舉</h2></div><button type="button" onClick={() => void loadReports()} disabled={isLoadingReports} className="inline-flex items-center gap-2 rounded-xl border border-[#d3e1e9] bg-white px-3.5 py-2.5 text-sm font-bold text-[#5e7891] transition hover:bg-[#eef5f9] disabled:cursor-wait disabled:opacity-60"><RefreshCw size={16} className={isLoadingReports ? 'animate-spin' : ''} />重新整理</button></div>{isLoadingReports ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="size-7 animate-spin text-[#9db5c4]" /></div> : reportError ? <div className="px-6 py-14 text-center"><p className="font-bold text-rose-600">檢舉清單暫時無法載入</p><p className="mt-2 text-sm text-rose-500">{reportError}</p></div> : reports.length === 0 ? <div className="px-6 py-16 text-center"><ShieldCheck className="mx-auto size-10 text-[#a7bdca]" /><h3 className="mt-4 font-bold text-[#49677e]">目前沒有檢舉案件</h3><p className="mt-2 text-sm text-[#8da5b5]">新的公開行程檢舉會顯示在這裡。</p></div> : <div className="divide-y divide-[#e8f0f4]">{reports.map((report) => <article key={report.id} className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${report.status === 'pending' ? 'bg-rose-50 text-rose-500' : 'bg-[#eef5f9] text-[#5d7a91]'}`}>{report.status === 'pending' ? '待處理' : report.status}</span><span className="rounded-full bg-[#f2f6f8] px-2.5 py-1 text-xs font-bold text-[#668398]">{report.reason}</span></div><h3 className="mt-3 text-lg font-bold text-[#365168]">{report.itinerary.title}</h3>{report.itinerary.location && <p className="mt-1 flex items-center gap-1.5 text-sm text-[#7892a4]"><MapPin size={14} />{report.itinerary.location}</p>}</div><Link href={`/destinations/itinerary/${report.itinerary.id}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#d3e1e9] bg-white px-3 py-2 text-xs font-bold text-[#5e7891] transition hover:bg-[#eef5f9]"><Eye size={14} />查看行程</Link></div>{report.details && <p className="mt-4 rounded-2xl bg-[#f5f9fb] px-4 py-3 text-sm leading-6 text-[#638095]">{report.details}</p>}<div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#8aa1b1]"><span>檢舉人：{report.reporter.name}</span><span>作者：{report.itinerary.ownerName}</span><span>送出時間：{formatTime(report.reportedAt)}</span></div></article>)}</div>}</section><section className="mt-8 rounded-3xl border border-dashed border-[#bfd4e1] bg-white/70 p-6 sm:p-8"><h2 className="text-lg font-bold text-[#42627a]">下一步</h2><p className="mt-2 text-sm leading-6 text-[#708a9e]">確認清單呈現符合你的習慣後，再加入「處理／駁回」與「下架／恢復公開」功能，並記錄每次管理處置。</p></section></section></main>;
}
