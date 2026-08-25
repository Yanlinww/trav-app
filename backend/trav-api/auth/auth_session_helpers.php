<?php

const TRAVMATE_SESSION_TTL_SECONDS = 2592000;

function ensure_auth_session_schema(mysqli $conn): void {
    $conn->query(
        "CREATE TABLE IF NOT EXISTS Auth_Session (
            Session_ID BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            Account VARCHAR(50) NOT NULL,
            Token_Hash CHAR(64) NOT NULL,
            Expires_At DATETIME NOT NULL,
            Created_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            Last_Used_At DATETIME NULL,
            Revoked_At DATETIME NULL,
            UNIQUE KEY uq_auth_session_token_hash (Token_Hash),
            KEY idx_auth_session_account (Account, Expires_At),
            KEY idx_auth_session_expiry (Expires_At)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci"
    );
}

function issue_auth_session(mysqli $conn, string $account): string {
    ensure_auth_session_schema($conn);

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $expiresAt = date('Y-m-d H:i:s', time() + TRAVMATE_SESSION_TTL_SECONDS);

    $statement = $conn->prepare(
        'INSERT INTO Auth_Session (Account, Token_Hash, Expires_At) VALUES (?, ?, ?)'
    );
    if (!$statement) throw new RuntimeException('無法建立登入工作階段。');
    $statement->bind_param('sss', $account, $tokenHash, $expiresAt);
    if (!$statement->execute()) {
        $statement->close();
        throw new RuntimeException('無法建立登入工作階段。');
    }
    $statement->close();

    return $token;
}

function get_bearer_token(): string {
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($authorization === '' && function_exists('getallheaders')) {
        $headers = getallheaders();
        $authorization = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!preg_match('/^Bearer\\s+(.+)$/i', trim($authorization), $matches)) return '';
    return trim($matches[1]);
}

function get_authenticated_account(mysqli $conn): ?string {
    $token = get_bearer_token();
    if ($token === '') return null;

    ensure_auth_session_schema($conn);
    $tokenHash = hash('sha256', $token);
    $statement = $conn->prepare(
        'SELECT Account FROM Auth_Session WHERE Token_Hash = ? AND Revoked_At IS NULL AND Expires_At > NOW() LIMIT 1'
    );
    if (!$statement) return null;
    $statement->bind_param('s', $tokenHash);
    if (!$statement->execute()) {
        $statement->close();
        return null;
    }
    $session = $statement->get_result()->fetch_assoc();
    $statement->close();
    if (!$session) return null;

    $lastUsed = $conn->prepare('UPDATE Auth_Session SET Last_Used_At = NOW() WHERE Token_Hash = ?');
    if ($lastUsed) {
        $lastUsed->bind_param('s', $tokenHash);
        $lastUsed->execute();
        $lastUsed->close();
    }

    return (string)$session['Account'];
}

function require_authenticated_account(mysqli $conn): string {
    $account = get_authenticated_account($conn);
    if ($account !== null) return $account;

    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => '登入已失效，請重新登入後再試。'], JSON_UNESCAPED_UNICODE);
    exit;
}
