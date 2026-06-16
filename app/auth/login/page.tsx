'use client';

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, Plane, X, Smartphone } from "lucide-react";
import { Link } from "../../components/Link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false); // 新增：同意條款狀態

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 檢查是否有勾選服務條款
    if (!agreeTerms) {
      alert("請先閱讀並同意會員服務條款喔！");
      return;
    }

    setIsLoading(true);

    try {
      // 這裡目前是模擬登入，未來可以換成 fetch 你的 login.php
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockUser = { id: "1", email, nickname: "旅行者" };
      login(mockUser, "mock_token_123");
      
      router.push("/"); 
    } catch (err) {
      alert("登入失敗，請檢查帳號密碼");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 外層：模擬全螢幕背景與半透明遮罩 (營造彈出視窗感)
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80')] bg-cover bg-center relative p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* 主卡片：左右分欄設計 */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* 關閉按鈕 (右上角) */}
        <button 
          onClick={() => router.push('/')}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors z-20"
        >
          <X className="size-6" />
        </button>

        {/* 左側：品牌宣傳與 APP 下載區塊 (對齊截圖風格) */}
        <div className="hidden md:flex flex-col w-1/2 bg-gray-50 p-10 items-center justify-center text-center border-r border-gray-100">
          <div className="space-y-6 flex flex-col items-center">
            <h3 className="text-2xl font-light text-gray-900 tracking-wider">
              輕鬆規劃旅行！<br />從 VOYAGE 開始！
            </h3>
            <p className="text-sm text-gray-500 font-light tracking-wide">
              跨裝置使用，隨時隨地展開專屬獨旅
            </p>
            
            {/* 模擬手機 APP 截圖的裝飾區塊 */}
            <div className="w-48 h-64 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
               <div className="absolute top-0 w-full h-32 bg-gray-100 rounded-t-xl flex items-center justify-center">
                 <Plane className="size-10 text-gray-300" />
               </div>
               <div className="mt-28 w-full space-y-2">
                 <div className="h-2 w-3/4 bg-gray-200 rounded-full mx-auto"></div>
                 <div className="h-2 w-1/2 bg-gray-200 rounded-full mx-auto"></div>
               </div>
            </div>

            <button className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg">
              <Smartphone className="size-4" />
              下載 APP
            </button>
          </div>
        </div>

        {/* 右側：登入表單區塊 */}
        <div className="w-full md:w-1/2 p-10 sm:p-14 flex flex-col justify-center bg-white">
          
          <div className="flex flex-col items-center text-center mb-10">
            <div className="flex items-center gap-2 mb-4 text-black">
              <Plane className="size-8" />
            </div>
            <h2 className="text-2xl font-light text-gray-900 tracking-widest mb-1">歡迎使用 VOYAGE</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Your Exclusive Solo Journey</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* 帳號 */}
            <div className="space-y-1.5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input
                  type="email"
                  placeholder="請輸入 Email 帳號"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all placeholder:font-light"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* 密碼 */}
            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="請輸入密碼"
                  required
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all placeholder:font-light"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 服務條款勾選 (對齊截圖風格) */}
            <div className="flex items-center justify-center py-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span className="text-xs text-gray-500 font-light group-hover:text-gray-800 transition-colors">
                  我已閱讀並同意 <span className="font-medium underline underline-offset-2">VOYAGE 會員服務條款</span>
                </span>
              </label>
            </div>

            {/* 登入按鈕 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white py-3.5 rounded-lg text-sm tracking-widest uppercase font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="animate-spin size-5" /> : "登入 / 註冊"}
            </button>
          </form>

          {/* 底部切換註冊提示 */}
          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-500 font-light tracking-wide">
              還沒有專屬帳號嗎？
              <Link to="/auth/register" className="ml-2 text-black font-medium hover:underline underline-offset-2">
                立即註冊
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}