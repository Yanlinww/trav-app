'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Shield, Compass, Share2, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// =======================================================
// Google 綁定區塊元件
// =======================================================
interface GoogleBindActionProps {
  user: any;
  isGoogleBound: boolean;
  setIsGoogleBound: (val: boolean) => void;
}

function GoogleBindAction({ user, isGoogleBound, setIsGoogleBound }: GoogleBindActionProps) {
  const [isLoading, setIsLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const res = await fetch("http://localhost:8080/profile/bind_google.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Account: user.id || (user as any).Account,
            AccessToken: tokenResponse.access_token
          }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          alert(data.message);
          setIsGoogleBound(true);
        } else alert("❌ Google 綁定失敗：" + data.message);
      } catch (error) {
        alert("連線後端 Google API 發生錯誤");
      } finally { setIsLoading(false); }
    },
    onError: () => alert('❌ Google 授權視窗已關閉或發生錯誤'),
  });

  return (
    <div className="flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-sm hover:border-neutral-200 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 flex items-center justify-center text-sm font-semibold shadow-sm transition-all ${isGoogleBound ? 'bg-neutral-900 text-white' : 'bg-neutral-50 text-neutral-700'}`}>G</div>
        <div>
          <h4 className="text-sm font-medium text-neutral-800">Google</h4>
          {isGoogleBound ? <p className="text-[11px] text-emerald-600 font-medium tracking-wide">已綁定</p> : <p className="text-[11px] text-neutral-400 font-light">尚未綁定</p>}
        </div>
      </div>
      {isGoogleBound ? (
        <button type="button" onClick={() => { if (window.confirm("確定解除 Google 綁定？")) setIsGoogleBound(false); }} className="px-4 py-2 text-neutral-400 text-[10px] tracking-widest uppercase hover:text-red-500 transition-all font-medium">解除綁定</button>
      ) : (
        <button type="button" onClick={() => login()} disabled={isLoading} className="px-5 py-2 border border-neutral-200 text-neutral-600 text-[10px] tracking-widest uppercase hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all rounded-sm font-medium disabled:opacity-50">{isLoading ? "驗證中..." : "連結帳號"}</button>
      )}
    </div>
  );
}

