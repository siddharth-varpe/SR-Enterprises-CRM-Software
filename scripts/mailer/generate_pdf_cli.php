<?php
/**
 * SR Enterprises CRM - Document PDF CLI Generator
 * 
 * Generates official single-page invoice or receipt PDF files on disk
 * via command line for Google Drive document upload and archival.
 */

namespace SREnterprises\Mailer;

require_once __DIR__ . '/PdfInvoiceGenerator.php';
require_once __DIR__ . '/PdfReceiptGenerator.php';

// Parse command line arguments
$payload = null;

foreach ($argv as $arg) {
    if (strpos($arg, '--base64=') === 0) {
        $encoded = substr($arg, 9);
        $json = base64_decode($encoded);
        if ($json) {
            $payload = json_decode($json, true);
        }
    }
}

if (!$payload) {
    // Check STDIN
    $stdin = file_get_contents('php://stdin');
    if (!empty($stdin)) {
        $payload = json_decode($stdin, true);
    }
}

if (!is_array($payload)) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid or missing document generation payload.',
    ]);
    exit(1);
}

$type = strtoupper($payload['type'] ?? $payload['docType'] ?? 'INVOICE');
$data = $payload['data'] ?? $payload;

if ($type === 'RECEIPT' || $type === 'PAYMENT_RECEIPT') {
    $result = PdfReceiptGenerator::generateReceiptPdf($data);
} else {
    $result = PdfInvoiceGenerator::generateInvoicePdf($data);
}

echo json_encode($result);
exit($result['success'] ? 0 : 1);
