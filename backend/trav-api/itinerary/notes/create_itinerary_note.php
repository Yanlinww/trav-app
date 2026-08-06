<?php
header('Access-Control-Allow-Origin: *'); header('Access-Control-Allow-Methods: POST, OPTIONS'); header('Access-Control-Allow-Headers: Content-Type'); header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once '../../db_connect.php'; require_once '../api_helpers.php'; $data = read_json_body();
$conn->query("CREATE TABLE IF NOT EXISTS `Itinerary_Note` (`Note_ID` INT AUTO_INCREMENT PRIMARY KEY, `Itinerary_ID` INT NOT NULL, `Title` VARCHAR(150) NOT NULL, `Content` TEXT NULL, `Updated_By` VARCHAR(100) NULL, `Updated_At` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX (`Itinerary_ID`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$title = trim((string)($data->Title ?? '')); $account = trim((string)($data->Account ?? ''));
if (empty($data->Itinerary_ID) || $title === '' || $account === '') { api_error('缺少行程 ID、帳號或備忘錄標題', 400); }
require_itinerary_access($conn, (int)$data->Itinerary_ID, $account);
$stmt = $conn->prepare('INSERT INTO Itinerary_Note (Itinerary_ID, Title, Content, Updated_By) VALUES (?, ?, ?, ?)'); $content = (string)($data->Content ?? ''); $stmt->bind_param('isss', $data->Itinerary_ID, $title, $content, $account); $ok = $stmt->execute(); $id = $conn->insert_id; $stmt->close(); $conn->close();
echo json_encode($ok ? ['status' => 'success', 'Note_ID' => $id] : ['status' => 'error', 'message' => '新增備忘錄失敗'], JSON_UNESCAPED_UNICODE);
?>
