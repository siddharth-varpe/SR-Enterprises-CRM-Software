# SR ENTERPRISES CRM / SRM
# SECURITY & AUTHENTICATION AUDIT REPORT (PHASE 15)

---

## 1. PASSWORD SECURITY & HASHING

- **Algorithm**: `Argon2id` (v19).
- **Parameters**: Memory: 64MB (65536 KiB), Iterations: 3, Parallelism: 4.
- **Timing Attack Mitigation**: Pre-computed dummy hash verification ensures non-existent usernames take the exact same compute time as valid usernames.
- **Zero Plaintext Storage**: Passwords are never saved, logged, or serialized in memory structures.

---

## 2. BRUTE-FORCE & BOT DEFENSES

- **Rate Limiting**: Configured via `@fastify/rate-limit` on `/api/v1/auth/login`.
- **Account Lockout**: 3 failed login attempts trigger an automatic 15-minute temporary lockout.
- **Single-Use Visual CAPTCHA**: Generated server-side with random noise curves and character distortion. Challenge tokens are single-use with a 120-second TTL.

---

## 3. SESSION & COOKIE SECURITY

- **Cookie Name**: `sr_crm_session`
- **Security Flags**: `HttpOnly: true`, `SameSite: 'lax'`, `Path: '/'`.
- **Session Revocation**: `POST /api/v1/auth/logout` deletes the active session from Redis. Replay attempts return `401 SESSION_EXPIRED`.
- **Route Guard Protection**: Direct URL navigation to protected pages by unauthenticated users is intercepted and redirected to `/login`.

---

## 4. AUDIT LOGGING & SECURITY EVENTS

Every authentication event is recorded with:
- Timestamp (UTC ISO8601)
- User ID and Username (when identifiable)
- Action (`LOGIN`, `LOGOUT`, `PASSWORD_CHANGE`, `LOCKOUT_TRIGGERED`)
- IP Address & User Agent
- Correlation Request ID (`x-request-id`)