// =======================================================
// 主頁面元件
// =======================================================
export default function SettingsPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'social'>('profile');
  
  // 獨立的綁定狀態與載入狀態 (只留 Google 與 Facebook)
  const [isGoogleBound, setIsGoogleBound] = useState(false);
  const [isFbBound, setIsFbBound] = useState(false);
  const [isBindingFb, setIsBindingFb] = useState(false);
  
  const GOOGLE_CLIENT_ID = "967812191339-ub5dtisdrbm7edemmo2qfv14gtlfpndk.apps.googleusercontent.com";
  const FB_APP_ID = "1349371613270362"; 
  const REDIRECT_URI = "http://localhost:3001/settings"; 

  // 🌟 網頁載入時，向後端查詢真實的綁定狀態 (解決重新整理失憶的問題)
  useEffect(() => {
    if (user) {
      fetch("http://localhost:8080/profile/get_social_bindings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setIsGoogleBound(data.bindings.google);
          setIsFbBound(data.bindings.facebook);
        }
      })
      .catch(err => console.error("無法取得社群綁定狀態", err));
    }
  }, [user]);

  // 統一攔截跳轉回來後的 URL 授權碼
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (code && state === 'facebook' && user && !isBindingFb) {
        setIsBindingFb(true);
        setActiveTab('social');
        fetch("http://localhost:8080/profile/bind_facebook.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Account: user.id || (user as any).Account, Code: code }),
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            alert(data.message);
            setIsFbBound(true);
            router.replace('/settings'); 
          } else alert("❌ Facebook 綁定失敗：" + data.message);
        })
        .catch(err => console.error(err))
        .finally(() => setIsBindingFb(false));
      }
    }
  }, [user]);

  // 臉書登入跳轉
  const handleFacebookLogin = () => {
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=facebook&response_type=code&scope=email,public_profile`;
    window.location.href = authUrl;
  };

  // ================= 表單輸入狀態 =================
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessHint, setShowSuccessHint] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
    else if (user) {
      setEditName(user.nickname || 'TRAVELER');
      setEditAvatar((user as any).avatar || null);
    }
  }, [user, loading, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return alert("請輸入暱稱喔！");
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await fetch("http://localhost:8080/profile/update_profile.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account, Name: editName, Avatar: editAvatar }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        const token = localStorage.getItem('auth_token') || 'auth_token_from_php';
        login({ ...user, nickname: editName, avatar: editAvatar } as any, token);
        setShowSuccessHint(true);
        setTimeout(() => setShowSuccessHint(false), 3000);
      } else alert("更新失敗：" + data.message);
    } catch (error) { alert("連線後端發生錯誤"); } finally { setIsSaving(false); }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return alert("❌ 新密碼與確認不一致！");
    if (!user) return;
    setIsUpdatingPassword(true);
    try {
      const res = await fetch("http://localhost:8080/profile/update_password.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: user.id || (user as any).Account, OldPassword: oldPassword, NewPassword: newPassword }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert("🎉 密碼更新成功！");
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      } else alert("❌ 更新失敗：" + data.message);
    } catch (error) { alert("連線後端發生錯誤"); } finally { setIsUpdatingPassword(false); }
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin size-8 text-neutral-300" /></div>;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-[#FBFBFB] pt-12 pb-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="mb-12">
            <h1 className="text-3xl font-extralight text-neutral-900 mb-2">帳號設定</h1>
            <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium">Account Settings & Preferences</p>
          </div>
          <div className="flex flex-col md:flex-row gap-8">
            <aside className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col overflow-x-auto no-scrollbar border-b md:border-b-0 border-neutral-100 md:space-y-1">
              <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 px-4 py-3 text-xs tracking-widest uppercase font-medium whitespace-nowrap transition-all border-b-2 md:border-b-0 md:border-l-2 ${activeTab === 'profile' ? 'border-neutral-900 text-neutral-900 bg-neutral-50 md:font-bold' : 'border-transparent text-neutral-400 hover:text-neutral-900'}`}><User className="size-4" /> 大頭貼與暱稱</button>
              <button onClick={() => setActiveTab('security')} className={`flex items-center gap-3 px-4 py-3 text-xs tracking-widest uppercase font-medium whitespace-nowrap transition-all border-b-2 md:border-b-0 md:border-l-2 ${activeTab === 'security' ? 'border-neutral-900 text-neutral-900 bg-neutral-50 md:font-bold' : 'border-transparent text-neutral-400 hover:text-neutral-900'}`}><Shield className="size-4" /> 安全與合規</button>
              <button onClick={() => setActiveTab('preferences')} className={`flex items-center gap-3 px-4 py-3 text-xs tracking-widest uppercase font-medium whitespace-nowrap transition-all border-b-2 md:border-b-0 md:border-l-2 ${activeTab === 'preferences' ? 'border-neutral-900 text-neutral-900 bg-neutral-50 md:font-bold' : 'border-transparent text-neutral-400 hover:text-neutral-900'}`}><Compass className="size-4" /> 個人化旅遊偏好</button>
              <button onClick={() => setActiveTab('social')} className={`flex items-center gap-3 px-4 py-3 text-xs tracking-widest uppercase font-medium whitespace-nowrap transition-all border-b-2 md:border-b-0 md:border-l-2 ${activeTab === 'social' ? 'border-neutral-900 text-neutral-900 bg-neutral-50 md:font-bold' : 'border-transparent text-neutral-400 hover:text-neutral-900'}`}><Share2 className="size-4" /> 社群帳號設定</button>
            </aside>

            <main className="flex-1 bg-white border border-neutral-100 rounded-sm p-8 md:p-12 shadow-sm relative overflow-hidden">
              {showSuccessHint && (
                <div className="absolute top-0 left-0 right-0 bg-neutral-900 text-white px-6 py-3 flex items-center justify-center gap-2 text-xs tracking-wider transition-all animate-in slide-in-from-top duration-300"><CheckCircle2 className="size-4 text-amber-400 fill-neutral-900" /><span>🎉 更改成功！</span></div>
              )}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-8 animate-in fade-in duration-300">
                  <div><h2 className="text-xl font-light text-neutral-900 mb-1">基本資料修改</h2></div>
                  <div className="flex flex-col items-center sm:items-start gap-4 border-b border-neutral-100 pb-8">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">TRAVELER AVATAR</span>
                    <div className="w-24 h-24 bg-neutral-50 rounded-full border border-dashed border-neutral-200 flex items-center justify-center relative overflow-hidden group shadow-inner">
                      {editAvatar ? <img src={editAvatar} alt="Preview" className="w-full h-full object-cover grayscale-[15%]" /> : <span className="text-3xl font-light text-neutral-300">{(user.nickname || 'T').charAt(0)}</span>}
                      <div className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"><Camera className="w-5 h-5 text-white" /></div>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarChange} />
                    </div>
                  </div>
                  <div className="space-y-2 max-w-md">
                    <label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">TRAVELER NICKNAME</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none transition-all text-neutral-900 font-light tracking-wider rounded-sm text-sm" required />
                  </div>
                  <button type="submit" disabled={isSaving} className="px-8 py-3.5 bg-neutral-900 text-white text-xs tracking-widest uppercase hover:bg-neutral-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 rounded-sm font-medium">{isSaving ? "儲存中..." : "儲存所有變更"}</button>
                </form>
              )}
              {activeTab === 'security' && (
                <form onSubmit={handleUpdatePassword} className="space-y-8 animate-in fade-in duration-300">
                  <div><h2 className="text-xl font-light text-neutral-900 mb-1">安全與合規設定</h2></div>
                  <div className="space-y-4 max-w-md border-b border-neutral-100 pb-8">
                    <div className="space-y-2"><label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">CURRENT PASSWORD</label><input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none text-sm" required /></div>
                    <div className="space-y-2"><label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">NEW PASSWORD</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none text-sm" required /></div>
                    <div className="space-y-2"><label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">CONFIRM NEW PASSWORD</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none text-sm" required /></div>
                  </div>
                  <button type="submit" disabled={isUpdatingPassword} className="px-8 py-3.5 bg-neutral-900 text-white text-xs tracking-widest uppercase hover:bg-neutral-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 rounded-sm font-medium">{isUpdatingPassword ? "驗證中..." : "更新密碼"}</button>
                </form>
              )}
              {activeTab === 'preferences' && (
                <div className="py-12 text-center space-y-3 animate-in fade-in duration-300"><Compass className="size-8 mx-auto text-neutral-300" /><h3 className="text-base font-light tracking-wider text-neutral-700">個人化旅遊偏好</h3></div>
              )}
              {activeTab === 'social' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div><h2 className="text-xl font-light text-neutral-900 mb-1">社群帳號連結</h2></div>
                  <div className="space-y-4 max-w-xl">
                    {/* 1. Google 連結按鈕 */}
                    <GoogleBindAction user={user} isGoogleBound={isGoogleBound} setIsGoogleBound={setIsGoogleBound} />

                    {/* 2. Facebook 連結按鈕 */}
                    <div className="flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-sm hover:border-neutral-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center text-sm font-semibold shadow-sm transition-all ${
                          isFbBound ? 'bg-[#1877F2] text-white' : 'bg-neutral-50 text-neutral-700'
                        }`}>F</div>
                        <div>
                          <h4 className="text-sm font-medium text-neutral-800">Facebook</h4>
                          {isFbBound ? <p className="text-[11px] text-[#1877F2] font-medium tracking-wide">已綁定</p> : <p className="text-[11px] text-neutral-400 font-light">尚未綁定</p>}
                        </div>
                      </div>
                      {isFbBound ? (
                        <button type="button" onClick={() => { if(window.confirm("確定解除 Facebook 綁定嗎？")) setIsFbBound(false); }} className="px-4 py-2 text-neutral-400 text-[10px] tracking-widest uppercase hover:text-red-500 transition-all font-medium">解除綁定</button>
                      ) : (
                        <button type="button" onClick={handleFacebookLogin} disabled={isBindingFb} className="px-5 py-2 border border-neutral-200 text-neutral-600 text-[10px] tracking-widest uppercase hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all rounded-sm font-medium disabled:opacity-50">{isBindingFb ? "跳轉中..." : "連結帳號"}</button>
                      )}
                    </div>
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