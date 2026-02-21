<?php
// /api/send.php
// AJAX endpoint for /assets/js/form.js
// Accepts JSON or multipart/form-data, returns JSON

declare(strict_types=1);

// ---------- CORS / headers ----------
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Method Not Allowed']);
  exit;
}

// ---------- tiny helpers ----------
function jfail(string $msg, int $code = 400) {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}
function jsuccess(string $msg = 'Message sent. Thank you.') {
  echo json_encode(['ok' => true, 'message' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}
function get_client_ip(): string {
  return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}
function clean(string $s): string {
  $s = trim($s);
  $s = preg_replace('/[\x00-\x1F\x7F]/u','', $s);
  return $s;
}
function valid_email(string $e): bool {
  return (bool) filter_var($e, FILTER_VALIDATE_EMAIL);
}

// ---------- parse input (JSON or FormData) ----------
$raw = file_get_contents('php://input');
$ctype = $_SERVER['CONTENT_TYPE'] ?? '';

$payload = [];
if (stripos($ctype, 'application/json') !== false && $raw) {
  $json = json_decode($raw, true);
  if (is_array($json)) $payload = $json;
}

if (!$payload) $payload = $_POST;

$name    = isset($payload['name'])    ? clean((string)$payload['name'])    : '';
$email   = isset($payload['email'])   ? clean((string)$payload['email'])   : '';
$subject = isset($payload['subject']) ? clean((string)$payload['subject']) : '';
$message = isset($payload['message']) ? clean((string)$payload['message']) : '';
$apt     = isset($payload['apt'])     ? clean((string)$payload['apt'])     : '';
$dates   = isset($payload['dates'])   ? clean((string)$payload['dates'])   : '';
$hp      = isset($payload['website']) ? (string)$payload['website'] : '';

// ---------- basic validation ----------
$errs = [];
if ($hp !== '') {
  jfail('Spam detected', 400);
}
if ($name === '' || mb_strlen($name) < 2) {
  $errs[] = 'Please enter your name.';
}
if (!valid_email($email)) {
  $errs[] = 'Please enter a valid email.';
}
if ($message === '' || mb_strlen($message) < 5) {
  $errs[] = 'Please enter a message.';
}
if (mb_strlen($name) > 120)    $name = mb_substr($name, 0, 120);
if (mb_strlen($subject) > 160) $subject = mb_substr($subject, 0, 160);
if (mb_strlen($message) > 4000) $message = mb_substr($message, 0, 4000);

if ($errs) jfail(implode(' ', $errs), 400);

// ---------- throttle (simple per-IP lock in /tmp) ----------
$ip = preg_replace('/[^0-9a-fA-F\.\:]/','', get_client_ip());
$lockFile = sys_get_temp_dir() . '/aa_form_' . md5($ip) . '.lock';
$maxPer5Min = 5;

$now = time();
$window = 5 * 60;
$history = [];

if (is_file($lockFile)) {
  $txt = @file_get_contents($lockFile);
  if ($txt) {
    $history = array_filter(array_map('intval', explode(',', $txt)), function($t) use ($now, $window){
      return ($now - $t) < $window;
    });
  }
}
$history[] = $now;
if (count($history) > $maxPer5Min) {
  jfail('Too many attempts. Please try again in a few minutes.', 429);
}
@file_put_contents($lockFile, implode(',', $history), LOCK_EX);

// ---------- build email ----------
$toEmail = 'info@auraadriatica.com';
$toName  = 'Aura Adriatica Website';

$finalSubject = $subject !== '' ? $subject : 'Website Inquiry';
if ($apt !== '')   $finalSubject .= " — {$apt}";
if ($dates !== '') $finalSubject .= " — {$dates}";

$bodyText = "New inquiry from Aura Adriatica website\n\n"
          . "Name: {$name}\n"
          . "Email: {$email}\n"
          . ($apt   !== '' ? "Apartment: {$apt}\n"   : '')
          . ($dates !== '' ? "Dates: {$dates}\n"     : '')
          . "IP: {$ip}\n"
          . "----------------------------------------\n\n"
          . "{$message}\n";

$bodyHtml = nl2br(htmlspecialchars($bodyText, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));

// ---------- send via PHPMailer (SMTP Zoho) ----------
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if (!class_exists(PHPMailer::class)) {
  jfail('Server mailer not available. Please contact us directly at info@auraadriatica.com', 500);
}

$mail = new PHPMailer(true);

try {
  $mail->isSMTP();
  $mail->Host       = 'smtp.zoho.eu';
  $mail->Port       = 587;
  $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
  $mail->SMTPAuth   = true;

  $mail->Username   = 'info@auraadriatica.com';
  $mail->Password   = $_ENV['SMTP_PASSWORD'] ?? getenv('SMTP_PASSWORD'); // ← lozinka iz env varijable

  $mail->setFrom('info@auraadriatica.com', 'Aura Adriatica Website');
  $mail->addAddress($toEmail, $toName);
  $mail->addReplyTo($email, $name);

  $mail->Subject = $finalSubject;
  $mail->isHTML(true);
  $mail->Body    = $bodyHtml;
  $mail->AltBody = $bodyText;

  $mail->send();
  jsuccess('We received your inquiry. Thank you!');
} catch (Exception $e) {
  jfail('Mail delivery failed. Please try again or email us at info@auraadriatica.com', 500);
}
