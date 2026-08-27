# SR ENTERPRISES CRM / SRM
# DESKTOP SETUP, PACKAGING & DEPLOYMENT GUIDE

---

## 1. PREREQUISITES & ENVIRONMENT

- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **Node.js**: v20.x or v22.x LTS
- **Package Manager**: `pnpm` v9.x or v10.x

---

## 2. DEVELOPMENT WORKFLOW

To run the full stack in desktop development mode with live reload:

```bash
# 1. Install all monorepo workspace dependencies
pnpm install

# 2. Start the development API daemon
pnpm --filter @crm/api dev

# 3. Start the development Web frontend
pnpm --filter @crm/web dev

# 4. Launch the Electron desktop shell in development mode
pnpm --filter @crm/desktop dev
```

---

## 3. PRODUCTION PACKAGING & INSTALLER CREATION

To build production assets and generate the Windows NSIS installer:

```bash
# 1. Compile all workspace TypeScript packages & build web assets
pnpm build

# 2. Package the Windows Desktop Installer (NSIS x64)
pnpm --filter @crm/desktop dist:win
```

The compiled installer will be output to:
`d:\Desktop\CRM-SR-Enterprices\dist-release\SR Enterprises CRM Setup 1.0.0.exe`

---

## 4. WINDOWS INSTALLATION EXPERIENCE

1. **Installer Launch**: Double-click `SR Enterprises CRM Setup 1.0.0.exe`.
2. **Directory Selection**: Installs to `C:\Program Files\SR Enterprises CRM` (or custom folder).
3. **Shortcuts**: Creates shortcuts on:
   - **Desktop**: `SR Enterprises CRM`
   - **Start Menu**: `SR Enterprises > SR Enterprises CRM`
4. **First Run**: Automatically supervises local backend initialization and launches login screen.

---

## 5. PERSISTENT STORAGE & BACKUPS

All customer records, database backups, logs, and configurations reside safely in:
`%APPDATA%\SR-Enterprises-CRM`

### Backup Procedure
To manually back up all CRM data:
1. Copy the folder `%APPDATA%\SR-Enterprises-CRM` to a secure external drive or cloud storage.
2. In the event of a computer migration, copy the folder back to `%APPDATA%\SR-Enterprises-CRM` on the new machine before launching the CRM.

---

## 6. CODE SIGNING PREPARATION

For commercial production deployment outside of testing:
- Configure Windows Authenticode Code Signing certificate via environment variables:
  - `CSC_LINK`: Path to `.pfx` code signing certificate.
  - `CSC_KEY_PASSWORD`: Password for the `.pfx` certificate.
- `electron-builder` will automatically sign the executable and NSIS uninstaller during `dist:win`.
