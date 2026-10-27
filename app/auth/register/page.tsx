'use client';

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, ArrowRight, Loader2, Plane, X, Smartphone } from "lucide-react";
import { Link } from "../../components/Link";

// 註冊頁只建立會員，成功後轉至登入頁，不會自動更新 AuthContext。
export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  // 表單 state 是待送出的草稿；這些值尚未代表資料庫已存在的會員。
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false); // 同意服務條款狀態

  const router = useRouter();

  // 表單送出：確認條款 → 呼叫 PHP 註冊 → 依業務結果提示／導頁；欄位另由 HTML 表單限制。
  const handleRegister = async (e: React.FormEvent) => {
    // 阻止原生表單換頁，改用下方 fetch 送出；條款未勾選時在發送前返回。
    e.preventDefault();

    if (!agreeTerms) {
      // 條款勾選只在前端阻擋提交，不包含在下方註冊 JSON，也不會在這裡保存同意紀錄。
      alert("請先閱讀並同意會員服務條款喔！");
      return;
    }

    // 控制送出按鈕的 disabled 與載入圖示；完成後由 finally 恢復。
    setIsLoading(true);

    try {
      // 本頁以電子郵件同時作為 Account 與 Email；暱稱對應 Name，Gender 目前送空字串。
      const res = await fetch("/backend/auth.php?action=register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            Account: email, // 後端登入使用的帳號，本頁與電子郵件採相同輸入值。
            Password: password, // 密碼由後端處理，本頁不自行雜湊或建立登入狀態。
            Email: email,
            Name: nickname, // 會員暱稱，不是帳號識別值。
            Gender: "" // 目前表單沒有性別欄位，因此送出空字串。
        }),
      });
      
      // 讀取後端的 status／message；此流程未另檢查 res.ok，非 JSON 回應會進入 catch。
      const data = await res.json();

      // 以回應的 status 判定註冊結果；錯誤訊息由後端提供。
      if (data.status === 'success') {
        alert(data.message); 
        router.push("/auth/login"); // 建立完成後由使用者另行登入。
      } else {
        // 業務失敗保留輸入草稿供修正，不建立會員 state，也不轉向登入頁。
        alert("❌ 註冊失敗密碼：" + data.message); 
      }
    } catch (err) {
      // 連線或解析例外會顯示通用連線提示；不會在這裡自動再次註冊。
      console.error(err);
      alert("無法連線至後端伺服器！請確認 Docker Desktop 中的 backend 容器是否已亮綠燈並正常運作");
    } finally {
      // 成功或失敗都恢復按鈕狀態，避免畫面持續顯示處理中。
      setIsLoading(false);
    }
  };

  // 欄位透過 value／onChange 綁定草稿；required 與 email 輸入型別提供瀏覽器端基本檢查。
  return (
    // 手機以單欄表單為主，md 以上並排品牌介紹與註冊欄位。
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
