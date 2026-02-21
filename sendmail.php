<?php
// /sendmail.php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/phpmailer/PHPMailer.php';
require_once __DIR__ . '/phpmailer/SMTP.php';
require_once __DIR__ . '/phpmailer/Exception.php';

// === CONFIGURATION ===
$to       = 'info@auraadriatica.com';   // glavni primatelj
$from     = 'info@auraadriatica.com';   // Zoho verified sender
$fromName = 'Aura Adriatica Web Form';
$smtpHost = 'smtp.zoho.eu';
$smtpUser = 'info@auraadriatica.com';
$smtpPass = $_ENV['SMTP_PASSWORD'] ?? getenv('SMTP_PASSWORD'); // ← lozinka iz env varijable
$smtpPort = 587;

// === PRIKUPI PODATKE IZ FORME ===
$name       = trim($_POST['name'] ?? '');
$email      = trim($_POST['email'] ?? '');
$message    = trim($_POST['message'] ?? '');
$apartment  = trim($_POST['apartment'] ?? 'N/A');
$lang       = trim($_POST['lang'] ?? 'en');
$page_url   = trim($_POST['page_url'] ?? '');
$user_agent = trim($_POST['user_agent'] ?? '');
$timestamp  = trim($_POST['timestamp'] ?? date('c'));

// === VALIDACIJA ===
if (!$name || !$email || !$message) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing fields']);
    exit;
}

// === KONSTRUIRAJ SADRŽAJ ===
$subject = "New inquiry — $apartment ($lang)";
$body = "
<h3>New message from Aura Adriatica website</h3>
<table border='0' cellspacing='0' cellpadding='6'>
<tr><td><strong>Apartment:</strong></td><td>{$apartment}</td></tr>
<tr><td><strong>Name:</strong></td><td>{$name}</td></tr>
<tr><td><strong>Email:</strong></td><td>{$email}</td></tr>
<tr><td><strong>Message:</strong></td><td>" . nl2br(htmlspecialchars($message)) . "</td></tr>
<tr><td><strong>Language:</strong></td><td>{$lang}</td></tr>
<tr><td><strong>Page URL:</strong></td><td>{$page_url}</td></tr>
<tr><td><strong>User Agent:</strong></td><td>{$user_agent}</td></tr>
<tr><td><strong>Timestamp:</strong></td><td>{$timestamp}</td></tr>
</table>
";

// === SLANJE MAILA ===
$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host       = $smtpHost;
    $mail->SMTPAuth   = true;
    $mail->Username   = $smtpUser;
    $mail->Password   = $smtpPass;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = $smtpPort;

    $mail->CharSet = 'UTF-8';
    $mail->setFrom($from, $fromName);
    $mail->addAddress($to);
    $mail->addReplyTo($email, $name);

    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $body;
    $mail->AltBody = strip_tags($message);

    $mail->send();
    http_response_code(200);
    echo json_encode(['ok' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $mail->ErrorInfo]);
}
