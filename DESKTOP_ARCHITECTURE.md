# SR ENTERPRISES CRM / SRM
# DESKTOP APPLICATION ARCHITECTURE SPECIFICATION

**Application**: SR Enterprises CRM Desktop  
**Target Environment**: Windows 10/11 (x64) Local Desktop & Workstation  
**Runtime**: Electron (Hardened Context Isolation, Sandbox, Secure IPC)

---

## 1. HIGH-LEVEL ARCHITECTURE TOPOLOGY

```
                    ┌────────────────────────────────────────┐
                    │       SR ENTERPRISES CRM DESKTOP       │
                    │        (Native OS Window Shell)        │
                    └───────────────────┬────────────────────┘
                                        │
                         Secure Context Bridge IPC
                      (Allowlisted Preload Methods Only)
                                        │
                    ┌───────────────────▼────────────────────┐
                    │      ELECTRON MAIN PROCESS RUNTIME     │
                    │                                        │
                    │  • Window Lifecycle & Geometry State   │
                    │  • Single Instance Lock                │
                    │  • Process Supervision & Tree-Kill     │
                    │  • %APPDATA% Storage Management        │
                    │  • External URL Security Filter        │
                    └───────────────────┬────────────────────┘
                                        │
                ┌───────────────────────┴───────────────────────┐
                │                                               │
    ┌───────────▼───────────┐                       ┌───────────▼───────────┐
    │  RENDERER UI PROCESS  │                       │ LOCAL FASTIFY BACKEND │
    │  (React 18 + Vite 6)  │  HTTP-Only Session    │  (Node.js 22 + API)   │
    │                       │ ────────────────────► │                       │
    │  • Global Sidebar     │  (localhost:4000)     │  • Zod Validation     │
    │  • Dashboard KPIs     │                       │  • RBAC Authorization │
    │  • Modules & Profiles │                       │  • SVG CAPTCHA Engine │
    └───────────────────────┘                       └───────────┬───────────┘
                                                                │
                                                    ┌───────────▼───────────┐
                                                    │    DATABASE LAYER     │
                                                    │  (PostgreSQL/Drizzle) │
                                                    │  + %APPDATA% Storage  │
                                                    └───────────────────────┘
```

---

## 2. SECURITY CONTROLS & IPC BOUNDARIES

1. **Strict Context Isolation**:
   - `contextIsolation: true`
   - `nodeIntegration: false`
   - `sandbox: true`
   - Zero raw Node.js primitives (`fs`, `child_process`, `net`, `process`) exposed to the renderer window.

2. **Allowlisted IPC Preload Bridge**:
   - Only 4 controlled methods exposed on `window.desktopApi`:
     - `getAppVersion()`
     - `getPlatform()`
     - `getAppStatus()`
     - `openExternalUrl(url)` (Validates strictly against `http://` and `https://` protocols).

3. **External Navigation Sandbox**:
   - `webContents.setWindowOpenHandler` denies all arbitrary child windows and redirects safe web links to the system's default OS browser.
   - `will-navigate` event prevents URL redirection outside of `http://127.0.0.1:4000/`.

---

## 3. USER DATA ISOLATION & STORAGE SPECIFICATION

In compliance with Windows desktop application standards, all mutable business and user data is segregated from the installation folder:

| Path Type | Windows Target Location | Purpose |
| :--- | :--- | :--- |
| **Base App Data** | `%APPDATA%\SR-Enterprises-CRM` | Root user data directory |
| **Database** | `%APPDATA%\SR-Enterprises-CRM\database` | Local database files and connection configs |
| **Backups** | `%APPDATA%\SR-Enterprises-CRM\backups` | Scheduled automated database and asset backups |
| **Logs** | `%APPDATA%\SR-Enterprises-CRM\logs` | Diagnostic application and backend logs |
| **Attachments** | `%APPDATA%\SR-Enterprises-CRM\attachments` | Customer invoices, job card images, machine photos |
| **Configuration** | `%APPDATA%\SR-Enterprises-CRM\configuration` | User window geometry (`window-state.json`) |

> **Data Persistence Guarantee**: Uninstalling or updating the application executable does NOT delete `%APPDATA%\SR-Enterprises-CRM`.

---

## 4. PROCESS LIFECYCLE & SUPERVISION

1. **Launch Sequence**:
   - Request single instance lock (`app.requestSingleInstanceLock()`).
   - Initialize and ensure `%APPDATA%` directory hierarchy exists with `0700` permissions.
   - Spawn Fastify API child process (`node apps/api/dist/server.js`).
   - Poll backend `/health` endpoint until HTTP 200 is confirmed (with 20s timeout and exponential backoff).
   - Restore saved window position/geometry and render authenticated CRM shell.

2. **Shutdown Sequence**:
   - Trap `window-all-closed` and `before-quit` events.
   - Execute `tree-kill` on backend process PID with `SIGTERM` (fallback to `SIGKILL` after grace period).
   - Flush pending configuration writes and exit cleanly with code 0.
