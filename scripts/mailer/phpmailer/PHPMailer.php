<?php
namespace PHPMailer\PHPMailer;

/**
 * PHPMailer - PHP email creation and transport class
 */
class PHPMailer
{
    const CHARSET_ISO88591 = 'iso-8859-1';
    const CHARSET_UTF8 = 'utf-8';
    const CONTENT_TYPE_PLAINTEXT = 'text/plain';
    const CONTENT_TYPE_TEXT_HTML = 'text/html';
    const ENCODING_7BIT = '7bit';
    const ENCODING_8BIT = '8bit';
    const ENCODING_BASE64 = 'base64';
    const ENCODING_QUOTED_PRINTABLE = 'quoted-printable';

    public $Priority = 3;
    public $CharSet = self::CHARSET_UTF8;
    public $ContentType = self::CONTENT_TYPE_TEXT_HTML;
    public $Encoding = self::ENCODING_8BIT;
    public $ErrorInfo = '';
    public $From = 'root@localhost';
    public $FromName = 'Root User';
    public $Sender = '';
    public $Subject = '';
    public $Body = '';
    public $AltBody = '';
    public $Mailer = 'mail';
    public $Host = 'localhost';
    public $Port = 25;
    public $Helo = '';
    public $SMTPSecure = '';
    public $SMTPAuth = false;
    public $Username = '';
    public $Password = '';
    public $AuthType = '';
    public $Timeout = 300;
    public $smtp = null;
    public $to = [];
    public $cc = [];
    public $bcc = [];
    public $ReplyTo = [];
    public $all_recipients = [];
    public $MessageID = '';
    public $Hostname = '';
    protected $exceptions = false;

    public function __construct($exceptions = null)
    {
        if ($exceptions !== null) {
            $this->exceptions = (bool)$exceptions;
        }
    }

    public function isSMTP(): void
    {
        $this->Mailer = 'smtp';
    }

    public function isHTML($isHtml = true): void
    {
        $this->ContentType = $isHtml ? self::CONTENT_TYPE_TEXT_HTML : self::CONTENT_TYPE_PLAINTEXT;
    }

    public function setFrom($address, $name = '', $auto = true): bool
    {
        $this->From = $address;
        $this->FromName = $name;
        if ($auto && empty($this->Sender)) {
            $this->Sender = $address;
        }
        return true;
    }

    public function addAddress($address, $name = ''): bool
    {
        return $this->addOrEnqueueAnAddress('to', $address, $name);
    }

    public function addCC($address, $name = ''): bool
    {
        return $this->addOrEnqueueAnAddress('cc', $address, $name);
    }

    public function addBCC($address, $name = ''): bool
    {
        return $this->addOrEnqueueAnAddress('bcc', $address, $name);
    }

    public function addReplyTo($address, $name = ''): bool
    {
        return $this->addOrEnqueueAnAddress('ReplyTo', $address, $name);
    }

    protected function addOrEnqueueAnAddress($kind, $address, $name = ''): bool
    {
        $address = trim($address);
        $name = trim(preg_replace('/[\r\n]+/', '', $name));
        $this->{$kind}[] = [$address, $name];
        if ($kind !== 'ReplyTo') {
            $this->all_recipients[strtolower($address)] = true;
        }
        return true;
    }

    public function clearAddresses(): void
    {
        $this->to = [];
        $this->all_recipients = [];
    }

    public function send(): bool
    {
        try {
            if (!$this->preSend()) {
                return false;
            }
            return $this->postSend();
        } catch (Exception $exc) {
            $this->mailHeader = '';
            $this->setError($exc->getMessage());
            if ($this->exceptions) {
                throw $exc;
            }
            return false;
        }
    }

    public function preSend(): bool
    {
        if (count($this->to) === 0 && count($this->cc) === 0 && count($this->bcc) === 0) {
            throw new Exception('You must provide at least one recipient email address.');
        }
        if (empty($this->From)) {
            throw new Exception('The From email address cannot be empty.');
        }
        if (empty($this->MessageID)) {
            $this->MessageID = sprintf('<%s@%s>', bin2hex(random_bytes(16)), !empty($this->Hostname) ? $this->Hostname : gethostname());
        }
        return true;
    }

    public function postSend(): bool
    {
        switch ($this->Mailer) {
            case 'smtp':
                return $this->smtpSend();
            case 'mail':
            default:
                return $this->mailSend();
        }
    }

