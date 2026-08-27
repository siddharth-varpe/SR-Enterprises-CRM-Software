# SR ENTERPRISES CRM / SRM
# BACKEND ARCHITECTURE SPECIFICATION (PHASE 14)

**Application**: SR Enterprises CRM API & Service Layer  
**Engine**: Node.js 22 LTS, Fastify v5, Drizzle ORM, PostgreSQL 18, Redis 7 (In-Memory Fallback)  
**Target Environment**: Local Desktop Workstation & Distributed Enterprise Nodes  

---

## 1. END-TO-END DATAFLOW TOPOLOGY

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND / DESKTOP                     │
│               React 18 + Vite 6 + Desktop Shell             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                      HTTP / Secure Cookies
                      (x-request-id Header)
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    FASTIFY API FOUNDATION                   │
│                                                             │
│  1. Helmet (Security Headers & Strict CSP)                  │
│  2. CORS (Origin allowlist / desktop local binding)         │
│  3. Rate Limiter (Brute-force & abuse protection)           │
│  4. Fastify Cookie (Signed HttpOnly cookies)                │
│  5. Request ID Middleware (x-request-id correlation)        │
│  6. Centralized Error Handler (Sanitized serialization)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     ROUTER LAYER (/api/v1)                  │
│                                                             │
│  • Public Routes (/public, /auth/captcha, /system/ping)    │
│  • Webhooks (/webhooks/whatsapp)                            │
│  • Protected Routes (Requires authenticate & RBAC guards)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  CONTROLLER & SERVICE LAYER                 │
│                                                             │
│  • Zod Payload & Query Validation                           │
│  • Business Rules Execution & Sequence Generators           │
│  • Event Dispatching & Audit Logging                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   REPOSITORY & ORM LAYER                    │
│                                                             │
│  • Drizzle ORM Type-Safe Relational Queries                 │
│  • ACID Transaction Manager (withTransaction)               │
│  • Idempotent Sequence Numbering                            │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      PERSISTENCE TIER                       │
│                                                             │
│  • PostgreSQL 18 Relational Database                        │
│  • Redis / In-Memory Session & Cache Store                  │
│  • %APPDATA%\SR-Enterprises-CRM Persistent Storage          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. COMPONENT DIRECTORY SPECIFICATION

- **`apps/api/src/config/`**: Type-safe runtime environment parsing (`env.ts`).
- **`apps/api/src/database/`**: PostgreSQL client, migrations, health probes, transaction manager (`transactions.ts`), sequence numbers (`sequences.ts`).
- **`apps/api/src/middleware/`**:
  - `auth.ts`: Session validation hook against Redis / in-memory store.
  - `rbac.ts`: Fine-grained permission and role enforcement (`requirePermission`, `requireRole`).
  - `request-id.ts`: `x-request-id` header injection and tracking.
  - `error-handler.ts`: Centralized error serialization.
- **`apps/api/src/modules/`**: Modular domain encapsulation (Customers, Sales, Invoices, Services, Warranties, Job Cards, Technicians, Payments, Reminders, Inquiries, WhatsApp, Analytics, Notifications, System).
- **`apps/api/src/security/`**: SVG CAPTCHA generator, rate limit configurations, password hashing via Argon2id.

---

## 3. LIFECYCLE & GRACEFUL SHUTDOWN

1. Process listens on `HOST` (`127.0.0.1`) and `PORT` (`4000`).
2. Traps `SIGINT` and `SIGTERM` signals.
3. Closes Fastify server to stop accepting new connections.
4. Flushes active database connection pools (`closeDatabaseConnections()`).
5. Closes Redis connection (`closeRedisConnection()`).
6. Exits cleanly with code 0.
