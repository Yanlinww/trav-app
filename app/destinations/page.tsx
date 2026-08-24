'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleMap, Marker, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import { Bookmark, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Copy, Eye, Flag, Globe2, Heart, Loader2, Map as MapIcon, MapPin, Pencil, Search, Settings2, Share2, SlidersHorizontal, Sparkles, Upload, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type PublicItinerary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  transport: string;
  coverImage: string;
  description?: string | null;
  location?: string | null;
  tags: string[];
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

type OwnedItinerary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  transport: string;
  coverImage?: string | null;
  isPublic: boolean;
  publicTitle?: string | null;
  publicCoverImage?: string | null;
  publicDescription?: string | null;
  publicLocation?: string | null;
  tags: string[];
  itemCount: number;
  dayCount: number;
};

type PreviewItem = {
  id: string;
  dayNumber: number;
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  latitude: number | null;
  longitude: number | null;
};

type ItineraryPreview = Omit<PublicItinerary, 'itemCount' | 'dayCount'> & { items: PreviewItem[] };

const transportLabel: Record<string, string> = {
  public: '大眾運輸',
  car: '開車',
  motorcycle: '機車',
  train: '大眾運輸',
  other: '其他',
};

const fallbackCover = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop';

const publicTagOptions = ['獨旅', '慢遊', '美食', '咖啡', '自然景點', '文化歷史', '親子', '寵物友善', '低預算'];

const publicTagGroups = [
  { label: '旅行方式', tags: ['獨旅', '慢遊', '低預算'] },
  { label: '旅程主題', tags: ['美食', '咖啡', '自然景點', '文化歷史'] },
  { label: '同行需求', tags: ['親子', '寵物友善'] },
];

const durationFilterOptions = [
  { value: 'all', label: '不限天數' },
  { value: '1-2', label: '1–2 天' },
  { value: '3-4', label: '3–4 天' },
  { value: '5+', label: '5 天以上' },
];

const transportFilterOptions = [
  { value: '', label: '不限交通' },
  { value: 'public', label: '大眾運輸' },
  { value: 'car', label: '開車' },
  { value: 'motorcycle', label: '機車' },
  { value: 'train', label: '火車／高鐵' },
  { value: 'other', label: '其他' },
];

const itinerarySortOptions = [
  { value: 'popular', label: '熱門' },
  { value: 'newest', label: '最新公開' },
  { value: 'copied', label: '最多複製' },
] as const;

type ItinerarySort = (typeof itinerarySortOptions)[number]['value'];

function normalizePublicLocation(value?: string | null): string {
  if (!value) return '';
  const parts = value
    .replace(/臺/g, '台')
    .split(/[・|,，、/／>＞]+/u)
    .map((part) => part.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 4).join('・');
}

function sortPublicItineraries(rows: PublicItinerary[], sort: ItinerarySort): PublicItinerary[] {
  return [...rows].sort((left, right) => {
    if (sort === 'newest') {
      return Date.parse(right.publishedAt || right.startDate || '1970-01-01') - Date.parse(left.publishedAt || left.startDate || '1970-01-01') || Number(right.id) - Number(left.id);
    }
    if (sort === 'copied') {
      return right.copyCount - left.copyCount || right.likeCount - left.likeCount || Number(right.id) - Number(left.id);
    }
    return right.likeCount - left.likeCount || right.viewCount - left.viewCount || right.copyCount - left.copyCount || Number(right.id) - Number(left.id);
  });
}

function filterPublicItineraries(rows: PublicItinerary[], tags: string[], transport: string, duration: string, sort: ItinerarySort, location = ''): PublicItinerary[] {
  return sortPublicItineraries(rows.filter((itinerary) => {
    if (transport && itinerary.transport !== transport) return false;
    if (location && normalizePublicLocation(itinerary.location) !== location) return false;
    if (duration === '1-2' && (itinerary.dayCount < 1 || itinerary.dayCount > 2)) return false;
    if (duration === '3-4' && (itinerary.dayCount < 3 || itinerary.dayCount > 4)) return false;
    if (duration === '5+' && itinerary.dayCount < 5) return false;
    return tags.every((tag) => itinerary.tags.includes(tag));
  }), sort);
}

function ItineraryPreviewMap({ items }: { items: PreviewItem[] }) {
  const mapPoints = useMemo(() => items.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)), [items]);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    language: 'zh-TW',
    region: 'TW',
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!map || !isLoaded || mapPoints.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    mapPoints.forEach((item) => bounds.extend({ lat: Number(item.latitude), lng: Number(item.longitude) }));
    map.fitBounds(bounds, mapPoints.length === 1 ? 150 : 72);
  }, [isLoaded, map, mapPoints]);

  if (mapPoints.length === 0) return <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-[#cbdce7] bg-[#f5f9fb] px-6 text-center text-sm leading-6 text-[#849cad]">這份行程目前沒有可顯示的座標點位。</div>;
  if (loadError) return <div className="flex min-h-72 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 px-6 text-center text-sm text-rose-600">地圖暫時無法載入，仍可查看行程內容。</div>;
  if (!isLoaded) return <div className="flex min-h-72 items-center justify-center rounded-2xl border border-[#dce7ef] bg-white"><Loader2 className="size-7 animate-spin text-[#9fb5c4]" /></div>;

  return <div className="overflow-hidden rounded-2xl border border-[#dce7ef] bg-white"><GoogleMap mapContainerStyle={{ width: '100%', height: '440px' }} center={{ lat: Number(mapPoints[0].latitude), lng: Number(mapPoints[0].longitude) }} zoom={11} onLoad={setMap} options={{ disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false, styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }] }}>
    {mapPoints.length > 1 && <PolylineF path={mapPoints.map((item) => ({ lat: Number(item.latitude), lng: Number(item.longitude) }))} options={{ strokeColor: '#5e7891', strokeOpacity: 0.75, strokeWeight: 4 }} />}
    {mapPoints.map((item, index) => <Marker key={item.id} position={{ lat: Number(item.latitude), lng: Number(item.longitude) }} label={{ text: String(index + 1), color: '#ffffff', fontWeight: '700' }} title={`Day ${item.dayNumber} · ${item.title || '未命名地點'}`} />)}
  </GoogleMap></div>;
}

