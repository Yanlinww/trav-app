'use client';

import { useState } from "react";
import { useAuth } from "../../context/AuthContext"; // 修正路徑：往上退兩層
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "../../components/Link"; // 修正路徑：往上退兩層

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 這裡目前是模擬登入，未來會串接 PHP API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模擬成功回傳的資料
      const mockUser = { id: "1", email, nickname: "旅行者" };
      login(mockUser, "mock_token_123");
      
      router.push("/"); // 登入成功回首頁
    } catch (err) {
      alert("登入失敗，請檢查帳號密碼");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* 上方裝飾條 */}
        <div className="h-3 bg-gradient-to-r from-blue-600 to-purple-600"></div>

        <div className="p-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">歡迎回來</h2>
            <p className="text-gray-500">請登入您的獨旅帳號</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Email 地址</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-gray-700">密碼</label>
                <button type="button" className="text-xs text-blue-600 hover:underline">忘記密碼？</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="請輸入密碼"
                  required
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  立即登入
                  <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              還沒有帳號嗎？
              {/* 注意這裡的路徑要改成 /auth/register */}
              <Link to="/auth/register" className="ml-2 text-blue-600 font-bold hover:underline">
                立即註冊
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}