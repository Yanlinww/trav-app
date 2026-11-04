"use client";

import { useEffect, useState } from "react";
import { Cloud, Droplets, RefreshCw, Thermometer, Wind } from "lucide-react";
import { WEATHER_CITIES, type CurrentWeather } from "../lib/weather";

// 結果附帶城市識別碼；成功保存天氣，失敗保存訊息，尚未取得結果則以 null 表示。
interface WeatherResult {
  cityId: string;
  weather: CurrentWeather | null;
  error: string | null;
}

/** 首頁天氣獨立載入，外部服務失敗不阻擋其他首頁功能。 */
export function WeatherWidget() {
  // 預設台北；revision 是手動重試的觸發值，不是天氣資料的版本號。
  const [cityId, setCityId] = useState<string>("taipei");
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<WeatherResult | null>(null);
  // 從第一個城市開始，逐筆尋找選取的城市，不使用 find 或非空斷言簡寫。
  let city = WEATHER_CITIES[0];
  for (let index = 0; index < WEATHER_CITIES.length; index = index + 1) {
    if (WEATHER_CITIES[index].id === cityId) {
      city = WEATHER_CITIES[index];
      break;
    }
  }
  // 切換城市時立即隱藏前一個城市的數值，避免新地名搭配舊天氣。
  let current: WeatherResult | null = null;
  if (result !== null) {
    if (result.cityId === cityId) {
      current = result;
    }
  }

  useEffect(function () {
    // stopped 記錄是否已離開這一輪查詢；inFlight 避免同時送出重複請求。
    let stopped = false;
    let inFlight = false;
    let activeController: AbortController | null = null;

    async function loadWeather() {
      if (inFlight === true) {
        return;
      }
      inFlight = true;
      const controller = new AbortController();
      activeController = controller;

      // 等待超過十五秒就取消這次請求；每次查詢使用自己的計時器。
      function cancelSlowRequest() {
        controller.abort();
      }
      const timeout = window.setTimeout(cancelSlowRequest, 15000);
      try {
        // 經 /backend 代理呼叫 PHP；前端只處理互動，查詢與檔案快取都在 PHP 執行。
        // 離開元件或等待超過 15 秒就取消前端等待，不直接連線外部天氣服務。
        const url = "/backend/weather.php?city=" + encodeURIComponent(cityId);
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok === false) {
          throw new Error("天氣讀取失敗");
        }
        // 數值與中文描述由 PHP 驗證／產生；前端再確認城市與資料存在。
        const body = await response.json();
        if (body.cityId !== cityId) {
          throw new Error("天氣回應城市不符");
        }
        if (!body.weather) {
          throw new Error("天氣回應缺少資料");
        }
        if (stopped === false) {
          setResult({
            cityId: cityId,
            weather: body.weather,
            error: null,
          });
        }
      } catch {
        // 主動取消屬於正常換城市流程，不顯示錯誤；其他失敗清除舊數值並提供重試入口。
        if (stopped === false) {
          setResult({
            cityId: cityId,
            weather: null,
            error: "暫時無法取得天氣，請稍後重試。",
          });
        }
      } finally {
        // 成功或失敗都停止逾時計時器，並允許下一次更新。
        window.clearTimeout(timeout);
        activeController = null;
        inFlight = false;
      }
    }

    loadWeather();
    const timer = window.setInterval(loadWeather, 600000);

    // React 在切換城市或離開頁面時呼叫這個清理函式，避免舊資料覆蓋新的選擇。
    function stopWeatherUpdates() {
      stopped = true;
      window.clearInterval(timer);
      if (activeController !== null) {
        activeController.abort();
      }
    }
    return stopWeatherUpdates;
  }, [cityId, revision]);

  // 清空結果立即顯示載入提示，遞增 revision 使 Effect 清理舊請求並重新查詢。
  function refresh() {
    setResult(null);
    setRevision(function (previousRevision) {
      return previousRevision + 1;
    });
  }

  function changeCity(event: React.ChangeEvent<HTMLSelectElement>) {
    setCityId(event.target.value);
  }

  // 逐筆建立選單項目；JSX 只顯示已準備好的內容，不放入箭頭函式或 map。
  const cityOptions = [];
  for (let index = 0; index < WEATHER_CITIES.length; index = index + 1) {
    const optionCity = WEATHER_CITIES[index];
    cityOptions.push(<option key={optionCity.id} value={optionCity.id}>{optionCity.name}</option>);
  }

  const isLoading = current === null;
  // 先決定按鈕文字與時間說明，再交給 JSX 顯示，避免在版面中嵌套條件運算。
  let refreshLabel = "更新";
  if (current && current.error) {
    refreshLabel = "重試";
  }

  let timeLabel = "每 10 分鐘自動更新";
  if (current && current.weather) {
    const formattedTime = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(current.weather.dataTime);
    timeLabel = "資料時間：" + formattedTime + "（台灣時間）";
  }

  return (
    <section aria-labelledby="weather-title" className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <div className="rounded-3xl border border-[#dedfd5] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-[#6c7b6a]">BEFORE YOU GO</p>
            <h2 id="weather-title" className="text-2xl font-bold">出發前，看看天氣</h2>
            <p className="mt-2 text-sm text-[#6c756d]">掌握目的地目前天氣，安排今天的小旅行。</p>
          </div>
          {/* label 與選單 ID 關聯供輔助工具辨識；載入時停用更新按鈕，避免連續重送。 */}
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="weather-city" className="text-sm font-medium">城市</label>
            <select id="weather-city" value={cityId} onChange={changeCity} className="min-h-11 rounded-xl border border-[#dedfd5] bg-[#f7f5ef] px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#52705f]">
              {cityOptions}
            </select>
            <button type="button" onClick={refresh} disabled={isLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dedfd5] px-3 text-sm hover:bg-[#f7f5ef] disabled:opacity-50">
              <RefreshCw size={15} aria-hidden="true" />{refreshLabel}
            </button>
          </div>
        </div>
        {/* 載入、錯誤、成功三種狀態互斥；aria-live 通知資料變化，aria-busy 表示尚在等待。
            預留最小高度減少載入時版面跳動；成功後依螢幕寬度排列為一、二或四欄。 */}
        <div aria-live="polite" aria-busy={isLoading} className="mt-6 min-h-32">
          <WeatherContent current={current} cityName={city.name} />
        </div>
        {/* 標示上游資料時間而非下載時間，並明確區分模型估算與測站觀測。 */}
        <div className="flex flex-wrap justify-between gap-2 border-t border-[#eeeee5] pt-4 text-xs leading-6 text-[#6c756d]">
          <p>{timeLabel}</p>
          <p>城市中心模型估算・資料來源：<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Open-Meteo</a></p>
        </div>
      </div>
    </section>
  );
}

