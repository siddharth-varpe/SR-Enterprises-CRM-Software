# SRM Business Automation Rules Specification

## 1. Overview

Business automation rules allow SR Enterprises administrators to declare how domain events trigger side effects across sales, invoicing, payments, field services, warranty lifecycles, and inventory monitoring.

---

## 2. Condition Operators

The Condition Evaluator enforces deterministic evaluation without dynamic code execution:

| Operator | Syntax / Example | Meaning |
|---|---|---|
| `equals` | `{ "field": "payload.status", "operator": "equals", "value": "COMPLETED" }` | Exact value equality |
| `not_equals` | `{ "field": "payload.totalAmount", "operator": "not_equals", "value": 0 }` | Inequality |
| `greater_than` | `{ "field": "payload.totalAmount", "operator": "greater_than", "value": 10000 }` | Numerical strictly greater |
| `less_than` | `{ "field": "payload.currentStock", "operator": "less_than", "value": 5 }` | Numerical strictly less |
| `greater_than_or_equal` | `{ "field": "payload.amount", "operator": "greater_than_or_equal", "value": 500 }` | Greater than or equal |
| `less_than_or_equal` | `{ "field": "payload.daysRemaining", "operator": "less_than_or_equal", "value": 7 }` | Less than or equal |
| `contains` | `{ "field": "payload.productName", "operator": "contains", "value": "RO" }` | Substring / array contains |
| `in` | `{ "field": "payload.tier", "operator": "in", "value": ["GOLD", "VIP"] }` | Value in array list |
| `not_in` | `{ "field": "payload.status", "operator": "not_in", "value": ["DRAFT", "VOID"] }` | Value not in array list |
| `exists` | `{ "field": "payload.technicianId", "operator": "exists" }` | Field is present and non-null |
| `not_exists` | `{ "field": "payload.invoiceId", "operator": "not_exists" }` | Field is missing or null |

---

## 3. Registered Workflow Actions

1. **`CREATE_NOTIFICATION`**: Dispatches in-app and role-based notifications.
2. **`CREATE_REMINDER`**: Schedules customer follow-up reminders.
3. **`CREATE_JOB_CARD`**: Auto-creates field service work orders.
4. **`GENERATE_INVOICE`**: Converts confirmed sales into official customer invoices.
5. **`UPDATE_STATUS`**: Transitions domain entity statuses with `StateMachine` validation.
6. **`UPDATE_WARRANTY`**: Registers or extends warranty coverage for machines and parts.
7. **`ASSIGN_TECHNICIAN`**: Assigns field technicians to work orders.
8. **`UPDATE_INVENTORY`**: Idempotently adjusts stock levels.
9. **`SEND_WHATSAPP`**: Enqueues customer WhatsApp messages via approved templates.

---

## 4. Built-in Default Automations

1. **Sale Confirmation Automation (`SaleConfirmed`)**:
   - Condition: `payload.totalAmount > 0`
   - Actions: `GENERATE_INVOICE` $\to$ `UPDATE_INVENTORY (DEDUCT)` $\to$ `CREATE_NOTIFICATION`
2. **Service Assignment Automation (`ServiceRequestAssigned`)**:
   - Condition: `payload.technicianId exists`
   - Actions: `CREATE_JOB_CARD` $\to$ `CREATE_NOTIFICATION (HIGH)`
3. **Payment Receipt Automation (`PaymentReceived`)**:
   - Condition: `payload.amount > 0`
   - Actions: `CREATE_NOTIFICATION (NORMAL)`
