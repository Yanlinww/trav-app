'use client';

/**
 * 粉絲／追蹤中名單共用彈窗，由本人與他人的個人頁共同使用。
 * 父頁決定是否掛載與初始分頁；此元件負責讀名單、搜尋及切換追蹤狀態。
 * 需要 React 狀態、Effect 與點擊事件，因此以 'use client' 宣告互動元件入口。
 * 閱讀順序：資料型別 → 畫面狀態 → 載入名單 → 更新追蹤 → 搜尋與 JSX。
 */
// Next.js Link 負責個人頁導航；點擊時另透過 onClose 通知父頁關閉彈窗。
import Link from 'next/link';
import { Loader2, Search, UserCheck, UserPlus, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';

// 限制名單種類只能使用這兩個代碼；畫面分頁與 API 參數共用這組值。
type FollowListType = 'followers' | 'following';

// follow_list API 回傳的單一會員資料；名單所屬關係與觀看者追蹤狀態分開表示。
type FollowMember = {
  account: string; // 會員識別，用於列表 key、個人頁網址與追蹤目標。
  name: string; // 畫面顯示名稱，也供本地搜尋使用。
  avatar: string; // 大頭貼來源；空字串時，畫面以名稱首字代替。
  createdAt: string; // 追蹤關係建立時間，目前 JSX 未顯示。
  isFollowedByViewer: boolean; // 觀看者是否追蹤這位會員，決定按鈕文字及樣式。
};

// Props 是父頁傳入的資料及回呼；問號代表可省略，部分欄位在函式參數中有預設值。
type FollowListModalProps = {
  account: string; // 要查看誰的名單，不一定是登入者本人。
  viewerAccount?: string; // 目前觀看者；空字串時不顯示追蹤操作按鈕。
  listType: FollowListType; // 初始分頁；父頁改變此值時，Effect 會同步。
  isOwnList?: boolean; // 是否為自己的名單，用於取消追蹤後移除列表項目。
  onClose: () => void; // 通知父頁關閉；元件本身不管理外部的開啟狀態。
  onOwnFollowingChanged?: () => void; // 自己的追蹤中名單移除一人後，通知父頁更新計數。
};

// 目前固定指向本機 PHP 後端，與前端個人頁路由的網址不同。
const API_BASE = '/backend';

export default function FollowListModal({ account, viewerAccount = '', listType, isOwnList = false, onClose, onOwnFollowingChanged }: FollowListModalProps) {
  // 內部 state 讓使用者在彈窗內切換分頁，不必由父頁每次重新指定。
  const [activeListType, setActiveListType] = useState<FollowListType>(listType);
  // API 回傳的原始名單；搜尋只產生衍生陣列，不修改這份資料。
  const [members, setMembers] = useState<FollowMember[]>([]);
  // 讀取完成前顯示轉圈，避免把初始空陣列當成「沒有粉絲」。
  const [isLoading, setIsLoading] = useState(true);
  // 名單讀取與追蹤更新共用的錯誤訊息；有值時內容區改顯示錯誤提示。
  const [error, setError] = useState('');
  // 正在更新的會員帳號，讓對應按鈕停用並轉圈；不是鎖定整份名單的旗標。
  const [updatingAccount, setUpdatingAccount] = useState<string | null>(null);
  // 搜尋草稿只存在彈窗內，不送後端，也不寫入瀏覽器儲存空間。
  const [searchText, setSearchText] = useState('');

  // 父頁可能由不同統計按鈕指定初始分頁；listType 改變時同步並清空搜尋。
  // 手動切分頁只改 activeListType，不會改動父頁傳入的 listType。
  useEffect(() => {
    setActiveListType(listType);
    setSearchText('');
  }, [listType]);

  // 名單主人、選中分頁或觀看者變動時重新讀取；觀看者會影響回傳的追蹤狀態。
  useEffect(() => {
    // 每次 Effect 使用獨立的取消控制器，切換條件或卸載時取消這一輪請求。
    const controller = new AbortController();
    const loadMembers = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE}/social.php?action=follow_list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Account 查誰的名單，Viewer_Account 決定以誰的角度計算按鈕狀態。
          body: JSON.stringify({ Account: account, List_Type: activeListType, Viewer_Account: viewerAccount }),
          signal: controller.signal,
        });
        const data = await response.json();
        // HTTP 與業務狀態都必須成功；HTTP 200 仍可能帶 status=error。
        if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法取得追蹤名單。');
        // 確認容器型別是陣列，避免後續 filter/map 因回應型別不符而失敗。
        setMembers(Array.isArray(data.data) ? data.data : []);
      } catch (requestError) {
        // 主動取消是切換或關閉時的正常清理，不當成連線錯誤顯示。
        if ((requestError as Error)?.name !== 'AbortError') setError(requestError instanceof Error ? requestError.message : '無法取得追蹤名單。');
      } finally {
        // 被取消的舊請求不應關閉新一輪讀取的轉圈提示。
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    // Effect 本身不宣告 async；在內部啟動讀取，再回傳同步清理函式。
    void loadMembers();
    return () => controller.abort();
  }, [account, activeListType, viewerAccount]);

  /**
   * 切換觀看者與指定會員的追蹤關係，等待後端確認後才更新畫面。
   * 回傳 isFollowing 是切換後的結果，前端不自行猜測是否已追蹤成功。
   * 此處由請求傳送 Follower_Account，帳號欄位本身不是可信的登入憑證。
   */
  const toggleFollow = async (member: FollowMember) => {
    setUpdatingAccount(member.account);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/social.php?action=toggle_follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Follower_Account: viewerAccount, Target_Account: member.account }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法更新追蹤狀態。');

      if (isOwnList && activeListType === 'following' && !data.isFollowing) {
        // 自己的「追蹤中」取消一人後，對方已不屬於名單，直接移除該列。
        setMembers((items) => items.filter((item) => item.account !== member.account));
        // ?.() 代表父頁有提供回呼才執行，讓父頁自行更新統計數字。
        onOwnFollowingChanged?.();
      } else {
        // 其他情境保留該列，只更新按鈕；取消追蹤粉絲不會移除對方追蹤自己的關係。
        // 函式型 setter 使用更新當下的清單，避免沿用請求開始時的陣列快照。
        setMembers((items) => items.map((item) => item.account === member.account ? { ...item, isFollowedByViewer: Boolean(data.isFollowing) } : item));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '無法更新追蹤狀態。');
    } finally {
      // 成功或失敗都結束按鈕處理中狀態；失敗不更新原追蹤資料。
      setUpdatingAccount(null);
    }
  };

  // 這三個值可從 state 推導，不需要另建 useState 並手動同步。
  const emptyText = activeListType === 'followers' ? '目前還沒有粉絲。' : '目前尚未追蹤其他旅行者。';
  // 去掉首尾空白、統一大小寫，再同時搜尋名稱與帳號。
  const normalizedSearchText = searchText.trim().toLocaleLowerCase();
  // 只篩選已載入的名單；空搜尋顯示全部，不另外向 API 查詢。
  const filteredMembers = normalizedSearchText === '' ? members : members.filter((member) =>
    `${member.name} ${member.account}`.toLocaleLowerCase().includes(normalizedSearchText)
  );

  // fixed/inset-0 讓遮罩覆蓋視窗；dialog 與 aria-labelledby 提供彈窗語意及標題關聯。
  // 高度以 rem/vh 限制，w-full/max-w-md 讓彈窗在不同視窗大小內保持合適寬度。
  // JSX 順序：標題及關閉 → 分頁 → 搜尋 → 載入／錯誤／空名單／搜尋無結果／會員列表。
  // 會員網址編碼帳號，點擊後通知父頁關閉；只有觀看者存在且目標不是自己才顯示追蹤鈕。
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="follow-list-title">
    <div className="max-h-[min(44rem,90vh)] w-full max-w-md overflow-hidden rounded-3xl border border-[#d7e4ec] bg-[#f8fbfd] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#dce7ef] bg-white px-6 py-4">
        <div><p className="text-xs font-bold tracking-[0.16em] text-[#8aa0b2]">TRAVELER CONNECTIONS</p><h2 id="follow-list-title" className="mt-1 text-xl font-bold text-[#30485f]">社群名單</h2></div>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-[#89a0b1] transition hover:bg-[#eef5f9] hover:text-[#4e6d86]" aria-label="關閉"><X size={21} /></button>
      </div>
      <div className="border-b border-[#dce7ef] bg-white px-5 pt-3">
        <div className="flex items-end justify-center gap-10" role="tablist" aria-label="社群名單類型">
          {/* 分頁與 API 共用代碼；aria-selected 與底線樣式反映目前選擇。 */}
          {(['followers', 'following'] as FollowListType[]).map((type) => {
            const isActive = activeListType === type;
            return <button key={type} type="button" role="tab" aria-selected={isActive} onClick={() => setActiveListType(type)} className={`border-b-2 px-2 pb-3 text-sm font-bold transition ${isActive ? 'border-[#5e8199] text-[#365168]' : 'border-transparent text-[#94a9b8] hover:text-[#5d7a91]'}`}>{type === 'followers' ? '粉絲' : '追蹤中'}</button>;
          })}
        </div>
      </div>
      <div className="max-h-[58vh] overflow-y-auto p-4">
        {/* 搜尋和名單共用可捲動區域；輸入只改 searchText，顯示結果即時計算。 */}
        <label className="relative mb-4 block"><Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#93aaba]" /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="搜尋名稱或帳號" className="w-full rounded-2xl border border-[#dce7ef] bg-[#edf4f8] py-3 pl-11 pr-4 text-sm text-[#365168] outline-none transition placeholder:text-[#9cafbd] focus:border-[#8ca9ba] focus:bg-white focus:ring-4 focus:ring-[#dfeef5]" /></label>
        {isLoading ? <div className="flex min-h-44 items-center justify-center"><Loader2 className="size-7 animate-spin text-[#9ab2c2]" /></div> : error ? <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-5 text-center text-sm font-medium text-rose-600">{error}</div> : members.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center text-center"><Users size={31} className="text-[#b6c8d3]" /><p className="mt-4 text-sm font-medium text-[#7b94a6]">{emptyText}</p></div> : filteredMembers.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center text-center"><Search size={29} className="text-[#b6c8d3]" /><p className="mt-4 text-sm font-medium text-[#7b94a6]">找不到符合的旅行者。</p></div> : <div className="space-y-2">{filteredMembers.map((member) => <div key={member.account} className="flex items-center gap-3 rounded-2xl border border-[#e1ebf1] bg-white p-3.5"><Link href={`/profile/${encodeURIComponent(member.account)}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#7594aa]"><div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#edf4f8] text-sm font-bold text-[#668399]">{member.avatar ? <img src={member.avatar} alt="" className="size-full object-cover" /> : member.name.slice(0, 1)}</div><div className="min-w-0"><p className="truncate font-bold text-[#365168]">{member.name}</p><p className="mt-0.5 truncate text-xs text-[#8aa0b2]">@{member.account}</p></div></Link>{viewerAccount && member.account !== viewerAccount && <button type="button" onClick={() => void toggleFollow(member)} disabled={updatingAccount === member.account} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 ${member.isFollowedByViewer ? 'border-[#c7dce9] bg-[#edf5f9] text-[#58758c] hover:bg-[#e0edf4]' : 'border-[#f4bdd0] bg-[#fff4f7] text-[#e94d78] hover:bg-[#ffe9f0]'}`}>{updatingAccount === member.account ? <Loader2 size={14} className="animate-spin" /> : member.isFollowedByViewer ? <><UserCheck size={14} />取消追蹤</> : <><UserPlus size={14} />追蹤</>}</button>}</div>)}</div>}
      </div>
    </div>
  </div>;
}
