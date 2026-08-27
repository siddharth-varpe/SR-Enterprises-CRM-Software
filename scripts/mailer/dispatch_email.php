<?php
/**
 * SR Enterprises CRM - Centralized PHPMailer CLI Dispatcher
 * 
 * Invoked by Node.js backend or database queue worker.
 * Supports:
 *   - Base64 payload: php dispatch_email.php --base64=...
 *   - JSON payload: php dispatch_email.php --json=...
 *   - File payload: php dispatch_email.php --file=...
 *   - Standard input: echo '{"to_email":"..."}' | php dispatch_email.php
 */

require_once __DIR__ . '/MailerEngine.php';

use SREnterprises\Mailer\MailerEngine;

// 1. Read input payload
$inputJson = null;
$opts = getopt('', ['json:', 'base64:', 'file:']);

if (!empty($opts['base64'])) {
    $inputJson = base64_decode($opts['base64']);
} elseif (!empty($opts['file']) && file_exists($opts['file'])) {
    $inputJson = file_get_contents($opts['file']);
} elseif (!empty($opts['json'])) {
    $inputJson = $opts['json'];
}

// Fallback: check raw $argv
if (empty($inputJson)) {
    foreach ($argv as $arg) {
        if (strpos($arg, '--base64=') === 0) {
            $inputJson = base64_decode(substr($arg, 9));
            break;
        }
        if (strpos($arg, '--json=') === 0) {
            $inputJson = substr($arg, 7);
            break;
        }
        if (strpos($arg, '--file=') === 0) {
            $f = substr($arg, 7);
            if (file_exists($f)) {
                $inputJson = file_get_contents($f);
                break;
            }
        }
        if (file_exists($arg) && substr($arg, -5) === '.json') {
            $inputJson = file_get_contents($arg);
            break;
        }
    }
}

// Fallback: check standard input pipe only if not a TTY
if (empty($inputJson) && function_exists('stream_isatty') && !@stream_isatty(STDIN)) {
    $stdin = @file_get_contents('php://stdin');
    if (!empty($stdin) && trim($stdin) !== '') {
        $inputJson = trim($stdin);
    }
}

if (empty($inputJson)) {
    echo json_encode([
        'success' => false,
        'status' => 'FAILED',
        'error' => 'No email payload provided. Pass --base64, --json, or pipe JSON via STDIN.',
    ]);
    exit(1);
}

$payload = json_decode($inputJson, true);
if (!is_array($payload)) {
    echo json_encode([
        'success' => false,
        'status' => 'FAILED',
        'error' => 'Invalid JSON payload structure.',
    ]);
    exit(1);
}

// 2. Execute email dispatch via centralized MailerEngine
$result = MailerEngine::sendEmail($payload);

// 3. Return JSON output
echo json_encode($result, JSON_UNESCAPED_SLASHES);

exit($result['success'] ? 0 : ($result['status'] === 'SKIPPED' ? 0 : 1));
