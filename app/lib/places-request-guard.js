/**
 * Google Places 的伺服器共用保護：送出 Google 請求前先檢查頻率，
 * 同時查詢相同內容則共用進行中的請求，完成後立即移除，不保存地點資料快取。
 *
 * 這是單一 Node.js 程序內的全站共用上限，不是每位使用者各有一份。
 * 不採用可偽造的前端帳號或 IP 標頭。重啟會重置，多個執行個體不共用計數；
 * 不能代替 Google 控制台每日配額，也不能保證零費用。
 */
// 下列三個常數集中管理頻率與併發；改這裡不會修改 Google 控制台的每日配額。
// 60_000 是 JavaScript 的數字分隔寫法，數值為 60000 毫秒，也就是 60 秒。
const WINDOW_MS = 60_000;
// 四種服務加總最多 30 次；分類上限仍會另外檢查，兩種限制必須同時通過。
const TOTAL_PER_MINUTE = 30;
// 計算的是「不同查詢」等待中的數量；相同查詢共用 Promise，不另佔一個名額。
const MAX_IN_FLIGHT = 4;
// 各項是每分鐘最多送往 Google 的次數，不是每日配額或免費用量。
const SERVICE_LIMITS = { autocomplete: 20, textsearch: 10, placedetails: 10, placephoto: 10 };
// Symbol.for 會在目前執行環境取得同名 Symbol，避免不同路由各建一份互不相干的狀態。
// v1 是本工具的狀態識別版本；這個 Symbol 不是金鑰，也不是會員識別。
const STATE_KEY = Symbol.for('trav-app.places-request-guard.v1');
function state() {
  // globalThis 讓同一程序內的四個 API 共用狀態；不把計數放在前端儲存空間。
  // ??= 表示只有原值為 null／undefined 時才建立物件，後續呼叫沿用原本狀態。
  // calls：已送出的 { time, service } 紀錄，只保留最近 60 秒，用來計算頻率。
  // pending：以查詢鍵值對應尚未完成的 Promise，實現同時查詢合併。
  // blockedUntil：Google 回報 429 後的冷卻截止時間，單位為 Unix 毫秒；0 表示未冷卻。
  return globalThis[STATE_KEY] ??= { calls: [], pending: new Map(), blockedUntil: 0 };
}
/**
 * 建立所有 Places API 共用的中文錯誤回應。
 * @param {string} message 給使用者看的中文說明，不帶 Google 原始錯誤或金鑰。
 * @param {number} status HTTP 狀態碼；預設 400 代表呼叫者送入的資料有誤。
 * @param {string} code 給程式判斷的固定代碼，與顯示給人的中文分開。
 * @param {number} retryAfter 建議等待秒數；大於 0 時才加入 Retry-After 標頭。
 * suggestions／places 皆回空陣列，讓不同搜尋元件都能安全讀取既有欄位。
 */
export function placesError(message, status = 400, code = 'INVALID_REQUEST', retryAfter = 0) {
  return Response.json({ error: message, message, code, suggestions: [], places: [] }, {
    status, headers: {
      // private 不允許共用代理保存；no-store 要求不把錯誤回應存成快取。
      'Cache-Control': 'private, no-store',
      ...(retryAfter > 0 ? { 'Retry-After': String(retryAfter) } : {}),
    },
  });
}
/**
 * 串流讀取最多 4 KiB 的 JSON，未提供 Content-Length 的請求也受限。
 * 非 JSON、陣列、null 與過大內容，都在送往 Google 前拒絕。
 */
export async function readPlacesBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('請提供搜尋資料。');
  // value 是每次讀到的 Uint8Array；先累積片段，完成後才組成完整 UTF-8 JSON。
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // byteLength 計算位元組，不是字數；中文字通常占多個 UTF-8 位元組。
      length += value.byteLength;
      if (length > 4096) {
        // 超過上限立即停止讀取剩餘內文，不必等大型請求完整傳完才拒絕。
        await reader.cancel();
        throw new Error('搜尋資料過長，請縮短後再試。');
      }
      chunks.push(value);
    }
  // 成功或失敗都釋放串流讀取鎖；releaseLock 本身不代表資料已成功解析。
  } finally { reader.releaseLock(); }
  // 依片段原順序拷貝，避免直接逐段解碼把跨片段的中文字元拆壞。
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error('搜尋資料格式錯誤，請重新操作。'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('搜尋資料必須是 JSON 物件。');
  return body;
}
/**
 * 把前端 { lat, lng } 轉為 Google 需要的 { latitude, longitude }。
 * 兩者皆未提供時回傳 null，表示不加位置偏好；只提供一個則驗證失敗。
 * 經度有效範圍為 -180 至 180，緯度為 -90 至 90；不接受字串、NaN 或 Infinity。
 * 此處不用 if (lat && lng)，因為 0 是合法座標，不應被當成未填寫。
 */
