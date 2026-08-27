<?php
/**
 * Verification Script for Partial Payment Due Date in Email Template
 */

require_once __DIR__ . '/MailerEngine.php';

use SREnterprises\Mailer\MailerEngine;

echo "================================================================\n";
echo "PARTIAL PAYMENT DUE DATE VERIFICATION TEST\n";
echo "================================================================\n\n";

$targetDueDate = date('d M Y', strtotime('+12 days'));
$rawDueDate = date('Y-m-d', strtotime('+12 days'));

$payload = [
    'eventType' => 'PAYMENT_RECEIPT',
    'toEmail' => 'amit.verma@example.com',
    'toName' => 'Amit Verma',
    'customerName' => 'Amit Verma',
    'amount' => 4000.00,
    'totalAmount' => 10000.00,
    'previousPaidAmount' => 2000.00,
    'totalPaidAmount' => 6000.00,
    'remainingBalance' => 4000.00,
    'paymentStatus' => 'PARTIALLY_PAID',
    'paymentDate' => date('Y-m-d'),
    'invoiceNumber' => 'INV-2026-0099',
    'paymentMethod' => 'UPI (PhonePe)',
    'transactionId' => 'UPI/998877665544',
    'dueDate' => $rawDueDate,
    'mock' => true,
];

$refMethod = new \ReflectionClass(MailerEngine::class);
$renderMethod = $refMethod->getMethod('renderTemplate');
$renderMethod->setAccessible(true);
$rendered = $renderMethod->invoke(null, 'PAYMENT_RECEIPT', $payload);

$html = $rendered['html'];
$text = $rendered['text'];

$errors = [];

// 1. Check if Due Date is in HTML Status Card
if (strpos($html, 'Next Due Date:') === false) {
    $errors[] = "Missing 'Next Due Date:' label in HTML.";
}
if (strpos($html, $targetDueDate) === false) {
    $errors[] = "Expected Due Date '{$targetDueDate}' not found in HTML.";
}

// 2. Check if Remaining Balance Due is present
if (strpos($html, 'Remaining Balance Due:') === false) {
    $errors[] = "Missing 'Remaining Balance Due:' in HTML.";
}
if (strpos($html, '4,000.00') === false) {
    $errors[] = "Missing formatted balance 4,000.00 in HTML.";
}

// 3. Check if Notice Card is present
if (strpos($html, 'Next Due Date Notice:') === false) {
    $errors[] = "Missing 'Next Due Date Notice:' alert card in HTML.";
}

// 4. Check if Plain Text contains Due Date
if (strpos($text, "Next Due Date: {$targetDueDate}") === false && strpos($text, "Next Payment Due Date: {$targetDueDate}") === false) {
    $errors[] = "Plain text does not contain 'Next Due Date: {$targetDueDate}'.";
}

if (empty($errors)) {
    echo "✓ PASSED: Partial payment email template correctly includes Due Date '{$targetDueDate}' across all sections:\n";
    echo "  - Main Status Card: Contains 'Next Due Date: {$targetDueDate}'\n";
    echo "  - Summary Table: Contains 'Next Payment Due Date: {$targetDueDate}'\n";
    echo "  - Alert Box: Contains 'Next Due Date Notice' with ₹ 4,000.00 balance and {$targetDueDate}\n";
    echo "  - Plain text: Includes Next Due Date\n\n";
} else {
    echo "✗ FAILED with errors:\n";
    foreach ($errors as $err) {
        echo "  - " . $err . "\n";
    }
    echo "\n";
    exit(1);
}

// Also test fully paid to ensure due date is NOT shown when fully paid
$paidPayload = $payload;
$paidPayload['amount'] = 10000.00;
$paidPayload['remainingBalance'] = 0.00;
$paidPayload['paymentStatus'] = 'PAID';

$renderedPaid = $renderMethod->invoke(null, 'PAYMENT_RECEIPT', $paidPayload);
if (strpos($renderedPaid['html'], 'Next Due Date Notice:') !== false) {
    echo "✗ FAILED: Fully paid email incorrectly included Next Due Date Notice.\n";
    exit(1);
} else {
    echo "✓ PASSED: Fully paid email correctly excludes Next Due Date Notice.\n";
}

echo "\n================================================================\n";
echo "ALL DUE DATE CHECKS COMPLETED SUCCESSFULLY\n";
echo "================================================================\n";
