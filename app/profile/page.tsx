'use client';

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { User, Mail, LogOut, ChevronRight, Settings, Shield } from "lucide-react";
import { useEffect } from "react";

export default function ProfilePage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  // 安全檢查：若沒登入就想進 profile，直接踢回登入頁
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) return <div className="p-10 text-center">載入中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 頂部個人資訊卡片 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 pt-12 pb-24 px-6 text-white">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div className="size-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/50">
            <User className="size-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.nickname}</h1>
            <p className="opacity-80 flex items-center gap-1 text-sm">
              <Mail className="size-3" /> {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* 功能選單清單 */}
      <div className="max-w-md mx-auto px-4 -mt-10">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-2">
            {[
              { icon: Settings, label: "偏好設定", color: "text-blue-500" },
              { icon: Shield, label: "帳號安全", color: "text-green-500" },
            ].map((item, idx) => (
              <button key={idx} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <item.icon className={`size-5 ${item.color}`} />
                  <span className="font-medium text-gray-700">{item.label}</span>
                </div>
                <ChevronRight className="size-4 text-gray-300 group-hover:text-gray-500" />
              </button>
            ))}

            <div className="h-[1px] bg-gray-100 my-2"></div>

            <button 
              onClick={() => { logout(); router.push("/"); }}
              className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 transition-colors font-medium"
            >
              <LogOut className="size-5" />
              <span>登出帳號</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}