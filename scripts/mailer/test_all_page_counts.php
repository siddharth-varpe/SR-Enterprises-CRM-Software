<?php
require_once __DIR__ . '/PdfInvoiceGenerator.php';

use SREnterprises\Mailer\PdfInvoiceGenerator;
use Dompdf\Dompdf;
use Dompdf\Options;

function checkPageCount(string $label, array $data): bool {
    $options = new Options();
    $options->set('isHtml5ParserEnabled', true);
    $options->set('isRemoteEnabled', true);
    $options->set('defaultFont', 'Helvetica');
    $options->set('dpi', 150);

    $dompdf = new Dompdf($options);
    $html = PdfInvoiceGenerator::renderOfficialDocumentHtml($data);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    $count = $dompdf->getCanvas()->get_page_count();
    $status = ($count === 1) ? "✓ PASSED (1 page)" : "✗ FAILED ({$count} pages)";
    echo "{$label}: {$status}\n";
    return ($count === 1);
}

echo "=======================================================\n";
echo "PAGE COUNT VERIFICATION TEST (MUST ALL BE 1 PAGE)\n";
echo "=======================================================\n";

$allPassed = true;

// Scenario 1: 1 item (Simple purchase)
$allPassed = checkPageCount("Scenario 1: 1 item", [
    'customerName' => 'PRABHATI FOODS PRIVATE LIMITED',
    'customerPhone' => '9989155841',
    'invoiceNumber' => '82026209',
    'totalAmount' => 18500,
    'paidAmount' => 18500,
    'items' => [
        ['productName' => '25LPH Ro Plant With 18L Tank', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 18500, 'lineTotal' => 18500],
    ],
]) && $allPassed;

// Scenario 2: 4 items with discount (Official sample)
$allPassed = checkPageCount("Scenario 2: 4 items with discount", [
    'customerName' => 'PRABHATI FOODS PRIVATE LIMITED',
    'customerPhone' => '9989155841',
    'invoiceNumber' => '82026209',
    'totalAmount' => 15050,
    'discountAmount' => 5100,
    'paidAmount' => 6950,
    'items' => [
        ['productName' => '25LPH Ro Plant With 18L Tank', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 18500, 'lineTotal' => 18500],
        ['productName' => 'PRV', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 700, 'lineTotal' => 700],
        ['productName' => 'Prefilter Bowl Housing', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 650, 'lineTotal' => 650],
        ['productName' => 'SF PreFilter', 'quantity' => 2, 'unit' => 'PCS', 'unitPrice' => 150, 'lineTotal' => 300],
    ],
]) && $allPassed;

// Scenario 3: 6 items (Large order)
$allPassed = checkPageCount("Scenario 3: 6 items", [
    'customerName' => 'PRABHATI FOODS PRIVATE LIMITED',
    'customerPhone' => '9989155841',
    'invoiceNumber' => '82026209',
    'totalAmount' => 24500,
    'discountAmount' => 1000,
    'paidAmount' => 24500,
    'items' => [
        ['productName' => '25LPH Ro Plant With 18L Tank', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 18500, 'lineTotal' => 18500],
        ['productName' => 'PRV', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 700, 'lineTotal' => 700],
        ['productName' => 'Prefilter Bowl Housing', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 650, 'lineTotal' => 650],
        ['productName' => 'SF PreFilter', 'quantity' => 2, 'unit' => 'PCS', 'unitPrice' => 150, 'lineTotal' => 300],
        ['productName' => 'Sediment Filter 10 Inch', 'quantity' => 2, 'unit' => 'PCS', 'unitPrice' => 450, 'lineTotal' => 900],
        ['productName' => 'Carbon Block Filter 10 Inch', 'quantity' => 2, 'unit' => 'PCS', 'unitPrice' => 550, 'lineTotal' => 1100],
    ],
]) && $allPassed;

// Scenario 4: Partial payment with custom notes
$allPassed = checkPageCount("Scenario 4: Partial payment + notes", [
    'customerName' => 'Ramesh Patil',
    'customerPhone' => '9822123456',
    'invoiceNumber' => 'INV-2026-9901',
    'totalAmount' => 12000,
    'paidAmount' => 4000,
    'outstandingAmount' => 8000,
    'notes' => '1 Year Comprehensive Onsite Warranty + 2 Free Preventative Maintenance Visits',
    'items' => [
        ['productName' => 'SR RO Alkaline 12L Commercial', 'quantity' => 1, 'unit' => 'PCS', 'unitPrice' => 12000, 'lineTotal' => 12000],
    ],
]) && $allPassed;

echo "=======================================================\n";
if ($allPassed) {
    echo "ALL SCENARIOS RENDERED ON STRICTLY 1 SINGLE PAGE!\n";
} else {
    echo "SOME SCENARIOS OVERFLOWED!\n";
}
echo "=======================================================\n";
