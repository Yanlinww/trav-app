"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Bookmark,
  Camera,
  ChevronRight,
  CircleHelp,
  Compass,
  Heart,
  ImagePlus,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";

type FeedType = "footprint" | "question" | "group";

type Comment = {
  id: number;
  author: string;
  text: string;
};

type Post = {
  id: number;
  type: FeedType;
  author: string;
  handle: string;
  avatar: string;
  time: string;
  title?: string;
  content: string;
  location?: string;
  tags: string[];
  images: string[];
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: Comment[];
};

const initialPosts: Post[] = [
  {
    id: 1,
    type: "footprint",
    author: "林予晴",
    handle: "@yuching.travels",
    avatar: "晴",
    time: "18 分鐘前",
    content:
      "清晨六點的清水寺，比想像中更安靜。沿著二年坂慢慢走，店家還沒開門，只有掃地聲和微涼的風。獨旅最喜歡的，就是能把時間留給這些小事。",
    location: "日本・京都・清水寺",
    tags: ["京都獨旅", "晨間散步", "底片感"],
    images: [
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1100&q=85",
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=700&q=85",
    ],
    likes: 128,
    liked: false,
    saved: false,
    comments: [
      { id: 1, author: "周安", text: "清晨真的最適合感受京都，照片好有氣氛！" },
      { id: 2, author: "Mina", text: "請問從車站走過去大概多久呢？" },
    ],
  },
  {
    id: 2,
    type: "question",
    author: "陳奕廷",
    handle: "@ethan_ontheroad",
    avatar: "奕",
    time: "1 小時前",
    title: "第一次一個人去冰島自駕，有哪些事情一定要注意？",
    content:
      "預計十月環島 9 天，目前最擔心天氣變化和加油問題。已經有雪地駕駛經驗，但沒去過冰島，希望有經驗的旅人分享路線安排。",
    location: "冰島",
    tags: ["疑難雜症", "冰島自駕", "行前準備"],
    images: [],
    likes: 46,
    liked: false,
    saved: true,
    comments: [
      { id: 1, author: "Kai", text: "每天先看 road.is 和 vedur.is，不要硬追原本排好的行程。" },
      { id: 2, author: "Sora", text: "建議租四驅，油箱過半看到加油站就補。" },
    ],
  },
  {
    id: 3,
    type: "group",
    author: "許庭瑄",
    handle: "@tinghsuan",
    avatar: "庭",
    time: "3 小時前",
    title: "快閃揪團｜週六一起去陽明山看海芋",
    content:
      "目前兩人，想再找 2～3 位喜歡拍照、步調悠閒的旅伴。早上九點劍潭站集合，下午回台北市區吃飯。",
    location: "台灣・台北・陽明山",
    tags: ["快閃揪團", "週末出走", "攝影"],
    images: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1100&q=85",
    ],
    likes: 31,
    liked: false,
    saved: false,
    comments: [{ id: 1, author: "Leo", text: "有興趣！已私訊行程細節。" }],
  },
];

const tabs: { id: "all" | FeedType; label: string }[] = [
  { id: "all", label: "全部動態" },
  { id: "footprint", label: "獨旅足跡" },
  { id: "question", label: "疑難問答" },
  { id: "group", label: "快閃揪團" },
];

const hotTopics = [
  ["#第一次獨旅", "2,341 篇動態"],
  ["#日本賞楓", "1,827 篇動態"],
  ["#女生獨旅安全", "986 篇討論"],
  ["#週末小旅行", "754 篇動態"],
];

