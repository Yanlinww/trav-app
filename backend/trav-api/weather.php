<?php
declare(strict_types=1);
require_once __DIR__ . '/weather/service.php';

/** GET /backend/weather.php?city=taipei：沿用同源代理，不載入 db_connect.php。 */
header('Content-Type: application/json; charset=utf-8');
// 快取統一由 PHP 暫存檔控制；瀏覽器不額外保存成功或失敗回應。
header('Cache-Control: no-store');
$requestMethod = '';
if (isset($_SERVER['REQUEST_METHOD'])) {
    $requestMethod = $_SERVER['REQUEST_METHOD'];
}
if ($requestMethod !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    echo json_encode(['error' => '只支援 GET 查詢'], JSON_UNESCAPED_UNICODE);
    exit;
}

$cityId = 'taipei';
if (isset($_GET['city'])) {
    $cityId = $_GET['city'];
}
// 拒絕 city[]=... 等陣列及不支援的城市，避免型別錯誤或任意檔案路徑。
$cities = weather_cities();
$cityIsValid = false;
if (is_string($cityId)) {
    if (isset($cities[$cityId])) {
        $cityIsValid = true;
    }
}
if ($cityIsValid === false) {
    http_response_code(400);
    echo json_encode(['error' => '不支援的城市'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 暫存檔在容器 /tmp，不在網站公開目錄；容器重建後自動重新取得資料。
    $cacheDirectory = sys_get_temp_dir() . '/travmade-weather-v1';
    $weather = weather_get($cityId, $cacheDirectory);
    $response = ['cityId' => $cityId, 'weather' => $weather];
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    // 詳細原因留在後端紀錄，前端只收到穩定的重試提示。
    error_log('Weather API: ' . $error->getMessage());
    http_response_code(503);
    echo json_encode(['error' => '暫時無法取得天氣，請稍後重試。'], JSON_UNESCAPED_UNICODE);
}
