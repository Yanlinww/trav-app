<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration can only run from the command line.\n");
}

$_SERVER['REQUEST_METHOD'] = 'GET';
require_once __DIR__ . '/../../db_connect.php';
require_once __DIR__ . '/../schema.php';

ensure_admin_schema($conn);
$conn->close();

echo "Admin schema is ready.\n";
