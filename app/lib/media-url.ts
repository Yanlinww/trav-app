/**
 * 將圖片/媒體網址進行正規化處理
 * - 將舊資料或快取中殘留的 localhost / 127.0.0.1 網址轉換為同源代理路徑
 * - 確保外部圖片、blob 預覽及 data URL 等特殊格式保持原樣
 * 
 * @param src - 原始的圖片網址（可為字串、null 或 undefined）
 * @returns 處理後的網址，或維持原樣回傳
 */
export function normalizeMediaUrl(src?: string | null): string | null | undefined {
  // 1. 空值防禦：若網址不存在（null、undefined、空字串），直接回傳原值
  if (!src) return src;

  // 2. 攔截並解析寫死在本地的絕對網址
  // 支援 http/https、localhost 或 127.0.0.1、可選的 Port 埠號、以及選填的 /backend/ 前綴，最後抓取 uploads/ 後面的路徑
  const localUpload = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/(?:backend\/)?(uploads\/.*)$/i.exec(src);
  if (localUpload) {
    // 轉換為標準的同源代理路徑（例如：/backend/uploads/...）
    return `/backend/${localUpload[1]}`;
  }

  // 3. 處理已經是相對路徑、但開頭可能帶有或不帶斜線的 uploads 檔案
  if (/^\/?uploads\//.test(src)) {
    // 去除開頭多餘的斜線，並統一補上 /backend/ 前綴
    return `/backend/${src.replace(/^\//, '')}`;
  }

  // 4. 其他類型的網址（例如外部圖床、blob 暫存預覽、data:image Base64 編碼等）保持原樣回傳
  return src;
}