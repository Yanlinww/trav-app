// 前後端共用同一份縣市清單，避免選單與 PHP 的允許值不同。
import regionGroups from '../../backend/trav-api/destinations/taiwan_regions.json';

export const publicDestinationGroups = regionGroups;
export const publicDestinations: string[] = Object.values(regionGroups).flat();
const cityNames = new Set(['台北', '新北', '基隆', '桃園', '台中', '台南', '高雄']);

/** 空值表示選填；null 表示不接受的自由文字。新竹、嘉義保留縣市區別，不自行猜測。 */
export function normalizePublicLocation(value: unknown): string | null {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return null;
  const clean = value.trim().replace(/臺/g, '台');
  if (!clean || publicDestinations.includes(clean)) return clean;
  // 相容「臺中市」「宜蘭縣」等完整名稱，儲存與篩選仍使用選單的固定名稱。
  const shortName = clean.replace(/[縣市]$/u, '');
  const officialName = `${shortName}${cityNames.has(shortName) ? '市' : '縣'}`;
  return !/[縣市]$/u.test(shortName) && clean === officialName && publicDestinations.includes(shortName) ? shortName : null;
}
