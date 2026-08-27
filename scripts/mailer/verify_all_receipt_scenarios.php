<?php
require_once __DIR__ . '/PdfInvoiceGenerator.php';
require_once __DIR__ . '/PdfReceiptGenerator.php';
require_once __DIR__ . '/MailerEngine.php';

use SREnterprises\Mailer\PdfInvoiceGenerator;
use SREnterprises\Mailer\MailerEngine;

echo "=======================================================\n";
echo "SR ENTERPRISES CRM - OFFICIAL RECEIPT VERIFICATION TEST\n";
echo "=======================================================\n\n";

$allPassed = true;

// -----------------------------------------------------------
// TEST 1: Single item invoice
// -----------------------------------------------------------
echo "--- TEST 1: Single item invoice generation ---\n";
$t1Data = [
    'customerName' => 'PRABHATI FOODS PRIVATE LIMITED',
    'customerPhone' => '9989155841',
    'customerEmail' => 'varpes380@gmail.com',
    'invoiceNumber' => '82026209',
    'invoiceDate' => '2026-08-23',
    'dueDate' => '2026-08-30',
    'totalAmount' => 18500,
    'discountAmount' => 0,
    'paidAmount' => 18500,
    'outstandingAmount' => 0,
    'notes' => '1 Years Warranty On Ele Spears 1 Service Free',
    'items' => [
        ['productName' => '25LPH Ro Plant With 18L Tank', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 18500, 'lineTotal' => 18500],
    ],
];
$res1 = PdfInvoiceGenerator::generateInvoicePdf($t1Data);
if ($res1['success'] && file_exists($res1['filePath']) && filesize($res1['filePath']) > 1000) {
    echo "✓ TEST 1 PASSED: Generated {$res1['filename']} (" . filesize($res1['filePath']) . " bytes)\n";
} else {
    echo "✗ TEST 1 FAILED: " . ($res1['error'] ?? 'Unknown error') . "\n";
    $allPassed = false;
}

// -----------------------------------------------------------
// TEST 2: Multiple items with discount
// -----------------------------------------------------------
echo "\n--- TEST 2: Multiple items with discount ---\n";
$t2Data = [
    'customerName' => 'PRABHATI FOODS PRIVATE LIMITED',
    'customerPhone' => '9989155841',
    'customerEmail' => 'varpes380@gmail.com',
    'invoiceNumber' => '82026209',
    'invoiceDate' => '2026-08-23',
    'dueDate' => '2026-08-30',
    'totalAmount' => 15050,
    'discountAmount' => 5100,
    'paidAmount' => 6950,
    'outstandingAmount' => 8100,
    'notes' => '1 Years Warranty On Ele Spears 1 Service Free',
    'items' => [
        ['productName' => '25LPH Ro Plant With 18L Tank', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 18500, 'lineTotal' => 18500],
        ['productName' => 'PRV', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 700, 'lineTotal' => 700],
        ['productName' => 'Prefilter Bowl Housing', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 650, 'lineTotal' => 650],
        ['productName' => 'SF PreFilter', 'quantity' => 2, 'unit' => 'PCS', 'unitPrice' => 150, 'lineTotal' => 300],
    ],
];
$res2 = PdfInvoiceGenerator::generateReceiptPdf($t2Data);
if ($res2['success'] && file_exists($res2['filePath']) && filesize($res2['filePath']) > 1000) {
    echo "✓ TEST 2 PASSED: Generated {$res2['filename']} (" . filesize($res2['filePath']) . " bytes)\n";
} else {
    echo "✗ TEST 2 FAILED: " . ($res2['error'] ?? 'Unknown error') . "\n";
    $allPassed = false;
}

// -----------------------------------------------------------
// TEST 3: No payment (Unpaid / NOT PAID)
// -----------------------------------------------------------
echo "\n--- TEST 3: Unpaid Invoice (Received = 0, Balance = Total) ---\n";
$t3Data = [
    'customerName' => 'Siddharth Varpe',
    'customerPhone' => '9822001122',
    'customerEmail' => 'varpes380@gmail.com',
    'invoiceNumber' => 'INV-2026-0003',
    'invoiceDate' => '2026-08-27',
    'dueDate' => '2026-09-10',
    'totalAmount' => 16500,
    'discountAmount' => 0,
    'paidAmount' => 0,
    'outstandingAmount' => 16500,
    'items' => [
        ['productName' => 'SR RO Alkaline 12L Commercial', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 16500, 'lineTotal' => 16500],
    ],
];
$res3 = PdfInvoiceGenerator::generateInvoicePdf($t3Data);
if ($res3['success'] && file_exists($res3['filePath'])) {
    echo "✓ TEST 3 PASSED: Generated unpaid invoice {$res3['filename']}\n";
} else {
    echo "✗ TEST 3 FAILED\n";
    $allPassed = false;
}

