'use client';

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, ArrowRight, Loader2, Plane, X, Smartphone } from "lucide-react";
import { Link } from "../../components/Link";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false); // 同意服務條款狀態

  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeTerms) {
      alert("請先閱讀並同意會員服務條款喔！");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8080/trav-app/backend/trav-api/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            Account: email,     
            Password: password, 
            Email: email,       
            Name: nickname,     
            Gender: ""          
        }),
      });
      
      const data = await res.json();

      if (data.status === 'success') {
        alert(data.message); 
        router.push("/auth/login"); // 註冊成功，直接導向剛剛寫好的精美登入頁！
      } else {
        alert("❌ 註冊失敗密碼：" + data.message); 
      }
    } catch (err) {
      console.error(err);
      alert("無法連線至後端伺服器！請確認 Docker Desktop 中的 backend 容器是否已亮綠燈並正常運作");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 外層：與登入頁呼應的全螢幕唯美背景與遮罩
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80')] bg-cover bg-center relative p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* 主卡片：左右分欄設計 */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* 關閉按鈕 */}
        <button 
          onClick={() => router.push('/')}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors z-20"
        >
          <X className="size-6" />
        </button>

        {/* 左側：品牌宣傳與 APP 下載區塊 */}
        <div className="hidden md:flex flex-col w-1/2 bg-gray-50 p-10 items-center justify-center text-center border-r border-gray-100">
          <div className="space-y-6 flex flex-col items-center">
            <h3 className="text-2xl font-light text-gray-900 tracking-wider">
              加入 旅伴travmade！<br />開啟你的專屬獨旅！
            </h3>
            <p className="text-sm text-gray-500 font-light tracking-wide">
              只需幾秒鐘，輕鬆打造你的洗滌心靈旅程
            </p>
            
            {/* 手機 APP 裝飾區塊 */}
            <div className="w-48 h-64 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
               <div className="absolute top-0 w-full h-32 bg-gray-50 rounded-t-xl flex items-center justify-center">
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

        {/* 右側：註冊表單區塊 */}
        <div className="w-full md:w-1/2 p-10 sm:p-14 flex flex-col justify-center bg-white">
          
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex items-center gap-2 mb-3 text-black">
              <Plane className="size-8" />
            </div>
            <h2 className="text-2xl font-light text-gray-900 tracking-widest mb-1">建立新帳號</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Join Solo Traveler Community</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* 暱稱 */}
            <div className="space-y-1.5">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input
                  type="text"
                  placeholder="想被怎麼稱呼？（您的暱稱）"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all placeholder:font-light"
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input
                  type="email"
                  placeholder="請輸入 Email 地址"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all placeholder:font-light"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* 密碼 */}
            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input
                  type="password"
                  placeholder="設定登入密碼 (至少 6 位數)"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all placeholder:font-light"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* 條款同意勾選 */}
            <div className="flex items-center justify-center py-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span className="text-xs text-gray-500 font-light group-hover:text-gray-800 transition-colors">
                  我已閱讀並同意 <span className="font-medium underline underline-offset-2">旅伴travmade 會員服務條款</span>
                </span>
              </label>
            </div>

            {/* 送出註冊按鈕 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white py-3.5 rounded-lg text-sm tracking-widest uppercase font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 group"
            >
              {isLoading ? <Loader2 className="animate-spin size-5" /> : <>建立帳號 <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </form>

          {/* 返回登入提示 */}
          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-500 font-light tracking-wide">
              已經有專屬帳號了？
              <Link to="/auth/login" className="ml-2 text-black font-medium hover:underline underline-offset-2">
                返回登入
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}