import { placesError, readPlacesBody, requestGooglePlaces } from '../../lib/places-request-guard';

/**
 * POST /api/placedetails：行程頁選取建議、候選標記或 Google 內建景點時呼叫。
 * 請求：{ placeId: Google 地點識別碼 }。
 * 成功回應：Google 的地點詳情物件，包含座標、顯示名稱與選定的詳細欄位。
 * 此 API 只讀地點資訊；是否新增行程或更新既有位置，由呼叫它的行程頁另外處理。
 */
export async function POST(request) {
  // 先由共用工具驗證 JSON 物件與 4 KiB 內文上限；失敗直接回 400，不消耗 Google 次數。
  let body;
  try { body = await readPlacesBody(request); }
  catch (error) { return placesError(error.message); }
  // ID 必須是單一資源名稱，不接受斜線或查詢參數改寫 Google 網址。
  const placeId = typeof body.placeId === 'string' ? body.placeId.trim() : '';
  // 正規表示式的 ^／$ 要求整段 ID 都符合白名單，{1,256} 限制長度。
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(placeId)) return placesError('地點識別碼無效，請重新選取地點。');
  // 優先使用伺服器專用金鑰，未設定才沿用既有公開金鑰；不在 JSON 回應中傳出金鑰。
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return placesError('地圖服務尚未設定，請聯絡管理者。', 503, 'MAPS_NOT_CONFIGURED');
  // 同一 placeId 的進行中查詢可以合併；encodeURIComponent 再做網址區段編碼。
  // 這裡保留既有詳情欄位，不把它們搬到每次鍵入就查詢的 autocomplete。
  return requestGooglePlaces('placedetails', placeId, 'https://places.googleapis.com/v1/places/' + encodeURIComponent(placeId) + '?languageCode=zh-TW', {
    method: 'GET', headers: {
      'X-Goog-Api-Key': apiKey,
      // photos 提供照片資源名稱，實際圖片再走 /api/placephoto；不是把圖片內容放在 JSON。
      // currentOpeningHours 是目前營業資訊，regularOpeningHours 是一般每週營業時間。
      'X-Goog-FieldMask': 'id,displayName,location,formattedAddress,photos,regularOpeningHours,currentOpeningHours,rating,nationalPhoneNumber,websiteUri,googleMapsUri',
    },
  });
}
