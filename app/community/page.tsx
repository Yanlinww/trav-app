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
  PenLine
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
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend";
// 社群模組專用 API 端點
const COMMUNITY_API = `${API_BASE}/community`;

// 頁面上方 Tab 分頁切換選單設定
const tabs: { id: TabType; label: string }[] = [
  { id: "all", label: "全部動態" },
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
  { tag: "台灣旅遊", count: 0 },
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
  const [loadedComments, setLoadedComments] = useState<Record<number, boolean>>({});                      // 各貼文留言是否已自後端載入 Map
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});                    // 各貼文留言載入中 Spinner 狀態 Map

  /* ------------------- 全域 UI / 載入狀態 ------------------- */
  const [loadingPosts, setLoadingPosts] = useState(true);                        // 貼文列表載入中狀態
  const [submitting, setSubmitting] = useState(false);                           // 發布貼文進行中狀態
  const [error, setError] = useState("");                                       // 錯誤訊息提示

  /* ------------------- Ref 引用區塊 ------------------- */
  const fileInputRef = useRef<HTMLInputElement>(null);                          // 隱藏版 <input type="file"> 的 DOM 引用
  const composeRef = useRef<HTMLFormElement>(null);                             // 用於 FAB 點擊後捲動至發文框

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
    <div className="min-h-screen bg-[#f9fafb] text-neutral-900 relative pb-20">
      {/* 頁頭 Banner 區塊：包含頁面標題與搜尋框 */}
      <section className="bg-white rounded-b-[2rem] shadow-sm shadow-slate-200/50 mb-8 border-b border-neutral-100 pb-4 relative z-10">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-900">
                <Sparkles className="size-3" /> Travmate Community
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-neutral-900">旅行動態與分享</h1>
              <p className="mt-2 max-w-lg text-sm font-medium leading-relaxed text-neutral-500">
                在這裡發掘靈感、尋找旅伴，或紀錄專屬於你的獨旅足跡。
              </p>
            </div>
            {/* 旅遊 App 風格膠囊搜尋框 */}
            <label className="flex h-12 w-full items-center gap-3 rounded-full border border-neutral-200 bg-neutral-50 px-5 md:w-80 hover:bg-neutral-100 transition-colors cursor-text">
              <Search className="size-4 text-neutral-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜尋地點、心得或 #標籤"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 font-medium"
              />
            </label>
          </div>
        </div>

        {/* 頂部固定切換選單 (Sticky Navigation Tabs) - 融入 Banner 底部 */}
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 md:px-8 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold tracking-wide transition-all ${
                activeTab === tab.id
                  ? "bg-neutral-900 text-white shadow-md shadow-neutral-900/10"
                  : "bg-white border border-neutral-200 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 hover:bg-neutral-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* 主要內容區域：雙欄式排版 (左側動態串流 / 右側話題邊欄) */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        
        {/* 左側：發文框與貼文串流 */}
        <main className="min-w-0 space-y-8">
          
          {/* 全域 API 錯誤提示區塊 */}
          {error && (
            <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
              <span className="font-medium">{error}</span>
              <button onClick={() => void loadPosts()} className="flex items-center gap-1.5 font-bold hover:text-red-900 transition-colors">
                <RefreshCw className="size-4" /> 重新載入
              </button>
            </div>
          )}

          {/* 發布貼文表單組件 (大圓角 App 質感) */}
          <form ref={composeRef} onSubmit={publishPost} className="rounded-[2rem] border border-neutral-100 bg-white p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="flex gap-4">
              {/* 發文者頭像 */}
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white shadow-sm shadow-neutral-900/10">
                {user ? getInitial(String(user.nickname || user.Account || "?")) : "?"}
              </div>
              
              <div className="min-w-0 flex-1">
                {/* 標題輸入框 (僅請益/揪團) */}
                {(postType === "question" || postType === "group") && (
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={postType === "question" ? "輸入請益主旨..." : "輸入揪團標題..."}
                    className="mb-3 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-neutral-900 focus:bg-white transition-colors font-medium"
                  />
                )}
                
                {/* 貼文內文輸入框 */}
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={authLoading ? "載入中..." : currentAccount ? "今天去了哪裡？分享你的足跡吧..." : "登入後即可發表動態"}
                  rows={3}
                  disabled={!currentAccount}
                  className="w-full resize-none border-0 bg-transparent text-sm font-medium leading-relaxed outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
                
                {/* 上傳圖片預覽區域 (大圓角) */}
                {preview && (
                  <div className="relative mt-3 h-56 overflow-hidden rounded-2xl bg-neutral-100 border border-neutral-100">
                    <Image src={preview} alt="Preview" fill unoptimized className="object-cover" />
                    <button
                      type="button"
                      onClick={clearImage}
                      aria-label="移除圖片"
                      className="absolute right-3 top-3 rounded-full bg-black/50 backdrop-blur-md p-2 text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}

                {/* 額外資訊輸入區（膠囊造型） */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs text-neutral-500 hover:bg-neutral-100 transition-colors focus-within:border-neutral-900 focus-within:bg-white">
                    <MapPin className="size-3.5 text-neutral-900" />
                    <input
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="新增地點"
                      className="w-24 bg-transparent outline-none font-medium placeholder:font-normal focus:w-32 transition-all"
                    />
                  </label>
                  <label className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs text-neutral-500 hover:bg-neutral-100 transition-colors focus-within:border-neutral-900 focus-within:bg-white">
                    <Compass className="size-3.5 text-neutral-900" />
                    <input
                      value={tagText}
                      onChange={(event) => setTagText(event.target.value)}
                      placeholder="新增 #標籤"
                      className="w-28 bg-transparent outline-none font-medium placeholder:font-normal focus:w-36 transition-all"
                    />
                  </label>
                </div>

                {/* 表單底部操作列 */}
                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
                  <div>
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
                      className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ImagePlus className="size-4" /> 相片
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={!currentAccount || !draft.trim() || submitting}
                    className="flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-neutral-700 hover:shadow-md hover:shadow-neutral-900/10 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {submitting ? "發布中..." : "發布"} <Send className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* 載入中骨架 Placeholder */}
          {loadingPosts && (
            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-neutral-100 bg-white py-20 text-neutral-400">
              <Loader2 className="size-8 animate-spin text-neutral-900 mb-3" />
              <p className="text-sm font-medium">載入動態中...</p>
            </div>
          )}

          {/* 無動態資料時的 Empty State */}
          {!loadingPosts && posts.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-neutral-200 bg-white py-20 text-neutral-400">
              <div className="size-16 rounded-full bg-neutral-50 flex items-center justify-center mb-3">
                <Compass className="size-8 text-neutral-300" />
              </div>
              <p className="text-sm font-bold text-neutral-500">目前還沒有相關動態</p>
              <p className="text-xs mt-1">來發布第一篇分享吧！</p>
            </div>
          )}

          {/* 貼文串流列表渲染 */}
          {!loadingPosts &&
            posts.map((post) => (
              <article key={post.id} className="overflow-hidden rounded-[2rem] border border-neutral-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                
                {/* 貼文頭部 (作者與分類) */}
                <div className="p-5 md:p-6 pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div 
                      className="flex min-w-0 items-center gap-3 cursor-pointer group"
                      onClick={() => {
                        const targetAccount = post.author.account || (post.author as any).Account || (post as any).Account;
                        if (targetAccount) router.push(`/profile/${encodeURIComponent(targetAccount)}`);
                      }}
                    >
                      {post.author.avatar ? (
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-neutral-100 group-hover:ring-2 ring-neutral-900/20 transition-all shadow-sm">
                          <Image src={post.author.avatar} alt={post.author.name} fill unoptimized className="object-cover" />
                        </div>
                      ) : (
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 text-sm font-bold text-neutral-600 group-hover:ring-2 ring-neutral-900/20 transition-all shadow-sm">
                          {getInitial(post.author.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-x-2">
                          <span className="text-sm font-bold text-neutral-900 group-hover:text-neutral-600 transition-colors">{post.author.name}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-neutral-400">{post.time}</p>
                      </div>
                    </div>
                    {/* 貼文分類膠囊 */}
                    <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-[10px] font-bold tracking-wider text-neutral-900">
                      {getTypeLabel(post.type)}
                    </span>
                  </div>

                  {/* 貼文標題與內文 */}
                  {post.title && <h2 className="mt-4 text-lg font-bold leading-tight text-neutral-900">{post.title}</h2>}
                  <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-neutral-600">{post.content}</p>
                  
                  {/* 地點打卡標示 */}
                  {post.location && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-3 py-1.5 text-[11px] font-bold text-neutral-500">
                      <MapPin className="size-3 text-neutral-900" /> {post.location}
                    </div>
                  )}
                  
                  {/* 標籤清單 */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags.map((item) => (
                      <button
                        key={item}
                        onClick={() => setSearch(item)}
                        className="rounded-full bg-neutral-50 px-3 py-1 text-[11px] font-bold text-neutral-500 hover:bg-neutral-900 hover:text-white transition-colors"
                      >
                        #{item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 貼文相片展示區 (無邊際大圓角設計) */}
                {post.images.length > 0 && (
                  <div className="px-3 md:px-4 mt-3">
                    <div className={`overflow-hidden rounded-2xl ${post.images.length > 1 ? "grid gap-1 grid-cols-[1.45fr_1fr]" : "grid-cols-1"}`}>
                      {post.images.map((src, index) => (
                        <div key={src} className="relative h-64 w-full md:h-80 bg-neutral-100">
                          <Image
                            src={src}
                            alt={`${post.author.name} 照片 ${index + 1}`}
                            fill
                            unoptimized
                            sizes={post.images.length > 1 ? "(min-width: 768px) 35vw, 50vw" : "(min-width: 1024px) 60vw, 100vw"}
                            className="object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 貼文社群互動功能列 */}
                <div className="mt-2 flex items-center justify-between px-4 py-3 md:px-5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => void toggleReaction(post, "like")}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${post.liked ? "bg-neutral-100 text-neutral-900" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"}`}
                    >
                      <Heart className={`size-4 ${post.liked ? "fill-current" : ""}`} /> {post.likes > 0 && post.likes}
                    </button>
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${openComments[post.id] ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"}`}
                    >
                      <MessageCircle className="size-4" /> {post.commentCount > 0 && post.commentCount}
                    </button>
                  </div>
                  <button
                    onClick={() => void toggleReaction(post, "save")}
                    className={`rounded-full p-2 transition-all ${post.saved ? "bg-amber-50 text-amber-500" : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"}`}
                  >
                    <Bookmark className={`size-4 ${post.saved ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* 🌟 留言區塊 🌟 */}
                {openComments[post.id] && (
                  <div className="border-t border-neutral-100 bg-[#FBFBFB] px-5 py-5 md:px-6">
                    {loadingComments[post.id] ? (
                      <div className="mb-4 flex items-center justify-center gap-2 text-xs font-medium text-neutral-400 py-4"><Loader2 className="size-4 animate-spin text-neutral-900" /> 載入留言中...</div>
                    ) : (
                      <div className="mb-5 space-y-4">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className={`flex gap-3 text-sm ${comment.parentId ? "ml-8 md:ml-12 border-l-2 border-neutral-200 pl-4" : ""}`}>
                            
                            <div 
                              className="flex min-w-0 items-start gap-3 cursor-pointer group flex-1"
                              onClick={() => {
                                if (comment.account) router.push(`/profile/${encodeURIComponent(comment.account)}`);
                              }}
                            >
                              {comment.avatar ? (
                                <div className="relative mt-1 size-8 shrink-0 overflow-hidden rounded-full bg-neutral-100 shadow-sm group-hover:ring-2 ring-neutral-900/20 transition-all">
                                  <Image src={comment.avatar} alt={comment.author} fill unoptimized className="object-cover" />
                                </div>
                              ) : (
                                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-600 shadow-sm group-hover:ring-2 ring-neutral-900/20 transition-all">
                                  {getInitial(comment.author)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1 bg-white border border-neutral-100 p-3 rounded-2xl rounded-tl-none shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-xs text-neutral-900 group-hover:text-neutral-600 transition-colors">{comment.author}</span>
                                  <span className="text-[10px] font-medium text-neutral-400">{comment.time}</span>
                                </div>
                                <p className="text-xs font-medium text-neutral-600 leading-relaxed mb-2">{comment.content}</p>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReplyTargets((current) => ({ ...current, [post.id]: comment }));
                                  }}
                                  className="text-[10px] font-bold text-neutral-400 hover:text-neutral-900 transition-colors flex items-center gap-1"
                                >
                                  回覆
                                </button>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}

                    {/* 回覆目標提示列 */}
                    {replyTargets[post.id] && (
                      <div className="mb-3 flex items-center justify-between rounded-xl bg-neutral-100 px-4 py-2 text-[11px] font-bold text-neutral-900">
                        <span>正在回覆 @{replyTargets[post.id]?.author}</span>
                        <button onClick={() => setReplyTargets((current) => ({ ...current, [post.id]: undefined }))} className="text-neutral-500 hover:text-neutral-900 transition-colors">
                          取消
                        </button>
                      </div>
                    )}

                    {/* 新增留言輸入表單 (膠囊設計) */}
                    <form onSubmit={(event) => void submitComment(event, post)} className="flex gap-2">
                      <div className="flex flex-1 items-center rounded-full border border-neutral-200 bg-white px-1.5 focus-within:border-neutral-900 transition-colors shadow-sm">
                        <input
                          value={commentDrafts[post.id] || ""}
                          onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                          onFocus={() => openCommentsForPost(post.id)}
                          placeholder={currentAccount ? "留言分享你的看法..." : "請先登入即可留言"}
                          disabled={!currentAccount}
                          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-xs font-medium outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <button 
                          type="submit" 
                          aria-label="發送留言" 
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-40 hover:bg-neutral-700 hover:shadow-md transition-all mr-0.5" 
                          disabled={!currentAccount || !(commentDrafts[post.id]?.trim())}
                        >
                          <Send className="size-3 -ml-0.5" />
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </article>
            ))}
        </main>

        {/* 右側邊欄：熱門話題 / 熱門標籤列表 */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start hidden md:block">
          <section className="rounded-[2rem] border border-neutral-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-neutral-900">
                <Compass className="size-4 text-neutral-900" /> 探索話題
              </h2>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[9px] font-bold tracking-widest text-neutral-900">TRENDING</span>
            </div>
            <div className="space-y-2">
              {visibleTopics.map((topic, index) => (
                <button
                  key={topic.tag}
                  onClick={() => setSearch(topic.tag)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-transparent p-3 text-left transition-all hover:bg-neutral-50 hover:border-neutral-100"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-400 group-hover:bg-neutral-200 group-hover:text-neutral-900 transition-colors">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-neutral-700 group-hover:text-neutral-900">#{topic.tag}</span>
                    <span className="mt-0.5 block text-[10px] font-medium text-neutral-400">{topic.count} 篇相關動態</span>
                  </span>
                  <ChevronRight className="size-4 text-neutral-300 group-hover:text-neutral-900 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* 手機版/右下角懸浮發文按鈕 (FAB) */}
        <div className="fixed bottom-24 right-6 z-40 md:hidden">
          <button
            onClick={() => {
              if (composeRef.current) {
                composeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 聚焦文字框
                const textarea = composeRef.current.querySelector('textarea');
                if (textarea) setTimeout(() => textarea.focus(), 500);
              }
            }}
            className="flex size-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-xl shadow-neutral-900/20 hover:scale-110 transition-transform"
          >
            <PenLine className="size-6" />
          </button>
        </div>

      </div>
    </div>
  );
}