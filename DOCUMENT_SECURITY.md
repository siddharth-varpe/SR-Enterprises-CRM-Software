# Document Security & Threat Defense Policy
**SR Enterprises CRM / SRM**
*Phase 31 — Document + File Management Infrastructure*

---

## 1. Security Defenses

### 1.1 Path Traversal Defenses
- Rejects paths and filenames with `..`, null bytes (`\0`), drive letters, or absolute path sequences.
- `resolveAbsolutePath(relativePath)` verifies boundary containment using path normalization before accessing disk.

### 1.2 File Extension & MIME Allowlist
- **Allowed Extensions**: `pdf`, `jpg`, `jpeg`, `png`, `webp`, `docx`, `xlsx`, `csv`, `txt`.
- **Default Blocked Extensions**: `exe`, `bat`, `cmd`, `com`, `scr`, `ps1`, `vbs`, `js`, `ts`, `sh`, `jar`, `msi`, `dll`, `pif`, `zip`, `rar`, `7z`.
- **Magic Bytes Validation**: Binary headers are checked for PDF (`%PDF-`), JPEG (`\xFF\xD8\xFF`), PNG (`\x89PNG`), WEBP (`RIFF...WEBP`), and Office ZIP (`PK\x03\x04`).

### 1.3 Authorization & Field-Level Access
- Every upload, download, preview, attach, and delete request verifies user authentication and active RBAC permissions (`documents.view`, `documents.upload`, `documents.delete`, `documents.manage`).
- Financial document access (e.g. invoice PDFs, payment receipts) respects caller permissions.

### 1.4 Safe Content Disposition
- Downloads are served with explicit `Content-Type` headers and `Content-Disposition: attachment; filename="<sanitized>"`.
- Previews are served with `Content-Disposition: inline` for supported browser types (PDF, PNG, JPEG, WEBP).
