# SRM Advanced Workflow Engine Architecture

## 1. Overview

Phase 28 delivers the centralized, event-driven, transaction-safe workflow engine for the SR Enterprises CRM/SRM application. It binds previously independent business modules (Sales, Invoices, Payments, Warranties, Customer Assets, Services, Job Cards, Inventory, Reminders, and Notifications) into a unified business automation pipeline.

---

## 2. Core Architectural Flow

```
[DOMAIN OPERATION] (e.g. Sale Confirmed / Payment Received / Service Scheduled)
        │
        ├── Transactional Outbox (PostgreSQL ACID Commit + outbox_events)
        │
        ▼
[WORKFLOW ENGINE / OUTBOX PROCESSOR]
        │
        ├── 1. Resolve Matching Workflows (Active, filtered by eventType, ordered by priority)
        │
        ├── 2. Evaluate Deterministic Conditions (Zero eval / zero raw code execution)
        │
        ├── 3. Execute Registered Safe Actions (Idempotency Key Check in workflow_action_executions)
        │     ├── CREATE_NOTIFICATION
        │     ├── CREATE_REMINDER
        │     ├── CREATE_JOB_CARD
        │     ├── GENERATE_INVOICE
        │     ├── UPDATE_STATUS (Validated via StateMachine)
        │     ├── UPDATE_WARRANTY
        │     ├── ASSIGN_TECHNICIAN
        │     ├── UPDATE_INVENTORY
        │     └── SEND_WHATSAPP
        │
        ▼
[EXECUTION AUDIT & OBSERVABILITY] (Recorded in workflow_executions & audit_logs)
```

---

## 3. Key Design Principles

1. **Transactional Outbox Pattern**: High-value business transactions (such as sale creation or payment capture) commit atomically with an outbox event. The asynchronous/synchronous Outbox Processor picks up pending events, ensuring zero lost events even if workers crash.
2. **Zero Code Execution**: Rule conditions and actions are strictly typed and deterministic. No `eval()`, dynamic JavaScript, PHP, or user-supplied SQL is permitted.
3. **Deterministic Idempotency**: Each side-effect action produces an idempotency key (`eventId:workflowId:actionType:index`). If an event is replayed or retried, completed actions are safely skipped.
4. **Finite Retries & Dead-Letter Routing**: Transient failures retry up to 3 times before routing to `DEAD_LETTER` status for administrative inspection.
5. **State Machine Transitions**: Centralized state transition validator guarantees illegal status jumps (e.g. `COMPLETED -> DRAFT` or `CANCELLED -> IN_PROGRESS`) are rejected.
