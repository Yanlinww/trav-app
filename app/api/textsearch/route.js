// app/api/textsearch/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { query, lat, lng } = await request.json();

    if (!query) {
      return NextResponse.json({ places: [] }, { status: 400 });
    }

    const requestBody = {
      textQuery: query,
      // 若有傳入座標，則設定搜尋偏好區域為該座標方圓 5 公里
      ...(lat && lng && {
        locationBias: {
          circle: { center: { latitude: lat, longitude: lng }, radius: 5000.0 }
        }
      })
    };

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        // 嚴格限制欄位以控制成本
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Google API Error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}