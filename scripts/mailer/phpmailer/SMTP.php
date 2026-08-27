<?php
namespace PHPMailer\PHPMailer;

/**
 * PHPMailer RFC 821/2821/5321 SMTP Client Class
 */
class SMTP
{
    const VERSION = '6.9.1';
    const DEFAULT_PORT = 25;
    const DEFAULT_SECURE_PORT = 465;
    const MAX_LINE_LENGTH = 998;
    const MAX_REPLY_LENGTH = 512;
    const DEBUG_OFF = 0;
    const DEBUG_CLIENT = 1;
    const DEBUG_SERVER = 2;
    const DEBUG_CONNECTION = 3;
    const DEBUG_LOWLEVEL = 4;

    public $do_debug = self::DEBUG_OFF;
    public $Debugoutput = 'echo';
    public $do_verp = false;
    public $Timeout = 300;
    public $Timelimit = 300;
    protected $smtp_conn;
    protected $error = [
        'error' => '',
        'detail' => '',
        'smtp_code' => '',
        'smtp_code_ex' => ''
    ];
    protected $helo_rply;
    protected $server_caps;
    protected $last_reply = '';

    public function connect($host, $port = null, $timeout = 30, $options = []): bool
    {
        $this->setError('');
        if ($this->connected()) {
            $this->setError('Already connected to a server');
            return false;
        }
        if (empty($port)) {
            $port = self::DEFAULT_PORT;
        }
        $errno = 0;
        $errstr = '';
        $socket_context = stream_context_create($options);
        set_error_handler([$this, 'errorHandler']);
        $this->smtp_conn = stream_socket_client(
            $host . ':' . $port,
            $errno,
            $errstr,
            $timeout,
            STREAM_CLIENT_CONNECT,
            $socket_context
        );
        restore_error_handler();

        if (!is_resource($this->smtp_conn)) {
            $this->setError('Failed to connect to server', '', (string)$errno, $errstr);
            return false;
        }
        stream_set_timeout($this->smtp_conn, $timeout, 0);
        $announce = $this->get_lines();
        return $this->parseHelloFields($announce);
    }

