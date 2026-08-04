import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const resourceName = String(url.searchParams.get('name') || '');
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!resourceName.startsWith('places/') || !apiKey) {
      return NextResponse.json({ error: 'Invalid photo request' }, { status: 400 });
    }

    const photoResponse = await fetch(
      `https://places.googleapis.com/v1/${resourceName}/media?maxWidthPx=800&key=${encodeURIComponent(apiKey)}`,
      { cache: 'no-store' },
    );

    if (!photoResponse.ok) {
      return NextResponse.json({ error: 'Google photo request failed' }, { status: photoResponse.status });
    }

    return new NextResponse(await photoResponse.arrayBuffer(), {
      status: 200,
      headers: {
        'Content-Type': photoResponse.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
