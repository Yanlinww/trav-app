'use client';

// ============================================================================
// 1. 引入必要的套件與 React Hooks
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleMap, Marker, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import { 
  Bookmark, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, 
  Copy, Eye, Globe2, Heart, Loader2, Map as MapIcon, MapPin, Pencil, 
  Search, Settings2, Share2, SlidersHorizontal, Sparkles, Upload, Users, X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ============================================================================
// 2. TypeScript 型別定義 (Types)
// 定義從後端接收到的資料結構，確保開發時不會打錯屬性名稱
// ============================================================================

/** 公開行程資料結構 */
type PublicItinerary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  description?: string | null;
  location?: string | null;
  copyCount: number;
  likeCount: number;
  viewCount: number;
  publishedAt?: string | null;
  isLiked: boolean;
  isSaved: boolean;
  itemCount: number;
  dayCount: number;
  owner: { account: string; name: string; avatar?: string | null };
};

/** 使用者擁有的個人行程 (用於準備公開上傳) */
type OwnedItinerary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage?: string | null;
  isPublic: boolean;
  publicTitle?: string | null;
  publicCoverImage?: string | null;
  publicDescription?: string | null;
  publicLocation?: string | null;
  itemCount: number;
  dayCount: number;
};

/** 預覽行程時的單一景點資料 */
type PreviewItem = {
  id: string;
  dayNumber: number;
  title: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  latitude: number | null;
  longitude: number | null;
};

/** 行程預覽的完整資料結構 (繼承 PublicItinerary，並替換/新增部分屬性) */
type ItineraryPreview = Omit<PublicItinerary, 'itemCount' | 'dayCount'> & { items: PreviewItem[] };

// ============================================================================
// 3. 全域常數與輔助函式 (Helpers)
// ============================================================================

// 當行程沒有設定封面時，使用的預設優美風景圖
const fallbackCover = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop';

// 篩選器選項設定
const durationFilterOptions = [
  { value: 'all', label: '不限天數' },
  { value: '1-2', label: '1–2 天' },
  { value: '3-4', label: '3–4 天' },
  { value: '5+', label: '5 天以上' },
];

const itinerarySortOptions = [
  { value: 'popular', label: '熱門' },
  { value: 'newest', label: '最新公開' },
  { value: 'copied', label: '最多複製' },
] as const;

type ItinerarySort = (typeof itinerarySortOptions)[number]['value'];

/**
 * 格式化與清理公開地點字串
 * 將 "台北 / 宜蘭 , 花蓮" 轉換為乾淨的 "台北・宜蘭・花蓮"
 */
function normalizePublicLocation(value?: string | null): string {
  if (!value) return '';
  const parts = value
    .replace(/臺/g, '台') // 統一正簡體
    .split(/[・|,，、/／>＞]+/u) // 根據各種可能的標點符號切割
    .map((part) => part.trim().replace(/\s+/g, ' ')) // 去除多餘空白
    .filter(Boolean); // 過濾掉空字串
  // 使用 Set 過濾重複地點，並限制最多回傳 4 個
  return Array.from(new Set(parts)).slice(0, 4).join('・');
}

/**
 * 行程排序邏輯
 */
function sortPublicItineraries(rows: PublicItinerary[], sort: ItinerarySort): PublicItinerary[] {
  return [...rows].sort((left, right) => {
    if (sort === 'newest') {
      return Date.parse(right.publishedAt || right.startDate || '1970-01-01') - Date.parse(left.publishedAt || left.startDate || '1970-01-01') || Number(right.id) - Number(left.id);
    }
    if (sort === 'copied') {
      return right.copyCount - left.copyCount || right.likeCount - left.likeCount || Number(right.id) - Number(left.id);
    }
    // 預設 (popular)：按讚數優先，其次瀏覽數，最後複製數
    return right.likeCount - left.likeCount || right.viewCount - left.viewCount || right.copyCount - left.copyCount || Number(right.id) - Number(left.id);
  });
}

/**
 * 行程篩選邏輯 (根據天數、地點、排序)
 */
function filterPublicItineraries(rows: PublicItinerary[], duration: string, sort: ItinerarySort, location = ''): PublicItinerary[] {
  return sortPublicItineraries(rows.filter((itinerary) => {
    if (location && normalizePublicLocation(itinerary.location) !== location) return false;
    if (duration === '1-2' && (itinerary.dayCount < 1 || itinerary.dayCount > 2)) return false;
    if (duration === '3-4' && (itinerary.dayCount < 3 || itinerary.dayCount > 4)) return false;
    if (duration === '5+' && itinerary.dayCount < 5) return false;
    return true;
  }), sort);
}

// ============================================================================
// 4. 子元件：預覽行程的地圖 (ItineraryPreviewMap)
// ============================================================================
function ItineraryPreviewMap({ items }: { items: PreviewItem[] }) {
  // 過濾出有經緯度的點位
  const mapPoints = useMemo(() => items.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)), [items]);
  
  // 初始化 Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    language: 'zh-TW',
    region: 'TW',
  });
  
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // 當地圖載入完成且有點位時，自動調整地圖視野 (Bounds) 讓所有標記都顯示在畫面內
  useEffect(() => {
    if (!map || !isLoaded || mapPoints.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    mapPoints.forEach((item) => bounds.extend({ lat: Number(item.latitude), lng: Number(item.longitude) }));
    map.fitBounds(bounds, mapPoints.length === 1 ? 150 : 72);
  }, [isLoaded, map, mapPoints]);

  if (mapPoints.length === 0) return <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-[#cbdce7] bg-[#f5f9fb] px-6 text-center text-sm leading-6 text-[#849cad]">這份行程目前沒有可顯示的座標點位。</div>;
  if (loadError) return <div className="flex min-h-72 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 px-6 text-center text-sm text-rose-600">地圖暫時無法載入，仍可查看行程內容。</div>;
  if (!isLoaded) return <div className="flex min-h-72 items-center justify-center rounded-2xl border border-[#dce7ef] bg-white"><Loader2 className="size-7 animate-spin text-[#9fb5c4]" /></div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#dce7ef] bg-white">
      <GoogleMap 
        mapContainerStyle={{ width: '100%', height: '440px' }} 
        center={{ lat: Number(mapPoints[0].latitude), lng: Number(mapPoints[0].longitude) }} 
        zoom={11} 
        onLoad={setMap} 
        options={{ 
          disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false, 
          styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }] // 隱藏地圖預設的商家標籤，讓畫面更乾淨
        }}
      >
        {/* 繪製路線軌跡 (Polyline) */}
        {mapPoints.length > 1 && <PolylineF path={mapPoints.map((item) => ({ lat: Number(item.latitude), lng: Number(item.longitude) }))} options={{ strokeColor: '#5e7891', strokeOpacity: 0.75, strokeWeight: 4 }} />}
        
        {/* 繪製點位標記 (Marker) */}
        {mapPoints.map((item, index) => (
          <Marker 
            key={item.id} 
            position={{ lat: Number(item.latitude), lng: Number(item.longitude) }} 
            label={{ text: String(index + 1), color: '#ffffff', fontWeight: '700' }} 
            title={`Day ${item.dayNumber} · ${item.title || '未命名地點'}`} 
          />
        ))}
      </GoogleMap>
    </div>
  );
}

