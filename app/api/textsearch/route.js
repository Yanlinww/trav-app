// app/api/textsearch/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { query, lat, lng } = await request.json();

    if (!query) {
      return NextResponse.json({ places: [] }, { status: 400 });
    }

    const requestBody = {
      textQuery: query.trim(),
      languageCode: 'zh-TW',
      regionCode: 'TW',
      maxResultCount: 10,
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
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        // 新增 places.formattedAddress (完整地址) 與 places.rating (星級評分)
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.rating,places.types,places.priceLevel',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Google API Error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ places: data.places || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
