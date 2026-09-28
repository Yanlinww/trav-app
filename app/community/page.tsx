"use client";

// 引用 React 核心 Hooks 與相關型別
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
// 引用 Next.js 最佳化圖片組件與路由管理 Hook
import Image from "next/image";
import { useRouter } from "next/navigation"; 
// 引用 Lucide React 圖示庫，用於 UI 介面圖示呈現
import {
  Bookmark,
  ChevronRight,
  Compass,
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
// 引用全域驗證上下文 Hook
import { useAuth } from "../context/AuthContext";

/** ==========================================
 *  型別定義區塊 (TypeScript Type Definitions)
 *  ========================================== */

// 貼文分類型別：足跡、請益、揪團
type PostType = "footprint" | "question" | "group";

// 標籤頁過濾型別：包含「全部」以及個別貼文類型
type TabType = "all" | PostType;

// 社群貼文作者資料結構
type CommunityAuthor = {
  account?: string; // 作者會員帳號（選擇性，用於個人頁面跳轉）
  name: string;     // 作者顯示名稱 / 暱稱
  avatar: string;   // 作者頭像 URL
};

// 社群留言資料結構
type CommunityComment = {
  id: number;               // 留言唯一識別碼
  parentId: number | null;  // 父留言 ID（若為回覆他人留言則有值，否則為 null）
  account?: string;         // 🌟 留言者帳號（用於點擊頭像/名字時跳轉至個人頁面）
  author: string;           // 留言者顯示名稱
  avatar: string;           // 留言者頭像 URL
  content: string;          // 留言內文
  time: string;             // 發布時間（格式化字串）
};

// 社群貼文完整資料結構
type CommunityPost = {
  id: number;                 // 貼文唯一識別碼
  type: PostType;             // 貼文類型
  title: string | null;       // 貼文標題（可為空，例如一般足跡貼文）
  content: string;            // 貼文內文
  location: string | null;    // 打卡地點名稱
  time: string;               // 發布時間
  author: CommunityAuthor;    // 作者資訊結構
  tags: string[];             // 貼文標籤陣列
  images: string[];           // 貼文附帶圖片 URL 陣列
  likes: number;              // 按讚總數
  commentCount: number;       // 留言總數
  liked: boolean;             // 當前登入使用者是否已按讚
  saved: boolean;             // 當前登入使用者是否已收藏
  comments: CommunityComment[]; // 留言清單
};

// 熱門話題 / 標籤資料結構
type Topic = {
  tag: string;   // 標籤名稱
  count: number; // 相關貼文數量
};

// 後端 API 統一回應格式包裝
type ApiResponse<T> = {
  status: "success" | "error"; // API 執行狀態
  message?: string;            // 錯誤訊息或提示
  data?: T;                    // 實際回傳資料內容
};

/** ==========================================
 *  常數與靜態設定區塊 (Constants & Configurations)
 *  ========================================== */

// 後端 API 基礎路徑（優先使用環境變數，若無則降級回本地端測試位址）
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
// 社群模組專用 API 端點
const COMMUNITY_API = `${API_BASE}/community`;

// 頁面上方 Tab 分頁切換選單設定
const tabs: { id: TabType; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "footprint", label: "旅行足跡" },
  { id: "question", label: "行程請益" },
  { id: "group", label: "揪團出發" },
];

// 發布貼文時的類型選項與說明設定
const postTypes: { id: PostType; label: string; description: string }[] = [
  { id: "footprint", label: "分享足跡", description: "分享你的旅行美景與心得" },
  { id: "question", label: "行程請益", description: "發布你的行程規劃讓大家給建議" },
  { id: "group", label: "揪團出發", description: "尋找志同道合的旅伴" },
];

// 熱門話題載入失敗或無資料時的預設備用話題
const fallbackTopics: Topic[] = [
  { tag: "獨旅", count: 0 },
  { tag: "日本", count: 0 },
  { tag: "美食", count: 0 },
  { tag: "秘境", count: 0 },
];