// ============================================================================
// 5. 主頁面元件 (DestinationsPage)
// ============================================================================
export default function DestinationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // 取得安全的帳號識別碼
  const currentAccount = (user as any)?.id || (user as any)?.Account || '';

  // --- 狀態管理區 (State) ---
  
  // 行程列表相關
  const [itineraries, setItineraries] = useState<PublicItinerary[]>([]);
  const [publicItineraryCatalogue, setPublicItineraryCatalogue] = useState<PublicItinerary[]>([]);
  const [isMobileList, setIsMobileList] = useState(false);
  const [listPage, setListPage] = useState(1);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  
  // 搜尋與篩選相關
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [durationFilter, setDurationFilter] = useState('all');
  const [sortBy, setSortBy] = useState<ItinerarySort>('popular');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'discover' | 'saved'>('discover'); // '探索行程' 或 '我的收藏'

  // 與卡片的 sm 斷點一致：手機每頁十份，sm 以上每頁四十份。
  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const syncViewport = () => setIsMobileList(media.matches);
    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);
  useEffect(() => {
    setListPage(1);
  }, [appliedSearch, durationFilter, sortBy, selectedLocation, viewMode, isMobileList]);
  const pageSize = isMobileList ? 10 : 40;
  const pageCount = Math.max(1, Math.ceil(itineraries.length / pageSize));
  const currentPage = Math.min(listPage, pageCount);
  const visibleItineraries = itineraries.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const changePage = (page: number) => {
    setListPage(Math.max(1, Math.min(page, pageCount)));
    // 翻頁後回到列表標題，避免仍停在上一頁底部；焦點供鍵盤與讀屏接續閱讀。
    listHeadingRef.current?.focus({ preventScroll: true });
    listHeadingRef.current?.scrollIntoView({ block: 'start' });
  };
  
  // UI 狀態相關
  const [featuredIndex, setFeaturedIndex] = useState(0); // 主打推薦的輪播索引
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [shareNotice, setShareNotice] = useState('');
  
  // 互動狀態相關 (複製、按讚、收藏)
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  
  // 上傳/管理公開行程 (Modal) 相關
  const [ownedItineraries, setOwnedItineraries] = useState<OwnedItinerary[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedOwnedId, setSelectedOwnedId] = useState<string | null>(null);
  const [publicTitle, setPublicTitle] = useState('');
  const [publicCoverImage, setPublicCoverImage] = useState('');
  const [publicDescription, setPublicDescription] = useState('');
  const [publicLocation, setPublicLocation] = useState('');
  const [isSavingPublic, setIsSavingPublic] = useState(false);
  const [manageError, setManageError] = useState('');
  const [publishItineraryId, setPublishItineraryId] = useState<string | null>(null);
  
  // 預覽行程 (Modal) 相關
  const [preview, setPreview] = useState<ItineraryPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [copiedItineraryId, setCopiedItineraryId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'schedule' | 'map'>('schedule');

  // --- Refs (用來處理防抖、快取與避免 Race Condition) ---
  const itineraryListRef = useRef<PublicItinerary[]>([]);
  const publicItineraryCatalogueRef = useRef<PublicItinerary[]>([]);
  const publicRequestRef = useRef<AbortController | null>(null); // 處理 API 請求中止
  const publicRequestIdRef = useRef(0); // 確保每次只處理最後一次發出的 API 回應
  const hasPublicItineraryLoadedRef = useRef(false);
  const handledPublishItineraryRef = useRef<string | null>(null);

  // --- 衍生計算資料 (Memoized Values) ---
  const selectedOwnedItinerary = ownedItineraries.find((itinerary) => itinerary.id === selectedOwnedId) || null;
  // 每份行程的隨機順位在 API 回應時建立；Ref 保留順位，避免按讚或切換推薦時重新抽選。
  const featuredOrderRef = useRef(new Map<string, number>());
  const featuredItineraries = useMemo(() => [...itineraries]
    .sort((left, right) => (featuredOrderRef.current.get(left.id) ?? 0) - (featuredOrderRef.current.get(right.id) ?? 0))
    .slice(0, 3), [itineraries]); // 只重排行程副本，不影響下方列表的熱門／最新排序。
  const featuredItinerary = featuredItineraries[Math.min(featuredIndex, Math.max(featuredItineraries.length - 1, 0))];
  
  // 動態計算熱門目的地標籤
  const popularLocationSummaries = useMemo(() => {
    const locationCounts = new Map<string, number>();
    publicItineraryCatalogue.forEach((itinerary) => {
      const location = normalizePublicLocation(itinerary.location);
      if (location) locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
    });
    return Array.from(locationCounts, ([location, count]) => ({ location, count })).sort((left, right) => right.count - left.count || left.location.localeCompare(right.location, 'zh-Hant'));
  }, [publicItineraryCatalogue]);

  // 同步最新的列表資料到 Ref，供閉包函式安全存取
  useEffect(() => {
    itineraryListRef.current = itineraries;
  }, [itineraries]);

  // 解析網址參數 (是否帶有直接開啟上傳 Modal 的指令)
  useEffect(() => {
    setPublishItineraryId(new URLSearchParams(window.location.search).get('publish'));
  }, []);

  /**
   * 🌟【核心功能：撈取公開行程列表】
   * 包含 AbortController 防護，避免使用者快速切換篩選器時產生 Race Condition (舊請求覆蓋新請求)
   */
  const fetchPublicItineraries = useCallback(async (
    keyword = '',
    duration = 'all',
    limit = 24,
    savedOnly = false,
    sort: ItinerarySort = 'popular',
    location = '',
  ) => {
    // 中止上一次還沒跑完的請求
    publicRequestRef.current?.abort();
    const requestId = ++publicRequestIdRef.current;
    const controller = new AbortController();
    publicRequestRef.current = controller;
    
    const isInitialLoad = !hasPublicItineraryLoadedRef.current;
    if (isInitialLoad) setIsLoading(true);
    else setIsRefreshing(true);
    setError('');

    try {
      const response = await fetch('/backend/destinations/public_itineraries.php?action=list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Account: currentAccount, Search: keyword, Duration: duration, Sort: sort, Location: location, Limit: limit, Saved_Only: savedOnly }),
        signal: controller.signal, // 綁定中止訊號
      });
      const data = await response.json();
      
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '載入公開行程失敗');
      
      // 確保這是最後一次發出的請求
      if (requestId === publicRequestIdRef.current) {
        hasPublicItineraryLoadedRef.current = true;
        const nextRows = Array.isArray(data.data) ? data.data as PublicItinerary[] : [];
        // 新遇到的行程才抽順位；不足三份時全部顯示，重新進入頁面後再重新抽選。
        nextRows.forEach((itinerary) => {
          if (!featuredOrderRef.current.has(itinerary.id)) featuredOrderRef.current.set(itinerary.id, Math.random());
        });
        
        // 如果是沒有帶任何篩選條件的「純淨請求」，就把結果存進 Catalogue 當作前端篩選快取
        if (!savedOnly && !keyword && duration === 'all' && !location) {
          publicItineraryCatalogueRef.current = nextRows;
          setPublicItineraryCatalogue(nextRows);
        }
        setItineraries(nextRows);
      }
    } catch (requestError) {
      // 忽略因使用者快速切換而被主動 Abort 的錯誤
      if ((requestError as Error)?.name !== 'AbortError' && requestId === publicRequestIdRef.current) {
        setError(requestError instanceof Error ? requestError.message : '載入公開行程失敗');
      }
    } finally {
      if (requestId === publicRequestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [currentAccount]);

  // 初次載入
  useEffect(() => {
    void fetchPublicItineraries('', 'all', 48);
    return () => publicRequestRef.current?.abort(); // Component Unmount 時取消請求
  }, [fetchPublicItineraries]);

  // 防呆：如果主打推薦陣列縮水，自動校正索引
  useEffect(() => {
    setFeaturedIndex((index) => Math.min(index, Math.max(featuredItineraries.length - 1, 0)));
  }, [featuredItineraries.length]);

  /** 撈取登入者的私人行程清單 (用於上傳選擇) */
  const fetchOwnedItineraries = async () => {
    if (!currentAccount) return [] as OwnedItinerary[];
    const response = await fetch('/backend/destinations/public_itineraries.php?action=mine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Account: currentAccount }),
    });
    const data = await response.json();
    if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法取得你的行程。');
    const rows = Array.isArray(data.data) ? data.data as OwnedItinerary[] : [];
    setOwnedItineraries(rows);
    return rows;
  };

  /** 準備編輯特定行程的公開設定 */
  const selectOwnedItinerary = (itinerary: OwnedItinerary) => {
    setSelectedOwnedId(itinerary.id);
    setPublicTitle(itinerary.publicTitle || itinerary.title || '');
    setPublicCoverImage(itinerary.publicCoverImage || itinerary.coverImage || '');
    setPublicDescription(itinerary.publicDescription || '');
    setPublicLocation(itinerary.publicLocation || '');
    setManageError('');
  };

  /** 開啟「上傳/管理」Modal */
  const openManage = async (itineraryId?: string) => {
    if (!currentAccount) {
      router.push('/auth/login');
      return;
    }
    setIsManageOpen(true);
    setManageError('');
    try {
      const rows = await fetchOwnedItineraries();
      const target = itineraryId ? rows.find((itinerary) => itinerary.id === itineraryId) : null;
      if (target) selectOwnedItinerary(target);
      else if (itineraryId) setManageError('找不到這份行程，或你目前沒有管理它的權限。');
      else {
        // 重置為未選擇狀態
        setSelectedOwnedId(null);
        setPublicTitle('');
        setPublicCoverImage('');
        setPublicDescription('');
        setPublicLocation('');
      }
    } catch (requestError) {
      setManageError(requestError instanceof Error ? requestError.message : '無法取得你的行程。');
    }
  };

  const closeManage = () => {
    setIsManageOpen(false);
    setSelectedOwnedId(null);
    setManageError('');
    // 如果是透過網址參數進來的，關閉時順便把網址清乾淨
    if (publishItineraryId) router.replace('/destinations', { scroll: false });
  };

  // 攔截網址上的 ?publish=ID 參數，自動打開管理面板
  useEffect(() => {
    if (!publishItineraryId || !currentAccount || handledPublishItineraryRef.current === publishItineraryId) return;
    handledPublishItineraryRef.current = publishItineraryId;
    void openManage(publishItineraryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount, publishItineraryId]);

  /** 儲存行程的公開設定 (發布/更新) */
  const savePublicSettings = async (isPublic: boolean) => {
    if (!selectedOwnedItinerary || !currentAccount) return;
    if (isPublic && !publicTitle.trim()) {
      setManageError('請填寫公開行程標題。');
      return;
    }

    setIsSavingPublic(true);
    setManageError('');
    try {
      const response = await fetch('/backend/destinations/public_itineraries.php?action=publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Account: currentAccount,
          Itinerary_ID: selectedOwnedItinerary.id,
          Is_Public: isPublic,
          Public_Title: publicTitle.trim(),
          Public_Cover_Image: publicCoverImage.trim(),
          Public_Description: publicDescription.trim(),
          Public_Location: publicLocation.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法儲存公開設定。');
      
      const savedOnly = viewMode === 'saved';
      // 並行更新資料庫，確保 UI 狀態同步
      await Promise.all([
        fetchOwnedItineraries(),
        fetchPublicItineraries('', 'all', 48, savedOnly, sortBy),
      ]);
      if (savedOnly || appliedSearch) await fetchPublicItineraries(appliedSearch, durationFilter, 24, savedOnly, sortBy, selectedLocation);
      else applyLocalFilters(durationFilter, sortBy, selectedLocation);
      
      closeManage();
    } catch (requestError) {
      setManageError(requestError instanceof Error ? requestError.message : '無法儲存公開設定。');
    } finally {
      setIsSavingPublic(false);
    }
  };

  /** 將行程下架 (取消公開) */
  const unpublish = () => {
    if (!selectedOwnedItinerary || !window.confirm('確定要從旅遊景點下架這份行程嗎？原本的私人行程與地點都會保留。')) return;
    void savePublicSettings(false);
  };

  // 動態顯示大標題
  const heading = useMemo(() => {
    if (viewMode === 'saved') return appliedSearch ? `收藏中符合「${appliedSearch}」的行程` : '我的收藏';
    return appliedSearch ? `「${appliedSearch}」的行程靈感` : '公開行程靈感';
  }, [appliedSearch, viewMode]);

  /** 本地端前端過濾 (如果沒有跨頁搜尋的需求，直接用本地 Cache 過濾速度最快) */
  const applyLocalFilters = useCallback((duration: string, sort: ItinerarySort = sortBy, location = selectedLocation) => {
    if (!hasPublicItineraryLoadedRef.current) return false;
    setItineraries(filterPublicItineraries(publicItineraryCatalogueRef.current, duration, sort, location).slice(0, 24));
    return true;
  }, [selectedLocation, sortBy]);

  /** 輔助更新：本地端即時更新按讚、收藏或瀏覽數，提升 UI 反應速度 (Optimistic Update) */
  const updateItineraryEngagement = useCallback((itineraryId: string, patch: Partial<Pick<PublicItinerary, 'likeCount' | 'viewCount' | 'isLiked' | 'isSaved'>>) => {
    const updateRows = (rows: PublicItinerary[]) => rows.map((item) => item.id === itineraryId ? { ...item, ...patch } : item);
    setItineraries((rows) => updateRows(rows));
    publicItineraryCatalogueRef.current = updateRows(publicItineraryCatalogueRef.current);
    setPreview((current) => current?.id === itineraryId ? { ...current, ...patch } : current);
  }, []);

  /** 產生訪客的匿名 View Key (用於計算瀏覽次數) */
  const getViewerKey = () => {
    if (currentAccount) return `account:${currentAccount}`;
    const storageKey = 'travmate:public-itinerary-viewer';
    let visitorId = window.sessionStorage.getItem(storageKey);
    if (!visitorId) {
      visitorId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(storageKey, visitorId);
    }
    return `browser:${visitorId}`;
  };

  /** 記錄行程瀏覽數 */
  const recordPublicView = async (itineraryId: string) => {
    try {
      const response = await fetch('/backend/destinations/public_itineraries.php?action=view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itineraryId, Viewer_Key: getViewerKey() }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success' && typeof data.viewCount === 'number') {
        updateItineraryEngagement(itineraryId, { viewCount: data.viewCount });
      }
    } catch {
      // 瀏覽數記錄失敗屬非致命錯誤，直接忽略，不應阻擋預覽畫面
    }
  };

  /** 處理按讚 / 取消按讚 */
  const toggleLike = async (itinerary: Pick<PublicItinerary, 'id'>) => {
    if (!currentAccount) {
      router.push('/auth/login');
      return;
    }
    setLikingId(itinerary.id);
    try {
      const response = await fetch('/backend/destinations/public_itineraries.php?action=like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itinerary.id, Account: currentAccount }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '按讚失敗');
      updateItineraryEngagement(itinerary.id, { isLiked: Boolean(data.isLiked), likeCount: Number(data.likeCount) || 0 });
    } catch (requestError) {
      window.alert(requestError instanceof Error ? requestError.message : '按讚失敗，請稍後再試。');
    } finally {
      setLikingId(null);
    }
  };

  /** 處理收藏 / 取消收藏 */
  const toggleSave = async (itinerary: Pick<PublicItinerary, 'id'>) => {
    if (!currentAccount) {
      router.push('/auth/login');
      return;
    }
    setSavingId(itinerary.id);
    try {
      const response = await fetch('/backend/destinations/public_itineraries.php?action=bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itinerary.id, Account: currentAccount }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '收藏更新失敗');
      const isSaved = Boolean(data.isSaved);
      updateItineraryEngagement(itinerary.id, { isSaved });
      
      // 如果目前處於「收藏模式」且使用者取消了收藏，就即時把那張卡片從畫面上移除
      if (viewMode === 'saved' && !isSaved) {
        setItineraries((rows) => rows.filter((item) => item.id !== itinerary.id));
      }
    } catch (requestError) {
      window.alert(requestError instanceof Error ? requestError.message : '收藏更新失敗，請稍後再試。');
    } finally {
      setSavingId(null);
    }
  };

  const publicItineraryUrl = (itineraryId: string) => `${window.location.origin}/destinations/itinerary/${itineraryId}`;

  /** 分享連結機制 (支援行動裝置的原生分享面板) */
  const sharePublicItinerary = async (itinerary: Pick<PublicItinerary, 'id' | 'title'>) => {
    const url = publicItineraryUrl(itinerary.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: itinerary.title, text: `一起看看「${itinerary.title}」這份旅行行程`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNotice('已複製分享連結');
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return; // 使用者主動取消原生分享面板
      try {
        await navigator.clipboard.writeText(url);
        setShareNotice('已複製分享連結');
      } catch {
        window.prompt('請複製這份公開行程連結：', url); // 最後手段的 Fallback
      }
    }
  };

  // --- 篩選與視圖控制 ---

  const switchViewMode = (nextMode: 'discover' | 'saved') => {
    if (nextMode === viewMode) return;
    if (nextMode === 'saved' && !currentAccount) {
      router.push('/auth/login');
      return;
    }
    setViewMode(nextMode);
    setSearch('');
    setAppliedSearch('');
    setDurationFilter('all');
    setSelectedLocation('');
    void fetchPublicItineraries('', 'all', 48, nextMode === 'saved', sortBy);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = search.trim();
    setAppliedSearch(keyword);
    if (viewMode === 'discover' && !keyword && applyLocalFilters(durationFilter, sortBy, selectedLocation)) return;
    void fetchPublicItineraries(keyword, durationFilter, 24, viewMode === 'saved', sortBy, selectedLocation);
  };

  const updateDurationFilter = (value: string) => {
    setDurationFilter(value);
    if (viewMode === 'discover' && !appliedSearch && applyLocalFilters(value, sortBy, selectedLocation)) return;
    void fetchPublicItineraries(appliedSearch, value, 24, viewMode === 'saved', sortBy, selectedLocation);
  };

  const updateLocationFilter = (location: string) => {
    const nextLocation = selectedLocation === location ? '' : location; // 再次點擊等同於取消選取
    setSelectedLocation(nextLocation);
    if (viewMode === 'discover' && !appliedSearch && applyLocalFilters(durationFilter, sortBy, nextLocation)) return;
    void fetchPublicItineraries(appliedSearch, durationFilter, 24, viewMode === 'saved', sortBy, nextLocation);
  };

  const clearFilters = () => {
    setDurationFilter('all');
    setSelectedLocation('');
    if (viewMode === 'discover' && !appliedSearch && applyLocalFilters('all', sortBy, '')) return;
    void fetchPublicItineraries(appliedSearch, 'all', 24, viewMode === 'saved', sortBy, '');
  };

  const updateSort = (nextSort: ItinerarySort) => {
    if (nextSort === sortBy) return;
    setSortBy(nextSort);
    if (viewMode === 'discover' && !appliedSearch && applyLocalFilters(durationFilter, nextSort, selectedLocation)) return;
    void fetchPublicItineraries(appliedSearch, durationFilter, 24, viewMode === 'saved', nextSort, selectedLocation);
  };

  // --- 預覽與複製 (Preview / Copy) ---

  const openPreview = async (itineraryId: string) => {
    setPreview(null);
    setPreviewError('');
    setCopiedItineraryId(null);
    setPreviewTab('schedule');
    setIsPreviewLoading(true);
    try {
      const response = await fetch('/backend/destinations/public_itineraries.php?action=preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itineraryId }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法載入行程預覽。');
      setPreview(data.data as ItineraryPreview);
      void recordPublicView(itineraryId); // 載入完成後順便戳一下增加瀏覽數的 API
    } catch (requestError) {
      setPreviewError(requestError instanceof Error ? requestError.message : '無法載入行程預覽。');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreview(null);
    setPreviewError('');
    setCopiedItineraryId(null);
    setPreviewTab('schedule');
  };

  const handleCopy = async (itinerary: Pick<PublicItinerary, 'id'>) => {
    if (!currentAccount) {
      router.push('/auth/login');
      return;
    }

    setCopyingId(itinerary.id);
    try {
      const response = await fetch('/backend/destinations/public_itineraries.php?action=copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itinerary.id, Account: currentAccount }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '複製行程失敗');
      
      setCopiedItineraryId(String(data.itineraryId));
      
      // 複製成功後，重新撈取資料確保 UI 狀態與伺服器同步
      const savedOnly = viewMode === 'saved';
      await fetchPublicItineraries('', 'all', 48, savedOnly, sortBy);
      if (savedOnly || appliedSearch) await fetchPublicItineraries(appliedSearch, durationFilter, 24, savedOnly, sortBy, selectedLocation);
      else applyLocalFilters(durationFilter, sortBy, selectedLocation);
    } catch (requestError) {
      window.alert(requestError instanceof Error ? requestError.message : '複製行程失敗，請稍後再試。');
    } finally {
      setCopyingId(null);
    }
  };

  // 將預覽行程的點位，依照天數 (Day) 進行分群歸類
  const previewDays = useMemo(() => {
    if (!preview) return [] as Array<[number, PreviewItem[]]>;
    const groups = new Map<number, PreviewItem[]>();
    preview.items.forEach((item) => groups.set(item.dayNumber, [...(groups.get(item.dayNumber) || []), item]));
    return Array.from(groups.entries()).sort(([firstDay], [secondDay]) => firstDay - secondDay);
  }, [preview]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] pb-16 text-[#31485f]">
      
      {/* ========================================= */}
      {/* 區塊 1: 頁面首圖與主標語區 (Hero Section) */}
      {/* ========================================= */}
      <section className="relative isolate z-10 min-h-[540px] border-b border-[#d5e1e9] bg-[#3d5a70] px-4 py-8 text-white sm:px-6 lg:px-10 lg:py-10">
        <img src={featuredItinerary?.coverImage || fallbackCover} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
        {/* 漸層遮罩，讓左側文字不論背景圖亮暗都能清楚閱讀 */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(19,37,51,0.9)_0%,rgba(28,48,63,0.76)_42%,rgba(28,48,63,0.25)_100%)]" />
        
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-[0.18em] text-white/85 backdrop-blur-md">
            <Sparkles size={15} />TRAVMATE INSPIRATION
          </div>
          <button type="button" onClick={() => void openManage()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/25">
            <Upload size={17} />上傳行程
          </button>
        </div>

        <div className="mx-auto mt-8 max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] lg:items-end">
            
            {/* 左側：大標題與搜尋器 */}
            <div className="max-w-2xl">
              <p className="text-sm font-bold tracking-[0.2em] text-white/70">{viewMode === 'saved' ? 'MY SAVED PLANS' : '行程靈感'}</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{viewMode === 'saved' ? '留住想出發的旅行靈感' : '看看其他旅人怎麼安排'}</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/78 sm:text-base">
                {viewMode === 'saved' ? '先收藏，再慢慢比較；準備好時再複製成可自由修改的私人行程。' : '探索公開行程、找到適合自己的旅行節奏，再複製成可自由修改的私人行程。'}
              </p>

              <form onSubmit={submitSearch} className="mt-6 flex max-w-xl flex-col gap-2 rounded-2xl border border-white/25 bg-white/92 p-2 shadow-xl shadow-slate-950/15 backdrop-blur-md sm:flex-row">
                <label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-[#7790a4]">
                  <Search size={19} className="shrink-0" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋行程名稱或目的地" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#31485f] outline-none placeholder:text-[#9cb0bf]" />
                </label>
                <button type="submit" className="rounded-xl bg-[#56758e] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#45647d]">搜尋</button>
              </form>

              {/* 篩選內容絕對定位，不撐高背景區；超長選項在浮層內捲動，Escape 可收合。 */}
              <div onKeyDown={(event) => { if (event.key === 'Escape') { setIsFilterOpen(false); event.currentTarget.querySelector('button')?.focus(); } }} className="relative z-20 mt-3 max-w-xl rounded-2xl border border-white/20 bg-slate-900/20 backdrop-blur-md">
                <button type="button" onClick={() => setIsFilterOpen((value) => !value)} aria-expanded={isFilterOpen} aria-controls="public-itinerary-filters" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/10">
                  <span className="inline-flex items-center gap-2">
                    <SlidersHorizontal size={16} />篩選行程
                    {(selectedLocation || durationFilter !== 'all') && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">{Number(Boolean(selectedLocation)) + Number(durationFilter !== 'all')}</span>}
                  </span>
                  <ChevronDown size={17} className={`transition ${isFilterOpen ? 'rotate-180' : ''}`} />
                </button>
                {isFilterOpen && (
                  <div id="public-itinerary-filters" className="absolute inset-x-0 top-full mt-2 max-h-[min(60dvh,24rem)] overflow-y-auto overscroll-contain rounded-2xl border border-[#d6e3eb] bg-white p-4 text-[#4e697e] shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold">探索條件</span>
                      {(selectedLocation || durationFilter !== 'all') && <button type="button" onClick={clearFilters} className="text-xs font-bold text-[#5e7891] hover:text-[#365168]">清除篩選</button>}
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-bold text-[#7891a4]">旅行天數
                        <select value={durationFilter} onChange={(event) => updateDurationFilter(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d6e3eb] bg-[#f8fbfd] px-3 py-2.5 text-sm font-medium text-[#4e697e] outline-none focus:border-[#7d9aaf]">
                          {durationFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    </div>
                    {popularLocationSummaries.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-1.5 text-[11px] font-bold tracking-wide text-[#8ca3b4]">目的地</p>
                        <div className="flex flex-wrap gap-2">
                          {popularLocationSummaries.slice(0, 8).map(({ location, count }) => (
                            <button type="button" key={location} onClick={() => updateLocationFilter(location)} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${selectedLocation === location ? 'border-[#5e7891] bg-[#5e7891] text-white shadow-sm' : 'border-[#d6e3eb] bg-[#f8fbfd] text-[#668096] hover:border-[#a9bfce] hover:bg-[#f0f6f9]'}`}>
                              <MapPin size={12} />{location}<span className={`text-[10px] ${selectedLocation === location ? 'text-white/75' : 'text-[#98acba]'}`}>{count}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 右側：精選行程推薦 Carousel */}
            <div className={featuredItinerary ? 'min-w-0' : 'hidden'}>
              {featuredItinerary ? (
                <>
                  <div className="mb-3 flex items-center justify-between text-sm font-bold text-white/85">
                    <span>旅人推薦</span><span className="text-xs font-medium text-white/60">{featuredIndex + 1} / {featuredItineraries.length}</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {featuredItineraries.map((itinerary, index) => (
                      <button type="button" key={itinerary.id} onClick={() => setFeaturedIndex(index)} className={`group relative h-56 w-40 shrink-0 overflow-hidden rounded-2xl border text-left shadow-xl transition sm:w-44 ${featuredItinerary.id === itinerary.id ? 'border-white/80 ring-2 ring-white/45' : 'border-white/20 opacity-80 hover:opacity-100'}`}>
                        <img src={itinerary.coverImage || fallbackCover} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.src = fallbackCover; }} />
                        <span className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
                        <span className="absolute inset-x-3 bottom-3 line-clamp-2 text-sm font-bold leading-5 text-white">{itinerary.title}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-slate-950/25 px-4 py-3 backdrop-blur-md">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{featuredItinerary.title}</p>
                      <p className="mt-1 text-xs text-white/70">{featuredItinerary.owner.name} · {featuredItinerary.dayCount} 天 · {featuredItinerary.itemCount} 個地點</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" aria-label="上一個推薦" onClick={() => setFeaturedIndex((index) => (index - 1 + featuredItineraries.length) % featuredItineraries.length)} className="rounded-lg p-2 text-white/85 transition hover:bg-white/15"><ChevronLeft size={18} /></button>
                      <button type="button" onClick={() => void openPreview(featuredItinerary.id)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#45647d] transition hover:bg-[#eef5f9]">查看行程</button>
                      <button type="button" aria-label="下一個推薦" onClick={() => setFeaturedIndex((index) => (index + 1) % featuredItineraries.length)} className="rounded-lg p-2 text-white/85 transition hover:bg-white/15"><ChevronRight size={18} /></button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================= */}
      {/* 區塊 2: 列表區與排序控制項 */}
      {/* ========================================= */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#8aa0b2]">COMMUNITY PLANS</p>
            <h2 ref={listHeadingRef} tabIndex={-1} className="mt-2 scroll-mt-24 text-xl font-bold text-[#30485f] focus:outline-none sm:text-2xl">{heading}</h2>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <button type="button" onClick={() => switchViewMode('discover')} className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold transition sm:px-3 sm:text-xs ${viewMode === 'discover' ? 'bg-[#5e7891] text-white shadow-sm' : 'bg-white text-[#698499] hover:bg-[#eaf2f7]'}`}><Globe2 size={14} />探索行程</button>
            <button type="button" onClick={() => switchViewMode('saved')} className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold transition sm:px-3 sm:text-xs ${viewMode === 'saved' ? 'bg-[#5e7891] text-white shadow-sm' : 'bg-white text-[#698499] hover:bg-[#eaf2f7]'}`}><Bookmark size={14} className={viewMode === 'saved' ? 'fill-current' : ''} />我的收藏</button>
            <label className="inline-flex items-center rounded-xl border border-[#d7e4ec] bg-white px-2 text-[11px] font-bold text-[#698499] sm:text-xs">
              <span className="sr-only">行程排序</span>
              <select value={sortBy} onChange={(event) => updateSort(event.target.value as ItinerarySort)} className="cursor-pointer bg-transparent py-2 text-[11px] font-bold outline-none sm:text-xs">
                {itinerarySortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {!isLoading && <span className="inline-flex items-center gap-1 text-xs text-[#91a6b7]">{isRefreshing && <Loader2 className="size-4 animate-spin" />}共 {itineraries.length} 份</span>}
          </div>
        </div>

        {/* 狀態切換與網格渲染 (Grid) */}
        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border border-[#dce7ef] bg-white shadow-sm"><Loader2 className="size-7 animate-spin text-[#b2c3cf]" /></div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 px-6 py-12 text-center">
            <p className="font-bold text-rose-700">暫時無法載入{viewMode === 'saved' ? '收藏行程' : '行程靈感'}</p>
            <p className="mt-2 text-sm text-rose-500">{error}</p>
            <button type="button" onClick={() => void fetchPublicItineraries(appliedSearch, durationFilter, 24, viewMode === 'saved', sortBy, selectedLocation)} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-700 shadow-sm">重新整理</button>
          </div>
        ) : itineraries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cbdce7] bg-white px-6 py-20 text-center shadow-sm">
            {viewMode === 'saved' ? (
              <><Bookmark className="mx-auto text-[#b2c5d2]" size={32} /><h3 className="mt-5 text-lg font-bold text-[#4c657b]">收藏清單還是空的</h3><p className="mt-2 text-sm text-[#91a6b7]">看到喜歡的公開行程時，按下書籤就能先留在這裡。</p><button type="button" onClick={() => switchViewMode('discover')} className="mt-5 rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#4d677f]">探索公開行程</button></>
            ) : (
              <><Globe2 className="mx-auto text-[#b2c5d2]" size={32} /><h3 className="mt-5 text-lg font-bold text-[#4c657b]">目前還沒有公開行程</h3><p className="mt-2 text-sm text-[#91a6b7]">完成一份行程後，可在「行程規劃」將它公開分享。</p></>
            )}
          </div>
        ) : (
          // 手機單欄橫式卡片避免資訊被兩欄擠窄；sm 以上恢復封面在上的網格。
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {visibleItineraries.map((itinerary) => (
              <article 
                key={itinerary.id} 
                role="button" 
                tabIndex={0} 
                aria-label={`預覽行程：${itinerary.title}`} 
                onClick={(event) => { if ((event.target as HTMLElement).closest('button, a')) return; void openPreview(itinerary.id); }} 
                onKeyDown={(event) => { if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return; event.preventDefault(); void openPreview(itinerary.id); }} 
                className="group flex self-start cursor-pointer flex-row overflow-hidden sm:flex-col rounded-2xl border border-[#dce7ef] bg-white shadow-[0_6px_18px_rgba(66,96,120,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#c4d8e6] hover:shadow-[0_14px_28px_rgba(66,96,120,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f91aa] focus-visible:ring-offset-2 sm:h-full"
              >
                <div className="relative w-24 shrink-0 overflow-hidden bg-[#edf4f8] sm:aspect-[4/3] sm:w-full">
                  <img src={itinerary.coverImage || fallbackCover} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.src = fallbackCover; }} />
                  {itinerary.location && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent px-2 pb-3 pt-8 text-[11px] font-bold text-white sm:px-4 sm:pt-12 sm:text-xs"><span className="flex min-w-0 items-center gap-1"><MapPin size={13} className="shrink-0" /><span className="line-clamp-2 break-words">{itinerary.location}</span></span></div>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-5">
                  <h3 className="line-clamp-2 break-words text-base font-bold leading-5 text-[#30485f] sm:min-h-12 sm:text-lg sm:leading-6">{itinerary.title}</h3>
                  <p className={`mt-1 break-words text-xs leading-4 text-[#7690a3] line-clamp-2 sm:mt-2 sm:min-h-10 sm:text-sm sm:leading-5 ${itinerary.description ? '' : 'hidden sm:block'}`}>{itinerary.description || ''}</p>
                  
                  {/* 行程數據 Meta */}
                  <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 sm:pt-3 text-[11px] text-[#91a6b7] sm:mt-auto sm:gap-x-3 sm:text-xs">
                    <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {itinerary.dayCount} 天</span>
                    <span>{itinerary.itemCount} 個地點</span>
                    <span>{itinerary.copyCount} 次複製</span>
                    <span className="inline-flex items-center gap-1"><Eye size={13} />{itinerary.viewCount}</span>
                  </div>
                  
                  {/* 作者與互動區 */}
                  <div className="mt-2 border-t border-[#edf2f5] pt-2 sm:mt-5 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:pt-4">
                    <div className="mb-2 flex min-w-0 items-center gap-2 sm:mb-0">
                      <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#edf4f8] text-[10px] font-bold text-[#688198]">
                        {itinerary.owner.avatar ? <img src={itinerary.owner.avatar} alt="" className="size-full object-cover" /> : itinerary.owner.name.slice(0, 1)}
                      </div>
                      <span className="truncate text-xs font-medium text-[#688198]">{itinerary.owner.name}</span>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-1 sm:flex sm:shrink-0 sm:flex-wrap sm:items-center sm:gap-2">
                      <button type="button" onClick={() => void toggleLike(itinerary)} disabled={likingId === itinerary.id} className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border px-1 py-2 sm:min-h-0 text-[11px] font-bold transition disabled:cursor-wait disabled:opacity-60 sm:px-2.5 sm:text-xs ${itinerary.isLiked ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-[#d7e4ec] bg-white text-[#7690a3] hover:border-rose-200 hover:text-rose-500'}`} aria-label={itinerary.isLiked ? '取消按讚' : '按讚'}>
                        <Heart size={14} className={itinerary.isLiked ? 'fill-current' : ''} />{itinerary.likeCount}
                      </button>
                      <button type="button" onClick={() => void toggleSave(itinerary)} disabled={savingId === itinerary.id} title={itinerary.isSaved ? '取消收藏' : '收藏行程'} aria-label={itinerary.isSaved ? '取消收藏' : '收藏行程'} className={`inline-flex min-h-11 items-center justify-center rounded-xl border p-2 sm:min-h-0 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 ${itinerary.isSaved ? 'border-[#c7dce9] bg-[#eaf4f9] text-[#4e718c]' : 'border-[#d7e4ec] bg-white text-[#7690a3] hover:border-[#a9c3d4] hover:text-[#4e718c]'}`}>
                        <Bookmark size={15} className={itinerary.isSaved ? 'fill-current' : ''} />
                      </button>
                      <button type="button" onClick={() => void sharePublicItinerary(itinerary)} title="分享公開行程" aria-label="分享公開行程" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d7e4ec] bg-white p-2 sm:min-h-0 text-[#7690a3] transition hover:border-[#a9c3d4] hover:text-[#4e718c]">
                        <Share2 size={15} />
                      </button>
                      
                      {/* 若該行程是本人擁有的，顯示管理按鈕 */}
                      {currentAccount === itinerary.owner.account && (
                        <button type="button" onClick={() => void openManage(itinerary.id)} aria-label={`管理行程：${itinerary.title}`} title="管理行程" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#c9dbe7] bg-[#f4f8fb] px-1 py-2 text-xs sm:min-h-0 sm:px-3 font-bold text-[#58758c] transition hover:bg-[#eaf2f7]">
                          <Settings2 size={14} /><span className="hidden sm:inline">管理</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* 不足兩頁不顯示控制列；條件變更或下架減少資料時，頁碼會保持在有效範圍。 */}
        {!isLoading && !error && pageCount > 1 && (
          <nav aria-label="公開行程分頁" className="mt-6 flex items-center justify-between gap-3 sm:justify-center sm:gap-6">
            <button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-[#d6e3eb] bg-white px-3 text-sm font-bold text-[#58758c] disabled:opacity-40"><ChevronLeft size={16} />上一頁</button>
            <span aria-live="polite" aria-atomic="true" className="text-xs text-[#698499]">第 {currentPage} / {pageCount} 頁</span>
            <button type="button" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-[#d6e3eb] bg-white px-3 text-sm font-bold text-[#58758c] disabled:opacity-40">下一頁<ChevronRight size={16} /></button>
          </nav>
        )}
        <div className="mt-10 rounded-2xl border border-[#dce7ef] bg-white px-5 py-4 text-sm leading-6 text-[#6d8498] shadow-sm"><Users className="mr-2 inline text-[#8ca4b6]" size={17} />複製後的行程只屬於你；你可以自行調整時間、地點與封面，原作者的行程不會受到影響。</div>
      </section>

      {/* ========================================= */}
      {/* 彈出視窗 1: 上傳與管理公開設定 (Manage Modal) */}
      {/* ========================================= */}
      {isManageOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#d7e4ec] bg-[#f8fbfd] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce7ef] bg-white/95 px-6 py-5 backdrop-blur">
              <div><p className="text-xs font-bold tracking-[0.18em] text-[#8aa0b2]">MY PUBLIC PLANS</p><h2 className="mt-1 text-xl font-bold text-[#30485f]">上傳與公開設定</h2></div>
              <button type="button" onClick={closeManage} className="rounded-xl p-2 text-[#89a0b1] transition hover:bg-[#eef5f9] hover:text-[#4e6d86]" aria-label="關閉"><X size={21} /></button>
            </div>

            <div className="p-6">
              {manageError && <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{manageError}</div>}
              
              {!selectedOwnedItinerary ? (
                <>
                  <p className="mb-4 text-sm leading-6 text-[#71899b]">選擇一份你建立的行程，設定公開標題與封面後即可上傳。公開內容不會包含記帳、票券或備忘錄。</p>
                  <div className="space-y-3">
                    {ownedItineraries.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#cbdce7] bg-white px-5 py-12 text-center text-sm text-[#91a6b7]">你目前還沒有可上傳的行程。<button type="button" onClick={() => router.push('/planner')} className="ml-2 font-bold text-[#5e7891] hover:underline">先建立行程</button></div>
                    ) : ownedItineraries.map((itinerary) => (
                      <button type="button" key={itinerary.id} onClick={() => selectOwnedItinerary(itinerary)} className="flex w-full items-center gap-4 rounded-2xl border border-[#dce7ef] bg-white p-4 text-left shadow-sm transition hover:border-[#bcd2e0] hover:bg-[#fbfdfe]">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#edf4f8] text-[#66839b]"><MapPin size={20} /></div>
                        <div className="min-w-0 flex-1"><div className="truncate font-bold text-[#365168]">{itinerary.title}</div><div className="mt-1 text-xs text-[#8aa0b2]">{itinerary.dayCount} 天 · {itinerary.itemCount} 個地點 · {itinerary.startDate}</div></div>
                        {itinerary.isPublic && <span className="rounded-full bg-[#eaf4ef] px-2.5 py-1 text-[11px] font-bold text-emerald-600">已公開</span>}
                        <Pencil size={17} className="text-[#95aaba]" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  <button type="button" onClick={() => setSelectedOwnedId(null)} className="text-sm font-bold text-[#648096] hover:text-[#3f6079]">← 返回選擇其他行程</button>
                  <div className="rounded-2xl border border-[#dce7ef] bg-white p-4">
                    <div className="text-xs font-bold tracking-wide text-[#8aa0b2]">原始行程</div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <div className="min-w-0"><h3 className="truncate text-lg font-bold text-[#365168]">{selectedOwnedItinerary.title}</h3><p className="mt-1 text-xs text-[#8aa0b2]">{selectedOwnedItinerary.dayCount} 天 · {selectedOwnedItinerary.itemCount} 個地點</p></div>
                      <button type="button" onClick={() => router.push(`/planner/${selectedOwnedItinerary.id}`)} className="shrink-0 rounded-lg bg-[#eef5f9] px-3 py-2 text-xs font-bold text-[#58758c] hover:bg-[#e3eef4]">編輯原行程</button>
                    </div>
                  </div>
                  
                  {/* 表單區塊 */}
                  <label className="block text-sm font-bold text-[#4e697e]">公開標題
                    <input value={publicTitle} onChange={(event) => setPublicTitle(event.target.value)} maxLength={255} placeholder="例如：台北三天兩夜慢遊行程" className="mt-2 w-full rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm text-[#365168] outline-none transition focus:border-[#7d9aaf]" />
                  </label>
                  <label className="block text-sm font-bold text-[#4e697e]">目的地 <span className="font-medium text-[#9aafbd]">（選填）</span>
                    <input value={publicLocation} onChange={(event) => setPublicLocation(event.target.value)} onBlur={() => setPublicLocation((value) => normalizePublicLocation(value))} maxLength={150} placeholder="例如：台中、台南、花蓮或澎湖" className="mt-2 w-full rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm text-[#365168] outline-none transition focus:border-[#7d9aaf]" />
                    <span className="mt-1 block text-xs font-medium text-[#9aafbd]">建議使用「國家・城市」；儲存時會統一分隔符號，讓其他旅人可直接依目的地篩選。</span>
                    {popularLocationSummaries.length > 0 && <span className="mt-3 flex flex-wrap gap-2">{popularLocationSummaries.slice(0, 6).map(({ location }) => <button type="button" key={location} onClick={() => setPublicLocation(location)} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${normalizePublicLocation(publicLocation) === location ? 'border-[#5e7891] bg-[#5e7891] text-white' : 'border-[#d6e3eb] bg-[#f8fbfd] text-[#668096] hover:border-[#a9bfce]'}`}>#{location}</button>)}</span>}
                  </label>
                  <label className="block text-sm font-bold text-[#4e697e]">公開封面連結 <span className="font-medium text-[#9aafbd]">（選填）</span>
                    <input value={publicCoverImage} onChange={(event) => setPublicCoverImage(event.target.value)} type="url" placeholder="https://..." className="mt-2 w-full rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm text-[#365168] outline-none transition focus:border-[#7d9aaf]" />
                  </label>
                  <label className="block text-sm font-bold text-[#4e697e]">行程簡介 <span className="font-medium text-[#9aafbd]">（選填，最多 1000 字）</span>
                    <textarea value={publicDescription} onChange={(event) => setPublicDescription(event.target.value)} maxLength={1000} rows={4} placeholder="分享這趟旅行的亮點、適合什麼樣的旅人，或行前注意事項…" className="mt-2 w-full resize-none rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm leading-6 text-[#365168] outline-none transition focus:border-[#7d9aaf]" />
                    <span className="mt-1 block text-right text-xs font-medium text-[#9aafbd]">{publicDescription.length}/1000</span>
                  </label>
                  <p className="rounded-xl border border-[#dce8ef] bg-[#f1f7fa] px-4 py-3 text-xs leading-5 text-[#698398]">公開後，其他旅人可以複製行程結構與地點；你的私人功能資料不會被複製。</p>
                  
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dce7ef] pt-5">
                    {selectedOwnedItinerary.isPublic ? <button type="button" onClick={unpublish} disabled={isSavingPublic} className="rounded-xl px-4 py-3 text-sm font-bold text-rose-500 transition hover:bg-rose-50 disabled:opacity-50">從旅遊景點下架</button> : <span className="text-xs font-medium text-[#8aa0b2]">這份行程目前尚未公開</span>}
                    <button type="button" onClick={() => void savePublicSettings(true)} disabled={isSavingPublic} className="inline-flex items-center gap-2 rounded-xl bg-[#5e7891] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#4d677f] disabled:cursor-wait disabled:opacity-60"><Upload size={16} />{isSavingPublic ? '儲存中…' : selectedOwnedItinerary.isPublic ? '更新公開內容' : '上傳行程'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 彈出視窗 2: 點擊單一卡片後的詳細預覽 (Preview Modal) */}
      {/* ========================================= */}
      {(isPreviewLoading || preview || previewError) && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#d7e4ec] bg-[#f8fbfd] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#dce7ef] bg-white px-6 py-5">
              <div><p className="text-xs font-bold tracking-[0.18em] text-[#8aa0b2]">ITINERARY PREVIEW</p><h2 className="mt-1 text-xl font-bold text-[#30485f]">行程預覽</h2></div>
              <button type="button" onClick={closePreview} className="rounded-xl p-2 text-[#89a0b1] transition hover:bg-[#eef5f9] hover:text-[#4e6d86]" aria-label="關閉"><X size={21} /></button>
            </div>

            {isPreviewLoading ? (
              <div className="flex min-h-80 items-center justify-center"><Loader2 className="size-8 animate-spin text-[#9fb5c4]" /></div>
            ) : previewError ? (
              <div className="p-6"><div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-600">{previewError}</div></div>
            ) : preview && (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  {/* 預覽：封面與作者區 */}
                  <div className="overflow-hidden rounded-2xl border border-[#dce7ef] bg-white">
                    <div className="relative h-48 bg-[#edf4f8] sm:h-56">
                      <img src={preview.coverImage || fallbackCover} alt="" className="size-full object-cover" onError={(event) => { event.currentTarget.src = fallbackCover; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5 text-white">
                        <h3 className="text-2xl font-bold">{preview.title}</h3>
                        <p className="mt-1 flex items-center gap-2 text-sm text-white/85"><CalendarDays size={15} />{preview.startDate} 至 {preview.endDate}</p>
                      </div>
                    </div>
                    <div className="p-5">
                      <Link href={`/profile/${encodeURIComponent(preview.owner.account)}`} title={`查看 ${preview.owner.name} 的個人主頁`} className="group/author inline-flex items-center gap-2 rounded-xl px-1 py-1 text-sm font-medium text-[#6b8599] transition hover:bg-[#edf4f8] hover:text-[#4f718b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f91aa]">
                        <div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-[#edf4f8] text-xs font-bold text-[#66839b] ring-1 ring-[#d5e4ec] transition group-hover/author:ring-[#9db6c8]">
                          {preview.owner.avatar ? <img src={preview.owner.avatar} alt="" className="size-full object-cover" /> : preview.owner.name.slice(0, 1)}
                        </div>
                        <span>{preview.owner.name}</span>
                        <span className="text-xs font-normal text-[#8aa2b2] group-hover/author:text-[#587891]">查看作品</span>
                      </Link>
                      {preview.description && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#6d8498]">{preview.description}</p>}
                    </div>
                  </div>

                  {/* 預覽：行程細節 (Tab: 行程內容 vs 點位地圖) */}
                  <div className="mt-6 rounded-2xl border border-[#dce7ef] bg-white p-5">
                    <div className="mb-5 flex gap-2 border-b border-[#e8f0f4] pb-3">
                      <button type="button" onClick={() => setPreviewTab('schedule')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${previewTab === 'schedule' ? 'bg-[#eaf3f8] text-[#52738c]' : 'text-[#91a6b7] hover:bg-[#f3f8fb]'}`}><Clock3 size={14} />行程內容</button>
                      <button type="button" onClick={() => setPreviewTab('map')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${previewTab === 'map' ? 'bg-[#eaf3f8] text-[#52738c]' : 'text-[#91a6b7] hover:bg-[#f3f8fb]'}`}><MapIcon size={14} />點位地圖</button>
                    </div>
                    
                    {previewTab === 'map' ? (
                      <ItineraryPreviewMap items={preview.items} />
                    ) : (
                      <>
                        <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-[#365168]">每日安排</h3><span className="text-xs font-medium text-[#8aa0b2]">{preview.items.length} 個地點</span></div>
                        {previewDays.length === 0 ? (
                          <p className="rounded-xl bg-[#f3f8fb] px-4 py-8 text-center text-sm text-[#8aa0b2]">作者尚未加入可預覽的地點。</p>
                        ) : (
                          <div className="space-y-5">
                            {previewDays.map(([dayNumber, items]) => (
                              <section key={dayNumber}>
                                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#58758c]"><span className="flex size-7 items-center justify-center rounded-full bg-[#edf4f8] text-xs">{dayNumber}</span>Day {dayNumber}</div>
                                <div className="ml-3 border-l border-[#d9e7ef] pl-5">
                                  {items.map((item) => (
                                    <div key={item.id} className="relative py-2.5">
                                      <span className="absolute -left-[26px] top-5 size-2.5 rounded-full border-2 border-white bg-[#7d9aaf]" />
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#87a0b1]"><Clock3 size={13} />{item.startTime || '未設定'}{item.endTime ? ` - ${item.endTime}` : ''}</span>
                                        <span className="font-medium text-[#405d73]">{item.title || '未命名地點'}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* 底部動作列 (確認複製) */}
                <div className="border-t border-[#dce7ef] bg-white px-6 py-4">
                  {copiedItineraryId ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-bold text-emerald-600">已複製為你的私人行程，可隨時到行程規劃編輯。</p>
                      <button type="button" onClick={closePreview} className="rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#4d677f]">完成</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs leading-5 text-[#8aa0b2]">複製後不會帶入記帳、票券或備忘錄。</p>
                      <button type="button" onClick={() => handleCopy(preview)} disabled={copyingId === preview.id} className="inline-flex items-center gap-2 rounded-xl bg-[#5e7891] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#4d677f] disabled:cursor-wait disabled:opacity-60">
                        <Copy size={16} />{copyingId === preview.id ? '複製中…' : '確認複製行程'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 隱藏式提示訊息 (Toast) */}
      {/* ========================================= */}
      {shareNotice && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-[#30485f] px-4 py-3 text-sm font-bold text-white shadow-xl" role="status">
          <div className="flex items-center gap-3">
            <span>{shareNotice}</span>
            <button type="button" onClick={() => setShareNotice('')} className="rounded-md p-0.5 text-white/70 transition hover:bg-white/15 hover:text-white" aria-label="關閉提示"><X size={15} /></button>
          </div>
        </div>
      )}

    </div>
  );
}
