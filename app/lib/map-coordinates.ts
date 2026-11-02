/**
 * PHP 的座標可能是數字、數字字串或 null，必須先排除空值才轉型。
 * Number(null)、Number('') 都會得到 0，若直接使用就會在赤道／本初子午線畫出假位置。
 * 真正的 0 座標仍有效；只有缺值、非有限數字或超出經緯度範圍才回傳 null。
 */
export function toMapPosition(latitude: unknown, longitude: unknown): { lat: number; lng: number } | null {
  const parseCoordinate = (value: unknown) => {
    if (typeof value !== 'number' && typeof value !== 'string') return NaN;
    if (typeof value === 'string' && !value.trim()) return NaN;
    return Number(value);
  };
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** 同一座標的多次造訪共用標記，保留各次序號與原項目，不移動真實位置或合併資料。 */
export function groupItineraryMapItems<T extends { Latitude?: unknown; Longitude?: unknown }>(items: T[]) {
  const groups = new Map<string, { position: { lat: number; lng: number }; visits: { item: T; number: number }[] }>();
  let number = 0;
  for (const item of items) {
    const position = toMapPosition(item.Latitude, item.Longitude);
    if (!position) continue;
    number++;
    // 六位小數約為十公分，吸收數字字串轉型差異，不把附近不同景點當成同一地點。
    const key = `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`;
    const group = groups.get(key) ?? { position, visits: [] };
    group.visits.push({ item, number });
    groups.set(key, group);
  }
  return [...groups.values()];
}
