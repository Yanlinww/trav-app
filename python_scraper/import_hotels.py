import requests
import mysql.connector
import urllib3

# 隱藏 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning) 

print("啟動程式：準備從政府開放資料平台下載旅宿資料...")

try:
    # 1. 建立 MySQL 資料庫連線
    db = mysql.connector.connect(
        host="localhost",
        user="root",        
        password="",        
        database="trav_db"  
    )
    cursor = db.cursor()
    print("✅ 資料庫連線成功！")

    # 2. 抓取新北市合法旅館 API
    url = "https://data.ntpc.gov.tw/api/datasets/1529141b-4395-46df-aeb3-22cf1ed62635/json?page=0&size=50"
    
    # 🌟 關鍵升級：加上假裝是 Google Chrome 瀏覽器的 User-Agent
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1"
    }
    
    print("⬇️ 正在向政府 API 請求資料，請稍候...")
    response = requests.get(url, headers=headers, verify=False) 
    
    # 🌟 關鍵防呆：先檢查拿到的內容是不是 JSON
    try:
        hotels_data = response.json() 
        print(f"✅ 成功獲取 {len(hotels_data)} 筆旅館資料！準備寫入資料庫...")
        
        # 3. 寫入資料庫
        insert_count = 0
        for hotel in hotels_data:
            name = hotel.get('Name', '未命名旅館')
            address = hotel.get('Add', '無地址')
            lat = hotel.get('Py', 0.0)  
            lng = hotel.get('Px', 0.0)  
            
            if name and address:
                sql = """
                    INSERT INTO places (name, category, address, latitude, longitude, price_level)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """
                val = (name, 'hotel', address, lat, lng, 2)
                
                try:
                    cursor.execute(sql, val)
                    insert_count += 1
                except mysql.connector.Error:
                    continue

        db.commit()
        print(f"🎉 太棒了！成功將 {insert_count} 筆合法旅館寫入 MySQL！")

    except ValueError:
        # 如果解析 JSON 失敗，就把網站實際回傳的內容印出來抓鬼
        print(f"❌ 網站拒絕給予 JSON 資料！狀態碼: {response.status_code}")
        print("網站實際回傳的內容前 300 個字是：")
        print(response.text[:300])

except mysql.connector.Error as err:
    print(f"❌ 資料庫發生錯誤：{err}")
except Exception as e:
    print(f"❌ 程式執行發生錯誤：{e}")
finally:
    if 'db' in locals() and db.is_connected():
        cursor.close()
        db.close()
        print("🔒 資料庫連線已安全關閉。")