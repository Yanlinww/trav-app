// app/api/placedetails/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { placeId } = body;

    // 1. 參數驗證：若無 placeId，直接阻斷並回傳 400
    if (!placeId) {
      return NextResponse.json(
        { error: 'Missing placeId in request body' }, 
        { status: 400 }
      );
    }

    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,location',
      },
    });

    const data = await response.json();

    // 2. HTTP 狀態碼驗證：攔截 Google API 回傳的 4xx 或 5xx 錯誤
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Google API Error', details: data }, 
        { status: response.status }
      );
    }

    return NextResponse.json(data);
    
  } catch (error) {
    // 僅捕捉網路斷線或 JSON 解析失敗等底層錯誤
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message }, 
      { status: 500 }
    );
  }
}