export default function CommunityPage() {
  const [posts, setPosts] = useState(initialPosts);
  const [activeTab, setActiveTab] = useState<"all" | FeedType>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [location, setLocation] = useState("");
  const [tag, setTag] = useState("");
  const [preview, setPreview] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visiblePosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesTab = activeTab === "all" || post.type === activeTab;
      const matchesSearch =
        !keyword ||
        [post.author, post.title, post.content, post.location, ...post.tags]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return matchesTab && matchesSearch;
    });
  }, [activeTab, posts, search]);

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  function publishPost(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;

    const nextPost: Post = {
      id: Date.now(),
      type: activeTab === "all" ? "footprint" : activeTab,
      author: "我的旅程",
      handle: "@travmade_me",
      avatar: "我",
      time: "剛剛",
      content: draft.trim(),
      location: location.trim() || undefined,
      tags: tag.trim() ? [tag.trim().replace(/^#/, "")] : ["獨旅日記"],
      images: preview ? [preview] : [],
      likes: 0,
      liked: false,
      saved: false,
      comments: [],
    };

    setPosts((current) => [nextPost, ...current]);
    setDraft("");
    setLocation("");
    setTag("");
    setPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function patchPost(id: number, patch: Partial<Post>) {
    setPosts((current) =>
      current.map((post) => (post.id === id ? { ...post, ...patch } : post)),
    );
  }

  function submitComment(event: FormEvent, post: Post) {
    event.preventDefault();
    const text = commentDrafts[post.id]?.trim();
    if (!text) return;
    patchPost(post.id, {
      comments: [...post.comments, { id: Date.now(), author: "我", text }],
    });
    setCommentDrafts((current) => ({ ...current, [post.id]: "" }));
  }

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-neutral-900">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-neutral-400">
                <Sparkles className="size-3.5 text-amber-500" /> Travmade Community
              </p>
              <h1 className="text-4xl font-light tracking-tight md:text-5xl">旅人動態牆</h1>
              <p className="mt-3 max-w-xl text-sm font-light leading-7 text-neutral-500">
                分享獨旅寫真與足跡、交換旅途情報，也在下一次出發前找到同行的人。
              </p>
            </div>
            <label className="flex h-12 w-full items-center gap-3 border border-neutral-200 bg-neutral-50 px-4 md:w-80">
              <Search className="size-4 text-neutral-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜尋景點、主題或旅人"
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
              onClick={() => setActiveTab(tab.id)}
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
          <form onSubmit={publishPost} className="border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                我
              </div>
              <div className="min-w-0 flex-1">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="這趟旅程，有什麼想和旅人分享？"
                  rows={3}
                  className="w-full resize-none border-0 bg-transparent text-sm leading-7 outline-none placeholder:text-neutral-400"
                />

                {preview && (
                  <div className="relative mt-3 h-56 overflow-hidden bg-neutral-100">
                    <Image src={preview} alt="上傳照片預覽" fill unoptimized className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setPreview("")}
                      aria-label="移除照片"
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
                      placeholder="加入景點足跡"
                      className="w-full bg-transparent outline-none"
                    />
                  </label>
                  <label className="flex items-center gap-2 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500">
                    <Compass className="size-3.5" />
                    <input
                      value={tag}
                      onChange={(event) => setTag(event.target.value)}
                      placeholder="加入主題標籤"
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
                      className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-900"
                    >
                      <ImagePlus className="size-4" /> 實景照片
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="flex items-center gap-2 bg-neutral-900 px-5 py-2.5 text-xs font-bold tracking-widest text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    發布足跡 <Send className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </form>

          {visiblePosts.length === 0 && (
            <div className="border border-dashed border-neutral-300 bg-white py-16 text-center text-sm text-neutral-400">
              找不到符合條件的旅途動態
            </div>
          )}

          {visiblePosts.map((post) => (
            <article key={post.id} className="overflow-hidden border border-neutral-200 bg-white shadow-sm">
              <div className="p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-700">
                      {post.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="text-sm font-bold">{post.author}</span>
                        <span className="text-xs text-neutral-400">{post.handle}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-neutral-400">{post.time}</p>
                    </div>
                  </div>
                  <span className="shrink-0 bg-neutral-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-neutral-600">
                    {post.type === "question" ? "疑難問答" : post.type === "group" ? "快閃揪團" : "獨旅足跡"}
                  </span>
                </div>

                {post.title && <h2 className="mt-5 text-lg font-semibold leading-7">{post.title}</h2>}
                <p className="mt-4 text-sm font-light leading-7 text-neutral-600">{post.content}</p>

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
                      alt={`${post.author} 的旅途照片 ${index + 1}`}
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
                    onClick={() => patchPost(post.id, { liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) })}
                    aria-label={post.liked ? "取消按讚" : "按讚"}
                    className={`flex items-center gap-2 px-3 py-2 text-xs transition ${post.liked ? "text-rose-600" : "text-neutral-500 hover:text-neutral-900"}`}
                  >
                    <Heart className={`size-4 ${post.liked ? "fill-current" : ""}`} /> {post.likes}
                  </button>
                  <button
                    onClick={() => setOpenComments((current) => ({ ...current, [post.id]: !current[post.id] }))}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-500 hover:text-neutral-900"
                  >
                    <MessageCircle className="size-4" /> {post.comments.length}
                  </button>
                </div>
                <button
                  onClick={() => patchPost(post.id, { saved: !post.saved })}
                  aria-label={post.saved ? "取消收藏" : "收藏"}
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
                        <div key={comment.id} className="flex gap-3 text-xs leading-5">
                          <span className="shrink-0 font-bold text-neutral-800">{comment.author}</span>
                          <span className="text-neutral-500">{comment.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={(event) => submitComment(event, post)} className="flex gap-2">
                    <input
                      value={commentDrafts[post.id] || ""}
                      onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                      onFocus={() => setOpenComments((current) => ({ ...current, [post.id]: true }))}
                      placeholder="留下你的旅行建議或回應⋯"
                      className="min-w-0 flex-1 border border-neutral-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-neutral-500"
                    />
                    <button type="submit" aria-label="送出留言" className="bg-neutral-900 px-3 text-white">
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
                <Compass className="size-4" /> 主題情報看板
              </h2>
              <span className="text-[10px] tracking-widest text-neutral-400">TRENDING</span>
            </div>
            <div className="space-y-1">
              {hotTopics.map(([topic, count], index) => (
                <button
                  key={topic}
                  onClick={() => setSearch(topic.slice(1))}
                  className="group flex w-full items-center gap-3 border-b border-neutral-100 py-3 text-left last:border-0"
                >
                  <span className="text-xs font-bold text-neutral-300">0{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-neutral-700 group-hover:text-neutral-900">{topic}</span>
                    <span className="mt-1 block text-[10px] text-neutral-400">{count}</span>
                  </span>
                  <ChevronRight className="size-3.5 text-neutral-300" />
                </button>
              ))}
            </div>
          </section>

          <section className="border border-neutral-200 bg-neutral-900 p-5 text-white shadow-sm">
            <CircleHelp className="size-6 text-amber-400" />
            <h2 className="mt-4 text-base font-semibold">旅途中遇到疑難雜症？</h2>
            <p className="mt-2 text-xs font-light leading-6 text-neutral-400">
              將動態切換至「疑難問答」，讓走過同一段路的旅人提供實用答案。
            </p>
            <button
              onClick={() => setActiveTab("question")}
              className="mt-5 flex w-full items-center justify-between border border-neutral-700 px-4 py-3 text-xs font-bold tracking-wider hover:bg-white hover:text-neutral-900"
            >
              前往問答區 <ChevronRight className="size-4" />
            </button>
          </section>

          <section className="border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <Users className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">週末快閃揪團區</h2>
                <p className="mt-1 text-[10px] text-neutral-400">今天新增 12 個旅伴邀請</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("group")}
              className="mt-4 w-full bg-stone-100 px-4 py-3 text-xs font-semibold text-neutral-700 hover:bg-stone-200"
            >
              查看正在揪團的旅人
            </button>
          </section>

          <div className="flex items-center gap-2 px-1 text-[10px] leading-5 text-neutral-400">
            <Camera className="size-3.5 shrink-0" />
            上傳照片前，請尊重同行者隱私與景點拍攝規範。
          </div>
        </aside>
      </div>
    </div>
  );
}
