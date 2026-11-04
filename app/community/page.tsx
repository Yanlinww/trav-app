"use client";

// 引用 React 核心 Hooks 與相關型別
import { ChangeEvent, FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
// 引用 Next.js 最佳化圖片組件與路由管理 Hook
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Edit2,
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

type PostType = "footprint" | "question" | "group";
type TabType = "all" | PostType;

type CommunityAuthor = {
  account?: string;
  name: string;
  avatar: string;
};

type CommunityComment = {
  id: number;
  parentId: number | null;
  account?: string;
  author: string;
  avatar: string;
  content: string;
  time: string;
};

type CommunityPost = {
  id: number;
  type: PostType;
  title: string | null;
  content: string;
  location: string | null;
  time: string;
  author: CommunityAuthor;
  tags: string[];
  images: string[];
  likes: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  comments: CommunityComment[];
};

type Topic = {
  tag: string;
  count: number;
};

type ApiResponse<T> = {
  status: "success" | "error";
  message?: string;
  data?: T;
};

/** ==========================================
 *  常數與靜態設定區塊 (Constants & Configurations)
 *  ========================================== */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend";
const COMMUNITY_API = `${API_BASE}/community`;

const tabs: { id: TabType; label: string }[] = [
  { id: "all", label: "全部動態" },
  { id: "footprint", label: "旅行足跡" },
  { id: "question", label: "行程請益" },
  { id: "group", label: "揪團出發" },
];

const postTypes: { id: PostType; label: string; description: string }[] = [
  { id: "footprint", label: "分享足跡", description: "分享你的旅行美景與心得" },
  { id: "question", label: "行程請益", description: "發布你的行程規劃讓大家給建議" },
  { id: "group", label: "揪團出發", description: "尋找志同道合的旅伴" },
];

const fallbackTopics: Topic[] = [
  { tag: "獨旅", count: 0 },
  { tag: "台灣旅遊", count: 0 },
  { tag: "美食", count: 0 },
  { tag: "秘境", count: 0 },
];

/** ==========================================
 *  輔助函式區塊 (Helper Functions)
 *  ========================================== */

function getTypeLabel(type: PostType) {
  return postTypes.find((item) => item.id === type)?.label ?? "未知";
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

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
  return <Suspense fallback={<p className="p-8 text-center text-sm text-neutral-500">載入動態中...</p>}><CommunityContent /></Suspense>;
}

function CommunityContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetPostId = searchParams.get("postId");
  const focusedPost = targetPostId !== null;
  const expandComments = searchParams.get("comments") === "1";
  
  const currentAccount = user ? String(user.id || (user as any).Account || (user as any).account || "") : "";

  /* ------------------- 核心資料狀態 ------------------- */
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [topics, setTopics] = useState<Topic[]>(fallbackTopics);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");

  /* ------------------- 發文表單狀態 ------------------- */
  const [postType, setPostType] = useState<PostType>("footprint");
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [location, setLocation] = useState("");
  const [tagText, setTagText] = useState("");
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  /* ------------------- 留言區相關狀態 ------------------- */
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<number, CommunityComment | undefined>>({});
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});
  const [loadedComments, setLoadedComments] = useState<Record<number, boolean>>({});
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});

  /* ------------------- 全域 UI / 載入狀態 ------------------- */
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* ------------------- 🌟 編輯貼文相關狀態 🌟 ------------------- */
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editTagText, setEditTagText] = useState("");
  const [editExistingImages, setEditExistingImages] = useState<string[]>([]);
  const [editNewImageFiles, setEditNewImageFiles] = useState<File[]>([]);
  const [editNewPreviews, setEditNewPreviews] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  /* ------------------- 🌟 圖片放大燈箱狀態 (Lightbox) 🌟 ------------------- */
  const [lightbox, setLightbox] = useState<{ images: string[], index: number } | null>(null);

  /* ------------------- Ref 引用區塊 ------------------- */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const composeRef = useRef<HTMLFormElement>(null);

  const visibleTopics = useMemo(() => (topics.length > 0 ? topics : fallbackTopics), [topics]);

  /* ------------------- 異步資料讀取區塊 ------------------- */

  const loadTopics = useCallback(async () => {
    try {
      const response = await fetch(`${COMMUNITY_API}/community.php?action=topics`, { cache: "no-store" });
      const data = await readApiResponse<Topic[]>(response);
      setTopics(data.data && data.data.length > 0 ? data.data : fallbackTopics);
    } catch {
      setTopics(fallbackTopics);
    }
  }, []);

  const loadPosts = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams();
    params.set("type", activeTab);
    if (search.trim()) params.set("search", search.trim());
    if (currentAccount) params.set("Account", currentAccount);

    setLoadingPosts(true);
    setError("");
    setPosts([]);

    try {
      if (focusedPost) {
        if (!/^[1-9]\d*$/.test(targetPostId) || Number(targetPostId) > 2147483647) {
          throw new Error("通知未提供有效的貼文編號");
        }
        params.set("postId", targetPostId);
        const response = await fetch(`${COMMUNITY_API}/community.php?action=post&${params.toString()}`, { cache: "no-store", signal });
        const data = await readApiResponse<CommunityPost>(response);
        if (!data.data) throw new Error("這篇貼文已不存在或無法顯示。");
        setPosts([data.data]);
        setLoadedComments({ [data.data.id]: true });
        setOpenComments({ [data.data.id]: expandComments });
      } else {
        const response = await fetch(`${COMMUNITY_API}/community.php?action=posts&${params.toString()}`, { cache: "no-store", signal });
        const data = await readApiResponse<CommunityPost[]>(response);
        setPosts(data.data ?? []);
        setLoadedComments({});
        setOpenComments({});
      }
    } catch (apiError) {
      if (signal?.aborted) return;
      setError(apiError instanceof Error ? apiError.message : "載入動態失敗");
    } finally {
      if (!signal?.aborted) setLoadingPosts(false);
    }
  }, [activeTab, currentAccount, search, focusedPost, targetPostId, expandComments]);

  /* ------------------- 副作用處理 (useEffect) ------------------- */

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTopics(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTopics]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void loadPosts(controller.signal); }, search.trim() ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadPosts, search]);

  // 鎖定燈箱開啟時的背景滾動
  useEffect(() => {
    if (lightbox || editingPost) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [lightbox, editingPost]);

  /* ------------------- 事件處理常式 (Event Handlers) ------------------- */

  function selectTab(tab: TabType) {
    setActiveTab(tab);
    setPostType(tab === "all" ? "footprint" : tab);
    if (focusedPost) router.push("/community");
  }

  function searchPosts(value: string) {
    setSearch(value);
    if (focusedPost) router.push("/community");
  }

  async function loadComments(postId: number) {
    if (loadingComments[postId]) return;
    setLoadingComments((current) => ({ ...current, [postId]: true }));
    try {
      const response = await fetch(`${COMMUNITY_API}/community.php?action=comments&postId=${postId}`, { cache: "no-store" });
      const data = await readApiResponse<CommunityComment[]>(response);
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: data.data ?? [] } : post));
      setLoadedComments((current) => ({ ...current, [postId]: true }));
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "載入留言失敗");
    } finally {
      setLoadingComments((current) => ({ ...current, [postId]: false }));
    }
  }

  function toggleComments(postId: number) {
    setOpenComments((current) => {
      const willOpen = !current[postId];
      if (willOpen && !loadedComments[postId]) void loadComments(postId);
      return { ...current, [postId]: willOpen };
    });
  }

  function openCommentsForPost(postId: number) {
    setOpenComments((current) => ({ ...current, [postId]: true }));
    if (!loadedComments[postId]) void loadComments(postId);
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`圖片 ${file.name} 大小超過 5MB，已略過！`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));

    setImageFiles(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearImage() {
    previews.forEach(preview => URL.revokeObjectURL(preview));
    setPreviews([]);
    setImageFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

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

    imageFiles.forEach(file => {
      formData.append("images[]", file);
    });

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${COMMUNITY_API}/community.php?action=create`, {
        method: "POST",
        body: formData,
      });

      const data = await readApiResponse<CommunityPost>(response);
      if (data.data) {
        setPosts((current) => [data.data as CommunityPost, ...current]);
      }

      setTitle("");
      setDraft("");
      setLocation("");
      setTagText("");
      clearImage();
      void loadTopics();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "發布貼文時發生錯誤");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(post: CommunityPost) {
    setEditingPost(post);
    setEditTitle(post.title || "");
    setEditDraft(post.content || "");
    setEditLocation(post.location || "");
    setEditTagText(post.tags.join(", "));
    setEditExistingImages(post.images ? [...post.images] : []);
    setEditNewImageFiles([]);
    setEditNewPreviews([]);
  }

  function handleEditImage(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`圖片 ${file.name} 大小超過 5MB，已略過！`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;
    const newPreviewsList = validFiles.map(file => URL.createObjectURL(file));

    setEditNewImageFiles(prev => [...prev, ...validFiles]);
    setEditNewPreviews(prev => [...prev, ...newPreviewsList]);
    
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingPost || !currentAccount) return;
    setUpdating(true);

    const formData = new FormData();
    formData.append("Account", currentAccount);
    formData.append("Post_ID", String(editingPost.id));
    formData.append("Title", editTitle.trim());
    formData.append("Content", editDraft.trim());
    formData.append("Location_Name", editLocation.trim());
    formData.append("Tags", editTagText.trim());

    editExistingImages.forEach(url => {
      formData.append("Existing_Images[]", url); 
    });

    editNewImageFiles.forEach(file => {
      formData.append("New_Images[]", file);
    });

    try {
      const response = await fetch(`${COMMUNITY_API}/community.php?action=update`, {
        method: "POST",
        body: formData,
      });
      await readApiResponse(response);

      setPosts((current) =>
        current.map((p) => {
          if (p.id !== editingPost.id) return p;
          return {
            ...p,
            title: editTitle.trim(),
            content: editDraft.trim(),
            location: editLocation.trim(),
            images: [...editExistingImages, ...editNewPreviews],
            tags: editTagText
              .split(",")
              .map((t) => t.trim().replace(/^#/, ""))
              .filter(Boolean),
          };
        })
      );
      setEditingPost(null);
    } catch (apiError) {
      alert(apiError instanceof Error ? apiError.message : "更新貼文失敗");
    } finally {
      setUpdating(false);
    }
  }

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
        setPosts((current) => current.map((item) => item.id === post.id ? { ...item, commentCount: item.commentCount + 1 } : item));
        await loadComments(post.id);
      }

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
      
      {/* 🌟 1. 豐富頁首橫幅 (增加裝飾性背景光暈) 🌟 */}
      <section className="relative overflow-hidden bg-white rounded-b-[3rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] mb-8 border-b border-neutral-100 pb-4 z-10">
        {/* 裝飾性漸層光暈 */}
        <div className="absolute -top-40 -right-40 size-96 rounded-full bg-slate-100/70 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-neutral-100/60 blur-3xl pointer-events-none"></div>
        
        <div className="relative mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
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
            <label className="flex h-12 w-full items-center gap-3 rounded-full border border-neutral-200 bg-neutral-50 px-5 md:w-80 hover:bg-neutral-100 transition-colors cursor-text">
              <Search className="size-4 text-neutral-400" />
              <input
                value={search}
                onChange={(event) => searchPosts(event.target.value)}
                placeholder="搜尋地點、心得或 #標籤"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 font-medium"
              />
            </label>
          </div>
        </div>

        {/* 分類列上下留白，讓原生捲軸與按鈕、陰影分開，避免底部被截切。 */}
        <div className="relative mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-3 pt-1 md:px-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold tracking-wide transition-all ${activeTab === tab.id
                ? "bg-neutral-900 text-white shadow-md shadow-neutral-900/10"
                : "bg-white border border-neutral-200 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 hover:bg-neutral-50"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-8">
          {focusedPost && (
            <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <span className="font-bold">通知相關貼文</span>
              <button type="button" onClick={() => router.push("/community")} className="font-bold text-neutral-600 hover:text-neutral-900">返回全部動態</button>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
              <span className="font-medium">{error}</span>
              <button onClick={() => void loadPosts()} className="flex items-center gap-1.5 font-bold hover:text-red-900 transition-colors">
                <RefreshCw className="size-4" /> 重新載入
              </button>
            </div>
          )}

          {!focusedPost && <form ref={composeRef} onSubmit={publishPost} className="rounded-[2.5rem] border border-neutral-100/80 bg-white p-5 md:p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <div className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white shadow-sm shadow-neutral-900/10">
                {user ? getInitial(String(user.nickname || user.Account || "?")) : "?"}
              </div>

              <div className="min-w-0 flex-1">
                {(postType === "question" || postType === "group") && (
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={postType === "question" ? "輸入請益主旨 (例如：台東三天兩夜交通)" : "輸入揪團標題..."}
                    className="mb-3 w-full border-b border-neutral-100 bg-transparent px-0 pb-3 pt-1 text-base font-bold text-neutral-900 outline-none focus:border-neutral-400 transition-colors placeholder:font-medium placeholder:text-neutral-300"
                  />
                )}

                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={authLoading ? "載入中..." : currentAccount ? "今天去了哪裡？分享你的足跡、行程或問題細節..." : "登入後即可發表動態"}
                  rows={3}
                  disabled={!currentAccount}
                  className="w-full resize-none border-0 bg-transparent px-0 text-sm font-medium leading-relaxed outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
                />

                {previews && previews.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {previews.map((src, index) => (
                      <div key={src} className="relative h-24 w-24 overflow-hidden rounded-xl bg-neutral-100 border border-neutral-100">
                        <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                        
                        <button
                          type="button"
                          onClick={() => {
                            const newPreviews = [...previews];
                            URL.revokeObjectURL(newPreviews[index]);
                            newPreviews.splice(index, 1);
                            setPreviews(newPreviews);

                            const newFiles = [...imageFiles];
                            newFiles.splice(index, 1);
                            setImageFiles(newFiles);
                          }}
                          className="absolute right-1 top-1 rounded-full bg-black/50 backdrop-blur-md p-1 text-white hover:bg-black/70 transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
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

                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple 
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
          </form>}

          {loadingPosts && (
            <div className="flex flex-col items-center justify-center rounded-[2.5rem] border border-neutral-100 bg-white py-20 text-neutral-400">
              <Loader2 className="size-8 animate-spin text-neutral-900 mb-3" />
              <p className="text-sm font-medium">載入動態中...</p>
            </div>
          )}

          {!loadingPosts && !error && posts.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-neutral-200 bg-white py-20 text-neutral-400">
              <div className="size-16 rounded-full bg-neutral-50 flex items-center justify-center mb-3">
                <Compass className="size-8 text-neutral-300" />
              </div>
              <p className="text-sm font-bold text-neutral-500">目前還沒有相關動態</p>
              <p className="text-xs mt-1">來發布第一篇分享吧！</p>
            </div>
          )}

          {!loadingPosts &&
            posts.map((post) => (
              /* 🌟 2. 貼文卡片增加「懸浮動畫」與「立體陰影」 🌟 */
              <article key={post.id} className="group/card overflow-hidden rounded-[2.5rem] border border-neutral-100/80 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:border-neutral-200">
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
                    
                    <div className="flex items-center gap-2">
                      {currentAccount && String(post.author?.account || (post as any).author?.Account || (post as any).Account || "").toLowerCase() === currentAccount.toLowerCase() && (
                        <button
                          onClick={() => openEditModal(post)}
                          className="flex size-7 items-center justify-center rounded-full bg-neutral-50 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
                          title="編輯貼文"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                      )}
                      <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-[10px] font-bold tracking-wider text-neutral-900">
                        {getTypeLabel(post.type)}
                      </span>
                    </div>

                  </div>

                  {post.title && <h2 className="mt-4 text-lg font-bold leading-tight text-neutral-900">{post.title}</h2>}
                  <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-neutral-600">{post.content}</p>

                  {/* 🌟 3. 標籤與地點加入微對比色彩與懸浮效果 🌟 */}
                  {post.location && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50/50 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                      <MapPin className="size-3 text-slate-900" /> {post.location}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags.map((item) => (
                      <button
                        key={item}
                        onClick={() => searchPosts(item)}
                        className="rounded-full border border-neutral-100 bg-white px-3 py-1 text-[11px] font-bold text-neutral-500 shadow-sm transition-all hover:border-neutral-900 hover:bg-neutral-900 hover:text-white hover:shadow-md"
                      >
                        #{item}
                      </button>
                    ))}
                  </div>
                </div>

                {post.images && post.images.length > 0 && (
                  <div className="px-3 md:px-4 mt-5">
                    {post.images.length === 1 && (
                      <div className="relative w-fit max-w-full rounded-2xl overflow-hidden bg-neutral-50 border border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer">
                        <img 
                          src={post.images[0]} 
                          alt={`${post.author.name} 照片 1`} 
                          onClick={() => setLightbox({ images: post.images, index: 0 })}
                          className="w-auto h-auto max-w-full max-h-[500px] md:max-h-[600px] object-contain hover:scale-105 transition-transform duration-700" 
                        />
                      </div>
                    )}
                    {post.images.length === 2 && (
                      <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden h-[250px] md:h-[350px]">
                        {post.images.map((src, index) => (
                          <div key={src} className="relative w-full h-full overflow-hidden bg-neutral-100 cursor-pointer">
                            <img 
                              src={src} 
                              alt={`照片 ${index + 1}`} 
                              onClick={() => setLightbox({ images: post.images, index })}
                              className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {post.images.length === 3 && (
                      <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden h-[300px] md:h-[400px]">
                        <div className="relative w-full h-full overflow-hidden bg-neutral-100 cursor-pointer">
                          <img 
                            src={post.images[0]} 
                            alt="照片 1" 
                            onClick={() => setLightbox({ images: post.images, index: 0 })}
                            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                          />
                        </div>
                        <div className="grid grid-rows-2 gap-1 h-full">
                          <div className="relative w-full h-full overflow-hidden bg-neutral-100 cursor-pointer">
                            <img 
                              src={post.images[1]} 
                              alt="照片 2" 
                              onClick={() => setLightbox({ images: post.images, index: 1 })}
                              className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                            />
                          </div>
                          <div className="relative w-full h-full overflow-hidden bg-neutral-100 cursor-pointer">
                            <img 
                              src={post.images[2]} 
                              alt="照片 3" 
                              onClick={() => setLightbox({ images: post.images, index: 2 })}
                              className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {post.images.length >= 4 && (
                      <div className="grid grid-cols-2 grid-rows-2 gap-1 rounded-2xl overflow-hidden h-[300px] md:h-[400px]">
                        {[0, 1, 2].map((idx) => (
                          <div key={idx} className="relative w-full h-full overflow-hidden bg-neutral-100 cursor-pointer">
                            <img 
                              src={post.images[idx]} 
                              alt={`照片 ${idx + 1}`} 
                              onClick={() => setLightbox({ images: post.images, index: idx })}
                              className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                            />
                          </div>
                        ))}
                        <div 
                          className="relative w-full h-full overflow-hidden bg-neutral-100 group cursor-pointer"
                          onClick={() => setLightbox({ images: post.images, index: 3 })}
                        >
                          <img src={post.images[3]} alt="照片 4" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          {post.images.length > 4 && (
                            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px] flex items-center justify-center text-white text-2xl font-bold">
                              +{post.images.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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

                {openComments[post.id] && (
                  <div className="border-t border-neutral-100 bg-[#FBFBFB] px-5 py-5 md:px-6">
                    {loadingComments[post.id] ? (
                      <div className="mb-4 flex items-center justify-center gap-2 text-xs font-medium text-neutral-400 py-4"><Loader2 className="size-4 animate-spin text-neutral-900" /> 載入留言中...</div>
                    ) : (
                      <div className="mb-5 space-y-4">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className={`flex gap-3 text-sm ${comment.parentId ? "ml-8 md:ml-12 border-l-2 border-neutral-200 pl-4" : ""}`}>
                            <div className="flex min-w-0 items-start gap-3 cursor-pointer group flex-1" onClick={() => { if (comment.account) router.push(`/profile/${encodeURIComponent(comment.account)}`); }}>
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
                                  onClick={(e) => { e.stopPropagation(); setReplyTargets((current) => ({ ...current, [post.id]: comment })); }}
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

                    {replyTargets[post.id] && (
                      <div className="mb-3 flex items-center justify-between rounded-xl bg-neutral-100 px-4 py-2 text-[11px] font-bold text-neutral-900">
                        <span>正在回覆 @{replyTargets[post.id]?.author}</span>
                        <button onClick={() => setReplyTargets((current) => ({ ...current, [post.id]: undefined }))} className="text-neutral-500 hover:text-neutral-900 transition-colors">取消</button>
                      </div>
                    )}

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

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start hidden md:block">
          <section className="rounded-[2.5rem] border border-neutral-100/80 bg-white p-6 shadow-sm">
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
                  onClick={() => searchPosts(topic.tag)}
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

        {!focusedPost && <div className="fixed bottom-24 right-6 z-40 md:hidden">
          <button
            onClick={() => {
              if (composeRef.current) {
                composeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const textarea = composeRef.current.querySelector('textarea');
                if (textarea) setTimeout(() => textarea.focus(), 500);
              }
            }}
            className="flex size-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-xl shadow-neutral-900/20 hover:scale-110 transition-transform"
          >
            <PenLine className="size-6" />
          </button>
        </div>}
      </div>

      {/* 🌟 編輯貼文彈出視窗 (Modal) 🌟 */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-neutral-900">編輯貼文</h3>
              <button onClick={() => setEditingPost(null)} className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors">
                <X className="size-5" />
              </button>
            </div>
            
            <form onSubmit={submitEdit} className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-4">
              {(editingPost.type === "question" || editingPost.type === "group") && (
                <div>
                  <label className="text-xs font-bold text-neutral-500 mb-1 block">標題</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-bold text-neutral-900 outline-none focus:border-neutral-900 focus:bg-white transition-all"
                  />
                </div>
              )}
              
              <div>
                <label className="text-xs font-bold text-neutral-500 mb-1 block">內文</label>
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium leading-relaxed outline-none focus:border-neutral-900 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-500 mb-2 block">編輯圖片</label>
                {(editExistingImages.length > 0 || editNewPreviews.length > 0) && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {editExistingImages.map((src, index) => (
                      <div key={`existing-${index}`} className="relative h-20 w-20 overflow-hidden rounded-xl bg-neutral-100 border border-neutral-200">
                        <img src={src} alt="舊圖片" className="w-full h-full object-cover opacity-90" />
                        <button
                          type="button"
                          onClick={() => setEditExistingImages(prev => prev.filter((_, i) => i !== index))}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-rose-500 transition-colors"
                          title="刪除這張舊圖片"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}

                    {editNewPreviews.map((src, index) => (
                      <div key={`new-${index}`} className="relative h-20 w-20 overflow-hidden rounded-xl bg-neutral-100 border border-emerald-500 shadow-[0_0_0_1px_#10b981]">
                        <img src={src} alt="新圖片" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-500/90 py-0.5 text-[9px] text-white text-center font-bold">新上傳</div>
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(src);
                            setEditNewPreviews(prev => prev.filter((_, i) => i !== index));
                            setEditNewImageFiles(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-rose-500 transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEditImage}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-bold text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                >
                  <ImagePlus className="size-3.5" /> 新增圖片
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-500 mb-1 flex items-center gap-1"><MapPin className="size-3"/> 地點</label>
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 mb-1 flex items-center gap-1"><Compass className="size-3"/> 標籤 (逗號分隔)</label>
                  <input
                    value={editTagText}
                    onChange={(e) => setEditTagText(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:bg-white transition-all"
                  />
                </div>
              </div>
              
              <div className="pt-4 mt-2 border-t border-neutral-100 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingPost(null)} className="rounded-full px-5 py-2.5 text-sm font-bold text-neutral-500 hover:bg-neutral-100 transition-colors">
                  取消
                </button>
                <button type="submit" disabled={updating || !editDraft.trim()} className="flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {updating ? <Loader2 className="size-4 animate-spin" /> : <Edit2 className="size-4" />} 
                  {updating ? "儲存中..." : "儲存修改"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 圖片放大燈箱 (Lightbox) 🌟 */}
      {lightbox && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md transition-all"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 md:right-8 md:top-8 z-[101] rounded-full bg-white/10 p-2 text-white hover:bg-white/30 transition-colors"
          >
            <X className="size-6" />
          </button>

          {lightbox.index > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox({ ...lightbox, index: lightbox.index - 1 });
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 md:left-8 z-[101] rounded-full bg-white/10 p-2 md:p-3 text-white hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="size-6 md:size-8" />
            </button>
          )}

          <img
            src={lightbox.images[lightbox.index]}
            alt="Enlarged"
            className="max-h-full max-w-full object-contain cursor-default"
            onClick={(e) => e.stopPropagation()} 
          />

          {lightbox.index < lightbox.images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox({ ...lightbox, index: lightbox.index + 1 });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 md:right-8 z-[101] rounded-full bg-white/10 p-2 md:p-3 text-white hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="size-6 md:size-8" />
            </button>
          )}
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm font-bold tracking-widest text-white/90 backdrop-blur-md">
            {lightbox.index + 1} / {lightbox.images.length}
          </div>
        </div>
      )}
    </div>
  );
}
