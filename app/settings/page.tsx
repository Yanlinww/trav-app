'use client';
// 【極重要】宣告這是一個 Client Component。
// Next.js 預設所有頁面都是在「伺服器端」渲染 (Server Component)，
// 但因為我們這頁需要監聽使用者的瀏覽器行為 (例如 onClick 點擊、onChange 輸入)，
// 並且使用了 React 的狀態管理 Hooks (useState, useEffect)，這些都必須在「用戶端(瀏覽器)」才能跑，所以要在第一行加上 'use client'。

// =======================================================
// 1. 引入必要的 React Hooks 與外部套件
// =======================================================
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext'; // 引入我們自己寫的全域狀態，用來抓取目前登入的 user 資料與更新全域資料的 login 函數
import { AvatarImage } from '../components/AvatarImage'; // 引入自訂的大頭貼元件 (如果沒有照片，會自動抓名字的第一個字來顯示)
import { useRouter } from 'next/navigation'; // 引入 Next.js 的路由器，讓我們可以用程式碼控制網頁跳轉 (例如 router.push)
import { User, Shield, Share2, Camera, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'; // 引入 Lucide UI 圖示庫，讓按鈕有漂亮的 icon
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'; // 引入 Google 官方的 OAuth 登入套件，用來產生登入視窗與取得 Token

// =======================================================
// 2. 定義 TypeScript 型別 (Type Definitions)
// 告訴編譯器這些變數「只能」裝哪些特定的值，防止我們打錯字
// =======================================================

// 設定頁面的三個主要分頁標籤，只能是這三個字串的其中一個
type SettingsTab = 'profile' | 'security' | 'social';

// 定義「未儲存防護機制」觸發時，使用者原本想去哪裡
// 如果使用者點了上方導覽列，type 就是 'route'，並記錄他想去的網址 (href)
// 如果使用者點了左側的分頁按鈕，type 就是 'tab'，並記錄他想切換過去的分頁 (tab)
type PendingNavigation =
  | { type: 'route'; href: string }
  | { type: 'tab'; tab: SettingsTab };

// =======================================================
// 3. 子元件：Google 帳號綁定區塊
// 為什麼要獨立寫成子元件？
// 因為 useGoogleLogin 這個 Hook 規定必須放在 <GoogleOAuthProvider> 的「裡面」才能運作。
// 把這塊拆出來，可以讓主元件的程式碼不要太長，也方便管理單一按鈕的狀態。
// =======================================================

// 定義這個子元件需要從父元件接收哪些參數 (Props)
interface GoogleBindActionProps {
  accountId: string; // 目前登入的使用者帳號 (Email 或 ID)
  isGoogleBound: boolean; // 記錄是否已經綁定 Google (用來決定要顯示「已綁定」還是「未綁定」)
  setIsGoogleBound: (val: boolean) => void; // 用來切換綁定狀態的函數
}

function GoogleBindAction({ accountId, isGoogleBound, setIsGoogleBound }: GoogleBindActionProps) {
  // 控制按鈕是否正在打 API 的狀態。true 的時候會顯示「綁定中...」並鎖死按鈕防止連點
  const [isLoading, setIsLoading] = useState(false);

  // 初始化 Google 登入視窗的 Hook
  const login = useGoogleLogin({
    // onSuccess: 當使用者在 Google 視窗點擊同意，且 Google 成功回傳資料時觸發
    onSuccess: async (tokenResponse) => {
      setIsLoading(true); // 開始轉圈圈動畫
      try {
        const res = await fetch("/backend/profile/profile.php?action=bind_google", {
          method: "POST",
          headers: { "Content-Type": "application/json" }, // 告訴 PHP 我們傳的是 JSON 格式
          // 將目前登入的帳號與 Google 通行證打包成 JSON 字串送過去
          body: JSON.stringify({
            Account: accountId,
            AccessToken: tokenResponse.access_token
          }),
        });
        const data = await res.json(); // 解析 PHP 回傳的 JSON 結果

        // 判斷 PHP 那邊是否處理成功
        if (data.status === 'success') {
          alert(data.message); // 彈出成功訊息
          setIsGoogleBound(true); // 將畫面的狀態切換為「已綁定」
        } else {
          alert("Google 綁定失敗：" + data.message);
        }
      } catch (error) {
        // 如果 fetch 失敗 (例如後端沒開、網路斷線)，就會跑到 catch 這裡
        alert("Google API 請求發生錯誤，請檢查後端是否啟動");
      } finally {
        setIsLoading(false); // 不管成功或失敗，最後都要把轉圈圈關掉，讓按鈕恢復正常
      }
    },
    // onError: 當使用者在 Google 視窗點了取消，或是 Google 驗證失敗時觸發
    onError: () => alert('Google 授權視窗關閉或失敗'),
  });

  // 處理解除綁定 (向後端發送解除請求)
  const handleUnbind = async () => {
    if (!window.confirm("確定要解除 Google 綁定嗎？")) return; // 防呆確認框
    setIsLoading(true);
    try {
      // 呼叫後端的解除綁定 API
      const res = await fetch("/backend/profile/profile.php?action=unbind_social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: accountId, Provider: 'google' }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setIsGoogleBound(false); // 更新畫面為未綁定
      } else {
        alert(data.message);
      }
    } catch {
      alert("解除綁定失敗");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-sm hover:border-neutral-200 transition-colors">
      {/* 左側：顯示大大的 G 圖示與綁定狀態文字 */}
      <div className="flex items-center gap-4">
        {/* 如果已綁定，背景變成黑色；未綁定則是灰色 */}
        <div className={`w-10 h-10 flex items-center justify-center text-sm font-semibold shadow-sm transition-all ${isGoogleBound ? 'bg-neutral-900 text-white' : 'bg-neutral-50 text-neutral-700'}`}>G</div>
        <div>
          <h4 className="text-sm font-medium text-neutral-800">Google</h4>
          {/* 根據 isGoogleBound 狀態，顯示綠色的「已綁定」或灰色的「未綁定」 */}
          {isGoogleBound ? <p className="text-[11px] text-emerald-600 font-medium tracking-wide">已綁定</p> : <p className="text-[11px] text-neutral-400 font-light">未綁定</p>}
        </div>
      </div>

      {/* 右側：互動按鈕 */}
      {isGoogleBound ? (
        // 如果已經綁定了，按鈕功能變成「解除綁定」
        <button type="button" onClick={handleUnbind} disabled={isLoading} className="px-4 py-2 text-neutral-400 text-[10px] tracking-widest uppercase hover:text-red-500 transition-all font-medium disabled:opacity-50">解除綁定</button>
      ) : (
        // 如果還沒綁定，按鈕功能就是觸發上面的 login() 函數。如果 isLoading 是 true，按鈕會變成半透明 (opacity-50) 且不能按 (disabled)
        <button type="button" onClick={() => login()} disabled={isLoading} className="px-5 py-2 border border-neutral-200 text-neutral-600 text-[10px] tracking-widest uppercase hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all rounded-sm font-medium disabled:opacity-50">
          {isLoading ? "綁定中..." : "立即綁定"}
        </button>
      )}
    </div>
  );
}

// =======================================================
// 4. 主元件：設定與隱私頁面 (SettingsPage)
// 這是整頁的進入點，管理所有分頁的切換與表單狀態
// =======================================================
export default function SettingsPage() {
  // 從 AuthContext 拿出全域資料：目前的 user 資訊、用來更新全域資料的 login 函數、以及是否還在驗證身分中的 loading 狀態
  const { user, login, loading } = useAuth();
  const router = useRouter(); // 用來做網頁跳轉的工具

  // 💡 【效能優化】統一取得乾淨的帳號 ID，消除後面每個 API 都要重複寫 user?.id || user?.Account 的冗餘程式碼
  const accountId = user?.id || (user as any)?.Account || '';

  // --- 狀態管理：目前在哪個分頁與社群綁定狀態 ---
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile'); // 紀錄目前停在哪個分頁，預設為「個人檔案」
  const [isGoogleBound, setIsGoogleBound] = useState(false); // 記錄 Google 綁定狀態
  const [isFbBound, setIsFbBound] = useState(false); // 記錄 FB 綁定狀態
  const [isBindingFb, setIsBindingFb] = useState(false); // 記錄 FB 是否正在打 API (避免連點)

  // 第三方登入的金鑰與回調網址 
  // (實務上這類機密資訊絕對不能直接寫在程式碼裡，必須寫在 .env 檔案中，透過 process.env 來讀取)
  const GOOGLE_CLIENT_ID = "967812191339-ub5dtisdrbm7edemmo2qfv14gtlfpndk.apps.googleusercontent.com";
  const FB_APP_ID = "1349371613270362";
  const REDIRECT_URI = "http://localhost:3001/settings"; // FB 驗證完後要跳回來的「我們自己的網址」

  // --- [生命週期 1] 一進到頁面，去資料庫檢查這個人的綁定狀態 ---
  // useEffect 的第二個參數是 [accountId]，代表「只要 accountId 改變了」，裡面的程式碼就會執行一次
  useEffect(() => {
    if (user) {
      fetch("/backend/profile/profile.php?action=bindings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: accountId }),
      })
        .then(res => res.json())
        .then(data => {
          // 如果後端回傳成功，就把後端給的 boolean 值存進我們的 State 裡面，畫面就會自動根據 true/false 變化
          if (data.status === 'success') {
            setIsGoogleBound(data.bindings.google);
            setIsFbBound(data.bindings.facebook);
          }
        })
        .catch(() => console.error("獲取綁定狀態失敗"));
    }
  }, [accountId]);

  // --- [生命週期 2] 攔截 Facebook 授權回來後的網址 ---
  // 當使用者點了 FB 登入，FB 會把網頁跳轉回 http://localhost:3001/settings?code=12345&state=facebook
  // 我們必須把網址列上的 ?code=12345 抓下來，傳給後端去換資料
  useEffect(() => {
    if (typeof window !== 'undefined' && accountId) { // 確保只在瀏覽器環境且有登入時執行
      // 解析目前的網址參數
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code'); // 抓取 code 的值
      const state = params.get('state'); // 抓取 state 的值

      if (code && state === 'facebook' && user && !isBindingFb) {
        setIsBindingFb(true);
        setActiveTab('social');
        fetch("/backend/profile/profile.php?action=bind_facebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Account: accountId, Code: code }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.status === 'success') {
              alert(data.message);
              setIsFbBound(true); // 綁定成功，更新狀態為已綁定
              router.replace('/settings'); // 用 replace 取代原本的歷史紀錄，這樣網址列上的 ?code=... 就會消失，畫面變乾淨
            } else {
              alert("Facebook 綁定失敗：" + data.message);
            }
          })
          .finally(() => setIsBindingFb(false)); // 無論成功失敗都解除轉圈圈狀態
      }
    }
  }, [accountId, isBindingFb, router]);

  // 點擊「立即綁定 Facebook」按鈕時觸發的函式
  const handleFacebookLogin = () => {
    // 組合出 Facebook 官方要求的授權網址。裡面要帶我們註冊的 FB_APP_ID，以及他授權完要跳回哪裡 (REDIRECT_URI)
    window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=facebook&response_type=code&scope=email,public_profile`;
  };

  // FB 解除綁定函式
  const handleFacebookUnbind = async () => {
    if (!window.confirm("確定要解除 Facebook 綁定嗎？")) return;
    setIsBindingFb(true);
    try {
      const res = await fetch("/backend/profile/profile.php?action=unbind_social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: accountId, Provider: 'facebook' }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setIsFbBound(false);
      } else {
        alert(data.message);
      }
    } catch {
      alert("解除綁定失敗");
    } finally {
      setIsBindingFb(false);
    }
  };

  // =======================================================
  // 表單狀態管理：分頁 1 (個人檔案編輯)
  // =======================================================
  // 畫面上輸入框裡正在打字的「暱稱」
  const [editName, setEditName] = useState('');
  // 畫面上的「大頭貼預覽網址」
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  // 真正要上傳給後端的「圖片檔案實體」。
  // (因為圖片不能轉成純文字 JSON，必須用 File 物件裝著，等下用 FormData 送出)
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // 儲存「剛剛進來這個網頁時的原始資料」
  // 為什麼要這兩個變數？因為如果使用者打字打到一半想離開，我們可以拿 editName 跟 savedName 比較。
  // 如果不一樣，就代表他「有修改但沒按儲存」，這時就要跳出警告框攔截他。
  const [savedName, setSavedName] = useState('');
  const [savedAvatar, setSavedAvatar] = useState<string | null>(null);

  // UI 互動狀態
  const [isSaving, setIsSaving] = useState(false); // 記錄是否正在打 API 儲存中 (決定按鈕要不要轉圈圈)
  const [showSuccessHint, setShowSuccessHint] = useState(false); // 記錄畫面上方要不要跳出「儲存成功」的綠色橫幅

  // =======================================================
  // 離開頁面防護機制 (Unsaved Changes Guard) 的狀態
  // =======================================================
  // 如果使用者沒存檔就想跑，我們會先把他想去哪裡記錄在這個 pendingNavigation 裡面，然後彈出警告視窗
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);

  // 這是一個「通行證」。如果設為 true，就代表我們允許他離開，瀏覽器就不會再跳警告了。
  // 使用 useRef 而不是 useState，是因為 useRef 改變時不會觸發畫面重新渲染，而且可以確保拿到最新值。
  const allowPageExitRef = useRef(false);

  // =======================================================
  // 表單狀態管理：分頁 2 (修改密碼)
  // =======================================================
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false); // 密碼更新的轉圈圈狀態

  // --- [生命週期 3] 當 user 資料從全域載入完成後，把資料填進表單的預設值 ---
  useEffect(() => {
    if (!loading && !user) {
      // 邏輯防呆：如果已經載入完了，卻沒有 user 資料，代表他是沒登入的訪客偷闖進來的
      router.push('/auth/login'); // 直接踢回登入頁
    } else if (user) {
      // 把全域的 user 資料，拷貝一份放到我們這頁的 State 裡面
      const currentName = user.nickname || 'TRAVELER';
      const currentAvatar = (user as any).avatar || null;

      setEditName(currentName);
      setEditAvatar(currentAvatar);

      // 同時記錄一份「未修改前的原始版本」，當作防呆比對的基準點
      setSavedName(currentName);
      setSavedAvatar(currentAvatar);
    }
  }, [user, loading, router]);

  // 動態計算：判斷目前表單裡的值，是不是跟一開始存的基準點不一樣？
  // 如果不一樣，這個變數就會變成 true，代表「有未儲存的變更」
  const hasUnsavedProfileChanges = editName !== savedName || editAvatar !== savedAvatar;

  // --- [生命週期 4] 核心防護機制：攔截離開頁面的動作 ---
  useEffect(() => {
    // 判斷 1：如果根本沒有修改，那使用者想去哪就去哪，我們不管他 (直接 return 結束)
    if (!hasUnsavedProfileChanges) return;

    // 攔截動作 A：處理瀏覽器原生的關閉分頁 (X)、按 F5 重新整理、按上一頁
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      // 如果我們發了通行證 (例如他已經按了儲存)，就放行
      if (allowPageExitRef.current) return;
      // 否則，阻擋預設動作
      event.preventDefault();
      // 只要設定了 returnValue，瀏覽器就會強制跳出它內建的「您確定要離開嗎？」警告視窗
      event.returnValue = '';
    };

    // 攔截動作 B：處理使用者點擊我們網頁裡面的其他 <a> 連結 (例如點了上方導覽列的首頁)
    const guardLinkNavigation = (event: MouseEvent) => {
      // 防呆：如果使用者是按著 Ctrl 點擊 (想開新分頁)，或是按滑鼠右鍵，我們就不攔截
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

      // 找出被點擊的元素，並往上找看看有沒有 <a> 標籤
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;

      // 如果根本不是連結，或是標示為另開新視窗 (target='_blank')，或是一個下載檔案的連結，就不攔截
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      // 如果點的是同一頁的連結 (例如網址有加 # 錨點)，就不攔截
      if (destination.href === window.location.href) return;

      // 🔥 正式攔截！取消這個 <a> 標籤原本會換頁的預設行為
      event.preventDefault();
      event.stopPropagation(); // 停止事件冒泡

      // 把使用者原本想去的網址記錄在 State 裡面，這會觸發畫面最下方那個黑色的自訂警告 Modal 彈出來
      setPendingNavigation({ type: 'route', href: destination.href });
    };

    // 把我們寫好的兩個攔截器掛載到瀏覽器視窗上
    // 注意 guardLinkNavigation 第三個參數傳入 true，代表使用「捕獲階段 (Capture)」，確保我們的攔截器比別的點擊事件更早執行
    window.addEventListener('beforeunload', warnBeforeLeaving);
    document.addEventListener('click', guardLinkNavigation, true);

    // Cleanup 函數：當元件被卸載 (使用者成功離開這頁)，或是 dependencies 改變時執行
    // 【極重要】一定要在這裡把剛剛掛載的監聽器拔掉！否則這個防護機制會一直卡在全域，導致使用者去別的頁面點連結也被攔截
    return () => {
      window.removeEventListener('beforeunload', warnBeforeLeaving);
      document.removeEventListener('click', guardLinkNavigation, true);
    };
  }, [hasUnsavedProfileChanges]); // 只要「有沒有變更」的狀態一改變，這個 useEffect 就會重新執行去掛載/卸載監聽器

  // 處理大頭貼圖片選擇：當使用者點了隱形檔案上傳框，選好圖片後觸發
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; // 抓取使用者選取的第一個檔案
    if (file) {
      // 💡【記憶體修復優化】如果原本已經有產生過預覽網址了，就把它從記憶體中釋放掉，避免不斷產生殘留的 blob 網址導致 Memory Leak
      if (editAvatar && editAvatar.startsWith('blob:')) {
        URL.revokeObjectURL(editAvatar);
      }
      setAvatarFile(file); // 1. 將檔案本體存起來，準備等一下打 API 傳給 PHP
      setEditAvatar(URL.createObjectURL(file)); // 2. 用瀏覽器的功能，產生一個暫時的 blob 網址，讓畫面馬上顯示這張圖讓使用者預覽
    }
  };

  // 處理點擊「儲存變更」(將暱稱與照片打 API 存給後端)
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // 如果是從 <form> 送出的，阻擋預設的重新整理
    if (!editName.trim()) return alert("暱稱不能為空"); // 基本防呆：把前後空白清掉後如果沒字就擋下來
    if (!accountId) return;

    setIsSaving(true); // 開啟按鈕轉圈圈
    try {
      // 【為什麼用 FormData？】
      // 因為一般 JSON 只能傳遞「純文字」，沒辦法傳遞「圖片二進位檔案」。
      // FormData 就像一個實體的包裹，可以把文字跟檔案打包在一起傳給後端。
      const formData = new FormData();
      formData.append('Account', accountId);
      formData.append('Name', editName); // 打包暱稱
      if (avatarFile) {
        formData.append('Avatar', avatarFile); // 如果有選新照片，就把檔案本體打包進去
      }

      const res = await fetch("/backend/profile/profile.php?action=update", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'success') {
        // 後端可能會回傳處理過的新圖片網址，如果沒有就用預覽網址
        const finalAvatarUrl = data.avatarUrl || editAvatar;

        // 🌟 【全域更新】呼叫 AuthContext 提供的 login 函數，覆蓋原本的 user 狀態
        // 這樣做的好處是，右上角 Header 的大頭貼跟名字會「瞬間」跟著變，不用重新整理網頁！
        login({ ...user, nickname: editName, avatar: finalAvatarUrl } as any);

        // 把「基準點」更新為剛存好檔的資料。這樣 hasUnsavedProfileChanges 就會變成 false，防呆警告也就解除了。
        setSavedName(editName);
        setSavedAvatar(finalAvatarUrl);
        setAvatarFile(null); // 上傳完畢，清空暫存的檔案

        // 顯示畫面上方綠色的「變更已成功儲存」橫幅，並設定 3 秒後自動關閉
        setShowSuccessHint(true);
        setTimeout(() => setShowSuccessHint(false), 3000);
      } else {
        alert("儲存失敗：" + data.message);
      }
    } catch {
      alert("發生伺服器錯誤");
    } finally {
      setIsSaving(false); // 關閉轉圈圈
    }
  };

  // 輔助函式：發放通行證，並根據紀錄好的目的地執行跳轉
  const executeNavigation = (nav: PendingNavigation) => {
    allowPageExitRef.current = true; // 把 useRef 的通行證設為 true，這樣接下來的動作就不會被 useEffect 裡的監聽器攔截了
    if (nav.type === 'route') {
      window.location.href = nav.href; // 強制網頁跳轉到新網址
    } else {
      setActiveTab(nav.tab); // 如果只是想切換左邊的設定分頁，就直接換分頁
    }
    setPendingNavigation(null); // 把彈出視窗關掉

    // 跳轉完成後，保險起見把通行證收回來
    setTimeout(() => { allowPageExitRef.current = false; }, 100);
  };

  // 警告 Modal 按鈕：「放棄變更」
  const handleDiscardChanges = () => {
    // 把畫面上的輸入框跟圖片，全部還原回原本存的樣子
    setEditName(savedName);
    setEditAvatar(savedAvatar);
    setAvatarFile(null);
    // 還原後，執行原本被打斷的跳轉
    if (pendingNavigation) executeNavigation(pendingNavigation);
  };

  // 警告 Modal 按鈕：「儲存並繼續」
  const handleSaveAndContinue = async () => {
    await handleSaveProfile(); // await 確保這支儲存的 API 有順利打完
    if (pendingNavigation) executeNavigation(pendingNavigation); // 存檔完畢後，執行原本被打斷的跳轉
  };

  // 處理：點擊「變更密碼」(打 API 給後端 password 介面)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return alert("新密碼與確認密碼不相符"); // 前端基本防呆
    if (!accountId) return;

    setIsUpdatingPassword(true);
    try {
      const res = await fetch("/backend/profile/profile.php?action=password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Account: accountId, OldPassword: oldPassword, NewPassword: newPassword }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        alert("密碼修改成功！");
        // 修改成功後，為了安全起見，主動幫使用者把輸入框清空
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert("修改失敗：" + data.message);
      }
    } catch {
      alert("發生伺服器錯誤");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // 💡 【效能優化】輔助函式：統一萃取側邊欄按鈕的重複 CSS 樣式
  // 傳入目前迴圈畫到的 tab 名稱，跟 activeTab 比對。如果一樣，就加上黑色粗體背景，否則就是淺灰色。
  const getTabClass = (tab: SettingsTab) =>
    `flex items-center gap-3 px-4 py-3 text-xs tracking-widest uppercase font-medium whitespace-nowrap transition-all border-b-2 md:border-b-0 md:border-l-2 ${activeTab === tab
      ? 'border-neutral-900 text-neutral-900 bg-neutral-50 md:font-bold'
      : 'border-transparent text-neutral-400 hover:text-neutral-900'
    }`;

  // 【畫面渲染防護】如果在確認使用者狀態的這段期間，畫面什麼都不顯示會很怪，
  // 所以這裡回傳一個置中的 Loader2 (旋轉動畫)，等資料到位了才渲染下方真正的內容
  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin size-8 text-neutral-300" /></div>;

  return (
    <div className="min-h-screen bg-[#FBFBFB] pt-12 pb-24">
      <div className="container mx-auto px-6 max-w-5xl">

        {/* ========================================= */}
        {/* 頁面大標題區塊 */}
        {/* ========================================= */}
        <div className="mb-12">
          <h1 className="text-3xl font-extralight text-neutral-900 mb-2">設定與隱私</h1>
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium">Account Settings</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">

          {/* ========================================= */}
          {/* 左側導覽列 (側邊欄) */}
          {/* flex-col 代表直排 (電腦版)，而在手機版上透過 flex-row 變成可以左右滑動的橫排 */}
          {/* 這裡呼叫 getTabClass 函式來決定每個按鈕要套用什麼顏色 */}
          {/* ========================================= */}
          <aside className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col overflow-x-auto no-scrollbar border-b md:border-b-0 border-neutral-100 md:space-y-1">
            <button onClick={() => setActiveTab('profile')} className={getTabClass('profile')}><User className="size-4" /> 個人檔案</button>
            <button onClick={() => setActiveTab('security')} className={getTabClass('security')}><Shield className="size-4" /> 帳號安全</button>
            <button onClick={() => setActiveTab('social')} className={getTabClass('social')}><Share2 className="size-4" /> 綁定社群帳號</button>
          </aside>

          {/* ========================================= */}
          {/* 右側主要內容區塊 (根據 activeTab 變數的值，動態決定要 render 哪一塊 HTML) */}
          {/* ========================================= */}
          <main className="flex-1 bg-white border border-neutral-100 rounded-sm p-8 md:p-12 shadow-sm relative overflow-hidden">

            {/* 儲存成功時的綠色提示條 (透過 absolute 絕對定位固定在右側區塊的最上方) */}
            {/* 只有當 showSuccessHint 是 true 時，這塊 HTML 才會出現在畫面上 */}
            {showSuccessHint && (
              <div className="absolute top-0 left-0 right-0 bg-neutral-900 text-white px-6 py-3 flex items-center justify-center gap-2 text-xs tracking-wider transition-all animate-in slide-in-from-top duration-300">
                <CheckCircle2 className="size-4 text-amber-400 fill-neutral-900" /><span>變更已成功儲存</span>
              </div>
            )}

            {/* [分頁 1 內容]：個人檔案編輯 */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-8 animate-in fade-in duration-300">
                <div><h2 className="text-xl font-light text-neutral-900 mb-1">編輯個人檔案</h2></div>

                {/* 大頭貼上傳區塊 */}
                <div className="flex flex-col items-center sm:items-start gap-4 border-b border-neutral-100 pb-8">
                  <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">
                    TRAVELER AVATAR <span className="ml-1 tracking-normal font-sans">旅行者頭像</span>
                  </span>

                  {/* 頭像區域，加上 group 類別，讓內部的元素可以感應滑鼠是否移入這個外框 */}
                  <div className="w-24 h-24 bg-neutral-50 rounded-full border border-dashed border-neutral-200 flex items-center justify-center relative overflow-hidden group shadow-inner">
                    <AvatarImage src={editAvatar} name={editName} fallbackClassName="text-3xl" />

                    {/* group-hover:opacity-100 效果：平常 opacity 是 0 (隱藏)，滑鼠移入外框時變成 100 (顯示相機圖示與黑底) */}
                    <div className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <Camera className="w-5 h-5 text-white" />
                    </div>

                    {/* 最關鍵的隱形上傳按鈕：它被設定為 position: absolute 蓋滿整個圓形，並且完全透明 (opacity-0)。這樣使用者點擊圖案時，其實是點到這個 input */}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarChange} />
                  </div>
                </div>

                {/* 暱稱輸入框 */}
                <div className="space-y-2 max-w-md">
                  <label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">
                    TRAVELER NICKNAME <span className="ml-1 tracking-normal font-sans">旅行者暱稱</span>
                  </label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none transition-all text-neutral-900 font-light tracking-wider rounded-sm text-sm" required />
                </div>

                {/* 儲存按鈕 */}
                <button type="submit" disabled={isSaving} className="px-8 py-3.5 bg-neutral-900 text-white text-xs tracking-widest uppercase hover:bg-neutral-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 rounded-sm font-medium">
                  {isSaving ? "儲存中..." : "儲存變更"}
                </button>
              </form>
            )}

            {/* [分頁 2 內容]：修改密碼 (包含中英雙語標籤優化) */}
            {activeTab === 'security' && (
              <form onSubmit={handleUpdatePassword} className="space-y-8 animate-in fade-in duration-300">
                <div><h2 className="text-xl font-light text-neutral-900 mb-1">帳號安全設定</h2></div>
                <div className="space-y-4 max-w-md border-b border-neutral-100 pb-8">

                  {/* 目前密碼 */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">
                      CURRENT PASSWORD <span className="ml-1 tracking-normal font-sans">目前密碼</span>
                    </label>
                    <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none text-sm" required />
                  </div>

                  {/* 新密碼 */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">
                      NEW PASSWORD <span className="ml-1 tracking-normal font-sans">新密碼</span>
                    </label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none text-sm" required />
                  </div>

                  {/* 確認新密碼 */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">
                      CONFIRM NEW PASSWORD <span className="ml-1 tracking-normal font-sans">確認新密碼</span>
                    </label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 outline-none text-sm" required />
                  </div>

                </div>

                {/* 儲存密碼按鈕 */}
                <button type="submit" disabled={isUpdatingPassword} className="px-8 py-3.5 bg-neutral-900 text-white text-xs tracking-widest uppercase hover:bg-neutral-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 rounded-sm font-medium">
                  {isUpdatingPassword ? "更新中..." : "變更密碼"}
                </button>
              </form>
            )}

            {/* [分頁 3 內容]：綁定社群帳號 */}
            {activeTab === 'social' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div><h2 className="text-xl font-light text-neutral-900 mb-1">第三方社群綁定</h2></div>
                <div className="space-y-4 max-w-xl">

                  {/* Google 綁定子元件 (邏輯寫在最上面的 GoogleBindAction 裡) */}
                  {/* 💡【效能優化】使用 GoogleOAuthProvider 提供 Google 登入環境。我們把它縮小範圍只包在這個區塊，避免切換到其他分頁時還要載入 Google 外部腳本 */}
                  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                    <GoogleBindAction accountId={accountId} isGoogleBound={isGoogleBound} setIsGoogleBound={setIsGoogleBound} />
                  </GoogleOAuthProvider>

                  {/* Facebook 綁定區塊 (因為 FB API 的關係，它的點擊跳轉邏輯直接寫在這邊比較好做) */}
                  <div className="flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-sm hover:border-neutral-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 flex items-center justify-center text-sm font-semibold shadow-sm transition-all ${isFbBound ? 'bg-[#1877F2] text-white' : 'bg-neutral-50 text-neutral-700'}`}>F</div>
                      <div>
                        <h4 className="text-sm font-medium text-neutral-800">Facebook</h4>
                        {isFbBound ? <p className="text-[11px] text-[#1877F2] font-medium tracking-wide">已綁定</p> : <p className="text-[11px] text-neutral-400 font-light">未綁定</p>}
                      </div>
                    </div>

                    {/* 根據是否綁定顯示不同按鈕 */}
                    {isFbBound ? (
                      <button type="button" onClick={handleFacebookUnbind} disabled={isBindingFb} className="px-4 py-2 text-neutral-400 text-[10px] tracking-widest uppercase hover:text-red-500 transition-all font-medium disabled:opacity-50">解除綁定</button>
                    ) : (
                      <button type="button" onClick={handleFacebookLogin} disabled={isBindingFb} className="px-5 py-2 border border-neutral-200 text-neutral-600 text-[10px] tracking-widest uppercase hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all rounded-sm font-medium disabled:opacity-50">
                        {isBindingFb ? "綁定中..." : "立即綁定"}
                      </button>
                    )}
                  </div>

                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================= */}
      {/* 未儲存防護警告彈窗 (Modal) */}
      {/* 只有在 pendingNavigation 存在時 (代表使用者剛剛亂點網址被我們攔截了)，這個黑底對話框才會出現 */}
      {/* ========================================= */}
      {pendingNavigation && (
        // 外層的黑色半透明遮罩 (backdrop-blur 讓背景有毛玻璃模糊效果)
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-5 backdrop-blur-[2px]" role="dialog">
          {/* 彈出視窗本體 */}
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start gap-4 px-6 pb-5 pt-6 sm:px-7">
              {/* 驚嘆號 Icon */}
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F04D79]/10 text-[#F04D79]"><AlertTriangle className="size-5" /></div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Unsaved changes</p>
                <h2 className="text-xl font-bold tracking-wide text-slate-900">您有未儲存的變更</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">是否要儲存目前的修改？如果直接離開，變更將會遺失。</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-7">
              {/* 點擊「放棄變更」觸發 handleDiscardChanges */}
              <button type="button" onClick={handleDiscardChanges} disabled={isSaving} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold tracking-wide text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50">放棄變更</button>
              {/* 點擊「儲存並繼續」觸發 handleSaveAndContinue */}
              <button type="button" onClick={handleSaveAndContinue} disabled={isSaving} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold tracking-wide text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60">
                {isSaving ? <><Loader2 className="size-4 animate-spin" />儲存中...</> : '儲存並繼續'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}