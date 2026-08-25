'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArchiveX, ArrowLeft, CheckCircle2, ClipboardList, Eye, Globe2, Loader2, MapPin, RefreshCw, ShieldCheck, Undo2, X, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type ReportStatus = 'pending' | 'resolved' | 'dismissed' | string;
type ReportFilter = 'all' | 'pending' | 'resolved' | 'dismissed';
type ModerationHistory = { id: string; reportId: string; action: string; note: string; adminAccount: string; createdAt: string };
type Report = {
  id: string;
  reason: string;
  details: string;
  status: ReportStatus;
  adminNote: string;
  reviewedBy: string;
  reviewedAt: string;
  reportedAt: string;
  history: ModerationHistory[];
  reporter: { account: string; name: string };
  itinerary: { id: string; title: string; location: string; ownerAccount: string; ownerName: string; isPublic: boolean; moderationStatus: string; moderationNote: string; moderatedBy: string; moderatedAt: string };
};

const API_BASE = 'http://localhost:8080/admin';

function formatTime(value: string) {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function getStatusMeta(status: ReportStatus) {
  if (status === 'resolved') return { label: '已處理', tone: 'bg-emerald-50 text-emerald-600' };
  if (status === 'dismissed') return { label: '已駁回', tone: 'bg-slate-100 text-slate-600' };
  return { label: '待處理', tone: 'bg-rose-50 text-rose-500' };
}

function moderationActionLabel(action: string) {
  if (action === 'report_resolved') return '檢舉標記為已處理';
  if (action === 'report_dismissed') return '檢舉已駁回';
  if (action === 'public_hidden') return '公開行程已下架';
  if (action === 'public_restored') return '公開行程已恢復';
  return action;
}

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const text = await response.text();
  try { return JSON.parse(text) as T; } catch { throw new Error(fallback); }
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === 'admin';
  const currentAccount = String(user?.id || user?.Account || '');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all');
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [action, setAction] = useState<'resolved' | 'dismissed'>('resolved');
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibilityTarget, setVisibilityTarget] = useState<Report | null>(null);
  const [visibilityAction, setVisibilityAction] = useState<'hide' | 'restore'>('hide');
  const [visibilityNote, setVisibilityNote] = useState('');
  const [visibilityError, setVisibilityError] = useState('');
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  const loadReports = useCallback(async () => {
    if (!isAdmin || !currentAccount) return;
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`${API_BASE}/get_public_itinerary_reports.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Account: currentAccount }),
      });
      const data = await parseJson<{ status?: string; message?: string; data?: Report[] }>(response, '檢舉服務回傳格式錯誤，請稍後重新整理。');
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法讀取檢舉清單。');
      setReports(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '無法讀取檢舉清單。');
    } finally { setIsLoading(false); }
  }, [currentAccount, isAdmin]);

  useEffect(() => { void loadReports(); }, [loadReports]);
  const pendingReports = useMemo(() => reports.filter((report) => report.status === 'pending'), [reports]);
  const reportCounts = useMemo<Record<ReportFilter, number>>(() => ({
    all: reports.length,
    pending: reports.filter((report) => report.status === 'pending').length,
    resolved: reports.filter((report) => report.status === 'resolved').length,
    dismissed: reports.filter((report) => report.status === 'dismissed').length,
  }), [reports]);
  const filteredReports = useMemo(
    () => reportFilter === 'all' ? reports : reports.filter((report) => report.status === reportFilter),
    [reportFilter, reports],
  );

  const openAction = (report: Report, nextAction: 'resolved' | 'dismissed') => {
    setActiveReport(report); setAction(nextAction); setNote(''); setActionError('');
  };
  const closeAction = () => {
    if (isSubmitting) return;
    setActiveReport(null); setNote(''); setActionError('');
  };

  const openVisibilityAction = (report: Report, nextAction: 'hide' | 'restore') => {
    setVisibilityTarget(report); setVisibilityAction(nextAction); setVisibilityNote(''); setVisibilityError('');
  };
  const closeVisibilityAction = () => {
    if (isUpdatingVisibility) return;
    setVisibilityTarget(null); setVisibilityNote(''); setVisibilityError('');
  };

  const submitAction = async () => {
    if (!activeReport || !currentAccount) return;
    if (!note.trim()) { setActionError('請填寫處理備註。'); return; }
    setIsSubmitting(true); setActionError('');
    try {
      const response = await fetch(`${API_BASE}/update_public_itinerary_report.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Account: currentAccount, Report_ID: activeReport.id, Status: action, Admin_Note: note.trim() }),
      });
      const data = await parseJson<{ status?: string; message?: string }>(response, '處理服務回傳格式錯誤，請稍後再試。');
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法更新檢舉案件。');
      setActiveReport(null); setNote('');
      await loadReports();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '無法更新檢舉案件。');
    } finally { setIsSubmitting(false); }
  };

  const submitVisibilityAction = async () => {
    if (!visibilityTarget || !currentAccount) return;
    if (!visibilityNote.trim()) { setVisibilityError('請填寫管理備註。'); return; }
    setIsUpdatingVisibility(true); setVisibilityError('');
    try {
      const response = await fetch(`${API_BASE}/update_public_itinerary_visibility.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Account: currentAccount, Itinerary_ID: visibilityTarget.itinerary.id, Report_ID: visibilityTarget.id, Action: visibilityAction, Moderation_Note: visibilityNote.trim() }),
      });
      const data = await parseJson<{ status?: string; message?: string }>(response, '公開狀態服務回傳格式錯誤，請稍後再試。');
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法更新公開狀態。');
      setVisibilityTarget(null); setVisibilityNote('');
      await loadReports();
    } catch (error) {
      setVisibilityError(error instanceof Error ? error.message : '無法更新公開狀態。');
    } finally { setIsUpdatingVisibility(false); }
  };

  if (loading) return <main className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb]" />;
  if (!isAdmin) return <main className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] px-4 py-16 text-[#30485f]"><div className="mx-auto max-w-md rounded-3xl border border-[#d7e4ec] bg-white p-8 text-center shadow-[0_14px_35px_rgba(66,96,120,0.08)]"><ShieldCheck className="mx-auto size-11 text-[#9eb7c7]" /><h1 className="mt-5 text-xl font-bold">此頁面僅限管理員</h1><p className="mt-3 text-sm leading-6 text-[#7891a3]">請確認帳號已設為 admin，並登出後重新登入以更新角色資訊。</p><Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white"><ArrowLeft size={16} />回到首頁</Link></div></main>;

  return <main className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] px-4 py-8 text-[#30485f] sm:px-6 lg:px-10 lg:py-12"><section className="mx-auto max-w-6xl"><header className="flex flex-wrap items-start justify-between gap-5"><div><span className="inline-flex items-center gap-2 rounded-full border border-[#cfe0ea] bg-white px-3 py-1.5 text-xs font-bold tracking-[0.14em] text-[#58788f] shadow-sm"><ShieldCheck size={15} />ADMIN CONSOLE</span><h1 className="mt-4 text-3xl font-bold sm:text-4xl">管理後台</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#7891a3]">管理公開行程的檢舉案件；每次處理都會留下備註，方便日後追蹤。</p></div><Link href="/destinations" className="inline-flex items-center gap-2 rounded-xl border border-[#d3e1e9] bg-white px-4 py-2.5 text-sm font-bold text-[#5e7891] shadow-sm"><Eye size={16} />查看公開行程</Link></header>

    <div className="mt-8 grid gap-5 md:grid-cols-3"><SummaryCard icon={<AlertTriangle size={22} />} iconClass="bg-rose-50 text-rose-500" label="待處理檢舉" value={String(pendingReports.length)} featured /><SummaryCard icon={<Globe2 size={22} />} label="全部檢舉" value={String(reports.length)} /><SummaryCard icon={<ClipboardList size={22} />} label="目前模式" value="可處理檢舉" /></div>

    <section className="mt-8 overflow-hidden rounded-3xl border border-[#d7e4ec] bg-white shadow-[0_14px_35px_rgba(66,96,120,0.06)]"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5eef3] px-5 py-5 sm:px-6"><div><p className="text-xs font-bold tracking-[0.15em] text-[#8ca6b7]">REPORT CENTER</p><h2 className="mt-1 text-xl font-bold text-[#365168]">公開行程檢舉</h2></div><button type="button" onClick={() => void loadReports()} disabled={isLoading} className="inline-flex items-center gap-2 rounded-xl border border-[#d3e1e9] bg-white px-3.5 py-2.5 text-sm font-bold text-[#5e7891] disabled:opacity-60"><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />重新整理</button></div>
      <div className="flex flex-wrap gap-2 border-b border-[#e5eef3] px-5 py-4 sm:px-6">{([['all', '全部'], ['pending', '待處理'], ['resolved', '已處理'], ['dismissed', '已駁回']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setReportFilter(value)} aria-pressed={reportFilter === value} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition ${reportFilter === value ? 'border-[#587994] bg-[#587994] text-white shadow-sm' : 'border-[#d6e4ec] bg-[#f8fbfd] text-[#668298] hover:border-[#adc5d4] hover:bg-white'}`}><span>{label}</span><span className={`min-w-5 rounded-full px-1.5 py-0.5 text-xs ${reportFilter === value ? 'bg-white/20 text-white' : 'bg-white text-[#718da1]'}`}>{reportCounts[value]}</span></button>)}</div>
      {isLoading ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="size-7 animate-spin text-[#9db5c4]" /></div> : loadError ? <div className="px-6 py-14 text-center"><p className="font-bold text-rose-600">檢舉清單暫時無法載入</p><p className="mt-2 text-sm text-rose-500">{loadError}</p></div> : reports.length === 0 ? <div className="px-6 py-16 text-center"><ShieldCheck className="mx-auto size-10 text-[#a7bdca]" /><h3 className="mt-4 font-bold text-[#49677e]">目前沒有檢舉案件</h3><p className="mt-2 text-sm text-[#8da5b5]">新的公開行程檢舉會顯示在這裡。</p></div> : filteredReports.length === 0 ? <div className="px-6 py-16 text-center"><ClipboardList className="mx-auto size-10 text-[#a7bdca]" /><h3 className="mt-4 font-bold text-[#49677e]">這個狀態目前沒有案件</h3><p className="mt-2 text-sm text-[#8da5b5]">可切換到其他狀態查看案件。</p></div> : <div className="divide-y divide-[#e8f0f4]">{filteredReports.map((report) => <ReportRow key={report.id} report={report} onAction={openAction} onVisibilityAction={openVisibilityAction} />)}</div>}
    </section>
    <section className="mt-8 rounded-3xl border border-dashed border-[#bfd4e1] bg-white/70 p-6 sm:p-8"><h2 className="text-lg font-bold text-[#42627a]">公開狀態規則</h2><p className="mt-2 text-sm leading-6 text-[#708a9e]">只有被管理員下架的公開行程可從這裡恢復，避免誤把作者自行設為私人的行程重新公開。</p></section>
  </section>
  {activeReport && <ActionModal report={activeReport} action={action} note={note} error={actionError} isSubmitting={isSubmitting} onNoteChange={setNote} onClose={closeAction} onSubmit={submitAction} />}
  {visibilityTarget && <VisibilityModal report={visibilityTarget} action={visibilityAction} note={visibilityNote} error={visibilityError} isSubmitting={isUpdatingVisibility} onNoteChange={setVisibilityNote} onClose={closeVisibilityAction} onSubmit={submitVisibilityAction} />}
  </main>;
}

