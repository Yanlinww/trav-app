// 首頁目的地推薦使用的靜態範例格式，與後端公開行程資料分開。
export interface Destination {
    id: string; // 範例識別碼，供卡片 key 與目的地連結使用，不是資料庫查詢結果。
    name: string; // 首頁卡片標題與封面替代文字。
    country: string; // 卡片中的國家／地區顯示文字，可包含多個地區名稱。
    description: string; // 卡片簡介，顯示時由頁面樣式限制長度。
    image: string; // 卡片封面網址。
    price: number; // 首頁以 NT$ 格式顯示的範例價格。
    rating: number; // 範例評分，非即時取得的 Google 評價。
    reviews: number; // 範例評論數。
    days: number; // 範例行程天數。
    category: string; // 卡片分類標籤。
    highlights: string[]; // 保留的行程亮點；目前首頁推薦卡片未使用此列表。
    bestTime: string; // 建議旅遊月份文字；目前首頁推薦卡片未顯示。
    tags?: string[]; // 首頁選標籤時比對此欄位；未提供者不會符合篩選。
    safetyRating?: string; // 首頁安全指數文字；未提供時由頁面顯示預設值。
}

// 未篩選時首頁取前六筆；目前範例未填 tags，因此選標籤後可能顯示空結果。
// 此陣列不呼叫 API，修改內容只改變使用它的靜態展示資料。
// 首頁的篩選採 tags?.includes(selectedTag)，不是依 category 或 country 自動推斷標籤。
// safetyRating 缺少時顯示「9.5」是首頁的備援文字，並非這份資料或外部服務提供的即時指數。
// id 用來組出 /destinations/{id} 連結；宣告資料不會自動建立該路由或把它對應為公開行程 ID。
export const destinations: Destination[] = [
    {
        id: "1",
        name: "京都古寺巡禮",
        country: "日本",
        description: "探索京都千年歷史的寺廟和神社，體驗傳統日本文化與禪意之美",
        image: "https://images.unsplash.com/photo-1528164344705-47542687000d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbiUyMHRlbXBsZSUyMHNjZW5pY3xlbnwxfHx8fDE3Nzk2MDQwMjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
        price: 28900,
        rating: 4.8,
        reviews: 1234,
        days: 5,
        category: "文化探索",
        highlights: ["金閣寺", "伏見稻荷大社", "嵐山竹林", "茶道體驗"],
        bestTime: "3-5月、9-11月",
    },
    {
        id: "2",
        name: "馬爾地夫度假天堂",
        country: "馬爾地夫",
        description: "享受碧海藍天的奢華度假體驗，在水上屋中度過夢幻假期",
        image: "https://images.unsplash.com/photo-1544945582-052b29cd29e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwcGFyYWRpc2V8ZW58MXx8fHwxNzc5NDE3MTEwfDA&ixlib=rb-4.1.0&q=80&w=1080",
        price: 89900,
        rating: 4.9,
        reviews: 2156,
        days: 7,
        category: "海島度假",
        highlights: ["水上別墅", "潛水探險", "SPA療程", "私人沙灘"],
        bestTime: "11月-4月",
    },
    {
        id: "3",
        name: "歐洲古城漫遊",
        country: "義大利/法國",
        description:
            "穿梭於羅馬、佛羅倫斯和巴黎的歷史街道，品味歐洲文藝復興的輝煌",
        image: "https://images.unsplash.com/photo-1616036902568-fa623d8f0c0a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxldXJvcGVhbiUyMGNpdHklMjBzdHJlZXR8ZW58MXx8fHwxNzc5NjA0MDI2fDA&ixlib=rb-4.1.0&q=80&w=1080",
        price: 65900,
        rating: 4.7,
        reviews: 987,
        days: 10,
        category: "文化探索",
        highlights: ["羅馬競技場", "艾菲爾鐵塔", "烏菲茲美術館", "美食品鑑"],
        bestTime: "4-6月、9-10月",
    },
    {
        id: "4",
        name: "阿爾卑斯山健行",
        country: "瑞士",
        description: "挑戰壯麗的阿爾卑斯山脈，享受純淨的山間空氣和絕美風景",
        image: "https://images.unsplash.com/photo-1604223190546-a43e4c7f29d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMGxhbmRzY2FwZSUyMGhpa2luZ3xlbnwxfHx8fDE3Nzk0MzU0ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
        price: 45900,
        rating: 4.6,
        reviews: 654,
        days: 6,
        category: "戶外探險",
        highlights: ["少女峰", "馬特洪峰", "登山纜車", "山間小鎮"],
        bestTime: "6-9月",
    },
    {
        id: "5",
        name: "峇里島奢華度假",
        country: "印尼",
        description:
            "在峇里島的頂級渡假村中放鬆身心，體驗印尼傳統文化與熱帶風情",
        image: "https://images.unsplash.com/photo-1549294413-26f195200c16?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJlc29ydHxlbnwxfHx8fDE3Nzk0NjA3OTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
        price: 35900,
        rating: 4.7,
        reviews: 1543,
        days: 5,
        category: "海島度假",
        highlights: ["無邊際泳池", "傳統舞蹈", "稻田美景", "衝浪體驗"],
        bestTime: "4-10月",
    },
    {
        id: "6",
        name: "非洲野生動物獵遊",
        country: "肯亞/坦尚尼亞",
        description: "在非洲大草原上近距離觀賞野生動物，見證大自然的原始之美",
        image: "https://images.unsplash.com/photo-1577971132997-c10be9372519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWZhcmklMjB3aWxkbGlmZSUyMGFmcmljYXxlbnwxfHx8fDE3Nzk0MzE4MDV8MA&ixlib=rb-4.1.0&q=80&w=1080",
        price: 99900,
        rating: 4.9,
        reviews: 876,
        days: 8,
        category: "戶外探險",
        highlights: ["動物大遷徙", "草原獵遊", "馬賽部落", "日出熱氣球"],
        bestTime: "7-10月",
    },
    {
        id: "7",
        name: "東南亞美食之旅",
        country: "泰國/越南",
        description: "品嚐道地的東南亞料理，體驗熱鬧的夜市和傳統街頭美食文化",
        image: "https://images.unsplash.com/photo-1552912470-ee2e96439539?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHN0cmVldCUyMGZvb2R8ZW58MXx8fHwxNzc5NjA0MDI4fDA&ixlib=rb-4.1.0&q=80&w=1080",
        price: 25900,
        rating: 4.5,
        reviews: 2341,
        days: 7,
        category: "美食文化",
        highlights: ["烹飪課程", "夜市探索", "水上市場", "古城巡禮"],
        bestTime: "11月-2月",
    },
    {
        id: "8",
        name: "冰島極光探險",
        country: "冰島",
        description: "追尋絢麗的北極光，探索冰川、溫泉和火山的奇幻景觀",
        image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxub3J0aGVybiUyMGxpZ2h0cyUyMGF1cm9yYXxlbnwxfHx8fDE3Nzk1OTgxNjR8MA&ixlib=rb-4.1.0&q=80&w=1080",
        price: 78900,
        rating: 4.8,
        reviews: 1098,
        days: 6,
        category: "自然奇觀",
        highlights: ["極光觀賞", "藍湖溫泉", "黃金圈", "冰川健行"],
        bestTime: "9月-3月",
    },
];
