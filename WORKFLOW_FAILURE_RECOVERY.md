# SRM Workflow Failure Recovery & Reliability Guide

## 1. Overview

Because SR Enterprises CRM/SRM runs primarily in local desktop and on-premise environments, the workflow engine implements robust local crash recovery, outbox retry loops, stuck execution sweepers, and missed-schedule catch-up mechanisms.

---

## 2. Failure Classifications

| Error Category | Retry Behavior | Action Taken |
|---|---|---|
| **`TRANSIENT_ERROR`** | Automatic Retry (Exponential backoff) | Attempts 1, 2, 3 before Dead-Letter routing |
| **`INTEGRATION_ERROR`** | Automatic Retry | Enqueued for retry; core transaction is preserved |
| **`VALIDATION_ERROR`** | No Retry | Immediately marked `FAILED` without infinite loop |
| **`AUTHORIZATION_ERROR`** | No Retry | Immediately marked `FAILED` with audit trail |
| **`CONFLICT`** | No Retry | Rejected with HTTP 409 |

---

## 3. Crash & Restart Recovery

### A. Pending Outbox Recovery
When the application starts up:
1. `WorkflowEngine.processOutbox()` queries any `outbox_events` that were left in `PENDING` or `PROCESSING` state during an abrupt shutdown.
2. Events are picked up in chronological `createdAt ASC` order and dispatched to matching active workflows.

### B. Action Idempotency Guard
If a worker crashed halfway through executing a multi-action workflow:
1. The engine checks `workflow_action_executions` for existing `idempotencyKey` entries.
2. Any action with status `COMPLETED` is safely skipped (`status: SKIPPED`).
3. Only pending or previously failed actions are re-executed, preventing duplicate invoices, stock deductions, or reminders.

### C. Stale Execution Sweeper
`WorkflowEngine.recoverStuckExecutions(stuckMinutes = 15)` periodically marks any execution in `RUNNING` state beyond 15 minutes as `FAILED` with error `Execution timed out`.

### D. Offline Missed Scheduler Catch-up
If the desktop application was shut down for several days:
1. Upon restart, `WorkflowScheduler.runAllScheduledAutomations()` scans for all past-due invoices, expiring warranties, and low stock products.
2. Distinct date/entity idempotency keys guarantee that multiple missed days do not spawn hundreds of duplicate reminders.
