import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const input = body?.input;
    const locationBias = body?.locationBias;

    if (!input || typeof input !== 'string' || input.trim() === '') {
      return NextResponse.json({ suggestions: [] });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { suggestions: [], message: 'Google Maps API Key is missing' },
        { status: 500 }
      );
    }

    const requestBody = {
      input: input.trim(),
      includedRegionCodes: ['tw'],
      languageCode: 'zh-TW',
    };

    if (locationBias && Number.isFinite(Number(locationBias.lat)) && Number.isFinite(Number(locationBias.lng))) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: Number(locationBias.lat),
            longitude: Number(locationBias.lng),
          },
          radius: 30000,
        },
      };
    }

    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const googleStatus = data.error?.status || 'REQUEST_FAILED';
      const message = data.error?.message || 'Google Places API request failed';
      console.error('Google Places API Error:', googleStatus, message);
      return NextResponse.json(
        { suggestions: [], googleStatus, message },
        { status: response.status }
      );
    }

    const suggestions = (data.suggestions || [])
      .filter((item) => item.placePrediction?.placeId)
      .filter((item, index, list) => (
        list.findIndex((candidate) => (
          candidate.placePrediction.placeId === item.placePrediction.placeId
        )) === index
      ));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Autocomplete API error:', error);
    return NextResponse.json(
      { suggestions: [], message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
