// 前端只保留選單與回應型別；座標、驗證、天氣判讀與快取都由 PHP 管理。
export const WEATHER_CITIES = [
  { id: "taipei", name: "台北" }, { id: "taoyuan", name: "桃園" },
  { id: "taichung", name: "台中" }, { id: "tainan", name: "台南" },
  { id: "kaohsiung", name: "高雄" }, { id: "yilan", name: "宜蘭" },
  { id: "hualien", name: "花蓮" }, { id: "taitung", name: "台東" },
];

// PHP 正規化後的顯示資料：溫度 °C、濕度 %、風速 km/h、時間 Unix 毫秒。
export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  code: number;
  description: string;
  isDay: boolean;
  dataTime: number;
}
