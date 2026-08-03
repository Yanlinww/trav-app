'use client';
import { useState, useEffect } from 'react';

// 👇 1. 新增 TypeScript 介面定義，明確告訴系統這個元件接受哪些屬性
interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (placeId: string) => void;
  onKeywordSearch?: (keyword: string) => void;
  locationBias?: { lat: number; lng: number };
}

// 👇 2. 將介面 (PlaceAutocompleteProps) 綁定到元件的參數上
export default function PlaceAutocomplete({ 
  value, 
  onChange, 
  onPlaceSelect, 
  onKeywordSearch,
  locationBias,
}: PlaceAutocompleteProps) {
  // 加上 <any[]> 避免 TypeScript 陣列型別報錯
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const selectSuggestion = (item: any) => {
    const prediction = item.placePrediction;
    if (!prediction?.placeId) return;
    onChange(prediction.text?.text || '');
    setSuggestions([]);
    onPlaceSelect(prediction.placeId);
  };

  useEffect(() => {
    if (!value) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setErrorMessage('');
        const res = await fetch('/api/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: value, locationBias }),
        });
        const contentType = res.headers.get('content-type') || '';
        const responseText = await res.text();

        if (!contentType.includes('application/json')) {
          throw new Error(`Autocomplete API ${res.status}: ${responseText.slice(0, 180)}`);
        }

        const data = JSON.parse(responseText);
        if (!res.ok) {
          throw new Error(`Autocomplete API ${res.status}: ${data.message || data.error || 'request failed'}`);
        }

        setSuggestions(data.suggestions || []);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Autocomplete request failed';
        setErrorMessage(message);
        console.error("Autocomplete fetch error:", error);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [value]);

  return (
    <div className="relative w-full">
      {/* 補齊 Tailwind CSS 邊框與 Focus 狀態 */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestions.length > 0) {
              selectSuggestion(suggestions[0]);
            } else if (onKeywordSearch) {
              onKeywordSearch(value);
            }
            setSuggestions([]); // 關閉下拉選單
          }
        }}
        placeholder="搜尋地點 或 輸入關鍵字按 Enter"
        // 👇 必須包含這行定義邊框與背景顏色的類別
        className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#F04D79] bg-white"
      />

      {suggestions.length > 0 && (
        <ul className="relative w-full bg-white border border-slate-200 rounded-md mt-1 z-50 shadow-lg max-h-60 overflow-y-auto list-none p-0 m-0">
          {suggestions.map((item) => (
            <li
              key={item.placePrediction.placeId}
              onMouseDown={(event) => {
                event.preventDefault();
                // 1. 將輸入框更新為完整的地點名稱
                onChange(item.placePrediction.text.text);
                // 2. 清空選單
                setSuggestions([]);
                // 3. 呼叫後端取得座標
                onPlaceSelect(item.placePrediction.placeId);
              }}
              className="px-4 py-2 cursor-pointer hover:bg-pink-50 hover:text-[#F04D79] text-sm text-slate-600 border-b border-slate-50 last:border-none"
            >
              {item.placePrediction.text.text}
            </li>
          ))}
        </ul>
      )}

      {errorMessage && (
        <p className="mt-1 text-xs text-red-500 break-words" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
