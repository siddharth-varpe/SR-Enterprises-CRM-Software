<?php
/**
 * Test Suite for SR Enterprises New Branded Email Templates
 */

require_once __DIR__ . '/MailerEngine.php';

use SREnterprises\Mailer\MailerEngine;

echo "================================================================\n";
echo "SR ENTERPRISES EMAIL TEMPLATES VERIFICATION SUITE\n";
echo "================================================================\n\n";

$tests = [
    // 1. Payment Received - Fully Paid
    [
        'name' => '1. Payment Received (Fully Paid)',
        'payload' => [
            'eventType' => 'PAYMENT_RECEIPT',
            'toEmail' => 'customer.test@example.com',
            'toName' => 'Rajesh Sharma',
            'customerName' => 'Rajesh Sharma',
            'amount' => 8500.00,
            'totalAmount' => 8500.00,
            'previousPaidAmount' => 0.00,
            'totalPaidAmount' => 8500.00,
            'remainingBalance' => 0.00,
            'paymentStatus' => 'PAID',
            'paymentDate' => date('Y-m-d'),
            'invoiceNumber' => 'INV-2026-0042',
            'paymentMethod' => 'UPI (Google Pay)',
            'transactionId' => 'UPI/382910481920/AU',
            'mock' => true,
        ],
    ],
    // 2. Payment Received - Partially Paid
    [
        'name' => '2. Payment Received (Partially Paid)',
        'payload' => [
            'eventType' => 'PAYMENT_RECEIPT',
            'toEmail' => 'customer.partial@example.com',
            'toName' => 'Amit Verma',
            'customerName' => 'Amit Verma',
            'amount' => 3000.00,
            'totalAmount' => 9500.00,
            'previousPaidAmount' => 2000.00,
            'totalPaidAmount' => 5000.00,
            'remainingBalance' => 4500.00,
            'paymentStatus' => 'PARTIALLY_PAID',
            'paymentDate' => date('Y-m-d'),
            'invoiceNumber' => 'INV-2026-0088',
            'paymentMethod' => 'Bank Transfer (IMPS)',
            'transactionId' => 'IMPS9283746190',
            'dueDate' => date('Y-m-d', strtotime('+15 days')),
            'mock' => true,
        ],
    ],
    // 3. Payment Due Reminder
    [
        'name' => '3. Payment Due Reminder',
        'payload' => [
            'eventType' => 'PAYMENT_REMINDER',
            'toEmail' => 'customer.due@example.com',
            'toName' => 'Sunil Deshmukh',
            'invoiceNumber' => 'INV-2026-0105',
            'invoiceDate' => date('Y-m-d', strtotime('-10 days')),
            'totalAmount' => 12500.00,
            'paidAmount' => 5000.00,
            'dueAmount' => 7500.00,
            'dueDate' => date('Y-m-d', strtotime('+5 days')),
            'invoiceUrl' => 'https://crm.srenterprises.com/invoices/INV-2026-0105',
            'mock' => true,
        ],
    ],
    // 4. Payment Overdue Reminder
    [
        'name' => '4. Payment Overdue Reminder',
        'payload' => [
            'eventType' => 'PAYMENT_REMINDER',
            'toEmail' => 'customer.overdue@example.com',
            'toName' => 'Vikram Malhotra',
            'invoiceNumber' => 'INV-2026-0012',
            'invoiceDate' => date('Y-m-d', strtotime('-40 days')),
            'totalAmount' => 6000.00,
            'paidAmount' => 0.00,
            'dueAmount' => 6000.00,
            'dueDate' => date('Y-m-d', strtotime('-10 days')),
            'invoiceUrl' => 'https://crm.srenterprises.com/invoices/INV-2026-0012',
            'mock' => true,
        ],
    ],
    // 5. Service Completed
    [
        'name' => '5. Service Completed',
        'payload' => [
            'eventType' => 'SERVICE_COMPLETED',
            'toEmail' => 'customer.service@example.com',
            'toName' => 'Pooja Kulkarni',
            'serviceNumber' => 'SRV-2026-0155',
            'serviceType' => 'PERIODIC_MAINTENANCE',
            'completedDate' => date('Y-m-d'),
            'technicianName' => 'Sanjay Patil (Senior Tech)',
            'serviceDescription' => 'Comprehensive 5-stage filter check completed. Sediment and Carbon pre-filters replaced. RO membrane flushed and TDS stabilized.',
            'amount' => 1250.00,
            'paymentStatus' => 'PAID',
            'outputTds' => '45',
            'mock' => true,
        ],
    ],
    // 6. Sale Confirmation
    [
        'name' => '6. Sale Order Confirmation',
        'payload' => [
            'eventType' => 'SALE_CONFIRMATION',
            'toEmail' => 'customer.sale@example.com',
            'toName' => 'Mahesh Patel',
            'saleNumber' => 'SALE-2026-0077',
            'saleDate' => date('Y-m-d'),
            'invoiceNumber' => 'INV-2026-0077',
            'customerNumber' => 'CUST-2026-0034',
            'subtotal' => 14500.00,
            'taxAmount' => 0.00,
            'discountAmount' => 500.00,
            'totalAmount' => 14000.00,
            'items' => [
                [
                    'productName' => 'Aqua Grand RO + UV + UF + TDS Controller 12L Purifier',
                    'sku' => 'AG-RO-12L',
                    'quantity' => 1,
                    'unitPrice' => 12500.00,
                    'lineTotal' => 12500.00,
                ],
                [
                    'productName' => 'External Pre-Filter Housing Set with Spun Candle',
                    'sku' => 'PF-SET-01',
                    'quantity' => 1,
                    'unitPrice' => 1500.00,
                    'lineTotal' => 1500.00,
                ],
            ],
            'mock' => true,
        ],
    ],
    // 7. Upcoming Service Reminder
    [
        'name' => '7. Upcoming Service Reminder',
        'payload' => [
            'eventType' => 'SERVICE_REMINDER',
            'toEmail' => 'customer.reminder@example.com',
            'toName' => 'Ganesh Shinde',
            'serviceNumber' => 'SRV-2026-0189',
            'serviceType' => 'QUARTERLY_RO_CHECKUP',
            'scheduledDate' => date('Y-m-d', strtotime('+2 days')),
            'timeSlot' => '11:00 AM - 01:00 PM',
            'technicianName' => 'Ramesh Pawar',
            'serviceAddress' => 'Flat 402, Shivneri Heights, Pipeline Road, Ahmednagar',
            'mock' => true,
        ],
    ],
    // 8. Warranty Expiry
    [
        'name' => '8. Warranty Expiry Reminder',
        'payload' => [
            'eventType' => 'WARRANTY_EXPIRY',
            'toEmail' => 'customer.warranty@example.com',
            'toName' => 'Anita Joshi',
            'machineModel' => 'SR Aqua Prime 15L Commercial RO',
            'serialNumber' => 'AP-2025-98321',
            'warrantyNumber' => 'WAR-2025-091',
            'startDate' => date('Y-m-d', strtotime('-335 days')),
            'endDate' => date('Y-m-d', strtotime('+30 days')),
            'daysRemaining' => 30,
            'mock' => true,
        ],
    ],
];

