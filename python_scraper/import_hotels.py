import requests
import mysql.connector

print("啟動程式：準備從政府開放資料平台下載旅宿資料...")

# 1. 建立 MySQL 資料庫連線
try:
    db = mysql.connector.connect(
        host="localhost",
        user="root",        # XAMPP 預設帳號
        password="",        # XAMPP 預設密碼
        database="trav_app" # 你的專題資料庫
    )
    cursor = db.cursor()
    print("✅ 資料庫連線成功！")

    # 2. 抓取新北市合法旅館 API (真實開放資料網址)
    url = "https://data.ntpc.gov.tw/api/datasets/1529141b-4395-46df-aeb3-22cf1ed62635/json?page=0&size=50"
    print("⬇️ 正在向政府 API 請求資料，請稍候...")
    response = requests.get(url)
    
    # 將回傳的文字轉換為 Python 的字典(Dictionary)格式
    hotels_data = response.json() 
    
    print(f"✅ 成功獲取 {len(hotels_data)} 筆旅館資料！準備寫入資料庫...")

    # 3. 迴圈處理每一筆資料，並寫入資料庫
    insert_count = 0
    for hotel in hotels_data:
        # 根據政府 API 的欄位名稱來抓取對應資料 (Name, Add, Px, Py)
        name = hotel.get('Name', '未命名旅館')
        address = hotel.get('Add', '無地址')
        lat = hotel.get('Py', 0.0)  # 緯度
        lng = hotel.get('Px', 0.0)  # 經度
        
        # 確保有名字和地址才存入
        if name and address:
            # 準備 SQL 語法
            # 這裡我們自動把 category 設為 'hotel'，並給一個預設的價格等級 2 (一般價位)
            sql = """
                INSERT INTO places (name, category, address, latitude, longitude, price_level)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            val = (name, 'hotel', address, lat, lng, 2)
            
            try:
                cursor.execute(sql, val)
                insert_count += 1
            except mysql.connector.Error as err:
                # 略過重複或錯誤的資料，繼續執行下一筆
                continue

    # 4. 提交並儲存所有變更
    db.commit()
    print(f"🎉 太棒了！成功將 {insert_count} 筆合法旅館寫入 MySQL！")

except mysql.connector.Error as err:
    print(f"❌ 資料庫發生錯誤：{err}")
except Exception as e:
    print(f"❌ 程式執行發生錯誤：{e}")
finally:
    # 確保最後有安全地關閉資料庫連線
    if 'db' in locals() and db.is_connected():
        cursor.close()
        db.close()
        print("🔒 資料庫連線已安全關閉。")