<?php
namespace PHPMailer\PHPMailer;

/**
 * PHPMailer Exception Class
 */
class Exception extends \Exception
{
    /**
     * Prettify error message output
     * @return string
     */
    public function errorMessage(): string
    {
        return '<strong>' . htmlspecialchars($this->getMessage(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "</strong><br />\n";
    }
}