$passedCount = 0;
$failedCount = 0;

$previewDir = __DIR__ . '/previews';
if (!is_dir($previewDir)) {
    @mkdir($previewDir, 0777, true);
}

foreach ($tests as $test) {
    echo "Testing: {$test['name']} ... ";
    $res = MailerEngine::sendEmail($test['payload']);

    if (!empty($res['success'])) {
        echo "✓ PASSED (Subject: {$res['subject']})\n";
        $passedCount++;

        // Save preview HTML file for visual verification
        $refMethod = new \ReflectionClass(MailerEngine::class);
        $renderMethod = $refMethod->getMethod('renderTemplate');
        $renderMethod->setAccessible(true);
        $rendered = $renderMethod->invoke(null, $test['payload']['eventType'], $test['payload']);

        $previewFile = $previewDir . '/' . strtolower(str_replace(' ', '_', preg_replace('/[^a-zA-Z0-9_ ]/', '', $test['name']))) . '.html';
        file_put_contents($previewFile, $rendered['html']);
    } else {
        echo "✗ FAILED: " . ($res['error'] ?? 'Unknown error') . "\n";
        $failedCount++;
    }
}

echo "\n================================================================\n";
echo "SUMMARY: {$passedCount} PASSED, {$failedCount} FAILED\n";
echo "Preview HTML files saved to: " . realpath($previewDir) . "\n";
echo "================================================================\n";

exit($failedCount === 0 ? 0 : 1);
