<?php
/**
 * SR Enterprises CRM - Official Bill of Supply / Receipt PDF Generator
 * 
 * Delegated to the single authoritative PdfInvoiceGenerator
 */

namespace SREnterprises\Mailer;

require_once __DIR__ . '/PdfInvoiceGenerator.php';

class PdfReceiptGenerator {
    /**
     * Generate an Official Receipt / Bill of Supply PDF file on disk
     * 
     * @param array $receiptData Real persisted payment record + invoice + line items + customer info
     * @return array ['success' => bool, 'filePath' => string, 'filename' => string, 'error' => string|null]
     */
    public static function generateReceiptPdf(array $receiptData): array {
        return PdfInvoiceGenerator::generateReceiptPdf($receiptData);
    }

    /**
     * Render the official document HTML layout
     */
    public static function renderReceiptHtml(array $data): string {
        return PdfInvoiceGenerator::renderOfficialDocumentHtml($data);
    }
}
