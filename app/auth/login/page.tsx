'use client';

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, Plane, X, Smartphone, CheckCircle2 } from "lucide-react";
import { Link } from "../../components/Link";
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = "967812191339-ub5dtisdrbm7edemmo2qfv14gtlfpndk.apps.googleusercontent.com";
const FB_APP_ID = "1349371613270362"; 
const REDIRECT_URI = "http://localhost:3001/auth/login";

// ==========================================
// 抽取 Google 按鈕元件 (為了使用 useGoogleLogin Hook)
// ==========================================
function GoogleLoginButton({ onSuccess, onError, disabled }: { onSuccess: (res: any) => void, onError: () => void, disabled: boolean }) {
  const login = useGoogleLogin({ onSuccess, onError });
  return (
    <button type="button" onClick={() => login()} disabled={disabled} className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
      <div className="size-5 bg-black text-white rounded-full flex items-center justify-center text-xs">G</div>
      Google 登入
    </button>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: "" });
  const [failureInfo, setFailureInfo] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false); 
  const { login } = useAuth();
  const router = useRouter();

  // 攔截 Facebook 登入跳轉回來帶的 Code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (code && state === 'facebook_login') {
        setIsLoading(true);
        fetch("http://localhost:8080/social_login_facebook.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Code: code, RedirectUri: REDIRECT_URI }),
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            login(data.user, "auth_token_from_php");
            setSuccessInfo({ isOpen: true, message: data.message });
            setTimeout(() => router.push("/"), 1500);
          } else {
            setFailureInfo({ isOpen: true, message: data.message });
          }
        })
        .catch(err => setFailureInfo({ isOpen: true, message: "Facebook 登入連線失敗" }))
        .finally(() => {
          setIsLoading(false);
          // 擦除網址上的參數，避免重整無限觸發
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      }
    }
  }, []);

  // Facebook 點擊跳轉
  const handleFacebookLogin = () => {
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=facebook_login&response_type=code&scope=email,public_profile`;
    window.location.href = authUrl;
  };

  // Google 成功回調
  const handleGoogleSuccess = async (tokenResponse: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/social_login_google.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ AccessToken: tokenResponse.access_token }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        login(data.user, "auth_token_from_php");
        setSuccessInfo({ isOpen: true, message: data.message });
        setTimeout(() => router.push("/"), 1500);
      } else setFailureInfo({ isOpen: true, message: data.message });
    } catch (err) {
      setFailureInfo({ isOpen: true, message: "Google 登入連線失敗" });
    } finally { setIsLoading(false); }
  };

  // 傳統帳密登入
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) { alert("請先閱讀並同意服務條款！"); return; }
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/login.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: email, Password: password }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSuccessInfo({ isOpen: true, message: "登入成功，歡迎回來 TRAVMADE！" });
        login(data.user, "auth_token_from_php");
        setTimeout(() => { router.push("/"); }, 1500);
      } else {
        setFailureInfo({ isOpen: true, message: data.message || "登入失敗" });
      }
    } catch (err) { setFailureInfo({ isOpen: true, message: "伺服器連線失敗" }); } finally { setIsLoading(false); }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80')] bg-cover bg-center relative p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

        {/* 成功彈窗 */}
        {successInfo.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white border-2 border-[#F04D79] w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
              <div className="size-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-[#F04D79] size-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">登入成功</h3>
              <p className="text-sm text-slate-500 font-medium tracking-wide">{successInfo.message}</p>
              <div className="mt-6 flex justify-center"><Loader2 className="animate-spin text-[#F04D79] size-6" /></div>
            </div>
          </div>
        )}

        {/* 失敗彈窗 */}
        {failureInfo.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white border-2 border-red-500 w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
              <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="text-red-500 size-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">登入失敗</h3>
              <p className="text-sm text-slate-500 font-medium tracking-wide mb-6">{failureInfo.message}</p>
              <button onClick={() => setFailureInfo({ isOpen: false, message: "" })} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-sm">關閉</button>
            </div>
          </div>
        )}

        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 animate-in fade-in zoom-in-95 duration-300">
          <button type="button" onClick={() => router.push('/')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors z-20"><X className="size-6" /></button>
          
          {/* 左側設計 */}
          <div className="hidden md:flex flex-col w-1/2 bg-gray-50 p-10 items-center justify-center text-center border-r border-gray-100">
            <div className="space-y-6 flex flex-col items-center">
              <h3 className="text-2xl font-light text-gray-900 tracking-wider">探索世界 <br /> 就在 TRAVMADE </h3>
              <div className="w-48 h-64 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                 <div className="absolute top-0 w-full h-32 bg-gray-100 rounded-t-xl flex items-center justify-center"><Plane className="size-10 text-gray-300" /></div>
                 <div className="mt-28 w-full space-y-2"><div className="h-2 w-3/4 bg-gray-200 rounded-full mx-auto"></div><div className="h-2 w-1/2 bg-gray-200 rounded-full mx-auto"></div></div>
              </div>
              <button type="button" className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg"><Smartphone className="size-4" /> 下載 APP</button>
            </div>
          </div>

          {/* 右側表單區 */}
          <div className="w-full md:w-1/2 p-10 sm:p-14 flex flex-col justify-center bg-white">
            <div className="flex flex-col items-center text-center mb-8">
              <Plane className="size-8 mb-4 text-black" />
              <h2 className="text-2xl font-light text-gray-900 tracking-widest mb-1">登入 TRAVMADE</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Your Exclusive Solo Journey</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input type="email" placeholder="信箱 Email 或 帳號" required className="w-full pl-11 py-3.5 bg-gray-50 border rounded-lg text-sm outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input type={showPassword ? "text" : "password"} placeholder="密碼" required className="w-full pl-11 py-3.5 bg-gray-50 border rounded-lg text-sm outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <label className="flex items-center justify-center gap-2 py-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-black" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                <span className="text-xs text-gray-500">我同意 <span className="font-medium underline">TRAVMADE 服務條款</span></span>
              </label>
              <button type="submit" disabled={isLoading} className="w-full bg-black text-white py-3.5 rounded-lg text-sm tracking-widest uppercase hover:bg-gray-800 transition-all flex justify-center">
                {isLoading ? <Loader2 className="animate-spin size-5" /> : "登入帳號"}
              </button>
            </form>

            {/* 🌟 社群快速登入/註冊區塊 🌟 */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-gray-400 text-xs font-medium tracking-widest">或使用社群快速登入</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={() => setFailureInfo({ isOpen: true, message: 'Google 視窗關閉或驗證失敗' })} disabled={isLoading} />
              
              <button type="button" onClick={handleFacebookLogin} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                <div className="size-5 bg-[#1877F2] text-white rounded-full flex items-center justify-center text-xs font-mono">f</div>
                Facebook
              </button>
            </div>

            <div className="mt-8 text-center border-t pt-6">
              <p className="text-xs text-gray-500">還沒有帳號嗎？ <Link to="/auth/register" className="ml-2 text-black font-medium hover:underline">立即註冊</Link></p>
            </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}