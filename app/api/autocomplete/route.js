// app/api/autocomplete/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { input } = await request.json();

    if (!input) {
      return NextResponse.json({ suggestions: [] });
    }

    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
      },
      body: JSON.stringify({
        input: input,
        // 若旅遊應用程式有特定目標國家，可加入此參數以提高精準度
        // includedRegionCodes: ['JP', 'TW'], 
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}