// 首頁目的地推薦使用的靜態範例格式，與後端公開行程資料分開。
export interface Destination {
    id: string; // 範例識別碼，供卡片 key 與目的地連結使用，不是資料庫查詢結果。
    name: string; // 首頁卡片標題與封面替代文字。
    country: string; // 沿用 country 欄位名稱，內容為台灣縣市或地區。
    description: string; // 卡片簡介，顯示時由頁面樣式限制長度。
    image: string; // 卡片封面網址。
    price: number; // 首頁以 NT$ 顯示的示意預算，非即時報價。
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
        "id": "1",
        "name": "台南古城慢遊",
        "country": "台南市",
        "description": "走訪老街、廟宇與歷史街區，感受台南的文化與日常風景",
        "image": "https://images.unsplash.com/photo-1528164344705-47542687000d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbiUyMHRlbXBsZSUyMHNjZW5pY3xlbnwxfHx8fDE3Nzk2MDQwMjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "price": 5800,
        "rating": 4.8,
        "reviews": 1234,
        "days": 3,
        "category": "文化探索",
        "highlights": [
            "赤崁樓",
            "安平古堡",
            "神農街",
            "在地小吃"
        ],
        "bestTime": "全年"
    },
    {
        "id": "2",
        "name": "澎湖海島假期",
        "country": "澎湖縣",
        "description": "漫步海邊與聚落，安排澎湖離島的放鬆小旅行",
        "image": "https://images.unsplash.com/photo-1544945582-052b29cd29e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwcGFyYWRpc2V8ZW58MXx8fHwxNzc5NDE3MTEwfDA&ixlib=rb-4.1.0&q=80&w=1080",
        "price": 9800,
        "rating": 4.9,
        "reviews": 2156,
        "days": 3,
        "category": "海島度假",
        "highlights": [
            "海岸散步",
            "聚落巡禮",
            "海鮮料理",
            "夕陽景色"
        ],
        "bestTime": "4-10月"
    },
    {
        "id": "3",
        "name": "鹿港老街漫步",
        "country": "彰化縣",
        "description": "穿梭鹿港歷史街巷，欣賞傳統建築與工藝，品味在地美食",
        "image": "https://images.unsplash.com/photo-1616036902568-fa623d8f0c0a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxldXJvcGVhbiUyMGNpdHklMjBzdHJlZXR8ZW58MXx8fHwxNzc5NjA0MDI2fDA&ixlib=rb-4.1.0&q=80&w=1080",
        "price": 3800,
        "rating": 4.7,
        "reviews": 987,
        "days": 2,
        "category": "文化探索",
        "highlights": [
            "鹿港老街",
            "龍山寺",
            "傳統工藝",
            "在地美食"
        ],
        "bestTime": "全年"
    },
    {
        "id": "4",
        "name": "阿里山森林散策",
        "country": "嘉義縣",
        "description": "走進阿里山森林步道，欣賞山林景色，安排適合自己的步行路線",
        "image": "https://images.unsplash.com/photo-1604223190546-a43e4c7f29d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMGxhbmRzY2FwZSUyMGhpa2luZ3xlbnwxfHx8fDE3Nzk0MzU0ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "price": 6800,
        "rating": 4.6,
        "reviews": 654,
        "days": 3,
        "category": "戶外探險",
        "highlights": [
            "森林步道",
            "阿里山車站",
            "山林景色",
            "茶鄉風光"
        ],
        "bestTime": "全年"
    },
    {
        "id": "5",
        "name": "日月潭湖畔慢活",
        "country": "南投縣",
        "description": "沿著日月潭湖畔散步或騎單車，享受放慢步調的國內假期",
        "image": "https://images.unsplash.com/photo-1549294413-26f195200c16?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJlc29ydHxlbnwxfHx8fDE3Nzk0NjA3OTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "price": 5200,
        "rating": 4.7,
        "reviews": 1543,
        "days": 2,
        "category": "海島度假",
        "highlights": [
            "湖畔散步",
            "環湖單車",
            "伊達邵",
            "茶香體驗"
        ],
        "bestTime": "全年"
    },
    {
        "id": "6",
        "name": "花蓮山海小旅行",
        "country": "花蓮縣",
        "description": "探索花蓮海岸、城市街區與在地文化，體驗台灣東部的自然風景",
        "image": "https://images.unsplash.com/photo-1577971132997-c10be9372519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWZhcmklMjB3aWxkbGlmZSUyMGFmcmljYXxlbnwxfHx8fDE3Nzk0MzE4MDV8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "price": 7200,
        "rating": 4.9,
        "reviews": 876,
        "days": 3,
        "category": "戶外探險",
        "highlights": [
            "海岸風景",
            "街區散步",
            "在地文化",
            "特色市集"
        ],
        "bestTime": "全年"
    },
    {
        "id": "7",
        "name": "台中美食散步",
        "country": "台中市",
        "description": "走訪台中市場、夜市與特色街區，品嚐在地小吃與日常美食",
        "image": "https://images.unsplash.com/photo-1552912470-ee2e96439539?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHN0cmVldCUyMGZvb2R8ZW58MXx8fHwxNzc5NjA0MDI4fDA&ixlib=rb-4.1.0&q=80&w=1080",
        "price": 4200,
        "rating": 4.5,
        "reviews": 2341,
        "days": 2,
        "category": "美食文化",
        "highlights": [
            "市場巡禮",
            "夜市探索",
            "街區咖啡",
            "在地小吃"
        ],
        "bestTime": "全年"
    },
    {
        "id": "8",
        "name": "北投溫泉慢遊",
        "country": "台北市",
        "description": "走訪北投溫泉街區與綠地，安排輕鬆的都會休閒小旅行",
        "image": "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxub3J0aGVybiUyMGxpZ2h0cyUyMGF1cm9yYXxlbnwxfHx8fDE3Nzk1OTgxNjR8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "price": 4800,
        "rating": 4.8,
        "reviews": 1098,
        "days": 2,
        "category": "自然奇觀",
        "highlights": [
            "溫泉街區",
            "北投公園",
            "溫泉博物館",
            "綠地散步"
        ],
        "bestTime": "全年"
    }
];
