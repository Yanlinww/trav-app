'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Shield, Compass, Share2, Camera, Loader2, CheckCircle2 } from 'lucide-react';
// 🌟 匯入剛才安裝的 Google OAuth 套件
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// ==========================================
// 新增：獨立的 Google 綁定按鈕元件
// ==========================================
function GoogleBindAction({ user }: { user: any }) {
  const [isBound, setIsBound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 呼叫 Google 授權視窗
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        // 授權成功，將 AccessToken 送去你的 PHP 後端驗證
        const res = await fetch("http://localhost:8080/profile/bind_google.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Account: user.id || user.Account,
            AccessToken: tokenResponse.access_token
          }),
        });
        const data = await res.json();
        
        if (data.status === 'success') {
          alert(data.message); // 顯示綁定成功
          setIsBound(true);
        } else {
          alert("❌ 綁定失敗：" + data.message);
        }
      } catch (error) {
        console.error(error);
        alert("連線後端 API 發生錯誤");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => alert('❌ Google 授權視窗已關閉或發生錯誤'),
  });

  return (
    <div className="flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-sm hover:border-neutral-200 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 flex items-center justify-center text-sm font-semibold shadow-sm transition-all ${
          isBound ? 'bg-neutral-900 text-white' : 'bg-neutral-50 text-neutral-700'
        }`}>
          G
        </div>
        <div>
          <h4 className="text-sm font-medium text-neutral-800">Google</h4>
          {isBound ? (
            <p className="text-[11px] text-emerald-600 font-medium tracking-wide">已綁定</p>
          ) : (
            <p className="text-[11px] text-neutral-400 font-light">尚未綁定</p>
          )}
        </div>
      </div>
      {isBound ? (
        <button
          type="button"
          onClick={() => {
            if(window.confirm("確定要解除 Google 帳號綁定嗎？")) setIsBound(false);
          }}
          className="px-4 py-2 text-neutral-400 text-[10px] tracking-widest uppercase hover:text-red-500 transition-all font-medium"
        >
          解除綁定
        </button>
      ) : (
        <button
          type="button"
          onClick={() => login()}
          disabled={isLoading}
          className="px-5 py-2 border border-neutral-200 text-neutral-600 text-[10px] tracking-widest uppercase hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all rounded-sm font-medium disabled:opacity-50"
        >
          {isLoading ? "驗證中..." : "連結帳號"}
        </button>
      )}
    </div>
  );
}


// ==========================================
// 原本的設定頁面主元件
// ==========================================
export default function SettingsPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'social'>('profile');
  
  // 大頭貼與暱稱狀態
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessHint, setShowSuccessHint] = useState(false);

  // 更改密碼狀態
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    } else if (user) {
      setEditName(user.nickname || 'TRAVELER');
      setEditAvatar((user as any).avatar || null);
    }
  }, [user, loading, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("請輸入暱稱喔！");
      return;
    }
    if (!user) return;

    setIsSaving(true);
    try {
      const res = await fetch("http://localhost:8080/profile/update_profile.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Account: user.id || (user as any).Account,
          Name: editName,
          Avatar: editAvatar
        }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        const token = localStorage.getItem('auth_token') || 'auth_token_from_php';
        login({ ...user, nickname: editName, avatar: editAvatar } as any, token);
        setShowSuccessHint(true);
        setTimeout(() => setShowSuccessHint(false), 3000);
      } else {
        alert("更新失敗：" + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("連線後端 API 發生錯誤");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("❌ 新密碼與確認密碼不一致！");
      return;
    }
    if (!user) return;

    setIsUpdatingPassword(true);
    try {
      const res = await fetch("http://localhost:8080/profile/update_password.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Account: user.id || (user as any).Account,
          OldPassword: oldPassword,
          NewPassword: newPassword
        }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        alert("🎉 密碼更新成功！");
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert("❌ 更新失敗：" + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("連線後端 API 發生錯誤");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="animate-spin size-8 text-neutral-300" />
      </div>
    );
  }

  return (
    // 🌟 在最外層包上 GoogleOAuthProvider，並貼上你的 Client ID
    <GoogleOAuthProvider clientId="967812191339-ub5dtisdrbm7edemmo2qfv14gtlfpndk.apps.googleusercontent.com">
      <div className="min-h-screen bg-[#FBFBFB] pt-12 pb-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="mb-12">
            <h1 className="text-3xl font-extralight tracking-tight text-neutral-900 mb-2">帳號設定</h1>
            <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium">Account Settings & Preferences</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            <aside className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col overflow-x-auto no-scrollbar border-b md:border-b-0 border-neutral-100 md:space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-3 px-4 py-3 text-xs tracking-widest uppercase font-medium whitespace-nowrap transition-all border-b-2 md:border-b-0 md:border-l-2 ${
                  activeTab === 'profile'
                    ? 'border-neutral-900 text-neutral-900 bg-neutral-50 md:font-bold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <User className="size-4" /> 大頭貼與暱稱
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-3 px-4 py-3 text-xs tracking-widest uppercase font-medium whitespace-nowrap transition-all border-b-2 md:border-b-0 md:border-l-2 ${
                  activeTab === 'security'
                    ? 'border-neutral-900 text-neutral-900 bg-neutral-50 md:font-bold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Shield className="size-4" /> 安全與合規
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`flex items-center gap-3 px-4 py-3 text-xs tracking-widest uppercase font-medium whitespace-nowrap transition-all border-b-2 md:border-b-0 md:border-l-2 ${
                  activeTab === 'preferences'
                    ? 'border-neutral-900 text-neutral-900 bg-neutral-50 md:font-bold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Compass className="size-4" /> 個人化旅遊偏好
              </button>
              <button
                onClick={() => setActiveTab('social')}
                className={`flex items-center gap-3 px-4 py-3 text-xs tracking-widest uppercase font-medium whitespace-nowrap transition-all border-b-2 md:border-b-0 md:border-l-2 ${
                  activeTab === 'social'
                    ? 'border-neutral-900 text-neutral-900 bg-neutral-50 md:font-bold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Share2 className="size-4" /> 社群帳號設定
              </button>
            </aside>

            <main className="flex-1 bg-white border border-neutral-100 rounded-sm p-8 md:p-12 shadow-sm relative overflow-hidden">
              
              {showSuccessHint && (
                <div className="absolute top-0 left-0 right-0 bg-neutral-900 text-white px-6 py-3 flex items-center justify-center gap-2 text-xs tracking-wider transition-all animate-in slide-in-from-top duration-300">
                  <CheckCircle2 className="size-4 text-amber-400 fill-neutral-900" />
                  <span>🎉 更改成功！你的憑證內容已同步更新。</span>
                </div>
              )}

              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-8 animate-in fade-in duration-300">
                  {/* ...大頭貼與暱稱內容省略以保持代碼一致，請保留原有輸入框... */}
                  <div>
                    <h2 className="text-xl font-light text-neutral-900 mb-1">基本資料修改</h2>
                    <p className="text-xs text-neutral-400 font-light">設定您在 TRAVMADE 獨旅社群中顯示的公開暱稱與通行證頭像。</p>
                  </div>
                  <div className="flex flex-col items-center sm:items-start gap-4 border-b border-neutral-100 pb-8">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">TRAVELER AVATAR</span>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-neutral-50 rounded-full border border-dashed border-neutral-200 flex items-center justify-center relative overflow-hidden group shadow-inner">
                        {editAvatar ? (
                          <img src={editAvatar} alt="Preview" className="w-full h-full object-cover grayscale-[15%]" />
                        ) : (
                          <span className="text-3xl font-light text-neutral-300">{(user.nickname || 'T').charAt(0)}</span>
                        )}
                        <div className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleAvatarChange}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-neutral-500 font-light">點擊圖片更換新頭像</p>
                        <p className="text-[10px] text-neutral-400 font-light">支援 JPG、PNG 格式之圖片</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 max-w-md">
                    <label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">
                      TRAVELER NICKNAME (公開暱稱)
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none transition-all text-neutral-900 font-light tracking-wider rounded-sm text-sm"
                      placeholder="請輸入您的新暱稱..."
                      required
                    />
                  </div>
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-8 py-3.5 bg-neutral-900 text-white text-xs tracking-widest uppercase hover:bg-neutral-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 rounded-sm font-medium"
                    >
                      {isSaving ? (
                        <><Loader2 className="size-3 animate-spin" /><span>儲存中...</span></>
                      ) : (
                        "儲存所有變更"
                      )}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'security' && (
                <form onSubmit={handleUpdatePassword} className="space-y-8 animate-in fade-in duration-300">
                  {/* ...密碼變更內容保留原有輸入框... */}
                  <div>
                    <h2 className="text-xl font-light text-neutral-900 mb-1">安全與合規設定</h2>
                    <p className="text-xs text-neutral-400 font-light">定期更新您的密碼以保護 TRAVMADE 帳號安全。</p>
                  </div>
                  <div className="space-y-4 max-w-md border-b border-neutral-100 pb-8">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">CURRENT PASSWORD (目前密碼)</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none transition-all text-neutral-900 font-light tracking-wider rounded-sm text-sm"
                        placeholder="請輸入目前的密碼"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">NEW PASSWORD (新密碼)</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none transition-all text-neutral-900 font-light tracking-wider rounded-sm text-sm"
                        placeholder="請設定新密碼"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">CONFIRM NEW PASSWORD (確認新密碼)</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none transition-all text-neutral-900 font-light tracking-wider rounded-sm text-sm"
                        placeholder="請再次輸入新密碼"
                        required
                      />
                    </div>
                  </div>
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="px-8 py-3.5 bg-neutral-900 text-white text-xs tracking-widest uppercase hover:bg-neutral-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 rounded-sm font-medium"
                    >
                      {isUpdatingPassword ? (
                        <><Loader2 className="size-3 animate-spin" /><span>驗證中...</span></>
                      ) : (
                        "更新密碼"
                      )}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'preferences' && (
                <div className="py-12 text-center space-y-3 animate-in fade-in duration-300">
                  <Compass className="size-8 mx-auto text-neutral-300" />
                  <h3 className="text-base font-light tracking-wider text-neutral-700">個人化旅遊偏好</h3>
                  <p className="text-xs text-neutral-400 font-light max-w-xs mx-auto">調整您的獨旅偏好標籤，讓 Solo Concierge AI 更精準地為您挑選目的地。</p>
                </div>
              )}

              {/* TAB 4: 社群帳號設定 */}
              {activeTab === 'social' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div>
                    <h2 className="text-xl font-light text-neutral-900 mb-1">社群帳號連結</h2>
                    <p className="text-xs text-neutral-400 font-light">授權綁定您的社群平台，將動態同步於您的旅客卡片中，並可啟用快速登入。</p>
                  </div>

                  <div className="space-y-4 max-w-xl">
                    {/* Facebook (保留純視覺狀態) */}
                    <div className="flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-sm hover:border-neutral-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-neutral-50 flex items-center justify-center text-neutral-700 text-sm font-semibold">F</div>
                        <div>
                          <h4 className="text-sm font-medium text-neutral-800">Facebook</h4>
                          <p className="text-[11px] text-neutral-400 font-light">尚未綁定</p>
                        </div>
                      </div>
                      <button type="button" className="px-5 py-2 border border-neutral-200 text-neutral-600 text-[10px] tracking-widest uppercase hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all rounded-sm font-medium">
                        連結帳號
                      </button>
                    </div>

                    {/* Instagram (保留純視覺狀態) */}
                    <div className="flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-sm hover:border-neutral-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-neutral-50 flex items-center justify-center text-neutral-700 text-sm font-semibold">I</div>
                        <div>
                          <h4 className="text-sm font-medium text-neutral-800">Instagram</h4>
                          <p className="text-[11px] text-neutral-400 font-light">尚未綁定</p>
                        </div>
                      </div>
                      <button type="button" className="px-5 py-2 border border-neutral-200 text-neutral-600 text-[10px] tracking-widest uppercase hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all rounded-sm font-medium">
                        連結帳號
                      </button>
                    </div>

                    {/* 🌟 真正的 Google 綁定功能元件 */}
                    <GoogleBindAction user={user} />
                    
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}