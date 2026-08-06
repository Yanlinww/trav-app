"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation"; // 🌟 1. 引入 useRouter
import {
  Bookmark,
  ChevronRight,
  Compass,
  Heart,
  ImagePlus,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

type PostType = "footprint" | "question" | "group";
type TabType = "all" | PostType;

type CommunityAuthor = {
  account?: string; // 🌟 2. 新增 account 屬性，用來作為跳轉依據
  name: string;
  avatar: string;
};

type CommunityComment = {
  id: number;
  parentId: number | null;
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const COMMUNITY_API = `${API_BASE}/community`;

const tabs: { id: TabType; label: string }[] = [
  { id: "all", label: "全部" },
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
  { tag: "日本", count: 0 },
  { tag: "美食", count: 0 },
  { tag: "秘境", count: 0 },
];

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

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter(); // 🌟 3. 初始化 router
  const currentAccount = user ? String(user.id || user.Account || "") : "";

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [topics, setTopics] = useState<Topic[]>(fallbackTopics);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");
  const [postType, setPostType] = useState<PostType>("footprint");
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [location, setLocation] = useState("");
  const [tagText, setTagText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<number, CommunityComment | undefined>>({});
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});

  const [loadingPosts, setLoadingPosts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const visibleTopics = useMemo(() => (topics.length > 0 ? topics : fallbackTopics), [topics]);

  const loadTopics = useCallback(async () => {
    try {
      const response = await fetch(`${COMMUNITY_API}/get_topics.php`, { cache: "no-store" });
      const data = await readApiResponse<Topic[]>(response);
      setTopics(data.data && data.data.length > 0 ? data.data : fallbackTopics);
    } catch {
      setTopics(fallbackTopics);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("type", activeTab);
    if (search.trim()) params.set("search", search.trim());
    if (currentAccount) params.set("Account", currentAccount);

    setLoadingPosts(true);
    setError("");

    try {
      const response = await fetch(`${COMMUNITY_API}/get_posts.php?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await readApiResponse<CommunityPost[]>(response);
      setPosts(data.data ?? []);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "載入動態失敗");
    } finally {
      setLoadingPosts(false);
    }
  }, [activeTab, currentAccount, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTopics();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTopics]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPosts();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadPosts]);

  function selectTab(tab: TabType) {
    setActiveTab(tab);
    setPostType(tab === "all" ? "footprint" : tab);
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("圖片大小不能超過 5MB");
      event.target.value = "";
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setImageFile(null);
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

    if (imageFile) formData.append("image", imageFile);

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${COMMUNITY_API}/create_post.php`, {
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

  async function toggleReaction(post: CommunityPost, reactionType: "like" | "save") {
    if (!currentAccount) {
      alert("請先登入即可使用此功能！");
      return;
    }

    try {
      const response = await fetch(`${COMMUNITY_API}/toggle_reaction.php`, {
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
      const response = await fetch(`${COMMUNITY_API}/add_comment.php`, {
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
        setPosts((current) =>
          current.map((item) =>
            item.id === post.id
              ? {
                  ...item,
                  comments: [...item.comments, data.data as CommunityComment],
                  commentCount: item.commentCount + 1,
                }
              : item,
          ),
        );
      }

      setCommentDrafts((current) => ({ ...current, [post.id]: "" }));
      setReplyTargets((current) => ({ ...current, [post.id]: undefined }));
      setOpenComments((current) => ({ ...current, [post.id]: true }));
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "留言發布失敗");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-neutral-900">
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

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-6">
          {error && (
            <div className="flex items-center justify-between border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button onClick={() => void loadPosts()} className="flex items-center gap-1 font-semibold">
                <RefreshCw className="size-3.5" /> 重試
              </button>
            </div>
          )}

          <form onSubmit={publishPost} className="border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                {user ? getInitial(String(user.nickname || user.Account || "?")) : "?"}
              </div>
              <div className="min-w-0 flex-1">
                {(postType === "question" || postType === "group") && (
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={postType === "question" ? "輸入請益主旨..." : "輸入揪團標題..."}
                    className="mb-3 w-full border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
                  />
                )}
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={authLoading ? "載入中..." : currentAccount ? "分享你的旅行足跡與心得..." : "登入後即可發表動態"}
                  rows={4}
                  disabled={!currentAccount}
                  className="w-full resize-none border-0 bg-transparent text-sm leading-7 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
                
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

          {loadingPosts && (
            <div className="border border-neutral-200 bg-white py-14 text-center text-sm text-neutral-400">
              載入動態中...
            </div>
          )}

          {!loadingPosts && posts.length === 0 && (
            <div className="border border-dashed border-neutral-300 bg-white py-16 text-center text-sm text-neutral-400">
              目前沒有任何動態
            </div>
          )}

          {!loadingPosts &&
            posts.map((post) => (
              <article key={post.id} className="overflow-hidden border border-neutral-200 bg-white shadow-sm">
                <div className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    
                    {/* 🌟 4. 加入 onClick 點擊跳轉事件 🌟 */}
                    <div 
                      className="flex min-w-0 items-center gap-3 cursor-pointer group"
                      onClick={() => {
                        // 確保有帳號資料才進行跳轉
                        if (post.author.account) {
                          router.push(`/profile/${encodeURIComponent(post.author.account)}`);
                        } else {
                          alert("後端尚未回傳此作者的帳號 (account)，無法跳轉！請提醒夥伴更新 API 喔。");
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

                    <span className="shrink-0 bg-neutral-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-neutral-600">
                      {getTypeLabel(post.type)}
                    </span>
                  </div>

                  {post.title && <h2 className="mt-5 text-lg font-semibold leading-7">{post.title}</h2>}
                  <p className="mt-4 whitespace-pre-line text-sm font-light leading-7 text-neutral-600">{post.content}</p>
                  
                  {post.location && (
                    <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                      <MapPin className="size-3.5" /> {post.location}
                    </p>
                  )}
                  
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

                <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 md:px-6">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => void toggleReaction(post, "like")}
                      aria-label={post.liked ? "取消讚" : "按讚"}
                      className={`flex items-center gap-2 px-3 py-2 text-xs transition ${post.liked ? "text-rose-600" : "text-neutral-500 hover:text-neutral-900"}`}
                    >
                      <Heart className={`size-4 ${post.liked ? "fill-current" : ""}`} /> {post.likes}
                    </button>
                    <button
                      onClick={() => setOpenComments((current) => ({ ...current, [post.id]: !current[post.id] }))}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-500 hover:text-neutral-900"
                    >
                      <MessageCircle className="size-4" /> {post.commentCount}
                    </button>
                  </div>
                  <button
                    onClick={() => void toggleReaction(post, "save")}
                    aria-label={post.saved ? "取消收藏" : "收藏貼文"}
                    className={`p-2 transition ${post.saved ? "text-amber-600" : "text-neutral-400 hover:text-neutral-900"}`}
                  >
                    <Bookmark className={`size-4 ${post.saved ? "fill-current" : ""}`} />
                  </button>
                </div>

                {(openComments[post.id] || post.comments.length > 0) && (
                  <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-4 md:px-6">
                    {openComments[post.id] && (
                      <div className="mb-4 space-y-3">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className={`flex gap-2 text-xs leading-5 ${comment.parentId ? "ml-6 border-l border-neutral-200 pl-3" : ""}`}>
                            {comment.avatar ? (
                              <div className="relative mt-0.5 size-7 shrink-0 overflow-hidden rounded-full bg-neutral-100">
                                <Image src={comment.avatar} alt={comment.author} fill unoptimized className="object-cover" />
                              </div>
                            ) : (
                              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-600">
                                {getInitial(comment.author)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-neutral-800">{comment.author}</span>
                                <span className="text-[10px] text-neutral-400">{comment.time}</span>
                                <button
                                  type="button"
                                  onClick={() => setReplyTargets((current) => ({ ...current, [post.id]: comment }))}
                                  className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-800"
                                >
                                  回覆
                                </button>
                              </div>
                              <p className="mt-1 text-neutral-500">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

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

                    <form onSubmit={(event) => void submitComment(event, post)} className="flex gap-2">
                      <input
                        value={commentDrafts[post.id] || ""}
                        onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                        onFocus={() => setOpenComments((current) => ({ ...current, [post.id]: true }))}
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