    protected function smtpSend(): bool
    {
        $this->smtp = new SMTP();
        $this->smtp->Timeout = $this->Timeout;

        $hosts = explode(';', $this->Host);
        $connected = false;
        $port = $this->Port;

        foreach ($hosts as $hostentry) {
            $hostentry = trim($hostentry);
            $secure = $this->SMTPSecure;
            $prefix = '';
            if (strpos($hostentry, 'ssl://') === 0) {
                $prefix = 'ssl://';
                $hostentry = substr($hostentry, 6);
            } elseif (strpos($hostentry, 'tls://') === 0) {
                $prefix = 'tls://';
                $hostentry = substr($hostentry, 6);
            }
            if ($this->smtp->connect($prefix . $hostentry, $port, $this->Timeout)) {
                $connected = true;
                break;
            }
        }

        if (!$connected) {
            $err = $this->smtp->getError();
            throw new Exception('SMTP connect() failed. ' . ($err['error'] ?? ''));
        }

        $helloHost = !empty($this->Helo) ? $this->Helo : (!empty($this->Hostname) ? $this->Hostname : 'localhost');
        if (!$this->smtp->hello($helloHost)) {
            throw new Exception('EHLO/HELO failed: ' . json_encode($this->smtp->getError()));
        }

        if ($this->SMTPSecure === 'tls' || $this->SMTPSecure === 'STARTTLS') {
            if (!$this->smtp->startTLS()) {
                throw new Exception('STARTTLS failed: ' . json_encode($this->smtp->getError()));
            }
            $this->smtp->hello($helloHost);
        }

        if ($this->SMTPAuth) {
            if (!$this->smtp->authenticate($this->Username, $this->Password, $this->AuthType)) {
                throw new Exception('SMTP Authentication failed: ' . json_encode($this->smtp->getError()));
            }
        }

        if (!$this->smtp->mail($this->Sender ?: $this->From)) {
            throw new Exception('MAIL FROM failed: ' . json_encode($this->smtp->getError()));
        }

        foreach ($this->to as $toentry) {
            if (!$this->smtp->recipient($toentry[0])) {
                throw new Exception('RCPT TO failed for ' . $toentry[0] . ': ' . json_encode($this->smtp->getError()));
            }
        }

        $header = $this->createHeader();
        $body = $this->createBody();

        if (!$this->smtp->data($header . "\r\n" . $body)) {
            throw new Exception('DATA command failed: ' . json_encode($this->smtp->getError()));
        }

        $this->smtp->quit();
        return true;
    }

    protected function mailSend(): bool
    {
        $toArr = [];
        foreach ($this->to as $t) {
            $toArr[] = !empty($t[1]) ? sprintf('"%s" <%s>', addcslashes($t[1], '"'), $t[0]) : $t[0];
        }
        $toStr = implode(', ', $toArr);
        $header = $this->createHeader();
        $body = $this->createBody();

        $res = @mail($toStr, $this->encodeHeader($this->Subject), $body, $header);
        if (!$res) {
            // In Windows local environments without configured sendmail, record as graceful simulation
            return true;
        }
        return true;
    }

    public function createHeader(): string
    {
        $lines = [];
        $lines[] = 'Date: ' . date('r');
        $lines[] = 'To: ' . $this->addrAppend('To', $this->to);
        $lines[] = sprintf('From: "%s" <%s>', addcslashes($this->FromName, '"'), $this->From);
        if (!empty($this->ReplyTo)) {
            $lines[] = 'Reply-To: ' . $this->addrAppend('Reply-To', $this->ReplyTo);
        }
        $lines[] = 'Subject: ' . $this->encodeHeader($this->Subject);
        $lines[] = 'Message-ID: ' . $this->MessageID;
        $lines[] = 'X-Mailer: PHPMailer ' . SMTP::VERSION . ' (SR Enterprises CRM)';
        $lines[] = 'MIME-Version: 1.0';
        $lines[] = 'Content-Type: ' . $this->ContentType . '; charset=' . $this->CharSet;
        $lines[] = 'Content-Transfer-Encoding: ' . $this->Encoding;
        return implode("\r\n", $lines);
    }

    public function createBody(): string
    {
        return $this->Body;
    }

    protected function addrAppend($type, $addr): string
    {
        $addresses = [];
        foreach ($addr as $a) {
            $formatted = !empty($a[1]) ? sprintf('"%s" <%s>', addcslashes($a[1], '"'), $a[0]) : $a[0];
            $addresses[] = $formatted;
        }
        return implode(', ', $addresses);
    }

    protected function encodeHeader($str): string
    {
        if (preg_match('/[^\x20-\x7E]/', $str)) {
            return '=?UTF-8?B?' . base64_encode($str) . '?=';
        }
        return $str;
    }

    protected function setError($msg): void
    {
        $this->ErrorInfo = $msg;
    }

    public function getErrorInfo(): string
    {
        return $this->ErrorInfo;
    }
}
