<?php
/**
 * SR Enterprises CRM - Automatic Payment Due Reminders Batch Cron Script
 *
 * Scans all pending/overdue invoices from the CRM database/API,
 * identifies customers with an outstanding balance, and dispatches
 * automatic payment due reminder emails using PHPMailer.
 *
 * Usage:
 *   php send_automated_due_reminders.php
 */

require_once __DIR__ . '/MailerEngine.php';

use SREnterprises\Mailer\MailerEngine;

MailerEngine::loadEnvironment();

$apiUrl = getenv('API_BASE_URL') ?: 'http://127.0.0.1:4000/api/v1';

echo "========================================================\n";
echo "  SR ENTERPRISES CRM - AUTOMATIC PAYMENT DUE MAILER    \n";
echo "  Powered by PHPMailer & Composer                       \n";
echo "========================================================\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n";
echo "API Endpoint: {$apiUrl}/invoices\n\n";

// Fetch Invoices via HTTP
function httpGet($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        return json_decode($response, true);
    }
    return null;
}

$invoicesResp = httpGet("{$apiUrl}/invoices?limit=100");
$invoices = $invoicesResp['data'] ?? [];

if (empty($invoices)) {
    echo "ℹ️  No active invoices retrieved from API (Ensure API server is running at {$apiUrl}).\n";
    exit(0);
}

$eligibleInvoices = array_filter($invoices, function($inv) {
    $status = $inv['status'] ?? '';
    return in_array($status, ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']);
});

echo "📊 Total Invoices Found: " . count($invoices) . "\n";
echo "🎯 Invoices with Pending/Due Balance: " . count($eligibleInvoices) . "\n\n";

$processedCount = 0;
$sentCount = 0;
$skippedCount = 0;

foreach ($eligibleInvoices as $inv) {
    $processedCount++;
    $invoiceId = $inv['id'];
    $invoiceNumber = $inv['invoiceNumber'] ?? 'INV-XXXX';
    $customerName = $inv['customerName'] ?? 'Valued Customer';
    $customerEmail = $inv['customerEmail'] ?? '';
    $customerNumber = $inv['customerNumber'] ?? '';
    $totalAmount = (float)($inv['totalAmount'] ?? 0);
    $paidAmount = (float)($inv['paidAmount'] ?? 0);
    $outstandingAmount = (float)($inv['outstandingAmount'] ?? ($totalAmount - $paidAmount));
    $dueDate = $inv['dueDate'] ?? $inv['invoiceDate'] ?? date('Y-m-d');

    if ($outstandingAmount <= 0.01) {
        echo "⏭️  [{$invoiceNumber}] Already settled. Skipping.\n";
        $skippedCount++;
        continue;
    }

    if (empty($customerEmail) || !filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
        echo "⚠️  [{$invoiceNumber}] Customer '{$customerName}' has no valid email ({$customerEmail}). Skipping.\n";
        $skippedCount++;
        continue;
    }

    echo "📧 Sending Payment Due Mail to: {$customerName} <{$customerEmail}>\n";
    echo "    Invoice: {$invoiceNumber} | Total: Rs. {$totalAmount} | Outstanding Due: Rs. {$outstandingAmount} | Due Date: {$dueDate}\n";

    $mailPayload = [
        'eventType' => 'PAYMENT_REMINDER',
        'toEmail' => $customerEmail,
        'toName' => $customerName,
        'invoiceNumber' => $invoiceNumber,
        'totalAmount' => $totalAmount,
        'paidAmount' => $paidAmount,
        'dueAmount' => $outstandingAmount,
        'dueDate' => $dueDate,
        'customerNumber' => $customerNumber,
    ];

    $result = MailerEngine::sendEmail($mailPayload);

    if (!empty($result['success'])) {
        echo "    ✅ Successfully sent! (Message-ID: " . ($result['messageId'] ?? 'OK') . ")\n\n";
        $sentCount++;
    } else {
        echo "    ❌ Error sending: " . ($result['error'] ?? 'Unknown error') . "\n\n";
    }
}

echo "========================================================\n";
echo "  SUMMARY: {$sentCount} sent, {$skippedCount} skipped, {$processedCount} processed.\n";
echo "========================================================\n";
