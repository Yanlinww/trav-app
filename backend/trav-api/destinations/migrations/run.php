<?php

// 公開行程模組的資料庫結構只在部署／升級時執行一次，
// 不應在每一個 API 請求中重複執行 ALTER TABLE。
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration can only run from the command line.\n");
}

$_SERVER['REQUEST_METHOD'] = 'GET';
require_once __DIR__ . '/../../db_connect.php';
require_once __DIR__ . '/../schema.php';
require_once __DIR__ . '/../public_itinerary_cache.php';

ensure_destinations_schema($conn);
$conn->close();
invalidate_public_itinerary_cache();

echo "Destinations schema is ready.\n";
