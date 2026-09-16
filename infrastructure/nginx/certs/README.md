# SSL/TLS Certificates Directory

Place your SSL/TLS Certificate and Private Key here for production deployment:

1. `cert.crt` — SSL/TLS Certificate / Full Chain (PEM format)
2. `cert.key` — Private Key (PEM format)

### Permissions:
Secure the private key on the server:
```bash
chmod 600 cert.key
```
