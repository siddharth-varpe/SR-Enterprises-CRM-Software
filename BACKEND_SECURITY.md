# SR ENTERPRISES CRM / SRM
# BACKEND SECURITY ARCHITECTURE & POLICIES (PHASE 14)

---

## 1. AUTHENTICATION BOUNDARY & SESSION MANAGEMENT

- **Credential Security**: Passwords hashed using `Argon2id` (memory cost 65536, time cost 3, parallelism 4).
- **Session Tokens**: Crytographically secure random tokens stored in Redis (with resilient local fallback).
- **Cookie Security**:
  - `HttpOnly: true` (Inaccessible to client scripts, mitigating XSS session theft).
  - `SameSite: 'lax'` (Mitigating Cross-Site Request Forgery).
  - `Secure: true` in production environments.
- **Brute Force Protection**:
  - 3 failed login attempts trigger a 15-minute account lockout.
  - Rate limiting enforced on all authentication routes.

---

## 2. AUTHORIZATION & RBAC ENFORCEMENT

- **Authoritative Server Enforcement**:
  - `requirePermission(permission)` checks required granular permission.
  - `requireRole(roles)` enforces minimum user role hierarchy.
  - Super Admin automatically passes all permission gates.
- **IDOR Protection**:
  - All resource queries validate tenancy and authorization on the backend.
  - Client cannot escalate privileges or access unauthorized resources by altering request IDs.

---

## 3. SECURITY HEADERS & INPUT SANITIZATION

- **Helmet Protection**:
  - Frameguard (`X-Frame-Options: DENY`).
  - NoSniff (`X-Content-Type-Options: nosniff`).
  - Strict Referrer Policy (`strict-origin-when-cross-origin`).
  - Cross-Origin Resource Policy (`same-site`).
- **Input Validation**:
  - 100% of API endpoints enforce strict Zod schemas on `body`, `params`, and `query`.
  - Malformed inputs are rejected with `400 / 422` before reaching domain services.
- **Anti-Bot Defenses**:
  - Single-use SVG CAPTCHA challenges with 5-minute TTL.
  - Honeypot hidden form fields on public inquiry endpoints.

---

## 4. ERROR SANITIZATION & LOGGING SECURITY

- **Zero Information Leakage**: Normal users never receive stack traces, SQL syntax, or filesystem paths.
- **Redaction**:
  - Structured Pino logger automatically redacts passwords, tokens, cookies, and secret keys.
  - Unique `x-request-id` enables developers to trace issues without exposing sensitive data.
