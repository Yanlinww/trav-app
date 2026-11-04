<?php
declare(strict_types=1);

/** 固定城市中心座標；不讀取定位，也不載入資料庫連線。 */
function weather_cities(): array
{
    return [
        'taipei' => [25.033, 121.5654], 'taoyuan' => [24.9936, 121.301],
        'taichung' => [24.1477, 120.6736], 'tainan' => [22.9999, 120.2269],
        'kaohsiung' => [22.6273, 120.3014], 'yilan' => [24.757, 121.753],
        'hualien' => [23.9872, 121.6015], 'taitung' => [22.7583, 121.1444],
    ];
}

/** PHP 將 WMO 代碼轉成中文；未知代碼不得誤判為晴天。 */
function weather_description(int $code): string
{
    $labels = [
        0 => '晴朗', 1 => '晴時多雲', 2 => '局部多雲', 3 => '陰天', 45 => '有霧', 48 => '霧凇',
        51 => '小毛毛雨', 53 => '毛毛雨', 55 => '濃毛毛雨', 56 => '輕微凍毛毛雨', 57 => '凍毛毛雨',
        61 => '小雨', 63 => '中雨', 65 => '大雨', 66 => '輕微凍雨', 67 => '凍雨',
        71 => '小雪', 73 => '中雪', 75 => '大雪', 77 => '雪粒',
        80 => '小陣雨', 81 => '陣雨', 82 => '強陣雨', 85 => '小陣雪', 86 => '強陣雪',
        95 => '雷雨', 96 => '雷雨伴隨冰雹', 99 => '強雷雨伴隨冰雹',
    ];
    if (isset($labels[$code])) {
        return $labels[$code];
    }
    return '天氣狀態未提供';
}

/** 拒絕 null、字串與不合理數值，避免以隱含轉型產生假的 0°C。 */
function weather_number(array $values, string $key, float $min, float $max): float
{
    // 先檢查欄位存在，再檢查型別，最後檢查數值範圍，依序讀即可理解。
    if (!isset($values[$key])) {
        throw new RuntimeException('缺少天氣欄位：' . $key);
    }
    $value = $values[$key];
    if (!is_int($value) && !is_float($value)) {
        throw new RuntimeException('天氣欄位不是數字：' . $key);
    }
    if (!is_finite((float) $value)) {
        throw new RuntimeException('天氣欄位不是有限值：' . $key);
    }
    if ($value < $min || $value > $max) {
        throw new RuntimeException('天氣欄位無效：' . $key);
    }
    return (float) $value;
}

/** 驗證上游資料，轉成 °C、百分比、km/h 與 Unix 毫秒格式供前端直接顯示。 */
function weather_parse(array $payload, int $now): array
{
    if (!isset($payload['current'])) {
        throw new RuntimeException('缺少目前天氣');
    }
    $current = $payload['current'];
    if (!is_array($current)) {
        throw new RuntimeException('缺少目前天氣');
    }
    $code = weather_number($current, 'weather_code', 0, 999);
    $day = weather_number($current, 'is_day', 0, 1);
    if (floor($code) !== $code || floor($day) !== $day) {
        throw new RuntimeException('天氣代碼無效');
    }
    $time = weather_number($current, 'time', 1, 8640000000000);
    // 新資料與快取皆檢查時效，拒絕超過 90 分鐘或領先現在 30 分鐘的資料。
    if ($now - $time > 90 * 60 || $time - $now > 30 * 60) {
        throw new RuntimeException('天氣資料已過期');
    }
    $isDay = false;
    if ($day === 1.0) {
        $isDay = true;
    }
    return [
        'temperature' => weather_number($current, 'temperature_2m', -100, 70),
        'feelsLike' => weather_number($current, 'apparent_temperature', -120, 100),
        'humidity' => weather_number($current, 'relative_humidity_2m', 0, 100),
        'windSpeed' => weather_number($current, 'wind_speed_10m', 0, 500),
        'code' => (int) $code, 'description' => weather_description((int) $code),
        'isDay' => $isDay, 'dataTime' => $time * 1000,
    ];
}

