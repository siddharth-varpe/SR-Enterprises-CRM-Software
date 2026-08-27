<?php
require_once __DIR__ . '/PdfInvoiceGenerator.php';

use SREnterprises\Mailer\PdfInvoiceGenerator;
use Dompdf\Dompdf;
use Dompdf\Options;

$options = new Options();
$options->set('isHtml5ParserEnabled', true);
$options->set('isRemoteEnabled', true);
$options->set('defaultFont', 'Helvetica');
$options->set('dpi', 150);

$dompdf = new Dompdf($options);

$sampleData = [
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

$html = PdfInvoiceGenerator::renderOfficialDocumentHtml($sampleData);
$dompdf->loadHtml($html);
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();

$pageCount = $dompdf->getCanvas()->get_page_count();
echo "CURRENT TOTAL PAGES: {$pageCount}\n";
