// 此頁有狀態、點擊事件和瀏覽器分享 API，因此宣告為 Client Component 入口。
'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
// 使用同一套圖示，讓返回、日期、地點、分享與關閉的視覺風格一致。
import { ArrowLeft, CalendarDays, Loader2, MapPin, Share2, X } from 'lucide-react';

/**
 * 單一行程項目的資料格式。type 只協助 TypeScript 檢查，不會驗證 API 的實際內容。
 * 後端 preview 查詢會先依 Day_Number、Sort_Order、Item_ID 排序，前端保留這個順序。
 */
type PreviewItem = {
  id: string; // 項目 ID，渲染列表時用來辨識項目，不使用容易隨排序改變的陣列索引。
  dayNumber: number; // 第幾天，例如 1 表示 Day 1。
  title: string; // 地點或活動名稱。
  startTime: string; // 開始時間，後端將時間截成 HH:mm；沒有時間時是空字串。
  endTime: string; // 結束時間。
  sortOrder: number; // 同一天內的排列順序；此頁不再另外依它排序。
};

/** 公開行程 API 回傳的主體：行程基本資料、作者資料，以及項目陣列。 */
type PublicItinerary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  // ? 表示欄位可以省略，| null 表示欄位存在時也可以沒有值。
  description?: string | null;
  location?: string | null;
  // API 提供這些統計值，但目前此頁沒有顯示，也沒有呼叫 action=view 記錄瀏覽。
  copyCount: number;
  likeCount: number;
  viewCount: number;
  owner: { account: string; name: string; avatar?: string | null };
  items: PreviewItem[]; // [] 表示多筆 PreviewItem 組成的陣列。
};

// 封面網址為空或圖片載入失敗時使用。固定值放在元件外，集中管理；仍需網路載入。
const fallbackCover = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop';

/**
 * 公開行程預覽頁，網址為 /destinations/itinerary/行程ID。
 * [id] 是 Next.js 動態路由：例如 /26 和 /35 共用此頁，分別取得 id="26"、id="35"。
 * 此頁負責閱讀與分享；是否公開由後端 preview 的 Is_Public = 1 查詢條件限制。
 * 閱讀順序：取得 ID → 載入 API → 按天分組 → 分享函式 → 載入／錯誤／正常畫面。
 * 寫法依據：專案 node_modules/next/dist/docs 的 dynamic-routes.md、use-client.md，
 * 以及 backend/trav-api/destinations/public_itineraries.php 的 preview 函式。
 */
