'use client';

import Link from 'next/link';
import { Loader2, Search, UserCheck, UserPlus, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type FollowListType = 'followers' | 'following';

type FollowMember = {
  account: string;
  name: string;
  avatar: string;
  createdAt: string;
  isFollowedByViewer: boolean;
};

type FollowListModalProps = {
  account: string;
  listType: FollowListType;
  isOwnList?: boolean;
  onClose: () => void;
  onOwnFollowingChanged?: () => void;
};

const API_BASE = 'http://localhost:8080';

export default function FollowListModal({ account, listType, isOwnList = false, onClose, onOwnFollowingChanged }: FollowListModalProps) {
  const [activeListType, setActiveListType] = useState<FollowListType>(listType);
  const [members, setMembers] = useState<FollowMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingAccount, setUpdatingAccount] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setActiveListType(listType);
    setSearchText('');
  }, [listType]);

  useEffect(() => {
    const controller = new AbortController();
    const loadMembers = async () => {
      setIsLoading(true);
      setError('');
      try {
        const token = window.localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE}/profile/get_follow_list.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ Account: account, List_Type: activeListType }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法取得追蹤名單。');
        setMembers(Array.isArray(data.data) ? data.data : []);
      } catch (requestError) {
        if ((requestError as Error)?.name !== 'AbortError') setError(requestError instanceof Error ? requestError.message : '無法取得追蹤名單。');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void loadMembers();
    return () => controller.abort();
  }, [account, activeListType]);

  const toggleFollow = async (member: FollowMember) => {
    setUpdatingAccount(member.account);
    setError('');
    try {
      const token = window.localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/toggle_follow.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ Target_Account: member.account }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法更新追蹤狀態。');

      if (isOwnList && activeListType === 'following' && !data.isFollowing) {
        setMembers((items) => items.filter((item) => item.account !== member.account));
        onOwnFollowingChanged?.();
      } else {
        setMembers((items) => items.map((item) => item.account === member.account ? { ...item, isFollowedByViewer: Boolean(data.isFollowing) } : item));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '無法更新追蹤狀態。');
    } finally {
      setUpdatingAccount(null);
    }
  };

  const emptyText = activeListType === 'followers' ? '目前還沒有粉絲。' : '目前尚未追蹤其他旅行者。';
  const normalizedSearchText = searchText.trim().toLocaleLowerCase();
  const filteredMembers = normalizedSearchText === '' ? members : members.filter((member) =>
    `${member.name} ${member.account}`.toLocaleLowerCase().includes(normalizedSearchText)
  );

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="follow-list-title">
    <div className="max-h-[min(44rem,90vh)] w-full max-w-md overflow-hidden rounded-3xl border border-[#d7e4ec] bg-[#f8fbfd] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#dce7ef] bg-white px-6 py-4">
        <div><p className="text-xs font-bold tracking-[0.16em] text-[#8aa0b2]">TRAVELER CONNECTIONS</p><h2 id="follow-list-title" className="mt-1 text-xl font-bold text-[#30485f]">社群名單</h2></div>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-[#89a0b1] transition hover:bg-[#eef5f9] hover:text-[#4e6d86]" aria-label="關閉"><X size={21} /></button>
      </div>
      <div className="border-b border-[#dce7ef] bg-white px-5 pt-3">
        <div className="flex items-end justify-center gap-10" role="tablist" aria-label="社群名單類型">
          {(['followers', 'following'] as FollowListType[]).map((type) => {
            const isActive = activeListType === type;
            return <button key={type} type="button" role="tab" aria-selected={isActive} onClick={() => setActiveListType(type)} className={`border-b-2 px-2 pb-3 text-sm font-bold transition ${isActive ? 'border-[#5e8199] text-[#365168]' : 'border-transparent text-[#94a9b8] hover:text-[#5d7a91]'}`}>{type === 'followers' ? '粉絲' : '追蹤中'}</button>;
          })}
        </div>
      </div>
      <div className="max-h-[58vh] overflow-y-auto p-4">
        <label className="relative mb-4 block"><Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#93aaba]" /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="搜尋名稱或帳號" className="w-full rounded-2xl border border-[#dce7ef] bg-[#edf4f8] py-3 pl-11 pr-4 text-sm text-[#365168] outline-none transition placeholder:text-[#9cafbd] focus:border-[#8ca9ba] focus:bg-white focus:ring-4 focus:ring-[#dfeef5]" /></label>
        {isLoading ? <div className="flex min-h-44 items-center justify-center"><Loader2 className="size-7 animate-spin text-[#9ab2c2]" /></div> : error ? <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-5 text-center text-sm font-medium text-rose-600">{error}</div> : members.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center text-center"><Users size={31} className="text-[#b6c8d3]" /><p className="mt-4 text-sm font-medium text-[#7b94a6]">{emptyText}</p></div> : filteredMembers.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center text-center"><Search size={29} className="text-[#b6c8d3]" /><p className="mt-4 text-sm font-medium text-[#7b94a6]">找不到符合的旅行者。</p></div> : <div className="space-y-2">{filteredMembers.map((member) => <div key={member.account} className="flex items-center gap-3 rounded-2xl border border-[#e1ebf1] bg-white p-3.5"><Link href={`/profile/${encodeURIComponent(member.account)}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#7594aa]"><div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#edf4f8] text-sm font-bold text-[#668399]">{member.avatar ? <img src={member.avatar} alt="" className="size-full object-cover" /> : member.name.slice(0, 1)}</div><div className="min-w-0"><p className="truncate font-bold text-[#365168]">{member.name}</p><p className="mt-0.5 truncate text-xs text-[#8aa0b2]">@{member.account}</p></div></Link><button type="button" onClick={() => void toggleFollow(member)} disabled={updatingAccount === member.account} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 ${member.isFollowedByViewer ? 'border-[#c7dce9] bg-[#edf5f9] text-[#58758c] hover:bg-[#e0edf4]' : 'border-[#f4bdd0] bg-[#fff4f7] text-[#e94d78] hover:bg-[#ffe9f0]'}`}>{updatingAccount === member.account ? <Loader2 size={14} className="animate-spin" /> : member.isFollowedByViewer ? <><UserCheck size={14} />取消追蹤</> : <><UserPlus size={14} />追蹤</>}</button></div>)}</div>}
      </div>
    </div>
  </div>;
}
