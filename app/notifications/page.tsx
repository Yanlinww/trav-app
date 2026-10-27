'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Bell, Heart, MessageCircle, CheckCircle2, Loader2, Info, UserPlus } from 'lucide-react';


// notifications.php 回傳的通知；referenceId 目前不作為本頁導航目標。
type Notification = {
  id: number; // 列表 key，與 referenceId 指向的業務對象不同。
  type: 'like' | 'comment' | 'follow' | 'system';
  referenceId: string | null; // 相關業務資料的識別碼；目前點擊不靠它定位特定貼文。
  message: string;
  isRead: boolean; // 控制未讀項目的外觀；不因點擊通知而在此自動變更。
  createdAt: string; // 交由畫面轉為 zh-TW 日期時間顯示。
  sender: {
    account: string | null;
    name: string;
    avatar: string;
  };
};

// 以登入帳號讀取通知及未讀數，畫面操作與後端已讀狀態分開處理。
export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const currentAccount = user ? String(user.id || (user as any).Account || "") : "";
  // 帳號來自共用會員資料，僅用作 API 查詢參數；本頁不自行驗證會員憑證。

  const [notifications, setNotifications] = useState<Notification[]>([]);
  // 未讀數獨立取自 API；isFetching 控制初次載入，isMarkingRead 控制批次已讀按鈕。
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  // 先等待會員資料還原，避免初始 user=null 時把已登入者提早導回登入頁。
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // 沒有可用帳號時不送出查詢；訪客導頁由前一個 Effect 負責。
    if (!currentAccount) return;
    // 帳號改變時重讀整份列表，未讀數採後端結果，不從目前畫面自行推算。
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/backend/notifications.php?action=get", {
          method: "POST", headers: { "Content-Type": "application/json" },
          // Account 是通知接收者，用來查詢誰的通知，而不是查發送者。
          body: JSON.stringify({ Account: currentAccount })
        });
        const data = await res.json();
        // data.data 提供通知列表，unreadCount 是同次查詢的未讀統計；成功時一併更新。
        if (data.status === 'success') {
          setNotifications(data.data);
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        // 例外只記錄、不清空原列表或顯示額外錯誤畫面；業務失敗也不更新列表。
        console.error("無法取得通知", error);
      } finally {
        // 只結束讀取狀態；即使失敗，也不會在這裡把通知與未讀數重設為零。
        setIsFetching(false);
      }
    };
    fetchNotifications();
  // 帳號改變才重讀，沒有輪詢；收到新通知不會由此 Effect 自動即時推播到畫面。
  }, [currentAccount]);

  // 標記該帳號全部已讀；後端成功才同步列表與未讀數，處理中由按鈕停用防連點。
  const handleMarkAllAsRead = async () => {
    // 只傳接收帳號，不傳通知 ID，因此操作的是該帳號全部通知，不是單筆。
    if (unreadCount === 0 || !currentAccount) return;
    setIsMarkingRead(true);
    try {
      const res = await fetch("/backend/notifications.php?action=mark_read", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: currentAccount })
      });
      const data = await res.json();
      if (data.status === 'success') {
        // 保留各通知內容，只替換 isRead，讓未讀標記／樣式立即消失，同步將未讀數歸零。
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      // 只有拋出的例外會顯示此提示；後端 status 非 success 時，目前保留原狀而不另提示。
      alert("標記已讀失敗");
    } finally {
      setIsMarkingRead(false);
    }
  };

  // 讚／留言前往動態牆，追蹤通知前往發送者個人頁；此操作不呼叫已讀 API。
  const handleNotificationClick = (notif: Notification) => {
    if (notif.type === 'like' || notif.type === 'comment') {
      router.push(`/community`);
    } else if (notif.type === 'follow' && notif.sender.account) {
      // 編碼帳號作為單一路徑參數，避免特殊字元改變個人頁網址結構。
      router.push(`/profile/${encodeURIComponent(notif.sender.account)}`);
    }
  };

  // 僅決定圖示與配色；system 或未知種類使用一般資訊樣式。
  const getIconConfig = (type: string) => {
    switch (type) {
      case 'like': return { icon: Heart, bg: 'bg-rose-100', text: 'text-rose-500' };
      case 'comment': return { icon: MessageCircle, bg: 'bg-blue-100', text: 'text-blue-500' };
      case 'follow': return { icon: UserPlus, bg: 'bg-pink-100', text: 'text-pink-500' };
      default: return { icon: Info, bg: 'bg-neutral-100', text: 'text-neutral-500' };
    }
  };

  // 登入資料與通知讀取任一尚未完成時，先顯示載入畫面。
  if (loading || isFetching) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FBFBFB]"><Loader2 className="w-8 h-8 animate-spin text-neutral-300" /></div>;
  }

  // 讀取完且列表為空才顯示「尚無通知」；每列外觀依 isRead 決定，點擊只做導航。
  return (
    <div className="min-h-screen bg-[#FBFBFB] pt-12 pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* 標題與操作區 */}
        <div className="flex items-end justify-between mb-8 border-b border-neutral-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="size-12 bg-neutral-900 rounded-full flex items-center justify-center text-white shadow-md">
              <Bell size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-extralight text-neutral-900 tracking-wide">通知中心</h1>
              <p className="text-xs text-neutral-400 font-medium tracking-widest uppercase mt-1">
                {unreadCount > 0 ? `你有 ${unreadCount} 則未讀通知` : "目前沒有新通知"}
              </p>
            </div>
          </div>
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingRead}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 shadow-sm"
          >
            {isMarkingRead ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            全部標記為已讀
          </button>
        </div>

        {/* 通知列表 */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-100 p-16 flex flex-col items-center justify-center text-center shadow-sm">
              <Bell className="w-12 h-12 text-neutral-200 mb-4" />
              <h3 className="text-lg font-bold tracking-widest mb-2 text-neutral-500">尚無任何通知</h3>
              <p className="text-sm text-neutral-400">當有人與你互動時，通知會顯示在這裡。</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const IconConfig = getIconConfig(notif.type);
              const Icon = IconConfig.icon;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${notif.isRead
                      ? 'bg-white border-neutral-100 hover:border-neutral-300 shadow-sm'
                      : 'bg-pink-50/40 border-pink-200 shadow-md'
                    }`}
                >
                  <div className="relative">
                    {/* 發送者大頭貼 */}
                    {notif.sender.avatar ? (
                      <div className="size-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                        <img src={notif.sender.avatar} alt={notif.sender.name} className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className="size-12 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold border-2 border-white shadow-sm shrink-0">
                        {notif.sender.name.charAt(0)}
                      </div>
                    )}
                    {/* 右下角類型小圖示 */}
                    <div className={`absolute -bottom-1 -right-1 size-6 rounded-full border-2 border-white flex items-center justify-center ${IconConfig.bg} ${IconConfig.text}`}>
                      <Icon size={12} strokeWidth={3} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm text-neutral-800 leading-relaxed">
                      <span className="font-bold mr-1">{notif.sender.name}</span>
                      {notif.message}
                    </p>
                    <p className="text-[10px] font-medium text-neutral-400 mt-1.5 font-mono">
                      {new Date(notif.createdAt).toLocaleString('zh-TW', { hour12: false })}
                    </p>
                  </div>

                  {!notif.isRead && (
                    <div className="size-2.5 rounded-full bg-[#F04D79] mt-2 shrink-0 shadow-sm" />
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
