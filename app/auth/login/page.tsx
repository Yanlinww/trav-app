'use client';

// 引入 React 核心狀態管理與生命週期 Hooks
import { useState, useEffect } from "react";

// 引入自訂 AuthContext，用於全局存取與更新使用者登入狀態 (login state)
import { useAuth } from "../../context/AuthContext";

// 引入 Next.js App Router 的路由導向 Hook (用於登入後跳轉頁面)
import { useRouter } from "next/navigation";

// 從 lucide-react 引入 UI 所需之向量圖示 (Icons)
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  Plane, 
  X, 
  Smartphone, 
  CheckCircle2 
} from "lucide-react";

// 引入自訂或包裝後的 Link 元件（用於路由跳轉）
import { Link } from "../../components/Link";

// 引入 Google 官方 OAuth 2.0 套件之 Provider 與自訂 Hook
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// ==========================================
// 全局常數設定 (OAuth API 金鑰與 OAuth 重導向 URL)
// ==========================================
// Google OAuth Client ID (發布生產環境時建議移至 .env.local 環境變數中)
const GOOGLE_CLIENT_ID = "967812191339-ub5dtisdrbm7edemmo2qfv14gtlfpndk.apps.googleusercontent.com";

// Facebook App ID
const FB_APP_ID = "1349371613270362"; 

// 第三方登入驗證成功後的回呼 (Callback) 網址
const REDIRECT_URI = "http://localhost:3001/auth/login";


// =========================================================================
// 子元件：GoogleLoginButton
// 說明：抽取 Google 登入按鈕為獨立元件，以符合 `@react-oauth/google` 的 Hook 限制
// （`useGoogleLogin` 必須在 `<GoogleOAuthProvider>` 的子層內部呼叫）
// =========================================================================
interface GoogleLoginButtonProps {
  /** Google 授權成功後的回呼函式 */
  onSuccess: (res: any) => void;
  /** Google 授權失敗時的回呼函式 */
  onError: () => void;
  /** 控制按鈕是否處於禁用狀態 (例如正在發送 Request 時) */
  disabled: boolean;
}

function GoogleLoginButton({ onSuccess, onError, disabled }: GoogleLoginButtonProps) {
  // 呼叫 React OAuth 提供之 useGoogleLogin Hook 觸發 Google 彈窗或跳轉
  const login = useGoogleLogin({ 
    onSuccess, 
    onError 
  });

  return (
    <button 
      type="button" 
      onClick={() => login()} 
      disabled={disabled} 
      className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {/* 模擬 Google 品牌圖示 Icon 視覺容器 */}
      <div className="size-5 bg-black text-white rounded-full flex items-center justify-center text-xs">
        G
      </div>
      Google 登入
    </button>
  );
}


