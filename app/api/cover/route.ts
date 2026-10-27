import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { NextRequest } from 'next/server';

// GET /api/cover?file=檔名：由 Next.js 讀取本機封面檔案，需使用支援 fs 的 Node.js 執行環境。
export const runtime = 'nodejs';
// 每次請求即時讀檔，不將路由預先產生成靜態回應。
export const dynamic = 'force-dynamic';

// 僅從固定封面目錄讀取；白名單不接受路徑分隔符，避免請求任意目錄。
const coverDirectory = path.join(process.cwd(), 'backend', 'trav-api', 'uploads', 'covers');
// 首字須為英數，後續只接受英數、點、底線與連字號；副檔名限圖片格式，i 表示不分大小寫。
// 這是檔名／副檔名白名單，不是重新解碼圖片來驗證實際檔案內容。
const coverFilePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:avif|jpe?g|png|webp)$/i;

// 依副檔名指定圖片 MIME，讓瀏覽器按圖片解析，而非直接顯示檔案位元組。
const contentTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// 先驗證檔名，再組合路徑；非法檔名與所有讀檔錯誤皆回 404。
export async function GET(request: NextRequest) {
  // 從查詢字串取 file；缺少時用空字串，與不合規檔名一起回 404，不進行檔案讀取。
  const fileName = request.nextUrl.searchParams.get('file') || '';
  if (!coverFilePattern.test(fileName)) return new Response('Not found', { status: 404 });

  // 使用執行時工作目錄下的固定 uploads/covers，部署時也必須能存取同一份封面檔案。
  const coverPath = path.join(coverDirectory, fileName);
  try {
    // 讀取完整檔案至記憶體；不是轉址到 PHP，也不是從 Google 等外部服務下載圖片。
    const file = await fs.readFile(coverPath);
    // 使用副檔名而非 URL 大小寫查表；圖片內容不轉 JSON，會原樣作為回應內文。
    const extension = path.extname(fileName).toLowerCase();
    // 回傳圖片二進位；禁止保存回應快取，避免更新封面後仍取得舊圖片。
    return new Response(new Uint8Array(file), {
      headers: {
        // 先將副檔名轉小寫再查 MIME 表；未知時有通用二進位備援。
        'Content-Type': contentTypes[extension] || 'application/octet-stream',
        // private／no-store 等控制快取，不等於在此驗證會員身分或封面擁有權。
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch {
    // 檔案不存在、權限不足或其他讀取失敗都採相同回應，不向瀏覽器揭露本機路徑與例外。
    return new Response('Not found', { status: 404 });
  }
}