/** 只呼叫固定 HTTPS 服務，保留 TLS 憑證驗證且禁止跟隨重新導向。 */
function weather_fetch(array $coordinates): array
{
    $parameters = [
        'latitude' => $coordinates[0], 'longitude' => $coordinates[1],
        'current' => 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
        'temperature_unit' => 'celsius', 'wind_speed_unit' => 'kmh',
        'timeformat' => 'unixtime', 'timezone' => 'Asia/Taipei',
    ];
    $query = http_build_query($parameters);
    $url = 'https://api.open-meteo.com/v1/forecast?' . $query;
    $curl = curl_init($url);
    if ($curl === false) {
        throw new RuntimeException('無法建立天氣請求');
    }
    try {
        // 連線最多 3 秒、總等待最多 8 秒，避免外部服務拖住 PHP 工作程序。
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 8,
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        ]);
        $body = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        if ($body === false || $status !== 200) {
            throw new RuntimeException('天氣服務無法使用');
        }
        $payload = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($payload)) {
            throw new RuntimeException('天氣格式錯誤');
        }
        return $payload;
    } finally {
        curl_close($curl);
    }
}

/**
 * 每個城市快取五分鐘，資料放在程式指定的暫存目錄，完全不使用資料庫。
 * $fetch 與 $now 可供測試注入；正式環境採 cURL 與伺服器時間。
 * 城市先經白名單驗證，避免路徑穿越；檔案鎖避免同時更新造成內容損壞。
 */
function weather_get(string $cityId, string $cacheDirectory, ?callable $fetch = null, ?int $now = null): array
{
    $cities = weather_cities();
    if (!isset($cities[$cityId])) {
        throw new InvalidArgumentException('不支援的城市');
    }
    if ($now === null) {
        $now = time();
    }
    if ($fetch === null) {
        $fetch = 'weather_fetch';
    }
    if (!is_dir($cacheDirectory)) {
        // @ 只避免檔案系統警告混入 JSON；回傳值仍須檢查，失敗時拋出例外。
        $created = @mkdir($cacheDirectory, 0700, true);
        if ($created === false) {
            // 其他請求可能剛建立相同目錄，因此再確認一次才判定失敗。
            if (!is_dir($cacheDirectory)) {
                throw new RuntimeException('無法建立天氣快取');
            }
        }
    }
    $cachePath = $cacheDirectory . '/' . $cityId . '.json';
    $file = @fopen($cachePath, 'c+');
    if ($file === false) {
        throw new RuntimeException('無法開啟天氣快取');
    }
    try {
        // 正在更新時回可重試錯誤，不無限等待鎖，避免大量請求占住工作程序。
        $locked = flock($file, LOCK_EX | LOCK_NB);
        if ($locked === false) {
            throw new RuntimeException('天氣正在更新');
        }
        $cacheText = stream_get_contents($file);
        $cached = json_decode($cacheText, true);

        // 每一步只檢查一種條件；全部通過後，才允許使用快取資料。
        $cacheIsValid = false;
        if (is_array($cached)) {
            if (isset($cached['cachedAt']) && isset($cached['payload'])) {
                if (is_int($cached['cachedAt']) && is_array($cached['payload'])) {
                    $cacheAge = $now - $cached['cachedAt'];
                    if ($cacheAge >= 0 && $cacheAge < 300) {
                        $cacheIsValid = true;
                    }
                }
            }
        }
        if ($cacheIsValid === true) {
            try {
                return weather_parse($cached['payload'], $now);
            } catch (RuntimeException $error) {
                // 損壞或失效的快取改由上游重新取得，不回傳不可信的數值。
            }
        }
        // $fetch 是要執行的查詢函式，正式環境是 weather_fetch，測試時可換成假資料函式。
        $coordinates = $cities[$cityId];
        $payload = $fetch($coordinates);
        $weather = weather_parse($payload, $now);
        $cacheData = ['cachedAt' => $now, 'payload' => $payload];
        $encoded = json_encode($cacheData, JSON_THROW_ON_ERROR);
        // 上游成功且通過驗證才更新檔案；若寫入失敗，下次會將壞快取視為未命中。
        rewind($file);
        $cleared = ftruncate($file, 0);
        if ($cleared === false) {
            throw new RuntimeException('無法清空天氣快取');
        }
        $writtenBytes = fwrite($file, $encoded);
        if ($writtenBytes !== strlen($encoded)) {
            throw new RuntimeException('無法寫入天氣快取');
        }
        $saved = fflush($file);
        if ($saved === false) {
            throw new RuntimeException('無法儲存天氣快取');
        }
        return $weather;
    } finally {
        // 即使拋出例外也會關閉檔案並釋放鎖，不阻擋後續請求。
        fclose($file);
    }
}