export function placesCoordinates(lat, lng) {
  if (lat == null && lng == null) return null;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)
    || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('搜尋位置的經緯度無效。');
  return { latitude: lat, longitude: lng };
}
/**
 * 四個 route.js 共用的實際外部請求入口，回傳可直接交給瀏覽器的 Response。
 * @param {string} service 服務分類，須對應 SERVICE_LIMITS 的其中一個鍵。
 * @param {*} signature 已驗證且正規化的查詢條件；相同服務與條件才合併。
 * @param {string} url Google 端點，只由伺服器程式組合，不直接接受訪客的任意 URL。
 * @param {object} options fetch 的方法、標頭與內文；本工具會另外指定不快取及逾時。
 * @param {Function} transform JSON 成功結果的轉換函式；預設原樣回傳。
 * @param {boolean} photo 為 true 時改讀取圖片二進位，不執行 JSON 轉換。
 * signature 只包含已驗證的查詢條件，不包含金鑰。
 * 相同進行中請求先合併，不另扣次數；新請求才檢查總上限、分類上限及同時連線數。
 * 檢查與扣次數之間沒有 await，避免非同步呼叫同時搶到最後一個名額。
 */
export async function requestGooglePlaces(service, signature, url, options, transform = (data) => data, photo = false) {
  if (!Object.hasOwn(SERVICE_LIMITS, service)) throw new Error('未知的地點服務。');
  const current = state();
  const now = Date.now();
  // 同樣字串用在不同服務不會互相合併；JSON.stringify 讓物件條件也能形成字串鍵值。
  const key = service + ':' + JSON.stringify(signature);
  // 滑動視窗：每次從「現在」往回看 60 秒，剛好滿 60 秒的舊紀錄便移除。
  // 因此不是固定整分鐘歸零，也不是按照台灣日期換日。
  current.calls = current.calls.filter((call) => now - call.time < WINDOW_MS);
  // Google 冷卻優先於請求合併與名額檢查；時間未到就直接回 429，不呼叫 fetch。
  if (now < current.blockedUntil) return placesError('Google 地點服務用量暫時受限，請稍後再試。', 429, 'GOOGLE_RATE_LIMIT', Math.ceil((current.blockedUntil - now) / 1000));
  const existing = current.pending.get(key);
  // Response 內文只能讀一次，每個等待者拿 clone，避免互相讀走資料。
  if (existing) return (await existing).clone();
  // calls 是全站已送出的紀錄；serviceCalls 另取出目前這一種服務，實施分類上限。
  const serviceCalls = current.calls.filter((call) => call.service === service);
  if (current.calls.length >= TOTAL_PER_MINUTE || serviceCalls.length >= SERVICE_LIMITS[service]) {
    // 找出造成這次拒絕的最舊紀錄，估算至少要等多久才會有名額。
    // Retry-After 是建議最早重試時間；其他人可能先使用名額，因此不是成功保證。
    const oldest = current.calls.length >= TOTAL_PER_MINUTE ? current.calls[0] : serviceCalls[0];
    return placesError('地點查詢過於頻繁，請稍候再試。', 429, 'PLACES_RATE_LIMIT', Math.max(1, Math.ceil((oldest.time + WINDOW_MS - now) / 1000)));
  }
  if (current.pending.size >= MAX_IN_FLIGHT) return placesError('目前地點查詢較多，請稍候再試。', 429, 'PLACES_BUSY', 2);
  // 失敗也不退回次數，避免網路或 Google 異常時無限重試；本工具不會自動重試。
  current.calls.push({ time: now, service });
  // 立即啟動非同步工作，取得 Promise 後立刻放進 pending，讓後來的相同查詢共用。
  const pending = (async () => {
    try {
      // ...options 保留路由設定，但後面的 cache／signal 會覆蓋同名值，統一使用 10 秒逾時。
      // 瀏覽器取消自己的請求，不會在這裡直接取消其他等待者共用的 Google 請求。
      const response = await fetch(url, { ...options, cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      if (!response.ok) {
        // Google 限流時全站冷卻一分鐘；不把含金鑰的網址或原始錯誤傳給前端。
        if (response.status === 429) current.blockedUntil = Date.now() + WINDOW_MS;
        // HTTP 非成功時不讀 Google 的錯誤內文，釋放串流並改送本專案的中文錯誤。
        await response.body?.cancel();
        return placesError(response.status === 429 ? 'Google 地點服務用量已達限制，請稍後再試。' : 'Google 地點服務暫時無法使用，請稍後再試。', response.status === 429 ? 429 : 502, 'GOOGLE_REQUEST_FAILED', response.status === 429 ? 60 : 0);
      }
      // 圖片要讀 arrayBuffer；JSON 要讀 json。兩者不可混用，也不能讀同一份內文兩次。
      if (photo) return new Response(await response.arrayBuffer(), { headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'private, no-store',
      } });
      // 各路由的 transform 只選出前端需要的格式，例如 { places: [...] }。
      return Response.json(transform(await response.json()), { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
      // AbortSignal 逾時與主動中止都視為逾時類錯誤，其餘連線／解析失敗回傳 502。
      const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      return placesError(timeout ? '地點查詢逾時，請稍後再試。' : '地點服務連線失敗，請稍後再試。', timeout ? 504 : 502, timeout ? 'PLACES_TIMEOUT' : 'PLACES_UNAVAILABLE');
    }
  })();
  // Map 只存「進行中」的結果，不在請求完成後保留地點內容當作長期快取。
  current.pending.set(key, pending);
  try { return (await pending).clone(); }
  // 無論成功、HTTP 錯誤或逾時，都移除該鍵值；下次新查詢需要重新通過頻率檢查。
  finally { current.pending.delete(key); }
}