    public function startTLS(): bool
    {
        if (!$this->sendCommand('STARTTLS', 'STARTTLS', 220)) {
            return false;
        }
        $crypto_method = STREAM_CRYPTO_METHOD_TLS_CLIENT;
        if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
            $crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
            $crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT;
        }
        set_error_handler([$this, 'errorHandler']);
        $crypto_ok = stream_socket_enable_crypto($this->smtp_conn, true, $crypto_method);
        restore_error_handler();
        return (bool)$crypto_ok;
    }

    public function authenticate($user, $pass, $authtype = null, $oauth = null): bool
    {
        if (!$this->server_caps) {
            $this->setError('No HELO/EHLO was sent');
            return false;
        }
        if (empty($authtype)) {
            if (isset($this->server_caps['AUTH'])) {
                if (in_array('LOGIN', $this->server_caps['AUTH'], true)) {
                    $authtype = 'LOGIN';
                } elseif (in_array('PLAIN', $this->server_caps['AUTH'], true)) {
                    $authtype = 'PLAIN';
                }
            }
        }
        switch ($authtype) {
            case 'PLAIN':
                if (!$this->sendCommand('AUTH', 'AUTH PLAIN', 334)) {
                    return false;
                }
                if (!$this->sendCommand('User & Password', base64_encode("\0" . $user . "\0" . $pass), 235)) {
                    return false;
                }
                break;
            case 'LOGIN':
            default:
                if (!$this->sendCommand('AUTH', 'AUTH LOGIN', 334)) {
                    return false;
                }
                if (!$this->sendCommand('Username', base64_encode($user), 334)) {
                    return false;
                }
                if (!$this->sendCommand('Password', base64_encode($pass), 235)) {
                    return false;
                }
                break;
        }
        return true;
    }

    public function connected(): bool
    {
        if (is_resource($this->smtp_conn)) {
            $sock_status = stream_get_meta_data($this->smtp_conn);
            if ($sock_status['eof']) {
                $this->close();
                return false;
            }
            return true;
        }
        return false;
    }

    public function close(): void
    {
        $this->setError('');
        $this->server_caps = null;
        $this->helo_rply = null;
        if (is_resource($this->smtp_conn)) {
            fclose($this->smtp_conn);
            $this->smtp_conn = null;
        }
    }

    public function data($msg_data): bool
    {
        if (!$this->sendCommand('DATA', 'DATA', 354)) {
            return false;
        }
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $msg_data));
        $field = substr($lines[0], 0, strpos($lines[0], ':'));
        $in_headers = false;
        if (!empty($field) && strpos($field, ' ') === false) {
            $in_headers = true;
        }
        $max_line_length = self::MAX_LINE_LENGTH;
        foreach ($lines as $line) {
            $lines_out = [];
            if ($in_headers && $line === '') {
                $in_headers = false;
            }
            while (isset($line[$max_line_length])) {
                $pos = strrpos(substr($line, 0, $max_line_length), ' ');
                if (!$pos) {
                    $pos = $max_line_length - 1;
                    $lines_out[] = substr($line, 0, $pos);
                    $line = substr($line, $pos);
                } else {
                    $lines_out[] = substr($line, 0, $pos);
                    $line = substr($line, $pos + 1);
                }
                if ($in_headers) {
                    $line = "\t" . $line;
                }
            }
            $lines_out[] = $line;
            foreach ($lines_out as $line_out) {
                if (!empty($line_out) && $line_out[0] === '.') {
                    $line_out = '.' . $line_out;
                }
                $this->client_send($line_out . "\r\n");
            }
        }
        $this->client_send(".\r\n");
        $rply = $this->get_lines();
        $code = (int)substr($rply, 0, 3);
        if ($code !== 250) {
            $this->setError('DATA not accepted from server', $rply, (string)$code);
            return false;
        }
        return true;
    }

    public function hello($host = ''): bool
    {
        if (empty($host)) {
            $host = 'localhost';
        }
        if (!$this->sendCommand('EHLO', 'EHLO ' . $host, 250)) {
            if (!$this->sendCommand('HELO', 'HELO ' . $host, 250)) {
                return false;
            }
        }
        return true;
    }

    public function mail($from): bool
    {
        $useVerp = ($this->do_verp ? ' XVERP' : '');
        return $this->sendCommand(
            'MAIL FROM',
            'MAIL FROM:<' . $from . '>' . $useVerp,
            250
        );
    }

    public function quit($close_on_error = true): bool
    {
        $noerror = $this->sendCommand('QUIT', 'QUIT', 221);
        $err = $this->error;
        if ($noerror || $close_on_error) {
            $this->close();
            $this->error = $err;
        }
        return $noerror;
    }

    public function recipient($address, $dsn = ''): bool
    {
        return $this->sendCommand(
            'RCPT TO',
            'RCPT TO:<' . $address . '>',
            [250, 251]
        );
    }

    public function reset(): bool
    {
        return $this->sendCommand('RSET', 'RSET', 250);
    }

    protected function sendCommand($commandName, $command, $expect): bool
    {
        if (!$this->connected()) {
            $this->setError("Called $commandName() without being connected");
            return false;
        }
        $this->client_send($command . "\r\n");
        $this->last_reply = $this->get_lines();
        $code = (int)substr($this->last_reply, 0, 3);
        if (!is_array($expect)) {
            $expect = [$expect];
        }
        if (!in_array($code, $expect, true)) {
            $this->setError("$commandName command failed", $this->last_reply, (string)$code);
            return false;
        }
        $this->setError('');
        return true;
    }

    public function getError(): array
    {
        return $this->error;
    }

    protected function setError($message, $detail = '', $smtp_code = '', $smtp_code_ex = ''): void
    {
        $this->error = [
            'error' => $message,
            'detail' => $detail,
            'smtp_code' => $smtp_code,
            'smtp_code_ex' => $smtp_code_ex,
        ];
    }

    protected function parseHelloFields($reply): bool
    {
        $this->server_caps = [];
        $lines = explode("\n", $reply);
        foreach ($lines as $n => $s) {
            $s = trim(substr($s, 4));
            if (empty($s)) continue;
            $fields = explode(' ', $s);
            if (!empty($fields)) {
                $name = strtoupper($fields[0]);
                if ($n === 0) {
                    $this->helo_rply = $s;
                } else {
                    $this->server_caps[$name] = array_slice($fields, 1);
                }
            }
        }
        return true;
    }

    protected function get_lines(): string
    {
        if (!is_resource($this->smtp_conn)) {
            return '';
        }
        $data = '';
        $endtime = 0;
        stream_set_timeout($this->smtp_conn, $this->Timeout);
        if ($this->Timelimit > 0) {
            $endtime = time() + $this->Timelimit;
        }
        while (is_resource($this->smtp_conn) && !feof($this->smtp_conn)) {
            $str = @fgets($this->smtp_conn, self::MAX_REPLY_LENGTH);
            $data .= $str;
            if (!isset($str[3]) || $str[3] === ' ' || $str[3] === "\r" || $str[3] === "\n") {
                break;
            }
            $info = stream_get_meta_data($this->smtp_conn);
            if ($info['timed_out']) {
                break;
            }
            if ($endtime && time() > $endtime) {
                break;
            }
        }
        return $data;
    }

    protected function client_send($data): int
    {
        set_error_handler([$this, 'errorHandler']);
        $result = fwrite($this->smtp_conn, $data);
        restore_error_handler();
        return (int)$result;
    }

    protected function errorHandler($errno, $errmsg, $errfile = '', $errline = 0): void
    {
        $notice = 'Connection: Failed to connect. ';
        $this->setError($notice . "Error #$errno: $errmsg [$errfile line $errline]");
    }
}
