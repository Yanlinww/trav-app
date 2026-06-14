'use client';

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Link } from "../../components/Link";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  const { login } = useAuth();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 🌟 修改 1：換成你本機 XAMPP 真正正確的網址 (加上 8080 與 trav-app)
      const res = await fetch("http://localhost:8080/trav-app/backend/trav-api/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 🌟 修改 2：這裡的屬性名稱必須完全對齊 PHP 裡寫的大寫名稱
        // 因為前端畫面沒有獨立的「帳號」欄位，我們直接把 email 當作登入帳號存入
        body: JSON.stringify({ 
            Account: email,     
            Password: password, 
            Email: email,       
            Name: nickname,     
            Gender: ""          
        }),
      });
      
      const data = await res.json();

      // 🌟 修改 3：判斷方式改成我們 PHP 格式回傳的 status
      if (data.status === 'success') {
        alert(data.message); // 顯示 PHP 給的：🎉 恭喜！帳號註冊成功...
        router.push("/auth/login"); // 成功後自動跳轉到登入頁
      } else {
        alert("❌ 註冊失敗：" + data.message); 
      }
    } catch (err) {
      console.error(err);
      alert("後端伺服器沒反應");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* 註冊頁面用綠色/藍色漸層，做出區隔感 */}
        <div className="h-3 bg-gradient-to-r from-green-400 to-blue-500"></div>

        <div className="p-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center size-16 bg-green-50 rounded-full mb-4">
              <ShieldCheck className="size-8 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">加入獨旅達人</h2>
            <p className="text-gray-500">只需幾秒鐘，開啟你的專屬旅程</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">您的暱稱</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                <input
                  type="text"
                  placeholder="想被怎麼稱呼？"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Email 地址</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">設定密碼</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                <input
                  type="password"
                  placeholder="至少 6 位數"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-600 shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2 group"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <>建立帳號 <ArrowRight /></>}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              已經有帳號了？
              <Link to="/auth/login" className="ml-2 text-green-600 font-bold hover:underline">
                返回登入
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}