'use client';
import { useState, useEffect, useRef, type MouseEvent } from 'react';

/**
 * 可重複使用的地點輸入元件，不負責寫入行程或直接建立 Google 地圖。
 * 輸入文字由父元件管理；此元件只管理建議清單、載入狀態與請求節流。
 * 選取建議後交出 placeId，由行程頁向 /api/placedetails 補齊資料。
 */
interface PlaceAutocompleteProps {
  value: string; // 父元件目前保存的文字，綁定 input.value，屬於受控輸入。
  onChange: (value: string) => void; // 通知父元件更新文字，本元件不另存一份文字副本。
  onPlaceSelect: (placeId: string) => void; // 選取建議後傳回 Google 地點 ID，不代表已加入行程。
  onKeywordSearch?: (keyword: string) => void; // 可選功能：Enter 時交給父元件做完整文字搜尋。
  locationBias?: { lat: number; lng: number }; // 可選搜尋中心，交給後端作為偏好區域，不是精確篩選邊界。
}
// 對應自動完成 API 回傳的單筆建議；文字欄位可缺少，因此顯示時使用 ?. 安全讀取。
interface Suggestion {
  placePrediction: { placeId: string; text?: { text?: string } };
}

export default function PlaceAutocomplete({ value, onChange, onPlaceSelect, onKeywordSearch, locationBias }: PlaceAutocompleteProps) {
  // 四種 state 影響畫面，所以使用 useState；下方 ref 只保存跨 render 的控制資訊。
  // suggestions 是建議清單，不是完整搜尋結果；errorMessage 為空字串時不顯示錯誤。
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  // 選取建議或送出 Enter 後，名稱雖改變，也不要再次查同一份自動完成建議。
  const suppressSuggestionsRef = useRef(false);
  // 計時器尚未到期前可 clearTimeout，避免使用者每輸入一字就送出一次。
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 保存最近一次自動完成的取消控制器，讓輸入與選取事件能立即中止等待。
  const controllerRef = useRef<AbortController | null>(null);
  // 每次新輸入／Effect 都遞增序號；回應回來時比對序號，避免慢回應覆蓋新內容。
  const requestIdRef = useRef(0);
  // 冷卻期限為 Date.now() 使用的 Unix 毫秒時間；只阻擋新操作，不自動排程重試。
  const cooldownUntilRef = useRef(0);
  // 保存上次點擊的地點與事件時間，用來判斷同一建議的兩秒內連點。
  const selectedRef = useRef({ id: '', time: 0 });
  // 只依賴座標數值：父元件每次 render 建立新物件，不應重啟搜尋計時器。
  const latitude = locationBias?.lat;
  const longitude = locationBias?.lng;

  /**
   * 輸入、選取、Enter、輸入法開始選字時共用的收尾。
   * 先取消尚未送出與正在等待的請求，再清掉舊建議與載入提示。
   * abort 不能保證 Google 沒收到請求，真正節省配額仍須靠送出前防抖及後端限制。
   */
  const stopSuggestions = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    controllerRef.current?.abort();
    requestIdRef.current += 1; // 就算 abort 太晚，舊回應也不能再更新畫面。
    setSuggestions([]);
    setIsLoading(false);
  };

  // Effect 只在文字、實際座標或輸入法狀態改變時啟動；不是每次重新繪製都查詢。
  useEffect(() => {
    // 此次工作的固定序號；後續事件若遞增 ref，就代表這份結果已過期。
    const requestId = ++requestIdRef.current;
    const input = value.trim();
    const controller = new AbortController();
    const coolingDown = Date.now() < cooldownUntilRef.current;
    // 延後同步畫面狀態，避免 Effect 內同步 setState 形成連鎖重新繪製。
    // 請求序號與取消訊號同時檢查，卸載或換字後不更新舊狀態。
    // microtask 在目前同步工作結束後執行，比 800 毫秒防抖計時器早；不會送出網路請求。
    queueMicrotask(() => {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setSuggestions([]);
      setErrorMessage(coolingDown ? '地點查詢過於頻繁，請稍候再輸入。' : '');
      setIsLoading(false);
    });
    // 選過建議、中文選字中、字數不足或仍在冷卻時，只清理狀態，不建立搜尋計時器。
    if (suppressSuggestionsRef.current || isComposing || input.length < 2 || coolingDown) return () => controller.abort();
    // 停止輸入 800 毫秒才送出；中文輸入法選字期間不呼叫 API。
    controllerRef.current = controller;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // 只呼叫本專案同源 API；Google 金鑰與實際外部請求由伺服器處理。
        const response = await fetch('/api/autocomplete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, locationBias: latitude == null || longitude == null ? undefined : { lat: latitude, lng: longitude } }),
          signal: controller.signal,
        });
        const data = await response.json();
        // 後端的 Retry-After 單位是秒，轉成毫秒後保存截止時間；沒有提供時先等 60 秒。
        if (response.status === 429) {
          const seconds = Number(response.headers.get('Retry-After')) || 60;
          cooldownUntilRef.current = Date.now() + Math.max(1, seconds) * 1000;
        }
        // 非成功狀態拋出本專案中文訊息，交由 catch 顯示；不在這裡自動重送。
        if (!response.ok) throw new Error(data.message || data.error || '地點搜尋暫時無法使用，請稍後再試。');
        if (requestId === requestIdRef.current && !controller.signal.aborted) setSuggestions(data.suggestions || []);
      } catch (error) {
        // 取消與過期都屬於正常收尾，不要把它們當作錯誤提示給使用者。
        if (requestId !== requestIdRef.current || controller.signal.aborted) return;
        setErrorMessage(error instanceof Error && !(error instanceof SyntaxError) && !(error instanceof TypeError) ? error.message : '地點搜尋連線失敗，請稍後再試。');
      } finally {
        // 舊請求結束時，不可關閉較新請求的「搜尋中」提示。
        if (requestId === requestIdRef.current && !controller.signal.aborted) setIsLoading(false);
      }
    }, 800);
    timerRef.current = timer;
    // 下次 Effect 或元件卸載時執行；同時取消尚未送出的計時器及已開始等待的 fetch。
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, latitude, longitude, isComposing]);

  // 這裡只通知父元件選取，真正的詳情查詢與行程位置更新由行程頁決定。
  const handleSuggestionSelect = (item: Suggestion, event: MouseEvent<HTMLButtonElement>) => {
    const id = item.placePrediction.placeId;
    // 同一建議在兩秒內的重複點擊不再觸發詳情查詢。
    // event.timeStamp 是事件時間，與上次事件相減；不要拿它和 Date.now() 的絕對時間混算。
    if (selectedRef.current.id === id && event.timeStamp - selectedRef.current.time < 2000) return;
    selectedRef.current = { id, time: event.timeStamp };
    suppressSuggestionsRef.current = true;
    stopSuggestions();
    onChange(item.placePrediction.text?.text || '');
    onPlaceSelect(id);
  };

  return (
    <div className="relative w-full">
      <input
        type="text" value={value} maxLength={100} aria-label="搜尋地點"
        onCompositionStart={() => { stopSuggestions(); setIsComposing(true); }}
        onCompositionEnd={() => setIsComposing(false)}
        onChange={(event) => {
          stopSuggestions();
          // 使用者重新打字才解除抑制；程式選取建議造成的名稱更新不會走這個事件。
          suppressSuggestionsRef.current = false;
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          // 輸入法的 Enter 是確認選字，不是送出搜尋。
          if (event.key !== 'Enter' || event.nativeEvent.isComposing || isComposing) return;
          event.preventDefault();
          // 長按 Enter 的重複 keydown 不再觸發完整搜尋，父元件還有另一層請求中鎖定。
          if (event.repeat) return;
          if (value.trim().length < 2) { setErrorMessage('請輸入至少 2 個字搜尋地點。'); return; }
          suppressSuggestionsRef.current = true;
          stopSuggestions();
          // ?. 表示父元件沒提供此回呼時略過，不會因 undefined 而呼叫失敗。
          onKeywordSearch?.(value.trim());
        }}
        placeholder="輸入至少 2 個字，或按 Enter 搜尋"
        className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#F04D79] bg-white"
      />
      {suggestions.length > 0 && (
        <ul className="relative w-full bg-white border border-slate-200 rounded-md mt-1 z-50 shadow-lg max-h-60 overflow-y-auto list-none p-0 m-0">
          {suggestions.map((item) => (
            <li key={item.placePrediction.placeId}>
              <button type="button" onClick={(event) => handleSuggestionSelect(item, event)}
                className="w-full text-left px-4 py-2 cursor-pointer hover:bg-pink-50 hover:text-[#F04D79] text-sm text-slate-600 border-b border-slate-50">
                {item.placePrediction.text?.text}
              </button>
            </li>
          ))}
        </ul>
      )}
      {isLoading && !errorMessage && <p className="mt-1 text-xs text-slate-400" role="status">搜尋中…</p>}
      {errorMessage && <p className="mt-1 text-xs text-red-500 break-words" role="alert">{errorMessage}</p>}
    </div>
  );
}
