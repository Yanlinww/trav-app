'use client';

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, Plane, X, Smartphone, CheckCircle2 } from "lucide-react";
import { Link } from "../../components/Link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  // 改用狀態來控制客製化彈窗
  const [successInfo, setSuccessInfo] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      alert("請先閱讀並同意會員服務條款喔！");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8080/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: email, Password: password }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        // 設定客製化彈窗訊息 (使用 data.message 或自定義字串)
        setSuccessInfo({ isOpen: true, message: "🎉 登入成功！歡迎回來 TRAVMADE！" });
        
        login(data.user, "auth_token_from_php");
        
        // 1.5 秒後跳轉，給彈窗出現的時間
        setTimeout(() => {
          router.push("/");
        }, 1500);
      } else {
        alert("❌ 登入失敗：" + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("後端伺服器沒反應");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80')] bg-cover bg-center relative p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* ================= 客製化登入成功彈窗 ================= */}
      {successInfo.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border-2 border-[#F04D79] w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="size-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-[#F04D79] size-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">登入成功</h3>
            <p className="text-sm text-slate-500 font-medium tracking-wide">
              {successInfo.message}
            </p>
            <div className="mt-6 flex justify-center">
              <Loader2 className="animate-spin text-[#F04D79] size-6" />
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 animate-in fade-in zoom-in-95 duration-300">
        <button type="button" onClick={() => router.push('/')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors z-20">
          <X className="size-6" />
        </button>

        <div className="hidden md:flex flex-col w-1/2 bg-gray-50 p-10 items-center justify-center text-center border-r border-gray-100">
          <div className="space-y-6 flex flex-col items-center">
            <h3 className="text-2xl font-light text-gray-900 tracking-wider">輕鬆規劃旅行！<br />從 TRAVMADE 開始！</h3>
            <button type="button" className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg">
              <Smartphone className="size-4" /> 下載 APP
            </button>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-10 sm:p-14 flex flex-col justify-center bg-white">
          <div className="flex flex-col items-center text-center mb-10">
            <Plane className="size-8 mb-4 text-black" />
            <h2 className="text-2xl font-light text-gray-900 tracking-widest mb-1">歡迎使用 TRAVMADE</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Your Exclusive Solo Journey</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
              <input type="email" placeholder="請輸入 Email 帳號" required className="w-full pl-11 py-3.5 bg-gray-50 border rounded-lg text-sm outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
              <input type={showPassword ? "text" : "password"} placeholder="請輸入密碼" required className="w-full pl-11 py-3.5 bg-gray-50 border rounded-lg text-sm outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <label className="flex items-center justify-center gap-2 py-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-black" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
              <span className="text-xs text-gray-500">我已閱讀並同意 <span className="font-medium underline">TRAVMADE 會員服務條款</span></span>
            </label>
            <button type="submit" disabled={isLoading} className="w-full bg-black text-white py-3.5 rounded-lg text-sm tracking-widest uppercase hover:bg-gray-800 transition-all flex justify-center">
              {isLoading ? <Loader2 className="animate-spin size-5" /> : "登入"}
            </button>
          </form>
          <div className="mt-8 text-center border-t pt-6">
            <p className="text-xs text-gray-500">還沒有專屬帳號嗎？<Link to="/auth/register" className="ml-2 text-black font-medium hover:underline">立即註冊</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}