function SummaryCard({ icon, iconClass = 'bg-[#edf4f8] text-[#58788f]', label, value, featured = false }: { icon: React.ReactNode; iconClass?: string; label: string; value: string; featured?: boolean }) {
  return <article className={`rounded-3xl border border-[#d7e4ec] p-6 shadow-[0_10px_25px_rgba(66,96,120,0.05)] ${featured ? 'bg-[linear-gradient(135deg,#ffffff_0%,#edf6fa_100%)]' : 'bg-white'}`}><div className={`flex size-11 items-center justify-center rounded-2xl ${iconClass}`}>{icon}</div><p className="mt-5 text-sm font-bold text-[#6d8799]">{label}</p><p className="mt-1 text-3xl font-bold text-[#365168]">{value}</p></article>;
}

function ReportRow({ report, onAction, onVisibilityAction }: { report: Report; onAction: (report: Report, action: 'resolved' | 'dismissed') => void; onVisibilityAction: (report: Report, action: 'hide' | 'restore') => void }) {
  const meta = getStatusMeta(report.status);
  const canRestore = !report.itinerary.isPublic && report.itinerary.moderationStatus === 'hidden';
  return <article className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.tone}`}>{meta.label}</span><span className="rounded-full bg-[#f2f6f8] px-2.5 py-1 text-xs font-bold text-[#668398]">{report.reason}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${report.itinerary.isPublic ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-700'}`}>{report.itinerary.isPublic ? '公開中' : canRestore ? '管理員已下架' : '未公開'}</span></div><h3 className="mt-3 text-lg font-bold text-[#365168]">{report.itinerary.title}</h3>{report.itinerary.location && <p className="mt-1 flex items-center gap-1.5 text-sm text-[#7892a4]"><MapPin size={14} />{report.itinerary.location}</p>}</div><div className="flex flex-wrap gap-2"><Link href={`/destinations/itinerary/${report.itinerary.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d3e1e9] bg-white px-3 py-2 text-xs font-bold text-[#5e7891]"><Eye size={14} />查看行程</Link>{report.itinerary.isPublic && <button type="button" onClick={() => onVisibilityAction(report, 'hide')} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600"><ArchiveX size={14} />下架</button>}{canRestore && <button type="button" onClick={() => onVisibilityAction(report, 'restore')} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white"><Undo2 size={14} />恢復公開</button>}{report.status === 'pending' && <><button type="button" onClick={() => onAction(report, 'resolved')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 size={14} />處理</button><button type="button" onClick={() => onAction(report, 'dismissed')} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><XCircle size={14} />駁回</button></>}</div></div>{report.details && <p className="mt-4 rounded-2xl bg-[#f5f9fb] px-4 py-3 text-sm leading-6 text-[#638095]">{report.details}</p>}{!report.itinerary.isPublic && report.itinerary.moderationNote && <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3"><p className="text-xs font-bold text-amber-700">公開狀態備註</p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-amber-900/80">{report.itinerary.moderationNote}</p><p className="mt-2 text-xs text-amber-700/80">處理者：{report.itinerary.moderatedBy || '—'}{report.itinerary.moderatedAt ? ` ・ ${formatTime(report.itinerary.moderatedAt)}` : ''}</p></div>}{report.status !== 'pending' && <div className="mt-4 rounded-2xl border border-[#dbe8ef] bg-[#f5f9fb] px-4 py-3"><p className="text-xs font-bold text-[#6b8799]">管理處理備註</p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#527188]">{report.adminNote || '未填寫備註'}</p><p className="mt-2 text-xs text-[#8aa1b1]">處理者：{report.reviewedBy || '—'}{report.reviewedAt ? ` ・ ${formatTime(report.reviewedAt)}` : ''}</p></div>}{report.history.length > 0 && <details className="mt-4 rounded-2xl border border-[#dbe8ef] bg-white px-4 py-3"><summary className="cursor-pointer text-sm font-bold text-[#58758c]">管理處理紀錄（{report.history.length}）</summary><div className="mt-3 space-y-3 border-t border-[#e6eef3] pt-3">{report.history.slice(0, 5).map((entry) => <div key={entry.id} className="text-sm"><p className="font-bold text-[#48677e]">{moderationActionLabel(entry.action)}</p><p className="mt-0.5 whitespace-pre-line leading-6 text-[#668398]">{entry.note}</p><p className="mt-1 text-xs text-[#8aa1b1]">{entry.adminAccount} ・ {formatTime(entry.createdAt)}</p></div>)}</div></details>}<div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#8aa1b1]"><span>檢舉人：{report.reporter.name}</span><span>作者：{report.itinerary.ownerName}</span><span>送出時間：{formatTime(report.reportedAt)}</span></div></article>;
}

function ActionModal({ report, action, note, error, isSubmitting, onNoteChange, onClose, onSubmit }: { report: Report; action: 'resolved' | 'dismissed'; note: string; error: string; isSubmitting: boolean; onNoteChange: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  const isResolve = action === 'resolved';
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-[#d7e4ec] bg-[#f8fbfd] shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-[#dce7ef] bg-white px-6 py-5"><div><p className="text-xs font-bold tracking-[0.14em] text-[#8aa0b2]">MODERATION ACTION</p><h2 className="mt-1 text-xl font-bold text-[#30485f]">{isResolve ? '標記為已處理' : '駁回檢舉'}</h2><p className="mt-2 line-clamp-1 text-sm text-[#7891a3]">{report.itinerary.title}</p></div><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl p-2 text-[#89a0b1] disabled:opacity-50" aria-label="關閉"><X size={21} /></button></div><div className="p-6"><label className="block text-sm font-bold text-[#4e697e]">處理備註 <span className="text-rose-500">*</span><textarea value={note} onChange={(event) => onNoteChange(event.target.value)} maxLength={1000} rows={5} disabled={isSubmitting} placeholder={isResolve ? '例如：已確認內容需要後續處理。' : '例如：經確認未違反公開行程規範。'} className="mt-2 w-full resize-none rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm leading-6 text-[#365168] outline-none disabled:opacity-60" /><span className="mt-1 block text-right text-xs font-medium text-[#9aafbd]">{note.length}/1000</span></label>{error && <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-4 py-3 text-sm font-bold text-[#7891a3] disabled:opacity-50">取消</button><button type="button" onClick={onSubmit} disabled={isSubmitting} className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-wait disabled:opacity-60 ${isResolve ? 'bg-emerald-600' : 'bg-[#5e7891]'}`}>{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : isResolve ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{isSubmitting ? '儲存中…' : isResolve ? '確認已處理' : '確認駁回'}</button></div></div></div></div>;
}

