# SR ENTERPRISES CRM / SRM
# AUTHENTICATION ARCHITECTURE SPECIFICATION (PHASE 15)

---

## 1. END-TO-END AUTHENTICATION LIFECYCLE

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND / DESKTOP                     │
│               React 18 LoginForm.tsx Component              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                       1. GET /api/v1/auth/captcha
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    FASTIFY API: AUTH ROUTER                 │
│                                                             │
│  • Generates SVG visual challenge                           │
│  • Stores single-use challenge token in Redis (120s TTL)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                       2. POST /api/v1/auth/login
                       { username, password, challengeId, captchaAnswer }
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                 AUTHENTICATION VERIFICATION                 │
│                                                             │
│  1. Check Redis Lockout Status (3 failures -> 15 min lock)  │
│  2. Validate Single-Use CAPTCHA (atomic consumption)        │
│  3. Query User in PostgreSQL / Database                     │
│  4. Verify Account Status (Must not be DISABLED / LOCKED)   │
│  5. Verify Argon2id Password Hash                           │
│  6. Reset Lockout Counter & Issue Secure Session            │
│  7. Set HttpOnly SameSite Cookie (`sr_crm_session`)         │
│  8. Write Security Audit Log (`AUTH_LOGIN_SUCCESS`)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                       3. Return Profile & Permission Matrix
                       { user: { id, username, displayName, role }, permissions: [...] }
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   FRONTEND SESSION RECOVERY                 │
│                                                             │
│  • AuthProvider calls GET /api/v1/auth/me on app load       │
│  • Protected routes verified by <ProtectedRoute>            │
│  • Calling POST /api/v1/auth/logout revokes session in Redis│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. SESSION LIFECYCLE & STORAGE

- **Cookie Protocol**: `sr_crm_session` HttpOnly, SameSite=`lax`, Secure in production.
- **Server Session Store**: Redis key `crm:session:{sessionId}` storing user ID, username, role, IP, user-agent, creation time (24h TTL).
- **Session Revocation**:
  - Logout explicitly deletes the session key in Redis.
  - Subsequent requests with the old cookie receive `401 SESSION_EXPIRED`.
- **Brute Force Lockout**:
  - Tracked via Redis key `crm:lockout:{username}`.
  - 3 failed attempts trigger 15-minute temporary lockout.

---

## 3. CORE AUTHENTICATION ENDPOINTS

| Endpoint | Method | Security | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/captcha` | `GET` | Public | Generates single-use visual CAPTCHA challenge |
| `/api/v1/auth/login` | `POST` | Rate Limited | Authenticates credentials, validates CAPTCHA, issues session |
| `/api/v1/auth/logout` | `POST` | Session | Revokes active session and clears cookie |
| `/api/v1/auth/me` | `GET` | Session | Returns authenticated user profile and permissions |
| `/api/v1/auth/change-password` | `POST` | Session | Validates current password and updates hash via Argon2id |