// -----------------------------------------------------------
// TEST 4: Partial payment (PARTIALLY PAID)
// -----------------------------------------------------------
echo "\n--- TEST 4: Partial Payment (Received = 6950, Balance = 8100) ---\n";
$t4Data = [
    'customerName' => 'PRABHATI FOODS PRIVATE LIMITED',
    'customerPhone' => '9989155841',
    'customerEmail' => 'varpes380@gmail.com',
    'invoiceNumber' => '82026209',
    'invoiceDate' => '2026-08-23',
    'dueDate' => '2026-08-30',
    'totalAmount' => 15050,
    'discountAmount' => 5100,
    'paidAmount' => 6950,
    'outstandingAmount' => 8100,
    'items' => $t2Data['items'],
];
$res4 = PdfInvoiceGenerator::generateReceiptPdf($t4Data);
if ($res4['success'] && file_exists($res4['filePath'])) {
    echo "✓ TEST 4 PASSED: Generated partial payment receipt {$res4['filename']}\n";
} else {
    echo "✗ TEST 4 FAILED\n";
    $allPassed = false;
}

// -----------------------------------------------------------
// TEST 5: Full payment (PAID)
// -----------------------------------------------------------
echo "\n--- TEST 5: Full Payment (Received = 15050, Balance = 0) ---\n";
$t5Data = [
    'customerName' => 'PRABHATI FOODS PRIVATE LIMITED',
    'customerPhone' => '9989155841',
    'customerEmail' => 'varpes380@gmail.com',
    'invoiceNumber' => '82026209',
    'invoiceDate' => '2026-08-23',
    'dueDate' => '2026-08-30',
    'totalAmount' => 15050,
    'discountAmount' => 5100,
    'paidAmount' => 15050,
    'outstandingAmount' => 0,
    'items' => $t2Data['items'],
];
$res5 = PdfInvoiceGenerator::generateReceiptPdf($t5Data);
if ($res5['success'] && file_exists($res5['filePath'])) {
    echo "✓ TEST 5 PASSED: Generated full settlement receipt {$res5['filename']}\n";
} else {
    echo "✗ TEST 5 FAILED\n";
    $allPassed = false;
}

// -----------------------------------------------------------
// TEST 6: Mailer Engine Integration (Attaches official PDF)
// -----------------------------------------------------------
echo "\n--- TEST 6: PHPMailer Engine Dispatch with official PDF attachment ---\n";
$emailPayload = [
    'to' => 'varpes380@gmail.com',
    'toName' => 'PRABHATI FOODS PRIVATE LIMITED',
    'eventType' => 'PAYMENT_RECEIPT',
    'customerName' => 'PRABHATI FOODS PRIVATE LIMITED',
    'customerPhone' => '9989155841',
    'invoiceNumber' => '82026209',
    'paymentDate' => '2026-08-27',
    'dueDate' => '2026-08-30',
    'nextDueDate' => '2026-08-30',
    'amount' => 6950,
    'totalPaidAmount' => 6950,
    'totalAmount' => 15050,
    'remainingBalance' => 8100,
    'paymentMethod' => 'UPI',
    'attachInvoicePdf' => true,
    'invoiceData' => $t4Data,
];

$emailPayload['toEmail'] = 'varpes380@gmail.com';
$mailResult = MailerEngine::sendEmail($emailPayload);
if (!empty($mailResult['success']) && !empty($mailResult['pdfAttached'])) {
    echo "✓ TEST 6 PASSED: Email dispatched with official PDF attachment ({$mailResult['status']}, messageId: {$mailResult['messageId']})\n";
} else {
    echo "✗ TEST 6 FAILED: " . json_encode($mailResult) . "\n";
    $allPassed = false;
}

echo "\n=======================================================\n";
if ($allPassed) {
    echo "ALL 6 SCENARIOS VERIFIED SUCCESSFULLY!\n";
} else {
    echo "SOME SCENARIOS FAILED!\n";
}
echo "=======================================================\n";
