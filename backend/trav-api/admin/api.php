<?php
/** 管理操作在登入權杖功能移除期間暫停。 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

http_response_code(503);
echo json_encode(['status' => 'error', 'message' => '管理功能暫時停用。'], JSON_UNESCAPED_UNICODE);