// 依序判斷載入、錯誤與成功，每個分支直接回傳畫面，避免巢狀三元運算子。
// 此元件只負責呈現，不新增請求或狀態，更新流程仍由 WeatherWidget 統一管理。
interface WeatherContentProps {
  current: WeatherResult | null;
  cityName: string;
}

function WeatherContent(props: WeatherContentProps) {
  const current = props.current;
  const cityName = props.cityName;
  if (current === null) {
    return <p role="status" className="py-8 text-sm text-[#6c756d]">正在取得{cityName}天氣…</p>;
  } else if (current.error) {
    return <p role="alert" className="rounded-xl bg-amber-50 p-5 text-sm text-amber-900">{cityName}：{current.error}</p>;
  } else if (!current.weather) {
    // 保留原本沒有錯誤也沒有數值時不顯示資料的行為，不自行填入假數值。
    return null;
  } else {
    const weather = current.weather;
    return (
      <div className="grid items-center gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* 雲朵僅為裝飾，實際天氣以中文描述為準；溫度取整數，風速保留一位小數。 */}
        <div className="flex items-center gap-4">
          <Cloud size={36} aria-hidden="true" className="shrink-0 text-[#b85f40]" />
          <div><p className="text-sm font-medium">{cityName}・{weather.description}</p><p className="mt-1 text-4xl font-bold tabular-nums">{Math.round(weather.temperature)}<span className="ml-1 text-xl">°C</span></p></div>
        </div>
        <WeatherMetric icon={<Thermometer size={18} />} label="體感溫度" value={Math.round(weather.feelsLike) + " °C"} />
        <WeatherMetric icon={<Droplets size={18} />} label="相對濕度" value={Math.round(weather.humidity) + " %"} />
        <WeatherMetric icon={<Wind size={18} />} label="風速" value={weather.windSpeed.toFixed(1) + " km/h"} />
      </div>
    );
  }
}

// 重複數值區塊共用同一版型，維持手機換行與文字層級一致。
interface WeatherMetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function WeatherMetric(props: WeatherMetricProps) {
  return (
    <div className="rounded-2xl bg-[#f7f5ef] p-4">
      <p className="flex items-center gap-2 text-xs text-[#6c756d]">
        <span aria-hidden="true">{props.icon}</span>
        {props.label}
      </p>
      <p className="mt-2 text-xl font-bold tabular-nums">{props.value}</p>
    </div>
  );
}