// =========================================================================
// 主頁面元件：LoginPage
// =========================================================================
export default function LoginPage() {
  // -----------------------------------------------------------------------
  // Component States (元件內部 UI 與資料狀態管理)
  // -----------------------------------------------------------------------
  
  // 控制密碼輸入框是否明文顯示 ( true: 明文 text / false: 隱藏 password )
  const [showPassword, setShowPassword] = useState(false);
  
  // 成功訊息彈窗 (Modal) 的控制狀態
  const [successInfo, setSuccessInfo] = useState<{ isOpen: boolean; message: string }>({ 
    isOpen: false, 
    message: "" 
  });
  
  // 失敗/錯誤訊息彈窗 (Modal) 的控制狀態
  const [failureInfo, setFailureInfo] = useState<{ isOpen: boolean; message: string }>({ 
    isOpen: false, 
    message: "" 
  });
  
  // 控制表單發送/第三方驗證時的載入中狀態 (Loading Indicator)
  const [isLoading, setIsLoading] = useState(false);
  
  // 帳號/電子郵件輸入值
  const [email, setEmail] = useState("");
  
  // 密碼輸入值
  const [password, setPassword] = useState("");
  
  // 服務條款勾選狀態 ( Checkbox )
  const [agreeTerms, setAgreeTerms] = useState(false); 

  // 從 AuthContext 取出 login 函式，用於儲存登入成功的使用者資料。
  const { login } = useAuth();
  
  // 宣告 Next.js 路由導向器
  const router = useRouter();


  // -----------------------------------------------------------------------
  // Lifecycle Effects (生命週期 Hooks)
  // -----------------------------------------------------------------------
  
  /**
   * Effect: 攔截 Facebook OAuth 重導向 (Redirect) 回來的 URL Authorization Code
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 解析目前 URL 網址列中的 Query Parameters
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      // 確認具備 Authorization Code 且 state 為 FB 登入驗證
      if (code && state === 'facebook_login') {
        setIsLoading(true);
        
        // 將 Code 發送到後端 PHP API 換取 Access Token 及使用者資料
        fetch("http://localhost:8080/auth.php?action=facebook", {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Code: code, RedirectUri: REDIRECT_URI }),
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success' && data.user) {
            // 登入成功：更新全域驗證狀態，顯示成功視窗並跳轉首頁
            login(data.user);
            setSuccessInfo({ isOpen: true, message: data.message });
            setTimeout(() => router.push("/"), 1500);
          } else {
            // 登入失敗：顯示錯誤彈窗
            setFailureInfo({ 
              isOpen: true, 
              message: data.message || '登入失敗，請再試一次。'
            });
          }
        })
        .catch(() => setFailureInfo({ isOpen: true, message: "Facebook 登入連線失敗" }))
        .finally(() => {
          setIsLoading(false);
          // 清除 URL 網址列上的 Query 參數 (Code & State)，防止重新整理時重複觸發 API
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      }
    }
  }, [login, router]);


  // -----------------------------------------------------------------------
  // Event Handlers (事件處理函式)
  // -----------------------------------------------------------------------

  /**
   * 觸發 Facebook OAuth 授權跳轉
   */
  const handleFacebookLogin = () => {
    // 構建 Facebook OAuth 2.0 授權 URL
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=facebook_login&response_type=code&scope=email,public_profile`;
    // 重導向至 Facebook 授權頁面
    window.location.href = authUrl;
  };

  /**
   * Google 授權成功後的 Client-side 回調函式
   * @param {any} tokenResponse - Google SDK 傳回之 Token 物件 (包含 access_token)
   */
  const handleGoogleSuccess = async (tokenResponse: any) => {
    setIsLoading(true);
    try {
      // 將 Google access_token 發送到後端進行二次驗證與帳號建立/比對
      const res = await fetch("http://localhost:8080/auth.php?action=google", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ AccessToken: tokenResponse.access_token }),
      });
      const data = await res.json();
      
      if (data.status === 'success' && data.user) {
        login(data.user);
        setSuccessInfo({ isOpen: true, message: data.message });
        setTimeout(() => router.push("/"), 1500);
      } else {
        setFailureInfo({ 
          isOpen: true, 
          message: data.message || '登入失敗，請再試一次。'
        });
      }
    } catch (err) {
      setFailureInfo({ isOpen: true, message: "Google 登入連線失敗" });
    } finally { 
      setIsLoading(false); 
    }
  };

  /**
   * 傳統帳號密碼登入表單提交處理
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 檢查服務條款勾選狀態
    if (!agreeTerms) { 
      alert("請先閱讀並同意服務條款！"); 
      return; 
    }
    
    setIsLoading(true);
    try {
      // 發送傳統帳密登入 Request 至後端 API
      const res = await fetch("http://localhost:8080/auth.php?action=login", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: email, Password: password }),
      });
      const data = await res.json();
      
      if (data.status === 'success' && data.user) {
        setSuccessInfo({ isOpen: true, message: "登入成功，歡迎回來 TRAVMADE！" });
        login(data.user);
        setTimeout(() => { router.push("/"); }, 1500);
      } else {
        setFailureInfo({ isOpen: true, message: data.message || "登入失敗" });
      }
    } catch (err) { 
      setFailureInfo({ isOpen: true, message: "伺服器連線失敗" }); 
    } finally { 
      setIsLoading(false); 
    }
  };


  // -----------------------------------------------------------------------
  // JSX Layout Rendering
  // -----------------------------------------------------------------------
  return (
    // 外層包裹 Google OAuth Provider，註冊 Client ID 以供子元件存取 SDK Context
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      
      {/* 全螢幕背景容器：使用 Unsplash 滿版背景圖 + CSS 暗色遮罩 + 高斯模糊 */}
      <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80')] bg-cover bg-center relative p-4">
        
        {/* 背景暗色遮罩層 (Overlay) */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

        {/* ==========================================
            1. 登入成功彈窗 (Success Modal)
           ========================================== */}
        {successInfo.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-[#d7e4ec] bg-white p-8 text-center shadow-[0_20px_50px_rgba(66,96,120,0.22)] animate-in zoom-in-95 fade-in duration-200">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#edf4f8]">
                <CheckCircle2 className="size-8 text-[#5e7891]" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-[#30485f]">登入成功</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-[#718da1]">
                {successInfo.message}
              </p>
              <div className="mt-6 flex justify-center">
                <Loader2 className="size-5 animate-spin text-[#5e7891]" />
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            2. 登入失敗彈窗 (Failure Modal)
           ========================================== */}
        {failureInfo.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white border-2 border-red-500 w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
              <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="text-red-500 size-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">登入失敗</h3>
              <p className="text-sm text-slate-500 font-medium tracking-wide mb-6">
                {failureInfo.message}
              </p>
              <button 
                onClick={() => setFailureInfo({ isOpen: false, message: "" })} 
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-sm"
              >
                關閉
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            3. 主要登入卡片容器 (Main Card)
           ========================================== */}
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 animate-in fade-in zoom-in-95 duration-300">
          
          {/* 右上角關閉按鈕：返回首頁 */}
          <button 
            type="button" 
            onClick={() => router.push('/')} 
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors z-20"
          >
            <X className="size-6" />
          </button>
          
          {/* 
            [卡片左側] 品牌宣傳區 (僅在中型螢幕 md 以上顯示)
          */}
          <div className="hidden md:flex flex-col w-1/2 bg-gray-50 p-10 items-center justify-center text-center border-r border-gray-100">
            <div className="space-y-6 flex flex-col items-center">
              <h3 className="text-2xl font-light text-gray-900 tracking-wider">
                探索世界 <br /> 就在 TRAVMADE
              </h3>
              
              {/* 視覺卡片插圖模擬 */}
              <div className="w-48 h-64 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-0 w-full h-32 bg-gray-100 rounded-t-xl flex items-center justify-center">
                  <Plane className="size-10 text-gray-300" />
                </div>
                <div className="mt-28 w-full space-y-2">
                  <div className="h-2 w-3/4 bg-gray-200 rounded-full mx-auto"></div>
                  <div className="h-2 w-1/2 bg-gray-200 rounded-full mx-auto"></div>
                </div>
              </div>

              {/* 行動端 APP 下載引導按鈕 */}
              <button 
                type="button" 
                className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg"
              >
                <Smartphone className="size-4" /> 下載 APP
              </button>
            </div>
          </div>

          {/* 
            [卡片右側] 登入表單與社群登入區
          */}
          <div className="w-full md:w-1/2 p-10 sm:p-14 flex flex-col justify-center bg-white">
            
            {/* 標頭與 Logo 區塊 */}
            <div className="flex flex-col items-center text-center mb-8">
              <Plane className="size-8 mb-4 text-black" />
              <h2 className="text-2xl font-light text-gray-900 tracking-widest mb-1">
                登入 TRAVMADE
              </h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">
                Your Exclusive Solo Journey
              </p>
            </div>

            {/* 帳密登入表單 */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Email / 帳號輸入框 */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input 
                  type="email" 
                  placeholder="信箱 Email 或 帳號" 
                  required 
                  className="w-full pl-11 py-3.5 bg-gray-50 border rounded-lg text-sm outline-none focus:border-black transition-colors" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>

              {/* 密碼輸入框 + 明盲眼切換按鈕 */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="密碼" 
                  required 
                  className="w-full pl-11 py-3.5 bg-gray-50 border rounded-lg text-sm outline-none focus:border-black transition-colors" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* 服務條款同意核取方塊 (Checkbox) */}
              <label className="flex items-center justify-center gap-2 py-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black" 
                  checked={agreeTerms} 
                  onChange={(e) => setAgreeTerms(e.target.checked)} 
                />
                <span className="text-xs text-gray-500">
                  我同意 <span className="font-medium underline">TRAVMADE 服務條款</span>
                </span>
              </label>

              {/* 登入送出按鈕 */}
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-black text-white py-3.5 rounded-lg text-sm tracking-widest uppercase hover:bg-gray-800 transition-all flex justify-center items-center disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin size-5" /> : "登入帳號"}
              </button>
            </form>

            {/* 社群登入分隔線 */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-400 text-xs font-medium tracking-widest">
                  或使用社群快速登入
                </span>
              </div>
            </div>

            {/* 社群快速登入按鈕區塊 */}
            <div className="grid grid-cols-2 gap-3">
              {/* Google 快速登入按鈕 (使用抽出之子元件) */}
              <GoogleLoginButton 
                onSuccess={handleGoogleSuccess} 
                onError={() => setFailureInfo({ isOpen: true, message: 'Google 視窗關閉或驗證失敗' })} 
                disabled={isLoading} 
              />
              
              {/* Facebook 快速登入按鈕 */}
              <button 
                type="button" 
                onClick={handleFacebookLogin} 
                disabled={isLoading} 
                className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <div className="size-5 bg-[#1877F2] text-white rounded-full flex items-center justify-center text-xs font-mono">
                  f
                </div>
                Facebook
              </button>
            </div>

            {/* 底部前往註冊連結區塊 */}
            <div className="mt-8 text-center border-t pt-6">
              <p className="text-xs text-gray-500">
                還沒有帳號嗎？{" "}
                <Link to="/auth/register" className="ml-2 text-black font-medium hover:underline">
                  立即註冊
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>
    </GoogleOAuthProvider>
  );
}
