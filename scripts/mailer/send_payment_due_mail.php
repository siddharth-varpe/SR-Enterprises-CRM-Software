<?php
/**
 * SR Enterprises CRM - Automated Payment Due Mailer using PHPMailer
 *
 * Backward-compatible CLI runner delegating to MailerEngine.
 */

require_once __DIR__ . '/MailerEngine.php';

use SREnterprises\Mailer\MailerEngine;

// Parse input arguments / JSON / Base64 / File / STDIN
$inputJson = null;
$opts = getopt('', ['json:', 'base64:', 'file:', 'to_email:', 'to_name:', 'invoice_number:', 'due_amount:', 'total_amount:', 'paid_amount:', 'due_date:', 'customer_number:']);

if (!empty($opts['base64'])) {
    $inputJson = base64_decode($opts['base64']);
} elseif (!empty($opts['file']) && file_exists($opts['file'])) {
    $inputJson = file_get_contents($opts['file']);
} elseif (!empty($opts['json'])) {
    $inputJson = $opts['json'];
}

$payload = [];
if (!empty($inputJson)) {
    $decoded = json_decode($inputJson, true);
    if (is_array($decoded)) {
        $payload = $decoded;
    }
}

// Check raw $argv for unparsed json or flags
if (empty($payload)) {
    foreach ($argv as $arg) {
        if (strpos($arg, '--json=') === 0) {
            $raw = substr($arg, 7);
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $payload = $decoded;
                break;
            }
        }
        if (strpos($arg, '--base64=') === 0) {
            $raw = base64_decode(substr($arg, 9));
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $payload = $decoded;
                break;
            }
        }
    }
}

if (empty($payload) && !empty($opts)) {
    $payload = $opts;
}

if (empty($payload)) {
    $stdin = file_get_contents('php://stdin');
    if (!empty($stdin) && trim($stdin) !== '') {
        $payload = json_decode(trim($stdin), true) ?: [];
    }
}

$payload['eventType'] = 'PAYMENT_REMINDER';

$result = MailerEngine::sendEmail($payload);
echo json_encode($result, JSON_UNESCAPED_SLASHES);

exit($result['success'] ? 0 : ($result['status'] === 'SKIPPED' ? 0 : 1));
