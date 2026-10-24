import { placesCoordinates, placesError, readPlacesBody, requestGooglePlaces } from '../../lib/places-request-guard';

/**
 * POST /api/autocomplete：由 PlaceAutocomplete.tsx 在停止輸入後呼叫。
 * 請求：{ input: 搜尋文字, locationBias?: { lat: 緯度, lng: 經度 } }。
 * 成功回應：{ suggestions: [{ placePrediction: { placeId, text } }] }。
 * 此階段只需要名稱與 ID，不查照片、營業時間等詳情；點選後再由行程頁補齊。
 */
export async function POST(request) {
  // 先由共用工具驗證 JSON 物件與 4 KiB 內文上限；失敗直接回 400，不消耗 Google 次數。
  let body;
  try { body = await readPlacesBody(request); }
  catch (error) { return placesError(error.message); }
  // 正規化前先檢查型別，避免數字／物件直接呼叫 trim 造成例外。
  // 去掉頭尾空白可讓同一份查詢形成相同的合併鍵值；長度以 JavaScript 字串 length 計算。
  const input = typeof body.input === 'string' ? body.input.trim() : '';
  if (input.length < 2 || input.length > 100) return placesError('請輸入 2 至 100 個字搜尋地點。');
  // 偏好位置可省略；若有提供，先確認是物件，再檢查兩個座標的型別與範圍。
  let center;
  try {
    if (body.locationBias != null && (typeof body.locationBias !== 'object' || Array.isArray(body.locationBias))) throw new Error('搜尋位置格式錯誤。');
    center = placesCoordinates(body.locationBias?.lat, body.locationBias?.lng);
  } catch (error) { return placesError(error.message); }
  // 優先使用伺服器專用金鑰，未設定才沿用既有公開金鑰；不在 JSON 回應中傳出金鑰。
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return placesError('地圖服務尚未設定，請聯絡管理者。', 503, 'MAPS_NOT_CONFIGURED');
  // payload 同時作為送往 Google 的內文與請求合併條件，避免不同位置偏好被錯誤合併。
  // includedRegionCodes 限定台灣；languageCode 要求繁體中文顯示文字。
  // 30000 的單位是公尺，代表以中心點周圍約 30 公里作為排序偏好，並非嚴格邊界。
  const payload = {
    input, includedRegionCodes: ['tw'], languageCode: 'zh-TW',
    ...(center ? { locationBias: { circle: { center, radius: 30000 } } } : {}),
  };
  // 所有真正送往 Google 的請求均經共用保護工具；此處不另寫一套頻率計數。
  // FieldMask 只要求 placePrediction 的 ID 與文字，對應前端建議選單需要的欄位。
  return requestGooglePlaces('autocomplete', payload, 'https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
    }, body: JSON.stringify(payload),
  }, (data) => ({
    // 先排除沒有 placeId 的資料；findIndex 只保留該 ID 第一次出現的位置。
    // 因為前端用 placeId 當列表 key，去重可避免相同地點產生重複 key 與重複選項。
    // 外層仍保留 suggestions 欄位，與元件原有的回應格式一致。
    suggestions: (data.suggestions || []).filter((item, index, list) => item.placePrediction?.placeId
      && list.findIndex((candidate) => candidate.placePrediction?.placeId === item.placePrediction.placeId) === index),
  }));
}
