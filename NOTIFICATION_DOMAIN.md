# Notification, Events & Automated Follow-Up Engine Domain Specification
## SR Enterprises CRM / SRM — Phase 23

---

## 1. Domain Event Architecture

The CRM leverages an event-driven domain architecture to separate core business transactions (sales, service completion, payments) from auxiliary notifications and reminders:

$$\text{Business Transaction} \rightarrow \text{Database Commit} \rightarrow \text{Domain Event Bus} \rightarrow \text{Rule Evaluation} \rightarrow \text{Multi-Channel Delivery}$$

### Core Domain Events:
- `WARRANTY_CREATED`: Emitted when new machine warranty is registered.
- `WARRANTY_EXPIRING`: Emitted upon warranty approaching expiration milestone.
- `SERVICE_SCHEDULED`: Emitted when periodic/complaint service appointment is booked.
- `SERVICE_COMPLETED`: Emitted when field service visit is completed.
- `JOB_CARD_ASSIGNED`: Emitted when technician is assigned a job card.
- `JOB_CARD_COMPLETED`: Emitted when technician completes work on-site.
- `INVOICE_GENERATED`: Emitted when sales/service invoice is created (`INV-2026-XXXX`).
- `PAYMENT_RECEIVED`: Emitted when customer payment is verified (`PAY-2026-XXXX`).
- `PAYMENT_OVERDUE`: Emitted when unpaid balance passes due date.
- `NEW_INQUIRY`: Emitted when new lead/inquiry enters the CRM.

---

## 2. Milestone Idempotency & Deduplication

To prevent reminder storms and multiple notifications for the same milestone:
- **Event Keys (`eventKey`)**: Every scheduled reminder and notification attaches a deterministic milestone key.
- **Milestone Formats**:
  - `WARRANTY_EXP_<warrantyId>_<milestone>` (e.g. `WARRANTY_EXP_uuid_30D`, `WARRANTY_EXP_uuid_7D`, `WARRANTY_EXP_uuid_1D`)
  - `INV_OVERDUE_<invoiceId>_<milestone>` (e.g. `INV_OVERDUE_uuid_OVERDUE_7D`)
  - `payment_<paymentId>`
  - `job_assigned_<jobCardId>_<technicianId>`
- **Database & Memory Guard**: The automated scanner checks existing keys before generating any new reminder or notification record.

---

## 3. Automated Follow-up Engine

### Warranty Expirations (`scanWarrantyExpirations`):
- Checks active warranties approaching expiration.
- Milestones:
  - $\le 30\text{ days}$: `30D` reminder (Normal Priority)
  - $\le 15\text{ days}$: `15D` reminder (Normal Priority)
  - $\le 7\text{ days}$: `7D` reminder (High Priority)
  - $\le 1\text{ day}$: `1D` reminder (High Priority, Urgent)

### Overdue Invoices (`scanOverdueInvoices`):
- Checks unpaid invoices (`ISSUED`, `PARTIALLY_PAID`) past their `dueDate`.
- Milestones:
  - $\ge 1\text{ day}$: `OVERDUE_1D`
  - $\ge 7\text{ days}$: `OVERDUE_7D`
  - $\ge 15\text{ days}$: `OVERDUE_15D`
- Generates high-priority actionable payment reminders.

---

## 4. Multi-Channel Abstraction

| Channel | Status Tracking | Notes |
| :--- | :--- | :--- |
| **In-App** | `DELIVERED`, `READ` | Primary system notifications with badge counts & read lifecycle. |
| **Email** | `SENT`, `FAILED` | Transactional receipt & invoice notifications via SMTP/Resend. |
| **WhatsApp** | `SENT`, `FAILED` | Pluggable interface for future WhatsApp Cloud API integration. |
| **SMS** | `SENT`, `FAILED` | Pluggable interface for transactional SMS gateways. |

> [!IMPORTANT]
> **No Fake Delivery**: Delivery status strictly tracks provider acceptance. Future channels return `FAILED (Not Configured)` until live API keys are present.

---

## 5. Template Engine & Security

- Parameter interpolation with automatic HTML escaping and script sanitization.
- Supported variables: `{{customerName}}`, `{{machineModel}}`, `{{serialNumber}}`, `{{expiryDate}}`, `{{invoiceNumber}}`, `{{amount}}`, `{{jobCardNumber}}`.

---

## 6. Failure Isolation

Notification dispatch is non-blocking. If an email/SMS provider is unreachable, the core business transaction (e.g. payment recording, service invoice creation) **never rolls back**.
