<?php
/**
 * SR Enterprises CRM - Centralized PHPMailer Engine
 * 
 * Provides production-grade SMTP connection management, environment configuration,
 * HTML & plain-text compilation, attachment handling, and standardized output.
 */

namespace SREnterprises\Mailer;

require_once __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

class MailerEngine {
    private static bool $envLoaded = false;

    /**
     * Load environment configuration from .env files
     */
    public static function loadEnvironment(): void {
        if (self::$envLoaded) return;

        $paths = [
            dirname(__DIR__, 2) . '/.env',
            dirname(__DIR__, 2) . '/apps/api/.env',
        ];

        foreach ($paths as $path) {
            if (!file_exists($path)) continue;
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (!$lines) continue;

            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || $line[0] === '#') continue;
                $parts = explode('=', $line, 2);
                if (count($parts) === 2) {
                    $k = trim($parts[0]);
                    $v = trim(trim($parts[1]), '"\'');
                    if (getenv($k) === false) {
                        putenv("$k=$v");
                        $_ENV[$k] = $v;
                    }
                }
            }
        }

        self::$envLoaded = true;
    }

    /**
     * Create and configure a secure PHPMailer instance
     */
    public static function createMailer(): PHPMailer {
        self::loadEnvironment();

        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';
        $mail->Timeout = 15; // 15 seconds connection timeout

        $smtpHost = getenv('SMTP_HOST') ?: getenv('MAIL_HOST') ?: '';
        $smtpPort = (int)(getenv('SMTP_PORT') ?: getenv('MAIL_PORT') ?: 587);
        $smtpUser = getenv('SMTP_USER') ?: getenv('SMTP_USERNAME') ?: getenv('MAIL_USERNAME') ?: '';
        $smtpPass = str_replace(' ', '', (getenv('SMTP_PASS') ?: getenv('SMTP_PASSWORD') ?: getenv('MAIL_PASSWORD') ?: ''));
        $smtpSecure = strtolower(getenv('SMTP_SECURE') ?: getenv('MAIL_ENCRYPTION') ?: 'tls');
        
        $fromEmail = getenv('SMTP_FROM_EMAIL') ?: getenv('SMTP_FROM') ?: getenv('MAIL_FROM_ADDRESS') ?: 'no-reply@srenterprises.com';
        $fromName = getenv('SMTP_FROM_NAME') ?: getenv('MAIL_FROM_NAME') ?: 'SR Enterprises';
        $supportEmail = getenv('SUPPORT_EMAIL') ?: 'support@srenterprises.com';

        if (!empty($smtpHost) && !empty($smtpUser)) {
            $mail->isSMTP();
            $mail->Host = $smtpHost;
            $mail->SMTPAuth = true;
            $mail->Username = $smtpUser;
            $mail->Password = $smtpPass;
            
            if ($smtpSecure === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($smtpSecure === 'tls' || $smtpSecure === 'starttls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $mail->SMTPSecure = '';
                $mail->SMTPAutoTLS = false;
            }

            $mail->Port = $smtpPort;
            $mail->SMTPKeepAlive = false;
        } else {
            // Local simulation / fallback mailer
            $mail->isMail();
        }

        $mail->setFrom($fromEmail, $fromName);
        $mail->addReplyTo($supportEmail, $fromName);

        return $mail;
    }

    /**
     * Send email with payload, templates and optional PDF attachments
     * 
     * @param array $payload
     * @return array Standardized result array
     */
    public static function sendEmail(array $payload): array {
        self::loadEnvironment();

        $eventType = $payload['eventType'] ?? $payload['event_type'] ?? 'GENERAL';
        $toEmail = trim($payload['toEmail'] ?? $payload['to_email'] ?? $payload['recipientEmail'] ?? '');
        $toName = trim($payload['toName'] ?? $payload['to_name'] ?? $payload['recipientName'] ?? 'Valued Customer');
        $subject = $payload['subject'] ?? '';

        // Validate recipient email
        if (empty($toEmail) || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return [
                'success' => false,
                'status' => 'SKIPPED',
                'reason' => 'EMAIL_SKIPPED_NO_VALID_ADDRESS',
                'error' => 'Invalid or missing recipient email address: ' . ($toEmail ?: '(empty)'),
                'recipient' => $toEmail,
            ];
        }

        // Development mode override check
        $devMode = filter_var(getenv('DEVELOPMENT_MODE') ?: getenv('MAIL_DEV_MODE') ?: false, FILTER_VALIDATE_BOOLEAN);
        $devOverride = getenv('DEV_EMAIL_OVERRIDE') ?: getenv('MAIL_DEV_OVERRIDE') ?: '';
        if ($devMode && !empty($devOverride) && filter_var($devOverride, FILTER_VALIDATE_EMAIL)) {
            $toName = "[DEV - Real Recipient: {$toEmail}] " . $toName;
            $toEmail = $devOverride;
        }

        // Render Templates
        $rendered = self::renderTemplate($eventType, $payload);
        $htmlBody = $rendered['html'];
        $plainText = $rendered['text'];
        if (empty($subject)) {
            $subject = $rendered['subject'];
        }

        $mail = self::createMailer();
        $tempPdfPath = null;

        $mailDriver = strtolower(getenv('MAIL_DRIVER') ?: '');
        $isMock = ($mailDriver === 'log' || $mailDriver === 'mock' || getenv('MOCK_MAIL') === 'true' || (!empty($payload['mock']) && $payload['mock'] === true));
        $smtpHost = getenv('SMTP_HOST') ?: getenv('MAIL_HOST') ?: '';
        $smtpUser = getenv('SMTP_USER') ?: getenv('SMTP_USERNAME') ?: getenv('MAIL_USERNAME') ?: '';

        try {
            $mail->addAddress($toEmail, $toName);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = $plainText;

            // Generate and attach PDF if requested
            if (!empty($payload['attachInvoicePdf']) || $eventType === 'PAYMENT_RECEIPT' || $eventType === 'SALE_CONFIRMATION') {
                require_once __DIR__ . '/PdfInvoiceGenerator.php';
                require_once __DIR__ . '/PdfReceiptGenerator.php';
                
                $invoiceData = (!empty($payload['invoiceData']) && is_array($payload['invoiceData'])) 
                    ? $payload['invoiceData'] 
                    : $payload;

                if (empty($invoiceData['customerName']) && !empty($toName)) {
                    $invoiceData['customerName'] = $toName;
                }
                if (empty($invoiceData['customerEmail']) && !empty($toEmail)) {
                    $invoiceData['customerEmail'] = $toEmail;
                }
                if (empty($invoiceData['invoiceNumber']) && !empty($payload['invoiceNumber'])) {
                    $invoiceData['invoiceNumber'] = $payload['invoiceNumber'];
                }

                if ($eventType === 'PAYMENT_RECEIPT') {
                    $pdfResult = PdfReceiptGenerator::generateReceiptPdf($invoiceData);
                } else {
                    $pdfResult = PdfInvoiceGenerator::generateInvoicePdf($invoiceData);
                }

                if (!empty($pdfResult['success']) && !empty($pdfResult['filePath']) && file_exists($pdfResult['filePath']) && filesize($pdfResult['filePath']) > 0) {
                    $tempPdfPath = $pdfResult['filePath'];
                    $pdfFilename = $pdfResult['filename'] ?? ($eventType === 'PAYMENT_RECEIPT' ? ('Receipt-' . ($payload['paymentNumber'] ?? $payload['invoiceNumber'] ?? 'REC') . '.pdf') : ('Invoice-' . ($payload['invoiceNumber'] ?? 'INV') . '.pdf'));
                    $mail->addAttachment($tempPdfPath, $pdfFilename, 'base64', 'application/pdf');
                }
            } elseif (!empty($payload['attachmentPath']) && file_exists($payload['attachmentPath']) && filesize($payload['attachmentPath']) > 0) {
                // Attach pre-generated trusted internal file
                $attachmentName = $payload['attachmentName'] ?? basename($payload['attachmentPath']);
                $mail->addAttachment($payload['attachmentPath'], $attachmentName);
            }

            // Check if SMTP is configured for live internet dispatch
            if (!empty($smtpHost) && !empty($smtpUser) && !$isMock) {
                // Send via PHPMailer SMTP
                $mail->send();
                self::logOutbox($payload, $mail, 'SENT');

                return [
                    'success' => true,
                    'status' => 'SENT',
                    'message' => "Email sent successfully via PHPMailer SMTP ({$smtpHost})",
                    'messageId' => $mail->MessageID ?: ('msg-' . uniqid()),
                    'recipient' => $toEmail,
                    'subject' => $subject,
                    'eventType' => $eventType,
                    'pdfAttached' => !empty($tempPdfPath) || !empty($payload['attachmentPath']),
                    'timestamp' => date('c'),
                ];
            } else {
                // Outbox logging mode when SMTP not yet configured in .env
                self::logOutbox($payload, $mail, 'SENT');

                return [
                    'success' => true,
                    'status' => 'SENT',
                    'message' => "Email rendered and saved to outbox (To send live emails to {$toEmail}, configure SMTP_HOST/SMTP_USER in .env)",
                    'messageId' => 'outbox-' . uniqid(),
                    'recipient' => $toEmail,
                    'subject' => $subject,
                    'eventType' => $eventType,
                    'pdfAttached' => !empty($tempPdfPath) || !empty($payload['attachmentPath']),
                    'timestamp' => date('c'),
                ];
            }
        } catch (\Throwable $e) {
            $mailError = !empty($mail->ErrorInfo) ? $mail->ErrorInfo : $e->getMessage();
            $errorMsg = 'PHPMailer error: ' . $mailError;
            self::logOutbox($payload, $mail, 'FAILED', $errorMsg);

            return [
                'success' => false,
                'status' => 'FAILED',
                'error' => $errorMsg,
                'recipient' => $toEmail,
                'subject' => $subject,
                'eventType' => $eventType,
            ];
        } finally {
            // Clean up temporary generated PDF file if created
            if ($tempPdfPath && file_exists($tempPdfPath)) {
                @unlink($tempPdfPath);
            }
        }
    }

    /**
     * Render Template for Event Type
     */
    private static function renderTemplate(string $eventType, array $data): array {
        $templateFile = __DIR__ . '/templates/' . strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $eventType)) . '.php';
        
        if (!file_exists($templateFile)) {
            // Fallback generic template
            $templateFile = __DIR__ . '/templates/generic.php';
        }

        // Shared metadata variables
        $companyName = getenv('COMPANY_NAME') ?: 'SR Enterprises';
        $supportPhone = getenv('SUPPORT_PHONE') ?: '+91 98200 11223';
        $supportEmail = getenv('SUPPORT_EMAIL') ?: 'support@srenterprises.com';
        $upiId = getenv('UPI_ID') ?: 'srenterprises6711@aubank';

        // Extract variables for template rendering
        extract($data);
        
        // Capture HTML Output
        ob_start();
        $subject = null;
        $plainText = null;
        include $templateFile;
        $html = ob_get_clean();

        // Default subject & plain text if not explicitly set in template
        if (empty($subject)) {
            $subject = "Notification from {$companyName}";
        }
        if (empty($plainText)) {
            $plainText = strip_tags(str_replace(['<br>', '<br/>', '</p>', '</tr>'], "\n", $html));
            $plainText = trim(preg_replace("/[\r\n]+/", "\n", $plainText));
        }

        return [
            'subject' => $subject,
            'html' => $html,
            'text' => $plainText,
        ];
    }

    /**
     * Audit log outgoing messages in local desktop outbox directory
     */
    private static function logOutbox(array $payload, PHPMailer $mail, string $status, ?string $error = null): void {
        try {
            $outboxDir = __DIR__ . '/outbox';
            if (!is_dir($outboxDir)) {
                @mkdir($outboxDir, 0777, true);
            }

            $ref = preg_replace('/[^a-zA-Z0-9_-]/', '', $payload['referenceId'] ?? $payload['invoiceNumber'] ?? $payload['saleNumber'] ?? 'mail');
            $filename = $outboxDir . '/' . date('Ymd_His') . '_' . $status . '_' . $ref . '.json';

            @file_put_contents($filename, json_encode([
                'timestamp' => date('c'),
                'status' => $status,
                'eventType' => $payload['eventType'] ?? 'UNKNOWN',
                'recipient' => $mail->getToAddresses()[0][0] ?? ($payload['toEmail'] ?? ''),
                'recipientName' => $mail->getToAddresses()[0][1] ?? ($payload['toName'] ?? ''),
                'subject' => $mail->Subject,
                'mailer' => $mail->Mailer,
                'error' => $error,
            ], JSON_PRETTY_PRINT));
        } catch (\Throwable $t) {
            // Suppress non-critical outbox logging errors
        }
    }
}
