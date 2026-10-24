import { placesError, requestGooglePlaces } from '../../lib/places-request-guard';

/**
 * GET /api/placephoto?name=照片資源名稱：由行程頁的 img.src 載入。
 * name 取自地點詳情 photos[0].name，例如 places/{地點}/photos/{照片}。
 * 成功回應是圖片二進位，並非 JSON；失敗才回中文 JSON 錯誤。
 * 行程頁使用圖片 onError 顯示替代提示，不會自動重試而持續消耗配額。
 */
export async function GET(request) {
  // URL.searchParams 會解析瀏覽器傳入的編碼；前端使用 encodeURIComponent 包住完整 name。
  const resourceName = new URL(request.url).searchParams.get('name') || '';
  // 只接受 places/{地點}/photos/{照片}，拒絕額外路徑與查詢參數。
  // 限制 2048 字元並採字元白名單，避免訪客修改路徑或插入其他 Google 查詢參數。
  if (resourceName.length > 2048 || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(resourceName)) return placesError('照片識別碼無效，請重新選取地點。');
  // 實際帶金鑰的 Google 網址只在伺服器組合；瀏覽器 img.src 仍是本專案同源網址。
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return placesError('地圖服務尚未設定，請聯絡管理者。', 503, 'MAPS_NOT_CONFIGURED');
  // maxWidthPx=800 限制照片請求寬度；合併鍵值使用完整資源名稱。
  // 第五個參數 undefined 沿用預設 JSON 轉換函式，但第六個 true 會切換圖片分支，
  // 因此實際不執行 JSON 轉換，而是回傳 arrayBuffer 與圖片 Content-Type。
  return requestGooglePlaces('placephoto', resourceName,
    'https://places.googleapis.com/v1/' + resourceName + '/media?maxWidthPx=800&key=' + encodeURIComponent(apiKey),
    { method: 'GET' }, undefined, true);
}
