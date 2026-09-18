import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const coverDirectory = path.join(process.cwd(), 'backend', 'trav-api', 'uploads', 'covers');
const coverFilePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:avif|jpe?g|png|webp)$/i;

const contentTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function GET(request: NextRequest) {
  const fileName = request.nextUrl.searchParams.get('file') || '';
  if (!coverFilePattern.test(fileName)) return new Response('Not found', { status: 404 });

  const coverPath = path.join(coverDirectory, fileName);
  try {
    const file = await fs.readFile(coverPath);
    const extension = path.extname(fileName).toLowerCase();
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': contentTypes[extension] || 'application/octet-stream',
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
