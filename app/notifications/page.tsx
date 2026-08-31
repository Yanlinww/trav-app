'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Bell, Heart, MessageCircle, UserPlus, CheckCircle2, Loader2, Info } from 'lucide-react';


type Notification = {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'system';
  referenceId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    account: string | null;
    name: string;
    avatar: string;
  };
};

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const currentAccount = user ? String(user.id || (user as any).Account || "") : "";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!currentAccount) return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch("http://localhost:8080/get_notifications.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Account: currentAccount })
        });
        const data = await res.json();
        if (data.status === 'success') {
          setNotifications(data.data);
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error("無法取得通知", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchNotifications();
  }, [currentAccount]);

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || !currentAccount) return;
    setIsMarkingRead(true);
    try {
      const res = await fetch("http://localhost:8080/mark_notifications_read.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: currentAccount })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      alert("標記已讀失敗");
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (notif.type === 'follow' && notif.sender.account) {
      router.push(`/profile/${encodeURIComponent(notif.sender.account)}`);
    } else if (notif.type === 'like' || notif.type === 'comment') {
      router.push(`/community`);
    }
  };

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'like': return { icon: Heart, bg: 'bg-rose-100', text: 'text-rose-500' };
      case 'comment': return { icon: MessageCircle, bg: 'bg-blue-100', text: 'text-blue-500' };
      case 'follow': return { icon: UserPlus, bg: 'bg-emerald-100', text: 'text-emerald-500' };
      default: return { icon: Info, bg: 'bg-neutral-100', text: 'text-neutral-500' };
    }
  };

  if (loading || isFetching) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FBFBFB]"><Loader2 className="w-8 h-8 animate-spin text-neutral-300" /></div>;
  }

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