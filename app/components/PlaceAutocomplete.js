'use client';
import { useState, useEffect } from 'react';

export default function PlaceAutocomplete({ value, onChange, onPlaceSelect, onKeywordSearch }) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!value) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch('/api/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: value }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch (error) {
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
            // 觸發父組件傳入的搜尋函式 (需先在 props 定義 onKeywordSearch)
            if (onKeywordSearch) onKeywordSearch(value);
            setSuggestions([]); // 關閉下拉選單
          }
        }}
        placeholder="搜尋地點 或 輸入關鍵字按 Enter"
        className="..."
      />

      {suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md mt-1 z-50 shadow-lg max-h-60 overflow-y-auto list-none p-0 m-0">
          {suggestions.map((item) => (
            <li
              key={item.placePrediction.placeId}
              onClick={() => {
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
    </div>
  );
}