/** ==========================================
 *  輔助函式區塊 (Helper Functions)
 *  ========================================== */

/**
 * 依據 PostType 取得對應的中文標籤名稱
 */
function getTypeLabel(type: PostType) {
  return postTypes.find((item) => item.id === type)?.label ?? "未知";
}

/**
 * 取得名稱的第一個英文字母或字元（用於無頭像時的預設文字 Placeholder）
 */
function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

/**
 * 統一處理 Fetch API 的 HTTP 回應解析與錯誤拋出
 */
async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = (await response.json()) as ApiResponse<T>;
  if (!response.ok || data.status === "error") {
    throw new Error(data.message || "API request failed");
  }
  return data;
}

/** ==========================================
 *  主要組件區塊 (Main Page Component)
 *  ========================================== */

export default function CommunityPage() {
  // 從 AuthContext 取得使用者驗證資訊與載入狀態
  const { user, loading: authLoading } = useAuth();
  // Next.js 頁面路由器
  const router = useRouter(); 
  // 取得當前登入者帳號（整合不同可能的欄位名稱）
  const currentAccount = user ? String(user.id || user.Account || "") : "";

  /* ------------------- 核心資料狀態 ------------------- */
  const [posts, setPosts] = useState<CommunityPost[]>([]);                      // 貼文列表
  const [topics, setTopics] = useState<Topic[]>(fallbackTopics);                // 熱門話題列表
  const [activeTab, setActiveTab] = useState<TabType>("all");                   // 當前選取的標籤頁
  const [search, setSearch] = useState("");                                     // 搜尋關鍵字

  /* ------------------- 發文表單狀態 ------------------- */
  const [postType, setPostType] = useState<PostType>("footprint");              // 發文類型
  const [title, setTitle] = useState("");                                       // 貼文標題
  const [draft, setDraft] = useState("");                                       // 發文草稿內文
  const [location, setLocation] = useState("");                                 // 地點打卡
  const [tagText, setTagText] = useState("");                                   // 標籤輸入 (以逗號分隔)
  const [imageFile, setImageFile] = useState<File | null>(null);                // 上傳的圖片檔案物件
  const [preview, setPreview] = useState("");                                   // 圖片預覽 Base64/Blob URL

  /* ------------------- 留言區相關狀態 ------------------- */
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});                        // 各貼文獨立的留言輸入內文 Map (PostID -> string)
  const [replyTargets, setReplyTargets] = useState<Record<number, CommunityComment | undefined>>({});    // 各貼文的回覆目標 Map (PostID -> Comment)
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});                          // 各貼文留言區展開/收合狀態 Map
  const [loadedComments, setLoadedComments] = useState<Record<number, boolean>>({});                        // 各貼文留言是否已自後端載入 Map
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});                      // 各貼文留言載入中 Spinner 狀態 Map

  /* ------------------- 全域 UI / 載入狀態 ------------------- */
  const [loadingPosts, setLoadingPosts] = useState(true);                        // 貼文列表載入中狀態
  const [submitting, setSubmitting] = useState(false);                          // 發布貼文進行中狀態
  const [error, setError] = useState("");                                       // 錯誤訊息提示

  /* ------------------- Ref 引用區塊 ------------------- */
  const fileInputRef = useRef<HTMLInputElement>(null);                          // 隱藏版 <input type="file"> 的 DOM 引用

  // 使用 useMemo 快取話題清單，確保即便話題清單為空也能降級顯示 fallbackTopics
  const visibleTopics = useMemo(() => (topics.length > 0 ? topics : fallbackTopics), [topics]);

  /* ------------------- 異步資料讀取區塊 ------------------- */

  /**
   * 載入熱門話題列表（使用 useCallback 避免不必要的重新宣告）
   */
  const loadTopics = useCallback(async () => {
    try {
      const response = await fetch(`${COMMUNITY_API}/community.php?action=topics`, { cache: "no-store" });
      const data = await readApiResponse<Topic[]>(response);
      setTopics(data.data && data.data.length > 0 ? data.data : fallbackTopics);
    } catch {
      setTopics(fallbackTopics);
    }
  }, []);

  /**
   * 載入貼文列表（支援分類過濾、搜尋關鍵字、登入者狀態綁定）
   */
  const loadPosts = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("type", activeTab);
    if (search.trim()) params.set("search", search.trim());
    if (currentAccount) params.set("Account", currentAccount);

    setLoadingPosts(true);
    setError("");

    try {
      const response = await fetch(`${COMMUNITY_API}/community.php?action=posts&${params.toString()}`, {
        cache: "no-store",
      });
      const data = await readApiResponse<CommunityPost[]>(response);
      setPosts(data.data ?? []);
      // 重新載入貼文時重置留言暫存狀態
      setLoadedComments({});
      setOpenComments({});
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "載入動態失敗");
    } finally {
      setLoadingPosts(false);
    }
  }, [activeTab, currentAccount, search]);

  /* ------------------- 副作用處理 (useEffect) ------------------- */

  // 頁面初始化時載入熱門話題
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTopics();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTopics]);

  // 當搜尋條件或分頁標籤變更時載入貼文（針對搜尋輸入實作 250ms Debounce 防抖，避免頻繁請求）
  useEffect(() => {
    // 只有搜尋輸入才 debounce；初次進入與切換分類不再固定多等 250ms。
    const timer = window.setTimeout(() => {
      void loadPosts();
    }, search.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadPosts, search]);

  /* ------------------- 事件處理常式 (Event Handlers) ------------------- */

  /**
   * 切換分頁 Tab 並同步更新發文類型
   */
  function selectTab(tab: TabType) {
    setActiveTab(tab);
    setPostType(tab === "all" ? "footprint" : tab);
  }

  /**
   * 依貼文 ID 異步讀取該篇貼文的詳細留言列表
   */
  async function loadComments(postId: number) {
    if (loadingComments[postId]) return;

    setLoadingComments((current) => ({ ...current, [postId]: true }));
    try {
      const response = await fetch(`${COMMUNITY_API}/community.php?action=comments&postId=${postId}`, { cache: "no-store" });
      const data = await readApiResponse<CommunityComment[]>(response);
      // 將回傳的留言注入對應 post 的 comments 屬性中
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: data.data ?? [] } : post));
      setLoadedComments((current) => ({ ...current, [postId]: true }));
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "載入留言失敗");
    } finally {
      setLoadingComments((current) => ({ ...current, [postId]: false }));
    }
  }

  /**
   * 切換指定貼文的留言區開關（若為首次展開則自動觸發 API 載入留言）
   */
  function toggleComments(postId: number) {
    setOpenComments((current) => {
      const willOpen = !current[postId];
      if (willOpen && !loadedComments[postId]) void loadComments(postId);
      return { ...current, [postId]: willOpen };
    });
  }

  /**
   * 強制展開指定貼文的留言區，並確保留言資料已讀取
   */
  function openCommentsForPost(postId: number) {
    setOpenComments((current) => ({ ...current, [postId]: true }));
    if (!loadedComments[postId]) void loadComments(postId);
  }

  /**
   * 處理上傳圖片檔案並建立本機預覽 Blob URL
   */
  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // 前端限制圖片大小最大為 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("圖片大小不能超過 5MB");
      event.target.value = "";
      return;
    }

    // 若原先已存在預覽圖，先釋放記憶體避免 Memory Leak
    if (preview) URL.revokeObjectURL(preview);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  /**
   * 清除目前選取的上傳圖片並釋放資源
   */
  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /**
   * 表單提交：發布新貼文 (以 Multipart FormData 格式傳輸圖片與純文字)
   */
  async function publishPost(event: FormEvent) {
    event.preventDefault();

    if (!currentAccount) {
      alert("請先登入即可發表動態！");
      return;
    }

    if (!draft.trim()) return;

    const formData = new FormData();
    formData.append("Account", currentAccount);
    formData.append("Post_Type", postType);
    formData.append("Title", title.trim());
    formData.append("Content", draft.trim());
    formData.append("Location_Name", location.trim());
    formData.append("Tags", tagText.trim());

    if (imageFile) formData.append("image", imageFile);

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${COMMUNITY_API}/community.php?action=create`, {
        method: "POST",
        body: formData,
      });

      const data = await readApiResponse<CommunityPost>(response);
      // 發布成功後將新貼文插至列表最前頭
      if (data.data) {
        setPosts((current) => [data.data as CommunityPost, ...current]);
      }

      // 重置發文表單輸入欄位
      setTitle("");
      setDraft("");
      setLocation("");
      setTagText("");
      clearImage();
      void loadTopics(); // 重新整理右側熱門話題數量
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "發布貼文時發生錯誤");
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * 切換按讚 (like) 或收藏 (save) 狀態
   */
  async function toggleReaction(post: CommunityPost, reactionType: "like" | "save") {
    if (!currentAccount) {
      alert("請先登入即可使用此功能！");
      return;
    }

    try {
      const response = await fetch(`${COMMUNITY_API}/community.php?action=reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Account: currentAccount,
          Post_ID: post.id,
          Reaction_Type: reactionType,
        }),
      });

      const data = await readApiResponse<{ active: boolean; likes: number }>(response);

      // 樂觀更新或依據後端回應更新 UI 按讚數與切換狀態
      setPosts((current) =>
        current.map((item) => {
          if (item.id !== post.id || !data.data) return item;
          return reactionType === "like"
            ? { ...item, liked: data.data.active, likes: data.data.likes }
            : { ...item, saved: data.data.active };
        }),
      );
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "互動處理失敗");
    }
  }

  /**
   * 表單提交：送出新留言或回覆既有留言
   */
  async function submitComment(event: FormEvent, post: CommunityPost) {
    event.preventDefault();

    if (!currentAccount) {
      alert("請先登入即可留言！");
      return;
    }

    const text = commentDrafts[post.id]?.trim();
    if (!text) return;

    const replyTarget = replyTargets[post.id];

    try {
      const response = await fetch(`${COMMUNITY_API}/community.php?action=comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Account: currentAccount,
          Post_ID: post.id,
          Content: text,
          Parent_Comment_ID: replyTarget?.id ?? null,
        }),
      });

      const data = await readApiResponse<CommunityComment>(response);

      if (data.data) {
        // 留言數 +1 並重新取得最新留言清單
        setPosts((current) => current.map((item) => item.id === post.id ? { ...item, commentCount: item.commentCount + 1 } : item));
        await loadComments(post.id);
      }

      // 清空該貼文的留言輸入框與回覆目標
      setCommentDrafts((current) => ({ ...current, [post.id]: "" }));
      setReplyTargets((current) => ({ ...current, [post.id]: undefined }));
      openCommentsForPost(post.id);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "留言發布失敗");
    }
  }

  /* ------------------- UI 渲染區塊 (JSX Render) ------------------- */
  return (
    <div className="min-h-screen bg-[#f5f5f2] text-neutral-900">
      {/* 頁頭 Banner 區塊：包含頁面標題與搜尋框 */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-neutral-400">
                <Sparkles className="size-3.5 text-amber-500" /> Travmate Community
              </p>
              <h1 className="text-4xl font-light tracking-tight md:text-5xl">靈感交流與分享</h1>
              <p className="mt-3 max-w-xl text-sm font-light leading-7 text-neutral-500">
                尋找你的下一個目的地，向其他旅行者請益，或者分享你專屬的旅程故事。
              </p>
            </div>
            {/* 搜尋輸入框 */}
            <label className="flex h-12 w-full items-center gap-3 border border-neutral-200 bg-neutral-50 px-4 md:w-80">
              <Search className="size-4 text-neutral-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜尋行程、地點或標籤"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </label>
          </div>
        </div>
      </section>

      {/* 頂部固定切換選單 (Sticky Navigation Tabs) */}
      <div className="sticky top-16 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-7 overflow-x-auto px-5 md:px-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`shrink-0 border-b-2 py-4 text-xs font-semibold tracking-wider transition-colors ${
                activeTab === tab.id
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 主要內容區域：雙欄式排版 (左側動態串流 / 右側話題邊欄) */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* 左側：發文框與貼文串流 */}
        <main className="min-w-0 space-y-6">
          {/* 全域 API 錯誤提示區塊 */}
          {error && (
            <div className="flex items-center justify-between border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button onClick={() => void loadPosts()} className="flex items-center gap-1 font-semibold">
                <RefreshCw className="size-3.5" /> 重試
              </button>
            </div>
          )}

          {/* 發布貼文表單組件 */}
          <form onSubmit={publishPost} className="border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex gap-4">
              {/* 發文者頭像預設圓圈 */}
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                {user ? getInitial(String(user.nickname || user.Account || "?")) : "?"}
              </div>
              <div className="min-w-0 flex-1">
                {/* 只有「行程請益」與「揪團出發」類型的貼文才顯示標題輸入框 */}
                {(postType === "question" || postType === "group") && (
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={postType === "question" ? "輸入請益主旨..." : "輸入揪團標題..."}
                    className="mb-3 w-full border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
                  />
                )}
                {/* 貼文內文輸入框 */}
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={authLoading ? "載入中..." : currentAccount ? "分享你的旅行足跡與心得..." : "登入後即可發表動態"}
                  rows={4}
                  disabled={!currentAccount}
                  className="w-full resize-none border-0 bg-transparent text-sm leading-7 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
                
                {/* 上傳圖片預覽區域 */}
                {preview && (
                  <div className="relative mt-3 h-56 overflow-hidden bg-neutral-100">
                    <Image src={preview} alt="Preview" fill unoptimized className="object-cover" />
                    <button
                      type="button"
                      onClick={clearImage}
                      aria-label="移除圖片"
                      className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}

                {/* 額外資訊輸入區（打卡地點、標籤） */}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500">
                    <MapPin className="size-3.5" />
                    <input
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="打卡地點 (選填)"
                      className="w-full bg-transparent outline-none"
                    />
                  </label>
                  <label className="flex items-center gap-2 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500">
                    <Compass className="size-3.5" />
                    <input
                      value={tagText}
                      onChange={(event) => setTagText(event.target.value)}
                      placeholder="相關標籤 (以逗號分隔)"
                      className="w-full bg-transparent outline-none"
                    />
                  </label>
                </div>

                {/* 表單底部操作列（附件圖片、發布按鈕） */}
                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
                  <div>
                    {/* 隱藏的原始檔案選取器 */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImage}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!currentAccount}
                      className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ImagePlus className="size-4" /> 附加照片
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={!currentAccount || !draft.trim() || submitting}
                    className="flex items-center gap-2 bg-neutral-900 px-5 py-2.5 text-xs font-bold tracking-widest text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {submitting ? "發布中..." : "發布動態"} <Send className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* 載入中骨架 Placeholder */}
          {loadingPosts && (
            <div className="border border-neutral-200 bg-white py-14 text-center text-sm text-neutral-400">
              載入動態中...
            </div>
          )}

          {/* 無動態資料時的 Empty State */}
          {!loadingPosts && posts.length === 0 && (
            <div className="border border-dashed border-neutral-300 bg-white py-16 text-center text-sm text-neutral-400">
              目前沒有任何動態
            </div>
          )}

          {/* 貼文串流列表渲染 */}
          {!loadingPosts &&
            posts.map((post) => (
              <article key={post.id} className="overflow-hidden border border-neutral-200 bg-white shadow-sm">
                <div className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    
                    {/* 貼文作者區塊（點擊可路由跳轉至該作者的個人頁面） */}
                    <div 
                      className="flex min-w-0 items-center gap-3 cursor-pointer group"
                      onClick={() => {
                        // 相容多種可能的後端欄位結構
                        const targetAccount = post.author.account || (post.author as any).Account || (post as any).Account;
                        if (targetAccount) {
                          router.push(`/profile/${encodeURIComponent(targetAccount)}`);
                        } else {
                          console.log("這篇貼文的資料長這樣：", post);
                          alert("後端尚未回傳此作者的帳號 (account)，無法跳轉！");
                        }
                      }}
                    >
                      {post.author.avatar ? (
                        <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-neutral-100 group-hover:ring-2 ring-neutral-300 transition-all">
                          <Image src={post.author.avatar} alt={post.author.name} fill unoptimized className="object-cover" />
                        </div>
                      ) : (
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-700 group-hover:ring-2 ring-neutral-300 transition-all">
                          {getInitial(post.author.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="text-sm font-bold group-hover:text-[#F04D79] transition-colors">{post.author.name}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-neutral-400">{post.time}</p>
                      </div>
                    </div>

                    {/* 貼文分類標籤 */}
                    <span className="shrink-0 bg-neutral-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-neutral-600">
                      {getTypeLabel(post.type)}
                    </span>
                  </div>

                  {/* 貼文標題與內文 */}
                  {post.title && <h2 className="mt-5 text-lg font-semibold leading-7">{post.title}</h2>}
                  <p className="mt-4 whitespace-pre-line text-sm font-light leading-7 text-neutral-600">{post.content}</p>
                  
                  {/* 地點打卡標示 */}
                  {post.location && (
                    <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                      <MapPin className="size-3.5" /> {post.location}
                    </p>
                  )}
                  
                  {/* 標籤清單 (點擊可快速觸發關鍵字搜尋) */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.map((item) => (
                      <button
                        key={item}
                        onClick={() => setSearch(item)}
                        className="bg-stone-100 px-2.5 py-1 text-[11px] text-stone-600 hover:bg-stone-200"
                      >
                        #{item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 貼文相片展示區（依據張數提供響應式網格） */}
                {post.images.length > 0 && (
                  <div className={`grid gap-0.5 bg-neutral-100 ${post.images.length > 1 ? "grid-cols-[1.45fr_1fr]" : "grid-cols-1"}`}>
                    {post.images.map((src, index) => (
                      <div key={src} className="relative h-72 w-full md:h-96">
                        <Image
                          src={src}
                          alt={`${post.author.name} 照片 ${index + 1}`}
                          fill
                          unoptimized
                          sizes={post.images.length > 1 ? "(min-width: 768px) 35vw, 50vw" : "(min-width: 1024px) 60vw, 100vw"}
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* 貼文社群互動功能列（按讚、留言開關、收藏） */}
                <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 md:px-6">
                  <div className="flex items-center gap-1">
                    {/* 按讚按鈕 */}
                    <button
                      onClick={() => void toggleReaction(post, "like")}
                      aria-label={post.liked ? "取消讚" : "按讚"}
                      className={`flex items-center gap-2 px-3 py-2 text-xs transition ${post.liked ? "text-rose-600" : "text-neutral-500 hover:text-neutral-900"}`}
                    >
                      <Heart className={`size-4 ${post.liked ? "fill-current" : ""}`} /> {post.likes}
                    </button>
                    {/* 展開/收合留言按鈕 */}
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-500 hover:text-neutral-900"
                    >
                      <MessageCircle className="size-4" /> {post.commentCount}
                    </button>
                  </div>
                  {/* 收藏按鈕 */}
                  <button
                    onClick={() => void toggleReaction(post, "save")}
                    aria-label={post.saved ? "取消收藏" : "收藏貼文"}
                    className={`p-2 transition ${post.saved ? "text-amber-600" : "text-neutral-400 hover:text-neutral-900"}`}
                  >
                    <Bookmark className={`size-4 ${post.saved ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* 🌟 留言區塊 🌟 */}
                {openComments[post.id] && (
                  <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-4 md:px-6">
                    {/* 留言載入中指示器 */}
                    {loadingComments[post.id] ? (
                      <div className="mb-4 flex items-center gap-2 text-xs text-neutral-400"><Loader2 className="size-4 animate-spin" /> 載入留言中...</div>
                    ) : (
                      /* 留言清單渲染 */
                      <div className="mb-4 space-y-3">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className={`flex gap-2 text-xs leading-5 ${comment.parentId ? "ml-6 border-l border-neutral-200 pl-3" : ""}`}>
                            
                            {/* 🌟 將頭像與名字包在可以點擊的區塊內（點擊可路由至該留言者個人頁面） 🌟 */}
                            <div 
                              className="flex min-w-0 items-start gap-2 cursor-pointer group flex-1"
                              onClick={() => {
                                if (comment.account) {
                                  router.push(`/profile/${encodeURIComponent(comment.account)}`);
                                }
                              }}
                            >
                              {comment.avatar ? (
                                <div className="relative mt-0.5 size-7 shrink-0 overflow-hidden rounded-full bg-neutral-100 group-hover:ring-2 ring-neutral-300 transition-all">
                                  <Image src={comment.avatar} alt={comment.author} fill unoptimized className="object-cover" />
                                </div>
                              ) : (
                                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-600 group-hover:ring-2 ring-neutral-300 transition-all">
                                  {getInitial(comment.author)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-neutral-800 group-hover:text-[#F04D79] transition-colors">{comment.author}</span>
                                  <span className="text-[10px] text-neutral-400">{comment.time}</span>
                                  
                                  {/* 🌟 阻止事件冒泡 (e.stopPropagation)，避免點擊「回覆」時誤觸外層的頁面跳轉 🌟 */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReplyTargets((current) => ({ ...current, [post.id]: comment }));
                                    }}
                                    className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-800 z-10 relative"
                                  >
                                    回覆
                                  </button>
                                </div>
                                <p className="mt-1 text-neutral-500">{comment.content}</p>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}

                    {/* 當前回覆目標提示列 */}
                    {replyTargets[post.id] && (
                      <div className="mb-2 flex items-center justify-between bg-white px-3 py-2 text-[11px] text-neutral-500">
                        <span>正在回覆 {replyTargets[post.id]?.author}</span>
                        <button
                          type="button"
                          onClick={() => setReplyTargets((current) => ({ ...current, [post.id]: undefined }))}
                          className="text-neutral-400 hover:text-neutral-900"
                        >
                          取消
                        </button>
                      </div>
                    )}

                    {/* 新增留言輸入表單 */}
                    <form onSubmit={(event) => void submitComment(event, post)} className="flex gap-2">
                      <input
                        value={commentDrafts[post.id] || ""}
                        onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                        onFocus={() => openCommentsForPost(post.id)}
                        placeholder={currentAccount ? "新增留言..." : "請先登入即可留言"}
                        disabled={!currentAccount}
                        className="min-w-0 flex-1 border border-neutral-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <button type="submit" aria-label="發送留言" className="bg-neutral-900 px-3 text-white disabled:opacity-40" disabled={!currentAccount}>
                        <Send className="size-3.5" />
                      </button>
                    </form>
                  </div>
                )}
              </article>
            ))}
        </main>

        {/* 右側邊欄：熱門話題 / 熱門標籤列表 */}
        <aside className="space-y-5 lg:sticky lg:top-36 lg:self-start">
          <section className="border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Compass className="size-4" /> 探索話題
              </h2>
              <span className="text-[10px] tracking-widest text-neutral-400">TRENDING</span>
            </div>
            <div className="space-y-1">
              {visibleTopics.map((topic, index) => (
                <button
                  key={topic.tag}
                  onClick={() => setSearch(topic.tag)}
                  className="group flex w-full items-center gap-3 border-b border-neutral-100 py-3 text-left last:border-0"
                >
                  <span className="text-xs font-bold text-neutral-300">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-neutral-700 group-hover:text-neutral-900">#{topic.tag}</span>
                    <span className="mt-1 block text-[10px] text-neutral-400">{topic.count} 篇貼文</span>
                  </span>
                  <ChevronRight className="size-3.5 text-neutral-300" />
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}