# SR ENTERPRISES CRM / SRM
## PAYMENT DOMAIN ARCHITECTURE & ACCOUNTS RECEIVABLES SPECIFICATION

---

### 1. Domain Overview & Accounts Receivable Layer
In SR Enterprises CRM / SRM, the financial architecture strictly connects sales orders, billing invoices, and collection payments:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ACCOUNTS RECEIVABLE LAYER                       │
│                                                                        │
│         Customer                          Sale                         │
│     (Commercial Entity)            (Order Agreement)                   │
│             │                              │                           │
│             └───────────────┬──────────────┘                           │
│                             ▼                                          │
│                          Invoice                                       │
│                 (INV-2026-XXXX Sequence)                               │
│                             │                                          │
│              ┌──────────────┴──────────────┐                           │
│              ▼                             ▼                           │
│           Payment 1                     Payment 2                      │
│     (₹20,000 / UPI / Rec)         (₹15,000 / Bank / Rec)               │
│              │                             │                           │
│              └──────────────┬──────────────┘                           │
│                             ▼                                          │
│                    Authoritative Ledger                                │
│              ┌─────────────────────────────┐                           │
│              │  Total Invoiced:  ₹50,000   │                           │
│              │  Total Paid:      ₹35,000   │                           │
│              │  Outstanding:     ₹15,000   │                           │
│              │  Status:  PARTIALLY_PAID    │                           │
│              └─────────────────────────────┘                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Payment Lifecycle & Reversal Accounting
A recorded payment is an immutable financial transaction. Payments are never deleted.

$$\text{RECORDED} \xrightarrow{\text{reverse}} \text{CANCELLED / REVERSED}$$

- **COMPLETED / RECORDED**: Valid completed payment. Included in financial sums and reduces invoice outstanding balance.
- **CANCELLED / REVERSED**: Preserved transaction record marked cancelled with reason, timestamp, and actor ID. Automatically excluded from paid sums, restoring invoice and customer outstanding balances.
- **REFUNDED**: Controlled refund record linked to the original transaction.

---

### 3. Payment Methods Enum
Controlled payment methods supported:
- `CASH`: In-person cash collection
- `UPI`: Instant UPI / QR payment with transaction reference
- `BANK_TRANSFER`: NEFT / RTGS / IMPS transfer with bank reference
- `CARD`: POS Credit / Debit card processing
- `CHEQUE`: Bank cheque with cheque number
- `OTHER`: Auxiliary payment methods

---

### 4. Overpayment Rejection & Row-Level Locking
To prevent race conditions and duplicate overpayments during concurrent submissions:
1. Invoice is selected with `SELECT ... FOR UPDATE` inside an ACID transaction (`withTransaction`).
2. Current completed payments are summed: $\text{CurrentPaid} = \sum \text{ValidPayments}$.
3. Current outstanding is computed: $\text{Outstanding} = \max(0, \text{InvoiceTotal} - \text{CurrentPaid})$.
4. Strict validation: If $\text{PaymentAmount} > \text{Outstanding}$, the transaction rolls back and throws `422 PAYMENT_EXCEEDS_OUTSTANDING`.

---

### 5. Invoice Status Transition Engine
Upon recording or reversing a payment:
- If $\text{RemainingOutstanding} \le 0.001$: Invoice status transitions to **`PAID`**.
- If $\text{RemainingOutstanding} > 0$ and $\text{ValidPaid} > 0$: Invoice status transitions to **`PARTIALLY_PAID`**.
- If $\text{ValidPaid} = 0$: If $\text{DueDate} < \text{Now}$, status is **`OVERDUE`**; otherwise **`ISSUED`**.
- Fully paying an invoice auto-completes any linked pending payment reminders in the CRM.

---

### 6. Customer Financial Summary Formulas
- $\text{Total Billed} = \sum \text{Invoices.totalAmount} \text{ (where status } \notin \{\text{CANCELLED, DRAFT}\})$
- $\text{Total Paid} = \sum \text{Payments.amount} \text{ (where status } = \text{COMPLETED})$
- $\text{Total Outstanding} = \max(0, \text{Total Billed} - \text{Total Paid})$
- $\text{Overdue Amount} = \sum \text{Invoices.totalAmount} \text{ (where status } = \text{OVERDUE})$

---

### 7. API Endpoints Matrix

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/payments/kpis` | `payments.view` | Global KPIs (Total Collected, Today's Collected, Receivables, Overdue count) |
| `GET` | `/api/v1/payments` | `payments.view` | Paginated payments with search, method, customer, invoice, and date filters |
| `GET` | `/api/v1/payments/:id` | `payments.view` | Single payment detail with invoice, customer, and collector information |
| `POST` | `/api/v1/payments` | `payments.create` | Record new payment with concurrency locking and overpayment rejection |
| `POST` | `/api/v1/payments/:id/cancel` | `payments.create` / `reverse` | Cancel payment and recalculate invoice balance atomically |
| `POST` | `/api/v1/payments/:id/reverse` | `payments.create` / `reverse` | Reverse payment (alias for cancel) |
| `POST` | `/api/v1/payments/:id/refund` | `payments.create` | Record payment refund |
| `GET` | `/api/v1/payments/invoice/:invoiceId` | `payments.view` | List payments for a specific invoice |
| `GET` | `/api/v1/payments/invoice/:invoiceId/balance` | `payments.view` | Authoritative invoice balance and receivables breakdown |
| `GET` | `/api/v1/payments/customer/:customerId/summary` | `payments.view` | Authoritative customer financial summary |
| `GET` | `/api/v1/payments/customer/:customerId` | `payments.view` | Paginated payments for a specific customer |
| `GET` | `/api/v1/invoices/:id/payments` | `invoices.view` | List all payments for an invoice |
| `GET` | `/api/v1/invoices/:id/balance` | `invoices.view` | Authoritative balance breakdown for an invoice |
| `GET` | `/api/v1/customers/:id/payments` | `customers.view` | Customer payment history |