export default function DestinationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [itineraries, setItineraries] = useState<PublicItinerary[]>([]);
  const [publicItineraryCatalogue, setPublicItineraryCatalogue] = useState<PublicItinerary[]>([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [transportFilter, setTransportFilter] = useState('');
  const [durationFilter, setDurationFilter] = useState('all');
  const [sortBy, setSortBy] = useState<ItinerarySort>('popular');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'discover' | 'saved'>('discover');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [ownedItineraries, setOwnedItineraries] = useState<OwnedItinerary[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedOwnedId, setSelectedOwnedId] = useState<string | null>(null);
  const [publicTitle, setPublicTitle] = useState('');
  const [publicCoverImage, setPublicCoverImage] = useState('');
  const [publicDescription, setPublicDescription] = useState('');
  const [publicLocation, setPublicLocation] = useState('');
  const [publicTags, setPublicTags] = useState<string[]>([]);
  const [isSavingPublic, setIsSavingPublic] = useState(false);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [manageError, setManageError] = useState('');
  const [preview, setPreview] = useState<ItineraryPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [copiedItineraryId, setCopiedItineraryId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'schedule' | 'map'>('schedule');
  const [shareNotice, setShareNotice] = useState('');
  const [reportTarget, setReportTarget] = useState<PublicItinerary | null>(null);
  const [reportReason, setReportReason] = useState('不當內容');
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const itineraryListRef = useRef<PublicItinerary[]>([]);
  const publicItineraryCatalogueRef = useRef<PublicItinerary[]>([]);
  const publicRequestRef = useRef<AbortController | null>(null);
  const publicRequestIdRef = useRef(0);
  const hasPublicItineraryLoadedRef = useRef(false);

  const currentAccount = (user as any)?.id || (user as any)?.Account || '';

  const selectedOwnedItinerary = ownedItineraries.find((itinerary) => itinerary.id === selectedOwnedId) || null;
  const featuredItineraries = itineraries.slice(0, 4);
  const featuredItinerary = featuredItineraries[Math.min(featuredIndex, Math.max(featuredItineraries.length - 1, 0))];
  const popularTagSummaries = useMemo(() => {
    const tagCounts = new Map<string, number>();
    publicItineraryCatalogue.forEach((itinerary) => itinerary.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)));
    return publicTagOptions
      .map((tag) => ({ tag, count: tagCounts.get(tag) || 0 }))
      .filter(({ count }) => count > 0)
      .sort((left, right) => right.count - left.count || publicTagOptions.indexOf(left.tag) - publicTagOptions.indexOf(right.tag));
  }, [publicItineraryCatalogue]);
  const tagCountByName = useMemo(() => new Map(popularTagSummaries.map(({ tag, count }) => [tag, count])), [popularTagSummaries]);
  const popularLocationSummaries = useMemo(() => {
    const locationCounts = new Map<string, number>();
    publicItineraryCatalogue.forEach((itinerary) => {
      const location = normalizePublicLocation(itinerary.location);
      if (location) locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
    });
    return Array.from(locationCounts, ([location, count]) => ({ location, count })).sort((left, right) => right.count - left.count || left.location.localeCompare(right.location, 'zh-Hant'));
  }, [publicItineraryCatalogue]);

  useEffect(() => {
    itineraryListRef.current = itineraries;
  }, [itineraries]);

  const fetchPublicItineraries = useCallback(async (
    keyword = '',
    tags: string[] = [],
    transport = '',
    duration = 'all',
    limit = 24,
    savedOnly = false,
    sort: ItinerarySort = 'popular',
    location = '',
  ) => {
    publicRequestRef.current?.abort();
    const requestId = ++publicRequestIdRef.current;
    const controller = new AbortController();
    publicRequestRef.current = controller;
    const isInitialLoad = !hasPublicItineraryLoadedRef.current;
    if (isInitialLoad) setIsLoading(true);
    else setIsRefreshing(true);
    setError('');
    try {
      const response = await fetch('http://localhost:8080/destinations/get_public_itineraries.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Account: currentAccount, Search: keyword, Tags: tags, Transport: transport, Duration: duration, Sort: sort, Location: location, Limit: limit, Saved_Only: savedOnly }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '載入公開行程失敗');
      if (requestId === publicRequestIdRef.current) {
        hasPublicItineraryLoadedRef.current = true;
        const nextRows = Array.isArray(data.data) ? data.data as PublicItinerary[] : [];
        if (!savedOnly && !keyword && tags.length === 0 && !transport && duration === 'all' && !location) {
          publicItineraryCatalogueRef.current = nextRows;
          setPublicItineraryCatalogue(nextRows);
        }
        setItineraries(nextRows);
      }
    } catch (requestError) {
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

  useEffect(() => {
    void fetchPublicItineraries('', [], '', 'all', 48);
    return () => publicRequestRef.current?.abort();
  }, [fetchPublicItineraries]);
  useEffect(() => {
    setFeaturedIndex((index) => Math.min(index, Math.max(featuredItineraries.length - 1, 0)));
  }, [featuredItineraries.length]);

  const fetchOwnedItineraries = async () => {
    if (!currentAccount) return [] as OwnedItinerary[];
    const response = await fetch('http://localhost:8080/destinations/get_publishable_itineraries.php', {
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

  const selectOwnedItinerary = (itinerary: OwnedItinerary) => {
    setSelectedOwnedId(itinerary.id);
    setPublicTitle(itinerary.publicTitle || itinerary.title || '');
    setPublicCoverImage(itinerary.publicCoverImage || itinerary.coverImage || '');
    setPublicDescription(itinerary.publicDescription || '');
    setPublicLocation(itinerary.publicLocation || '');
    setPublicTags(itinerary.tags || []);
    setManageError('');
  };

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
      else if (!itineraryId) {
        setSelectedOwnedId(null);
        setPublicTitle('');
        setPublicCoverImage('');
        setPublicDescription('');
        setPublicLocation('');
        setPublicTags([]);
      }
    } catch (requestError) {
      setManageError(requestError instanceof Error ? requestError.message : '無法取得你的行程。');
    }
  };

  const closeManage = () => {
    setIsManageOpen(false);
    setSelectedOwnedId(null);
    setManageError('');
  };

  const savePublicSettings = async (isPublic: boolean) => {
    if (!selectedOwnedItinerary || !currentAccount) return;
    if (isPublic && !publicTitle.trim()) {
      setManageError('請填寫公開行程標題。');
      return;
    }

    setIsSavingPublic(true);
    setManageError('');
    try {
      const response = await fetch('http://localhost:8080/destinations/save_public_itinerary.php', {
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
          Tags: publicTags,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法儲存公開設定。');
      const savedOnly = viewMode === 'saved';
      await Promise.all([
        fetchOwnedItineraries(),
        fetchPublicItineraries('', [], '', 'all', 48, savedOnly, sortBy),
      ]);
      if (savedOnly || appliedSearch) await fetchPublicItineraries(appliedSearch, selectedTags, transportFilter, durationFilter, 24, savedOnly, sortBy, selectedLocation);
      else applyLocalFilters(selectedTags, transportFilter, durationFilter, sortBy, selectedLocation);
      closeManage();
    } catch (requestError) {
      setManageError(requestError instanceof Error ? requestError.message : '無法儲存公開設定。');
    } finally {
      setIsSavingPublic(false);
    }
  };

  const unpublish = () => {
    if (!selectedOwnedItinerary || !window.confirm('確定要從旅遊景點下架這份行程嗎？原本的私人行程與地點都會保留。')) return;
    void savePublicSettings(false);
  };

  const heading = useMemo(() => {
    if (viewMode === 'saved') return appliedSearch ? `收藏中符合「${appliedSearch}」的行程` : '我的收藏';
    return appliedSearch ? `「${appliedSearch}」的行程靈感` : '公開行程靈感';
  }, [appliedSearch, viewMode]);

  const applyLocalFilters = useCallback((tags: string[], transport: string, duration: string, sort: ItinerarySort = sortBy, location = selectedLocation) => {
    if (!hasPublicItineraryLoadedRef.current) return false;
    setItineraries(filterPublicItineraries(publicItineraryCatalogueRef.current, tags, transport, duration, sort, location).slice(0, 24));
    return true;
  }, [selectedLocation, sortBy]);

  const updateItineraryEngagement = useCallback((itineraryId: string, patch: Partial<Pick<PublicItinerary, 'likeCount' | 'viewCount' | 'isLiked' | 'isSaved'>>) => {
    const updateRows = (rows: PublicItinerary[]) => rows.map((item) => item.id === itineraryId ? { ...item, ...patch } : item);
    setItineraries((rows) => updateRows(rows));
    publicItineraryCatalogueRef.current = updateRows(publicItineraryCatalogueRef.current);
    setPreview((current) => current?.id === itineraryId ? { ...current, ...patch } : current);
  }, []);

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

  const recordPublicView = async (itineraryId: string) => {
    try {
      const response = await fetch('http://localhost:8080/destinations/record_public_itinerary_view.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itineraryId, Viewer_Key: getViewerKey() }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success' && typeof data.viewCount === 'number') {
        updateItineraryEngagement(itineraryId, { viewCount: data.viewCount });
      }
    } catch {
      // 瀏覽數記錄不應阻擋行程預覽。
    }
  };

  const toggleLike = async (itinerary: Pick<PublicItinerary, 'id'>) => {
    if (!currentAccount) {
      router.push('/auth/login');
      return;
    }
    setLikingId(itinerary.id);
    try {
      const response = await fetch('http://localhost:8080/destinations/toggle_public_itinerary_like.php', {
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

  const toggleSave = async (itinerary: Pick<PublicItinerary, 'id'>) => {
    if (!currentAccount) {
      router.push('/auth/login');
      return;
    }
    setSavingId(itinerary.id);
    try {
      const response = await fetch('http://localhost:8080/destinations/toggle_public_itinerary_save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itinerary.id, Account: currentAccount }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '收藏更新失敗');
      const isSaved = Boolean(data.isSaved);
      updateItineraryEngagement(itinerary.id, { isSaved });
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
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        setShareNotice('已複製分享連結');
      } catch {
        window.prompt('請複製這份公開行程連結：', url);
      }
    }
  };

  const openReport = (itinerary: PublicItinerary) => {
    if (!currentAccount) {
      router.push('/auth/login');
      return;
    }
    setReportTarget(itinerary);
    setReportReason('不當內容');
    setReportDetails('');
    setReportError('');
  };

  const closeReport = () => {
    if (isSubmittingReport) return;
    setReportTarget(null);
    setReportError('');
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    setIsSubmittingReport(true);
    setReportError('');
    try {
      const response = await fetch('http://localhost:8080/destinations/create_public_itinerary_report.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: reportTarget.id, Account: currentAccount, Reason: reportReason, Details: reportDetails.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '檢舉送出失敗');
      setReportTarget(null);
      setShareNotice(data.message || '已收到你的檢舉');
    } catch (requestError) {
      setReportError(requestError instanceof Error ? requestError.message : '檢舉送出失敗，請稍後再試。');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const switchViewMode = (nextMode: 'discover' | 'saved') => {
    if (nextMode === viewMode) return;
    if (nextMode === 'saved' && !currentAccount) {
      router.push('/auth/login');
      return;
    }
    setViewMode(nextMode);
    setSearch('');
    setAppliedSearch('');
    setSelectedTags([]);
    setTransportFilter('');
    setDurationFilter('all');
    setSelectedLocation('');
    void fetchPublicItineraries('', [], '', 'all', 48, nextMode === 'saved', sortBy);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = search.trim();
    setAppliedSearch(keyword);
    if (viewMode === 'discover' && !keyword && applyLocalFilters(selectedTags, transportFilter, durationFilter, sortBy, selectedLocation)) return;
    void fetchPublicItineraries(keyword, selectedTags, transportFilter, durationFilter, 24, viewMode === 'saved', sortBy, selectedLocation);
  };

  const toggleDiscoveryTag = (tag: string) => {
    const nextTags = selectedTags.includes(tag)
      ? selectedTags.filter((item) => item !== tag)
      : [...selectedTags, tag];
    setSelectedTags(nextTags);
    if (viewMode === 'discover' && !appliedSearch && applyLocalFilters(nextTags, transportFilter, durationFilter, sortBy, selectedLocation)) return;
    void fetchPublicItineraries(appliedSearch, nextTags, transportFilter, durationFilter, 24, viewMode === 'saved', sortBy, selectedLocation);
  };

  const updateTransportFilter = (value: string) => {
    setTransportFilter(value);
    if (viewMode === 'discover' && !appliedSearch && applyLocalFilters(selectedTags, value, durationFilter, sortBy, selectedLocation)) return;
    void fetchPublicItineraries(appliedSearch, selectedTags, value, durationFilter, 24, viewMode === 'saved', sortBy, selectedLocation);
  };

  const updateDurationFilter = (value: string) => {
    setDurationFilter(value);
    if (viewMode === 'discover' && !appliedSearch && applyLocalFilters(selectedTags, transportFilter, value, sortBy, selectedLocation)) return;
    void fetchPublicItineraries(appliedSearch, selectedTags, transportFilter, value, 24, viewMode === 'saved', sortBy, selectedLocation);
  };

  const updateLocationFilter = (location: string) => {
    const nextLocation = selectedLocation === location ? '' : location;
    setSelectedLocation(nextLocation);
    if (viewMode === 'discover' && !appliedSearch && applyLocalFilters(selectedTags, transportFilter, durationFilter, sortBy, nextLocation)) return;
    void fetchPublicItineraries(appliedSearch, selectedTags, transportFilter, durationFilter, 24, viewMode === 'saved', sortBy, nextLocation);
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setTransportFilter('');
    setDurationFilter('all');
    setSelectedLocation('');
    if (viewMode === 'discover' && !appliedSearch && applyLocalFilters([], '', 'all', sortBy, '')) return;
    void fetchPublicItineraries(appliedSearch, [], '', 'all', 24, viewMode === 'saved', sortBy, '');
  };

  const updateSort = (nextSort: ItinerarySort) => {
    if (nextSort === sortBy) return;
    setSortBy(nextSort);
    if (viewMode === 'discover' && !appliedSearch && applyLocalFilters(selectedTags, transportFilter, durationFilter, nextSort, selectedLocation)) return;
    void fetchPublicItineraries(appliedSearch, selectedTags, transportFilter, durationFilter, 24, viewMode === 'saved', nextSort, selectedLocation);
  };

  const togglePublicTag = (tag: string) => {
    if (publicTags.includes(tag)) {
      setPublicTags(publicTags.filter((item) => item !== tag));
      return;
    }
    if (publicTags.length >= 5) {
      setManageError('最多可選擇 5 個旅遊標籤。');
      return;
    }
    setManageError('');
    setPublicTags([...publicTags, tag]);
  };

  const openPreview = async (itineraryId: string) => {
    setPreview(null);
    setPreviewError('');
    setCopiedItineraryId(null);
    setPreviewTab('schedule');
    setIsPreviewLoading(true);
    try {
      const response = await fetch('http://localhost:8080/destinations/get_public_itinerary_preview.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itineraryId }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '無法載入行程預覽。');
      setPreview(data.data as ItineraryPreview);
      void recordPublicView(itineraryId);
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
      const response = await fetch('http://localhost:8080/destinations/copy_public_itinerary.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itinerary.id, Account: currentAccount }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || '複製行程失敗');
      setCopiedItineraryId(String(data.itineraryId));
      const savedOnly = viewMode === 'saved';
      await fetchPublicItineraries('', [], '', 'all', 48, savedOnly, sortBy);
      if (savedOnly || appliedSearch) await fetchPublicItineraries(appliedSearch, selectedTags, transportFilter, durationFilter, 24, savedOnly, sortBy, selectedLocation);
      else applyLocalFilters(selectedTags, transportFilter, durationFilter, sortBy, selectedLocation);
    } catch (requestError) {
      window.alert(requestError instanceof Error ? requestError.message : '複製行程失敗，請稍後再試。');
    } finally {
      setCopyingId(null);
    }
  };

  const previewDays = useMemo(() => {
    if (!preview) return [] as Array<[number, PreviewItem[]]>;
    const groups = new Map<number, PreviewItem[]>();
    preview.items.forEach((item) => groups.set(item.dayNumber, [...(groups.get(item.dayNumber) || []), item]));
    return Array.from(groups.entries()).sort(([firstDay], [secondDay]) => firstDay - secondDay);
  }, [preview]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] pb-16 text-[#31485f]">
      <section className="relative isolate min-h-[540px] overflow-hidden border-b border-[#d5e1e9] bg-[#3d5a70] px-4 py-8 text-white sm:px-6 lg:px-10 lg:py-10">
        <img src={featuredItinerary?.coverImage || fallbackCover} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(19,37,51,0.9)_0%,rgba(28,48,63,0.76)_42%,rgba(28,48,63,0.25)_100%)]" />
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-[0.18em] text-white/85 backdrop-blur-md"><Sparkles size={15} />TRAVMATE INSPIRATION</div>
          <button type="button" onClick={() => void openManage()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/25"><Upload size={17} />上傳行程</button>
        </div>

        <div className="mx-auto mt-8 max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-bold tracking-[0.2em] text-white/70">{viewMode === 'saved' ? 'MY SAVED PLANS' : '行程靈感'}</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{viewMode === 'saved' ? '留住想出發的旅行靈感' : '看看其他旅人怎麼安排'}</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/78 sm:text-base">{viewMode === 'saved' ? '先收藏，再慢慢比較；準備好時再複製成可自由修改的私人行程。' : '探索公開行程、找到適合自己的旅行節奏，再複製成可自由修改的私人行程。'}</p>

              <form onSubmit={submitSearch} className="mt-6 flex max-w-xl flex-col gap-2 rounded-2xl border border-white/25 bg-white/92 p-2 shadow-xl shadow-slate-950/15 backdrop-blur-md sm:flex-row">
                <label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-[#7790a4]"><Search size={19} className="shrink-0" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋行程名稱或目的地" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#31485f] outline-none placeholder:text-[#9cb0bf]" /></label>
                <button type="submit" className="rounded-xl bg-[#56758e] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#45647d]">搜尋</button>
              </form>

              {viewMode === 'discover' && popularTagSummaries.length > 0 && <div className="mt-3 flex max-w-xl flex-wrap items-center gap-2 text-xs text-white/80"><span className="mr-1 font-bold text-white/65">熱門主題</span>{popularTagSummaries.slice(0, 4).map(({ tag, count }) => <button type="button" key={tag} onClick={() => { setIsFilterOpen(true); toggleDiscoveryTag(tag); }} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 font-bold transition ${selectedTags.includes(tag) ? 'border-white bg-white text-[#496981]' : 'border-white/25 bg-white/10 text-white hover:bg-white/20'}`}>#{tag}<span className="text-[10px] opacity-75">{count}</span></button>)}<button type="button" onClick={() => setIsFilterOpen(true)} className="rounded-full px-2 py-1.5 font-bold text-white/70 transition hover:bg-white/10 hover:text-white">全部標籤</button></div>}

              <div className="mt-3 max-w-xl rounded-2xl border border-white/20 bg-slate-900/20 backdrop-blur-md">
                <button type="button" onClick={() => setIsFilterOpen((value) => !value)} aria-expanded={isFilterOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/10"><span className="inline-flex items-center gap-2"><SlidersHorizontal size={16} />篩選行程{(selectedTags.length > 0 || selectedLocation || transportFilter || durationFilter !== 'all') && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">{selectedTags.length + Number(Boolean(selectedLocation)) + Number(Boolean(transportFilter)) + Number(durationFilter !== 'all')}</span>}</span><ChevronDown size={17} className={`transition ${isFilterOpen ? 'rotate-180' : ''}`} /></button>
                {isFilterOpen && <div className="border-t border-white/15 bg-white/95 p-4 text-[#4e697e] shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold">探索條件</span>{(selectedTags.length > 0 || selectedLocation || transportFilter || durationFilter !== 'all') && <button type="button" onClick={clearFilters} className="text-xs font-bold text-[#5e7891] hover:text-[#365168]">清除篩選</button>}</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#7891a4]">旅行天數<select value={durationFilter} onChange={(event) => updateDurationFilter(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d6e3eb] bg-[#f8fbfd] px-3 py-2.5 text-sm font-medium text-[#4e697e] outline-none focus:border-[#7d9aaf]">{durationFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="text-xs font-bold text-[#7891a4]">交通方式<select value={transportFilter} onChange={(event) => updateTransportFilter(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d6e3eb] bg-[#f8fbfd] px-3 py-2.5 text-sm font-medium text-[#4e697e] outline-none focus:border-[#7d9aaf]">{transportFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
                  {popularLocationSummaries.length > 0 && <div className="mt-4"><p className="mb-1.5 text-[11px] font-bold tracking-wide text-[#8ca3b4]">目的地</p><div className="flex flex-wrap gap-2">{popularLocationSummaries.slice(0, 8).map(({ location, count }) => <button type="button" key={location} onClick={() => updateLocationFilter(location)} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${selectedLocation === location ? 'border-[#5e7891] bg-[#5e7891] text-white shadow-sm' : 'border-[#d6e3eb] bg-[#f8fbfd] text-[#668096] hover:border-[#a9bfce] hover:bg-[#f0f6f9]'}`}><MapPin size={12} />{location}<span className={`text-[10px] ${selectedLocation === location ? 'text-white/75' : 'text-[#98acba]'}`}>{count}</span></button>)}</div></div>}
                  <div className="mt-4 space-y-3">{publicTagGroups.map((group) => <div key={group.label}><p className="mb-1.5 text-[11px] font-bold tracking-wide text-[#8ca3b4]">{group.label}</p><div className="flex flex-wrap gap-2">{group.tags.map((tag) => { const count = tagCountByName.get(tag) || 0; return <button type="button" key={tag} onClick={() => toggleDiscoveryTag(tag)} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${selectedTags.includes(tag) ? 'border-[#5e7891] bg-[#5e7891] text-white shadow-sm' : 'border-[#d6e3eb] bg-[#f8fbfd] text-[#668096] hover:border-[#a9bfce] hover:bg-[#f0f6f9]'}`}>#{tag}{count > 0 && <span className={`text-[10px] ${selectedTags.includes(tag) ? 'text-white/75' : 'text-[#98acba]'}`}>{count}</span>}</button>; })}</div></div>)}</div>
                  <p className="mt-3 text-xs leading-5 text-[#91a6b7]">標籤後的數字代表目前公開行程數量；多選會以「同時符合」搜尋。</p>
                </div>}
              </div>
            </div>

            <div className="min-w-0">
              {featuredItinerary ? <>
                <div className="mb-3 flex items-center justify-between text-sm font-bold text-white/85"><span>旅人推薦</span><span className="text-xs font-medium text-white/60">{featuredIndex + 1} / {featuredItineraries.length}</span></div>
                <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {featuredItineraries.map((itinerary, index) => <button type="button" key={itinerary.id} onClick={() => setFeaturedIndex(index)} className={`group relative h-56 w-40 shrink-0 overflow-hidden rounded-2xl border text-left shadow-xl transition sm:w-44 ${featuredItinerary.id === itinerary.id ? 'border-white/80 ring-2 ring-white/45' : 'border-white/20 opacity-80 hover:opacity-100'}`}><img src={itinerary.coverImage || fallbackCover} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.src = fallbackCover; }} /><span className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" /><span className="absolute inset-x-3 bottom-3 line-clamp-2 text-sm font-bold leading-5 text-white">{itinerary.title}</span></button>)}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-slate-950/25 px-4 py-3 backdrop-blur-md"><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{featuredItinerary.title}</p><p className="mt-1 text-xs text-white/70">{featuredItinerary.owner.name} · {featuredItinerary.dayCount} 天 · {featuredItinerary.itemCount} 個地點</p></div><div className="flex items-center gap-2"><button type="button" aria-label="上一個推薦" onClick={() => setFeaturedIndex((index) => (index - 1 + featuredItineraries.length) % featuredItineraries.length)} className="rounded-lg p-2 text-white/85 transition hover:bg-white/15"><ChevronLeft size={18} /></button><button type="button" onClick={() => void openPreview(featuredItinerary.id)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#45647d] transition hover:bg-[#eef5f9]">查看行程</button><button type="button" aria-label="下一個推薦" onClick={() => setFeaturedIndex((index) => (index + 1) % featuredItineraries.length)} className="rounded-lg p-2 text-white/85 transition hover:bg-white/15"><ChevronRight size={18} /></button></div></div>
              </> : <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-sm leading-6 text-white/75 backdrop-blur-md">公開行程會在這裡顯示，成為其他旅人的下一段靈感。</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#8aa0b2]">COMMUNITY PLANS</p>
            <h2 className="mt-2 text-2xl font-bold text-[#30485f]">{heading}</h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2"><button type="button" onClick={() => switchViewMode('discover')} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${viewMode === 'discover' ? 'bg-[#5e7891] text-white shadow-sm' : 'bg-white text-[#698499] hover:bg-[#eaf2f7]'}`}><Globe2 size={14} />探索行程</button><button type="button" onClick={() => switchViewMode('saved')} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${viewMode === 'saved' ? 'bg-[#5e7891] text-white shadow-sm' : 'bg-white text-[#698499] hover:bg-[#eaf2f7]'}`}><Bookmark size={14} className={viewMode === 'saved' ? 'fill-current' : ''} />我的收藏</button><label className="inline-flex items-center rounded-xl border border-[#d7e4ec] bg-white px-2 text-xs font-bold text-[#698499]"><span className="sr-only">行程排序</span><select value={sortBy} onChange={(event) => updateSort(event.target.value as ItinerarySort)} className="cursor-pointer bg-transparent py-2 text-xs font-bold outline-none">{itinerarySortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{!isLoading && <span className="inline-flex items-center gap-2 text-sm text-[#91a6b7]">{isRefreshing && <Loader2 className="size-4 animate-spin" />}共 {itineraries.length} 份</span>}</div>
        </div>

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border border-[#dce7ef] bg-white shadow-sm"><Loader2 className="size-7 animate-spin text-[#b2c3cf]" /></div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 px-6 py-12 text-center"><p className="font-bold text-rose-700">暫時無法載入{viewMode === 'saved' ? '收藏行程' : '行程靈感'}</p><p className="mt-2 text-sm text-rose-500">{error}</p><button type="button" onClick={() => void fetchPublicItineraries(appliedSearch, selectedTags, transportFilter, durationFilter, 24, viewMode === 'saved', sortBy, selectedLocation)} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-700 shadow-sm">重新整理</button></div>
        ) : itineraries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cbdce7] bg-white px-6 py-20 text-center shadow-sm">{viewMode === 'saved' ? <><Bookmark className="mx-auto text-[#b2c5d2]" size={32} /><h3 className="mt-5 text-lg font-bold text-[#4c657b]">收藏清單還是空的</h3><p className="mt-2 text-sm text-[#91a6b7]">看到喜歡的公開行程時，按下書籤就能先留在這裡。</p><button type="button" onClick={() => switchViewMode('discover')} className="mt-5 rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#4d677f]">探索公開行程</button></> : <><Globe2 className="mx-auto text-[#b2c5d2]" size={32} /><h3 className="mt-5 text-lg font-bold text-[#4c657b]">目前還沒有公開行程</h3><p className="mt-2 text-sm text-[#91a6b7]">完成一份行程後，可在「行程規劃」將它公開分享。</p></>}</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {itineraries.map((itinerary) => (
              <article key={itinerary.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce7ef] bg-white shadow-[0_6px_18px_rgba(66,96,120,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#c4d8e6] hover:shadow-[0_14px_28px_rgba(66,96,120,0.12)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#edf4f8]">
                  <img src={itinerary.coverImage || fallbackCover} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.src = fallbackCover; }} />
                  {itinerary.location && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent px-4 pb-3 pt-12 text-xs font-bold text-white"><span className="inline-flex items-center gap-1"><MapPin size={13} /> {itinerary.location}</span></div>}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="line-clamp-2 min-h-12 break-words text-lg font-bold leading-6 text-[#30485f]">{itinerary.title}</h3>
                  <p className="mt-2 min-h-10 break-all text-sm leading-5 text-[#7690a3] line-clamp-2">{itinerary.description || ''}</p>
                  <div className="mt-3 min-h-7 overflow-hidden">
                    {itinerary.tags.length > 0 && <div className="flex flex-nowrap gap-1.5">{itinerary.tags.slice(0, 3).map((tag) => <Link href={`/destinations/tag/${encodeURIComponent(tag)}`} key={tag} className="shrink-0 rounded-full bg-[#edf4f8] px-2 py-1 text-[11px] font-bold text-[#5f7c94] transition hover:bg-[#dcecf4] hover:text-[#45647d]">#{tag}</Link>)}</div>}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs text-[#91a6b7]"><span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {itinerary.dayCount} 天</span><span>{itinerary.itemCount} 個地點</span><span>{itinerary.copyCount} 次複製</span><span className="inline-flex items-center gap-1"><Eye size={13} />{itinerary.viewCount}</span></div>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf2f5] pt-4">
                    <div className="flex min-w-0 items-center gap-2"><div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#edf4f8] text-[10px] font-bold text-[#688198]">{itinerary.owner.avatar ? <img src={itinerary.owner.avatar} alt="" className="size-full object-cover" /> : itinerary.owner.name.slice(0, 1)}</div><span className="truncate text-xs font-medium text-[#688198]">{itinerary.owner.name}</span></div>
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2"><button type="button" onClick={() => void toggleLike(itinerary)} disabled={likingId === itinerary.id} className={`inline-flex items-center gap-1 rounded-xl border px-2 py-2 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 sm:px-2.5 ${itinerary.isLiked ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-[#d7e4ec] bg-white text-[#7690a3] hover:border-rose-200 hover:text-rose-500'}`} aria-label={itinerary.isLiked ? '取消按讚' : '按讚'}><Heart size={14} className={itinerary.isLiked ? 'fill-current' : ''} />{itinerary.likeCount}</button><button type="button" onClick={() => void toggleSave(itinerary)} disabled={savingId === itinerary.id} title={itinerary.isSaved ? '取消收藏' : '收藏行程'} aria-label={itinerary.isSaved ? '取消收藏' : '收藏行程'} className={`inline-flex rounded-xl border p-2 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 ${itinerary.isSaved ? 'border-[#c7dce9] bg-[#eaf4f9] text-[#4e718c]' : 'border-[#d7e4ec] bg-white text-[#7690a3] hover:border-[#a9c3d4] hover:text-[#4e718c]'}`}><Bookmark size={15} className={itinerary.isSaved ? 'fill-current' : ''} /></button><button type="button" onClick={() => void sharePublicItinerary(itinerary)} title="分享公開行程" aria-label="分享公開行程" className="inline-flex rounded-xl border border-[#d7e4ec] bg-white p-2 text-[#7690a3] transition hover:border-[#a9c3d4] hover:text-[#4e718c]"><Share2 size={15} /></button>{currentAccount === itinerary.owner.account ? (
                      <button type="button" onClick={() => void openManage(itinerary.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#c9dbe7] bg-[#f4f8fb] px-3 py-2 text-xs font-bold text-[#58758c] transition hover:bg-[#eaf2f7]"><Settings2 size={14} />管理</button>
                    ) : (
                      <><button type="button" onClick={() => openReport(itinerary)} title="檢舉公開行程" aria-label="檢舉公開行程" className="inline-flex rounded-xl border border-[#d7e4ec] bg-white p-2 text-[#7690a3] transition hover:border-rose-200 hover:text-rose-500"><Flag size={15} /></button><button type="button" onClick={() => void openPreview(itinerary.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#5e7891] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#4d677f]"><Eye size={14} />預覽</button></>
                    )}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-[#dce7ef] bg-white px-5 py-4 text-sm leading-6 text-[#6d8498] shadow-sm"><Users className="mr-2 inline text-[#8ca4b6]" size={17} />複製後的行程只屬於你；你可以自行調整時間、地點與封面，原作者的行程不會受到影響。</div>
      </section>

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
                  <p className="mb-4 text-sm leading-6 text-[#71899b]">選擇一份你建立的行程，設定公開標題與封面後即可上傳。公開內容不會包含記帳、票券、備忘錄、聊天或旅伴資料。</p>
                  <div className="space-y-3">
                    {ownedItineraries.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cbdce7] bg-white px-5 py-12 text-center text-sm text-[#91a6b7]">你目前還沒有可上傳的行程。<button type="button" onClick={() => router.push('/planner')} className="ml-2 font-bold text-[#5e7891] hover:underline">先建立行程</button></div> : ownedItineraries.map((itinerary) => (
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
                  <div className="rounded-2xl border border-[#dce7ef] bg-white p-4"><div className="text-xs font-bold tracking-wide text-[#8aa0b2]">原始行程</div><div className="mt-1 flex items-center justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-bold text-[#365168]">{selectedOwnedItinerary.title}</h3><p className="mt-1 text-xs text-[#8aa0b2]">{selectedOwnedItinerary.dayCount} 天 · {selectedOwnedItinerary.itemCount} 個地點</p></div><button type="button" onClick={() => router.push(`/planner/${selectedOwnedItinerary.id}`)} className="shrink-0 rounded-lg bg-[#eef5f9] px-3 py-2 text-xs font-bold text-[#58758c] hover:bg-[#e3eef4]">編輯原行程</button></div></div>
                  <label className="block text-sm font-bold text-[#4e697e]">公開標題<input value={publicTitle} onChange={(event) => setPublicTitle(event.target.value)} maxLength={255} placeholder="例如：台北三天兩夜慢遊行程" className="mt-2 w-full rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm text-[#365168] outline-none transition focus:border-[#7d9aaf]" /></label>
                  <label className="block text-sm font-bold text-[#4e697e]">目的地 <span className="font-medium text-[#9aafbd]">（選填）</span><input value={publicLocation} onChange={(event) => setPublicLocation(event.target.value)} onBlur={() => setPublicLocation((value) => normalizePublicLocation(value))} maxLength={150} placeholder="例如：日本・東京，或台灣・台中" className="mt-2 w-full rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm text-[#365168] outline-none transition focus:border-[#7d9aaf]" /><span className="mt-1 block text-xs font-medium text-[#9aafbd]">建議使用「國家・城市」；儲存時會統一分隔符號，讓其他旅人可直接依目的地篩選。</span>{popularLocationSummaries.length > 0 && <span className="mt-3 flex flex-wrap gap-2">{popularLocationSummaries.slice(0, 6).map(({ location }) => <button type="button" key={location} onClick={() => setPublicLocation(location)} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${normalizePublicLocation(publicLocation) === location ? 'border-[#5e7891] bg-[#5e7891] text-white' : 'border-[#d6e3eb] bg-[#f8fbfd] text-[#668096] hover:border-[#a9bfce]'}`}>#{location}</button>)}</span>}</label>
                  <label className="block text-sm font-bold text-[#4e697e]">公開封面連結 <span className="font-medium text-[#9aafbd]">（選填）</span><input value={publicCoverImage} onChange={(event) => setPublicCoverImage(event.target.value)} type="url" placeholder="https://..." className="mt-2 w-full rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm text-[#365168] outline-none transition focus:border-[#7d9aaf]" /></label>
                  <label className="block text-sm font-bold text-[#4e697e]">行程簡介 <span className="font-medium text-[#9aafbd]">（選填，最多 1000 字）</span><textarea value={publicDescription} onChange={(event) => setPublicDescription(event.target.value)} maxLength={1000} rows={4} placeholder="分享這趟旅行的亮點、適合什麼樣的旅人，或行前注意事項…" className="mt-2 w-full resize-none rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm leading-6 text-[#365168] outline-none transition focus:border-[#7d9aaf]" /><span className="mt-1 block text-right text-xs font-medium text-[#9aafbd]">{publicDescription.length}/1000</span></label>
                  <p className="rounded-xl border border-[#dce8ef] bg-[#f1f7fa] px-4 py-3 text-xs leading-5 text-[#698398]">公開後，其他旅人可以複製行程結構與地點；你的私人功能資料不會被複製。</p>
                  <div className="rounded-2xl border border-[#dce7ef] bg-white p-4">
                    <div className="flex items-center justify-between gap-3"><div className="text-sm font-bold text-[#4e697e]">旅遊標籤</div><span className="text-xs font-medium text-[#8da3b3]">{publicTags.length}/5</span></div>
                    <p className="mt-1 text-xs leading-5 text-[#91a6b7]">選擇能描述這份行程的標籤，讓其他旅人更容易找到它。</p>
                    <div className="mt-3 flex flex-wrap gap-2">{publicTagOptions.map((tag) => <button type="button" key={tag} onClick={() => togglePublicTag(tag)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${publicTags.includes(tag) ? 'border-[#5e7891] bg-[#5e7891] text-white' : 'border-[#d6e3eb] bg-[#f8fbfd] text-[#668096] hover:border-[#a9bfce]'}`}>#{tag}</button>)}</div>
                  </div>
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

      {(isPreviewLoading || preview || previewError) && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#d7e4ec] bg-[#f8fbfd] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#dce7ef] bg-white px-6 py-5">
              <div><p className="text-xs font-bold tracking-[0.18em] text-[#8aa0b2]">ITINERARY PREVIEW</p><h2 className="mt-1 text-xl font-bold text-[#30485f]">行程預覽</h2></div>
              <button type="button" onClick={closePreview} className="rounded-xl p-2 text-[#89a0b1] transition hover:bg-[#eef5f9] hover:text-[#4e6d86]" aria-label="關閉"><X size={21} /></button>
            </div>

            {isPreviewLoading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="size-8 animate-spin text-[#9fb5c4]" /></div> : previewError ? <div className="p-6"><div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-600">{previewError}</div></div> : preview && (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  <div className="overflow-hidden rounded-2xl border border-[#dce7ef] bg-white">
                    <div className="relative h-48 bg-[#edf4f8] sm:h-56"><img src={preview.coverImage || fallbackCover} alt="" className="size-full object-cover" onError={(event) => { event.currentTarget.src = fallbackCover; }} /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" /><div className="absolute bottom-4 left-5 right-5 text-white"><h3 className="text-2xl font-bold">{preview.title}</h3><p className="mt-1 flex items-center gap-2 text-sm text-white/85"><CalendarDays size={15} />{preview.startDate} 至 {preview.endDate}</p></div></div>
                    <div className="p-5"><div className="flex items-center gap-2 text-sm font-medium text-[#6b8599]"><div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-[#edf4f8] text-xs font-bold text-[#66839b]">{preview.owner.avatar ? <img src={preview.owner.avatar} alt="" className="size-full object-cover" /> : preview.owner.name.slice(0, 1)}</div>{preview.owner.name}</div>{preview.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{preview.tags.map((tag) => <span key={tag} className="rounded-full bg-[#edf4f8] px-2.5 py-1 text-[11px] font-bold text-[#5f7c94]">#{tag}</span>)}</div>}{preview.description && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#6d8498]">{preview.description}</p>}</div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-[#dce7ef] bg-white p-5">
                    <div className="mb-5 flex gap-2 border-b border-[#e8f0f4] pb-3"><button type="button" onClick={() => setPreviewTab('schedule')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${previewTab === 'schedule' ? 'bg-[#eaf3f8] text-[#52738c]' : 'text-[#91a6b7] hover:bg-[#f3f8fb]'}`}><Clock3 size={14} />行程內容</button><button type="button" onClick={() => setPreviewTab('map')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${previewTab === 'map' ? 'bg-[#eaf3f8] text-[#52738c]' : 'text-[#91a6b7] hover:bg-[#f3f8fb]'}`}><MapIcon size={14} />點位地圖</button></div>
                    {previewTab === 'map' ? <ItineraryPreviewMap items={preview.items} /> : <>
                    <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-[#365168]">每日安排</h3><span className="text-xs font-medium text-[#8aa0b2]">{preview.items.length} 個地點</span></div>
                    {previewDays.length === 0 ? <p className="rounded-xl bg-[#f3f8fb] px-4 py-8 text-center text-sm text-[#8aa0b2]">作者尚未加入可預覽的地點。</p> : <div className="space-y-5">{previewDays.map(([dayNumber, items]) => <section key={dayNumber}><div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#58758c]"><span className="flex size-7 items-center justify-center rounded-full bg-[#edf4f8] text-xs">{dayNumber}</span>Day {dayNumber}</div><div className="ml-3 border-l border-[#d9e7ef] pl-5">{items.map((item) => <div key={item.id} className="relative py-2.5"><span className="absolute -left-[26px] top-5 size-2.5 rounded-full border-2 border-white bg-[#7d9aaf]" /><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="inline-flex items-center gap-1 text-xs font-medium text-[#87a0b1]"><Clock3 size={13} />{item.startTime || '未設定'}{item.endTime ? ` - ${item.endTime}` : ''}</span><span className="font-medium text-[#405d73]">{item.title || '未命名地點'}</span></div></div>)}</div></section>)}</div>}
                    </>}
                  </div>
                </div>
                <div className="border-t border-[#dce7ef] bg-white px-6 py-4">
                  {copiedItineraryId ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-emerald-600">已複製為你的私人行程，可隨時到行程規劃編輯。</p><button type="button" onClick={closePreview} className="rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#4d677f]">完成</button></div> : <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-[#8aa0b2]">複製後不會帶入記帳、票券、備忘錄、聊天或旅伴資料。</p><button type="button" onClick={() => handleCopy(preview)} disabled={copyingId === preview.id} className="inline-flex items-center gap-2 rounded-xl bg-[#5e7891] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#4d677f] disabled:cursor-wait disabled:opacity-60"><Copy size={16} />{copyingId === preview.id ? '複製中…' : '確認複製行程'}</button></div>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {shareNotice && <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-[#30485f] px-4 py-3 text-sm font-bold text-white shadow-xl" role="status"><div className="flex items-center gap-3"><span>{shareNotice}</span><button type="button" onClick={() => setShareNotice('')} className="rounded-md p-0.5 text-white/70 transition hover:bg-white/15 hover:text-white" aria-label="關閉提示"><X size={15} /></button></div></div>}

      {reportTarget && <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-[#d7e4ec] bg-[#f8fbfd] shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-[#dce7ef] bg-white px-6 py-5"><div><p className="text-xs font-bold tracking-[0.16em] text-[#8aa0b2]">REPORT PUBLIC ITINERARY</p><h2 className="mt-1 text-xl font-bold text-[#30485f]">檢舉公開行程</h2><p className="mt-2 line-clamp-1 text-sm text-[#7891a3]">{reportTarget.title}</p></div><button type="button" onClick={closeReport} disabled={isSubmittingReport} className="rounded-xl p-2 text-[#89a0b1] transition hover:bg-[#eef5f9] disabled:opacity-50" aria-label="關閉"><X size={21} /></button></div><div className="space-y-5 p-6"><label className="block text-sm font-bold text-[#4e697e]">檢舉原因<select value={reportReason} onChange={(event) => setReportReason(event.target.value)} disabled={isSubmittingReport} className="mt-2 w-full rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm text-[#365168] outline-none transition focus:border-[#7d9aaf]"><option value="不當內容">不當內容</option><option value="詐騙或不實資訊">詐騙或不實資訊</option><option value="侵犯權利">侵犯權利</option><option value="其他">其他</option></select></label><label className="block text-sm font-bold text-[#4e697e]">補充說明 <span className="font-medium text-[#9aafbd]">（選填）</span><textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} disabled={isSubmittingReport} maxLength={500} rows={4} placeholder="請簡單說明你認為需要確認的內容…" className="mt-2 w-full resize-none rounded-xl border border-[#cbdce7] bg-white px-4 py-3 text-sm leading-6 text-[#365168] outline-none transition focus:border-[#7d9aaf]" /><span className="mt-1 block text-right text-xs font-medium text-[#9aafbd]">{reportDetails.length}/500</span></label>{reportError && <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{reportError}</p>}<p className="rounded-xl border border-[#dce8ef] bg-[#f1f7fa] px-4 py-3 text-xs leading-5 text-[#698398]">同一份行程再次送出時，會更新你原本的檢舉內容，不會重複建立資料。</p><div className="flex items-center justify-end gap-3"><button type="button" onClick={closeReport} disabled={isSubmittingReport} className="rounded-xl px-4 py-3 text-sm font-bold text-[#7891a3] transition hover:bg-[#eef5f9] disabled:opacity-50">取消</button><button type="button" onClick={() => void submitReport()} disabled={isSubmittingReport} className="inline-flex items-center gap-2 rounded-xl bg-[#5e7891] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#4d677f] disabled:cursor-wait disabled:opacity-60"><Flag size={16} />{isSubmittingReport ? '送出中…' : '送出檢舉'}</button></div></div></div></div>}
    </div>
  );
}