function VisibilityModal({ report, action, note, error, isSubmitting, onNoteChange, onClose, onSubmit }: { report: Report; action: 'hide' | 'restore'; note: string; error: string; isSubmitting: boolean; onNoteChange: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  const isHide = action === 'hide';
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-[#d7e4ec] bg-[#f8fbfd] shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-[#dce7ef] bg-white px-6 py-5"><div><p className="text-xs font-bold tracking-[0.14em] text-[#8aa0b2]">PUBLIC VISIBILITY</p><h2 className="mt-1 text-xl font-bold text-[#30485f]">{isHide ? '下架公開行程' : '恢復公開行程'}</h2><p className="mt-2 line-clamp-1 text-sm text-[#7891a3]">{report.itinerary.title}</p></div><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl p-2 text-[#89a0b1] disabled:opacity-50" aria-label="關閉"><X size={21} /></button></div><div className="p-6"><p className={`rounded-2xl px-4 py-3 text-sm leading-6 ${isHide ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700'}`}>{isHide ? '下架後，公開景點頁、複製與分享連結將無法再讀取此行程。' : '恢復後，行程會重新出現在公開景點頁並可被瀏覽與複製。'}</p><label className="mt-5 block text-sm font-bold text-[#4e697e]">管理備註 <span className="text-rose-500">*</span><textarea value={note} onChange={(event) => onNoteChange(event.target.value)} maxLength={1000} rows={5} disabled={isSubmitting} placeholder={isHide ? '例如：已確認違規，暫時下架公開內容。' : '例如：已完成修正，恢復公開顯示。'} className="mt-2 w-full resize-none rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm leading-6 text-[#365168] outline-none disabled:opacity-60" /><span className="mt-1 block text-right text-xs font-medium text-[#9aafbd]">{note.length}/1000</span></label>{error && <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-4 py-3 text-sm font-bold text-[#7891a3] disabled:opacity-50">取消</button><button type="button" onClick={onSubmit} disabled={isSubmitting} className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-wait disabled:opacity-60 ${isHide ? 'bg-rose-600' : 'bg-sky-600'}`}>{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : isHide ? <ArchiveX size={16} /> : <Undo2 size={16} />}{isSubmitting ? '儲存中…' : isHide ? '確認下架' : '確認恢復公開'}</button></div></div></div></div>;
}
