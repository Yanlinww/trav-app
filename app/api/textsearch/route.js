import { placesCoordinates, placesError, readPlacesBody, requestGooglePlaces } from '../../lib/places-request-guard';

/**
 * POST /api/textsearch：由行程頁 handleKeywordSearch 在按 Enter 後呼叫。
 * 請求：{ query: 搜尋文字, lat?: 緯度, lng?: 經度 }。
 * 成功回應：{ places: [...] }；行程頁將結果畫成候選標記，不會因此寫入資料庫。
 * 與 autocomplete 的差別：這裡取得完整候選列表，不是輸入框的名稱建議。
 */
export async function POST(request) {
  // 先由共用工具驗證 JSON 物件與 4 KiB 內文上限；失敗直接回 400，不消耗 Google 次數。
  let body;
  try { body = await readPlacesBody(request); }
  catch (error) { return placesError(error.message); }
  // 防止空白、非字串與過長關鍵字；條件不符時在呼叫 Google 前返回中文錯誤。
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (query.length < 2 || query.length > 100) return placesError('請輸入 2 至 100 個字搜尋地點。');
  // 前端傳 lat／lng，共用工具轉成 Google 欄位 latitude／longitude；皆未填時不限制偏好。
  let center;
  try { center = placesCoordinates(body.lat, body.lng); }
  catch (error) { return placesError(error.message); }
  // 優先使用伺服器專用金鑰，未設定才沿用既有公開金鑰；不在 JSON 回應中傳出金鑰。
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return placesError('地圖服務尚未設定，請聯絡管理者。', 503, 'MAPS_NOT_CONFIGURED');
  // 最多讀 10 筆候選，以免一次搜尋載入過多結果。
  // regionCode 是地區設定，languageCode 是回傳語系；位置偏好採中心周圍 5000 公尺。
  const payload = {
    textQuery: query, languageCode: 'zh-TW', regionCode: 'TW', maxResultCount: 10,
    ...(center ? { locationBias: { circle: { center, radius: 5000 } } } : {}),
  };
  // payload 包含關鍵字及偏好位置，所以相同字詞但不同中心點不會合併成同一份請求。
  return requestGooglePlaces('textsearch', payload, 'https://places.googleapis.com/v1/places:searchText', {
    method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey,
      // 保留候選卡片既有欄位；照片與營業時間留待點選後讀取。
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.rating,places.types,places.priceLevel',
    }, body: JSON.stringify(payload),
  // Google 沒有 places 時統一回空陣列，讓前端進入「找不到符合條件」的既有分支。
  }, (data) => ({ places: data.places || [] }));
}