export default function PublicItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  // 目前 Next.js 的 params 是 Promise；Client Component 用 React use() 讀取結果。
  // URL 參數是字串，即使網址中的 ID 看起來像數字，這裡仍是 "26" 而不是 26。
  const { id } = use(params);

  // useState 回傳 [目前值, 更新函式]；呼叫更新函式會通知 React 重新渲染畫面。
  const [itinerary, setItinerary] = useState<PublicItinerary | null>(null); // 尚未取得資料。
  const [error, setError] = useState(''); // 空字串表示目前沒有載入錯誤。
  const [isLoading, setIsLoading] = useState(true); // 第一次進入時先顯示載入動畫。
  const [notice, setNotice] = useState(''); // 分享後的提示文字；清空即隱藏提示。

  // API 請求是與外部系統互動，放在 Effect 中，避免每次渲染都直接發送請求。
  useEffect(() => {
    // 每輪 Effect 都有自己的旗標，忽略已離開頁面或已切換 ID 的舊請求結果。
    // 這只阻止舊結果更新狀態，並沒有真正取消已送出的網路請求。
    let isActive = true;

    // Effect 本身要能回傳清理函式，所以另外定義 async 函式來等待 API 回應。
    const load = async () => {
      setIsLoading(true);
      setError(''); // 新一輪載入不沿用上一輪的錯誤訊息。
      try {
        // 配合現有 PHP API 契約：POST + JSON，action=preview 指定公開行程預覽。
        // Itinerary_ID 必須與 PHP 讀取的欄位同名；JSON.stringify 將物件轉成 JSON 字串。
        // 後端讀取 Itinerary、Member、Itinerary_Item，再將資料組成 JSON 回傳。
        // localhost:8080 是目前的開發位置，部署時需改成使用者可連線的後端位置。
        const response = await fetch('/backend/destinations/public_itineraries.php?action=preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Itinerary_ID: id })
        });
        const data = await response.json(); // 把回應內容解析成 JavaScript 資料。

        // 同時檢查 HTTP 與業務結果：HTTP 200 也可能包含 status="error"。
        // throw 會轉入下方 catch，讓失敗情況走同一套錯誤畫面。
        if (!response.ok || data.status !== 'success') throw new Error(data.message || '找不到這份公開行程。');
        // as 是型別斷言，不會轉換或驗證資料；此處依賴後端遵守回傳格式。
        if (isActive) setItinerary(data.data as PublicItinerary);
      } catch (requestError) {
        // 拋出的值不一定是 Error，先判斷才能安全讀取 message，否則使用預設訊息。
        if (isActive) setError(requestError instanceof Error ? requestError.message : '公開行程暫時無法載入。');
      } finally {
        // 成功或失敗都結束載入，避免錯誤後畫面一直轉圈。
        if (isActive) setIsLoading(false);
      }
    };

    // 啟動非同步載入；void 表示不使用回傳的 Promise，錯誤由 load 裡的 catch 處理。
    void load();
    // 切換 ID 或離開頁面時清理，避免先前較慢的回應覆蓋新行程。
    return () => { isActive = false; };
  }, [id]); // id 改變就重新載入；例如從 /26 切換到 /35。

  // days 可由 itinerary 推導，不需要另外保存成 state，避免兩份資料不同步。
  // useMemo 在依賴未變時重用計算結果；它是效能選擇，不是分組正確性的必要條件。
  const days = useMemo(() => {
    const grouped = new Map<number, PreviewItem[]>(); // 對照表：天數 → 當天的項目陣列。
    // ?. 讓 itinerary 為 null 時略過處理；每筆項目加到對應天數的陣列尾端。
    // get(...) || []：第一次遇到這一天就從空陣列開始；... 展開已有項目，再加入 item。
    itinerary?.items.forEach((item) => grouped.set(item.dayNumber, [...(grouped.get(item.dayNumber) || []), item]));
    // entries() 取得 [天數, 項目陣列]，轉成陣列後依天數由小到大排序。
    // 例如結果是 [[1, [A, B]], [2, [C]]]；沒有項目的天數不會自動建立空白區塊。
    return Array.from(grouped.entries()).sort(([first], [second]) => first - second);
  }, [itinerary]);

  /** 分享依序使用原生分享、剪貼簿、手動複製，以適應不同瀏覽器的支援程度。 */
  const share = async () => {
    if (!itinerary) return; // 沒有資料時不執行分享。
    // 此函式由點擊事件執行，因此在使用者的瀏覽器內讀取目前完整網址。
    const url = window.location.href;
    try {
      // 有 API 才嘗試原生分享；實際可用性仍受 HTTPS、瀏覽器和使用者操作等條件影響。
      if (navigator.share) {
        await navigator.share({ title: itinerary.title, text: `一起看看「${itinerary.title}」這份旅行行程`, url });
        return; // 分享成功後結束，避免又額外複製一次網址。
      }
      await navigator.clipboard.writeText(url);
      setNotice('已複製分享連結'); // 更新 state，讓底部提示出現。
    } catch (requestError) {
      // AbortError 通常表示取消等分享中止情況，此處直接結束，不再啟動複製備案。
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      // 原生分享失敗時再嘗試複製；剪貼簿也失敗，就提供網址讓使用者手動複製。
      try {
        await navigator.clipboard.writeText(url);
        setNotice('已複製分享連結');
      } catch {
        window.prompt('請複製這份公開行程連結：', url);
      }
    }
  };

  // 所有 Hooks 都在提前 return 之前，確保每次渲染的 Hook 呼叫順序一致。
  // 先處理載入與錯誤，正常 JSX 就能直接使用已存在的 itinerary。
  if (isLoading) return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f3f8fb]">
      {/* animate-spin 使圖示旋轉，表示仍在等待後端。 */}
      <Loader2 className="size-8 animate-spin text-[#8fa9ba]" />
    </main>
  );

  if (error || !itinerary) return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f3f8fb] p-6">
      <div className="max-w-md rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
        <p className="font-bold text-rose-600">{error || '找不到這份公開行程。'}</p>
        <Link href="/destinations" className="mt-5 inline-flex rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white">回到旅遊景點</Link>
      </div>
    </main>
  );

  // Tailwind className 控制樣式：px/py 是內距，sm:/lg: 在不同螢幕寬度調整版面。
  // min-h 使用視窗高度減去 4rem；mx-auto + max-w-4xl 讓內容置中並限制最大寬度。
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] px-4 py-8 text-[#30485f] sm:px-6 lg:py-12">
      <div className="mx-auto max-w-4xl">
        {/* 頂部操作列：Link 做站內導航，分享按鈕在點擊時才呼叫 share。 */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href="/destinations" className="inline-flex items-center gap-2 rounded-xl border border-[#d3e1e9] bg-white px-3.5 py-2.5 text-sm font-bold text-[#5e7891] shadow-sm transition hover:bg-[#eef5f9]">
            <ArrowLeft size={16} />旅遊景點
          </Link>
          <div className="flex items-center gap-2">
            {/* type=button 避免放入表單時被當作送出按鈕；箭頭函式延後到點擊才執行。 */}
            <button type="button" onClick={() => void share()} className="inline-flex items-center gap-2 rounded-xl border border-[#d3e1e9] bg-white px-3.5 py-2.5 text-sm font-bold text-[#5e7891] shadow-sm transition hover:bg-[#eef5f9]">
              <Share2 size={16} />分享
            </button>
          </div>
        </div>

        <article className="overflow-hidden rounded-3xl border border-[#d7e4ec] bg-white shadow-[0_18px_50px_rgba(66,96,120,0.10)]">
          {/* 封面：relative 作為定位基準，讓漸層和標題能疊在圖片上。 */}
          <div className="relative h-64 sm:h-80">
            {/* || 處理空網址；onError 處理有網址但載入失敗；object-cover 維持比例並裁切填滿。 */}
            <img src={itinerary.coverImage || fallbackCover} alt="" className="size-full object-cover" onError={(event) => { event.currentTarget.src = fallbackCover; }} />
            {/* 由底部深色到透明的漸層，提升白色標題在圖片上的辨識度。 */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
              <p className="text-xs font-bold tracking-[0.16em] text-white/70">PUBLIC ITINERARY</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{itinerary.title}</h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/85">
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />{itinerary.startDate} 至 {itinerary.endDate}</span>
                {/* && 是條件顯示：只有 location 有值才渲染，避免空的地點資訊。 */}
                {itinerary.location && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{itinerary.location}</span>}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* 作者資料：沒有頭像網址時顯示名字第一個字；此處未處理頭像圖片載入失敗。 */}
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#edf4f8] text-sm font-bold text-[#66839b]">
                {itinerary.owner.avatar ? <img src={itinerary.owner.avatar} alt="" className="size-full object-cover" /> : itinerary.owner.name.slice(0, 1)}
              </div>
              <div>
                <p className="text-sm font-bold text-[#49657b]">{itinerary.owner.name}</p>
                <p className="mt-0.5 text-xs text-[#91a6b7]">公開分享的旅行安排</p>
              </div>
            </div>

            {/* 有描述才顯示；whitespace-pre-line 保留作者輸入的換行。 */}
            {itinerary.description && <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#698398]">{itinerary.description}</p>}

            <div className="mt-8 border-t border-[#e8f0f4] pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#365168]">行程安排</h2>
                {/* 計算項目筆數，沒有去重；同一地點出現兩筆仍計為兩個項目。 */}
                <span className="text-xs font-medium text-[#8ca3b3]">{itinerary.items.length} 個地點</span>
              </div>
              {/* 三元運算子依有無項目，選擇空狀態說明或每日時間軸。 */}
              {days.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-[#f3f8fb] px-4 py-8 text-center text-sm text-[#8aa0b2]">作者尚未加入可預覽的地點。</p>
              ) : (
                <div className="mt-5 space-y-6">
                  {/* 解構 [dayNumber, items]；map 將每一天轉成 JSX 區塊。 */}
                  {days.map(([dayNumber, items]) => (
                    <section key={dayNumber}>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#58758c]">
                        <span className="flex size-7 items-center justify-center rounded-full bg-[#edf4f8] text-xs">{dayNumber}</span>Day {dayNumber}
                      </h3>
                      {/* 左邊框形成時間軸直線，內距替地點文字保留空間。 */}
                      <div className="ml-3 border-l border-[#d9e7ef] pl-5">
                        {/* key 使用穩定 ID，讓 React 在列表改變時辨識同一項目。 */}
                        {items.map((item) => (
                          <div key={item.id} className="relative py-2.5">
                            {/* 小圓點以 absolute 定位到左側時間軸。 */}
                            <span className="absolute -left-[26px] top-5 size-2.5 rounded-full border-2 border-white bg-[#7d9aaf]" />
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              {/* 沒有開始時間就顯示「未設定」，有結束時間才加上分隔符與時間。 */}
                              <span className="min-w-24 text-xs font-medium text-[#87a0b1]">{item.startTime || '未設定'}{item.endTime ? ` - ${item.endTime}` : ''}</span>
                              <span className="font-medium text-[#405d73]">{item.title || '未命名地點'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>
      </div>

      {/* notice 非空才顯示；fixed 固定在視窗底部，left-1/2 與位移使提示水平置中。 */}
      {notice && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#30485f] px-4 py-3 text-sm font-bold text-white shadow-xl">
          <div className="flex items-center gap-3">
            <span>{notice}</span>
            {/* 清空狀態即隱藏；aria-label 為只有圖示的按鈕提供可讀名稱。目前沒有自動關閉計時。 */}
            <button type="button" onClick={() => setNotice('')} className="rounded-md p-0.5 text-white/70 transition hover:bg-white/15 hover:text-white" aria-label="關閉提示">
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
