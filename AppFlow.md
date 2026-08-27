# SR ENTERPRISES CRM — USER JOURNEY / APP FLOW

Version: 1.0
Document Type: Product User Journey and Application Flow
Product: SR Enterprises CRM

---

## 1. PURPOSE

This document defines how users move through the SR Enterprises CRM, how
screens connect to each other, and how major business workflows move data
through the system.

This is a product-flow document, not a database schema.

Core principle:

> ENTER DATA ONCE → CONNECT IT TO THE RIGHT ENTITY → REUSE IT AUTOMATICALLY.

The CRM must behave as one connected system rather than a collection of
independent pages.

---

# 2. PRODUCT ENTRY

## 2.1 First Visit

User opens:

`https://crm.srenterprises.com`

Flow:

```text
CRM URL
   ↓
Application loads
   ↓
Connectivity check
   ↓
Authentication check
   ↓
Login screen
```

If an authenticated session exists and is valid:

```text
Valid Session
   ↓
Dashboard
```

If no valid session exists:

```text
No Session
   ↓
Login
```

---

# 3. LOGIN JOURNEY

## 3.1 Login Screen

The login screen contains:

- Username
- Password
- CRM-generated CAPTCHA
- CAPTCHA input
- Login button

Flow:

```text
Username
   +
Password
   +
CAPTCHA
   ↓
Submit
   ↓
Backend validation
```

## 3.2 Successful Login

Conditions:

```text
Username valid
Password valid
CAPTCHA valid
Account not locked
```

Then:

```text
Create secure session
   ↓
Load user permissions
   ↓
Load dashboard
```

## 3.3 Failed Login

Each failed authentication attempt increments the server-side attempt
counter.

```text
Failed Login #1
   ↓
New CAPTCHA
   ↓
Retry

Failed Login #2
   ↓
New CAPTCHA
   ↓
Retry

Failed Login #3
   ↓
Temporary lockout
```

Refreshing the browser must NOT reset the attempt counter.

---

# 4. MAIN APPLICATION SHELL

After successful login:

```text
┌───────────────────────────────────────────┐
│ Top Header                                │
├──────────────┬────────────────────────────┤
│              │                            │
│ Sidebar      │ Main Page                  │
│              │                            │
│ Dashboard    │                            │
│ Customers    │                            │
│ Sales        │                            │
│ Invoices     │                            │
│ Services     │                            │
│ Inquiries    │                            │
│ Analytics    │                            │
│ Warranty     │                            │
│ Technicians  │                            │
│ Notifications│                            │
│ Settings     │                            │
│              │                            │
└──────────────┴────────────────────────────┘
```

The sidebar remains consistent across all pages.

---

# 5. DASHBOARD JOURNEY

Dashboard answers:

> What needs my attention today?

Dashboard must remain clean and must NOT become a full analytics page.

Primary dashboard information:

- Services due today
- New inquiries
- Warranties expiring
- Payments due
- Late payments
- Technician availability
- Today's schedule
- Important notifications
- Key operational summary

Typical flow:

```text
Login
  ↓
Dashboard
  ├── Service Due → Services
  ├── New Inquiry → Inquiry Detail
  ├── Warranty Alert → Warranty / Customer Asset
  ├── Payment Alert → Invoice / Customer
  ├── Technician → Technician / Service
  └── Notification → Relevant Record
```

---

# 6. CUSTOMER JOURNEY

## 6.1 Customer Directory

User selects:

`Customers`

The customer list provides:

- Search
- Filters
- Customer status
- Customer ID
- Name
- Phone
- Email
- Asset count
- Outstanding amount
- Last service
- Next service

Clicking a customer:

```text
Customer List
   ↓
Customer Profile
```

---

# 7. CUSTOMER PROFILE

Customer Profile is the central relationship hub.

The profile contains:

```text
Customer Profile
│
├── Customer Information
├── Assets
├── Sales
├── Invoices
├── Payments
├── Services
├── Warranty
├── Job Cards
├── Documents
├── Notes
└── Activity History
```

The user should be able to understand the complete customer relationship
without searching through unrelated pages.

---

# 8. CUSTOMER CREATION JOURNEY

User:

`Customers → Add Customer`

Enter:

- Name
- Phone
- Email
- Address
- Service address
- Billing information where applicable
- Notes
- Other required customer information

Flow:

```text
Enter Customer Information
       ↓
Client Validation
       ↓
Server Validation
       ↓
Create Customer
       ↓
Customer ID generated
       ↓
Activity: Customer Created
       ↓
Customer Profile
```

No asset, sale, invoice or service is created unless the user explicitly
performs that action.

---

# 9. SALES JOURNEY

## 9.1 Create Sale

User:

`Sales → New Sale`

Choose:

```text
RO Machine
OR
Spare Part
```

Then select/create customer.

Enter:

- Product
- Quantity where applicable
- Price
- Discount where applicable
- Tax where applicable
- Warranty
- Service interval where applicable
- Payment information

Flow:

```text
New Sale
   ↓
Select Customer
   ↓
Select Product
   ↓
Enter Sale Details
   ↓
Warranty / Service Configuration
   ↓
Payment Details
   ↓
Review
   ↓
Complete Sale
```

---

# 10. SALE TRANSACTION FLOW

A completed RO machine sale can trigger multiple connected operations.

```text
                    SALE COMPLETED
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
       Invoice         Asset         Payment
          │              │              │
          ↓              ↓              ↓
       Customer      Warranty       Balance
       Profile       Record          Status
                         │
                         ↓
                  Service Schedule
                         │
                         ↓
                      Heatmap
                         │
                         ↓
                  Activity History
                         │
                         ↓
                      Analytics
```

All critical operations must happen transactionally.

If a required operation fails:

```text
ROLLBACK
```

---

# 11. RO MACHINE SALE EXAMPLE

Example:

```text
Customer:
Rahul Patil

Machine:
Kent Grand Plus

Warranty:
2 Years

Service Interval:
6 Months
```

After sale:

```text
Sale created
   ↓
Customer asset created
   ↓
2-year warranty activated
   ↓
4 service schedules generated
   ↓
Service heatmap updated
   ↓
Invoice generated
   ↓
Customer activity updated
```

The user should NOT manually create four service entries.

The system derives them automatically.

---

# 12. SERVICE SCHEDULE GENERATION

Example:

```text
Sale Date:
17 Aug 2026

Warranty:
2 Years

Interval:
6 Months
```

System generates:

```text
Service 1 → 17 Feb 2027
Service 2 → 17 Aug 2027
Service 3 → 17 Feb 2028
Service 4 → 17 Aug 2028
```

These records immediately become available to:

- Services page
- Service heatmap
- Customer profile
- Warranty workflow
- Service timeline
- Notifications

---

# 13. SPARE PART SALE JOURNEY

```text
Sales
  ↓
New Sale
  ↓
Spare Part
  ↓
Select Customer
  ↓
Select Spare
  ↓
Enter Warranty
  ↓
Complete Sale
```

System creates:

```text
Sale
  ↓
Spare-part asset
  ↓
Spare warranty
  ↓
Invoice
  ↓
Customer activity
```

---

# 14. SPARE WARRANTY CLAIM JOURNEY

Customer visits the shop with a damaged spare.

User:

```text
Customers
   ↓
Search Customer
   ↓
Customer Profile
   ↓
Assets
   ↓
Select Spare Part
```

CRM checks:

```text
Current Date
      vs
Warranty End Date
```

## If warranty is active:

```text
Warranty Active
   ↓
Replacement Eligible
   ↓
Replace Spare
   ↓
Record Replacement
   ↓
Update Warranty History
   ↓
Customer Activity
```

## If warranty expired:

```text
Warranty Expired
   ↓
Replacement Not Covered
   ↓
New Paid Sale
   ↓
Invoice
   ↓
New Spare Asset
```

---

# 15. INVOICE JOURNEY

After a sale/service that requires billing:

```text
Transaction
   ↓
Generate Invoice
   ↓
Invoice Detail
```

User can:

```text
Print
Download
Save
Send via WhatsApp
View Customer Profile
Record Payment
```

Invoice becomes permanently linked to:

```text
Customer
Sale/Service
Payment
Asset where applicable
```

---

# 16. WHATSAPP INVOICE JOURNEY

User selects:

`Send via WhatsApp`

Flow:

```text
Invoice
   ↓
Prepare message
   ↓
Backend WhatsApp integration
   ↓
Send
   ↓
Delivery status where available
   ↓
Activity History
```

Customer data is automatically populated.

User must not manually retype:

- Customer name
- Invoice number
- Amount
- Due date

---

# 17. SERVICES MAIN JOURNEY

User selects:

`Services`

The page contains:

```text
Service classification:
    General Services
    Warranty Services

Service location filter:
    All
    Doorstep
    In-Shop
```

These filters work together.

Example:

```text
Warranty Services + Doorstep
```

shows only warranty doorstep services.

---

# 18. SERVICE HEATMAP JOURNEY

The Service page contains a GitHub-style activity heatmap.

Supported views:

```text
Year
Month
Week
Day
```

Heatmap is generated from actual scheduled services.

Flow:

```text
Services
   ↓
Select Heatmap Period
   ↓
View Activity
   ↓
Click Cell / Period
   ↓
Service List Filters
```

Example:

```text
Day View
   ↓
Click today's cell
   ↓
Today's scheduled services appear
```

The current day/period must be visually highlighted.

---

# 19. SERVICE DETAIL JOURNEY

User clicks a service:

```text
Service List
   ↓
Service Detail
```

Service detail displays:

- Customer
- Phone
- Address
- Machine
- Brand
- Model
- Serial number
- Warranty status
- Service type
- Service classification
- Scheduled date
- Technician
- Service timeline
- Job card
- Notes
- Previous services
- Next service

---

# 20. WARRANTY SERVICE JOURNEY

For a machine with active warranty:

```text
Customer Asset
   ↓
Warranty Active
   ↓
Scheduled Warranty Service
   ↓
Services → Warranty Services
```

The service remains classified as warranty service while eligible.

When warranty expires:

```text
Warranty Expired
   ↓
Service classification automatically changes
   ↓
General Service
```

No manual migration is required.

---

# 21. GENERAL SERVICE JOURNEY

Technician completes a service.

During completion:

```text
Technician recommends:
"Service again after 2 months"
```

User chooses:

`Schedule Next Service`

Then:

```text
Next service date
   ↓
Create General Service
   ↓
Add to heatmap
   ↓
Add to upcoming services
   ↓
Add to customer timeline
```

No future service is created unless it is actually scheduled.

---

# 22. JOB CARD JOURNEY

A service can have a Job Card.

Flow:

```text
Service
   ↓
Create / Open Job Card
   ↓
Assign Technician
   ↓
Technician Starts
   ↓
Diagnosis
   ↓
Work In Progress
   ↓
Record Work
   ↓
Record Parts Used
   ↓
Record Notes
   ↓
Complete
   ↓
Customer Confirmation
   ↓
Close
```

Job Card status must remain separate from the service's high-level status.

---

# 23. SERVICE COMPLETION JOURNEY

Technician finishes service.

User opens:

`Service → Service Detail`

Then:

`Mark Complete`

Enter/confirm:

- Work performed
- Parts used
- Charges
- Notes
- Technician
- Completion time
- Next service recommendation

Then:

```text
Complete Service
   ↓
Job Card Updated
   ↓
Service Status = Completed
   ↓
Timeline Updated
   ↓
Customer Activity Updated
   ↓
Analytics Updated
```

Completed services move into the completed-services view.

---

# 24. SERVICE TIMELINE JOURNEY

For a 2-year warranty with four scheduled services:

Initial:

```text
1 / 4 Pending
2 / 4 Pending
3 / 4 Pending
4 / 4 Pending
```

After first service:

```text
1 / 4 Completed
2 / 4 Pending
3 / 4 Pending
4 / 4 Pending
```

The timeline must make completion visually obvious.

---

# 25. PAYMENT JOURNEY

Payment can be recorded from:

```text
Customer Profile
OR
Invoice
```

Flow:

```text
Invoice
   ↓
Record Payment
   ↓
Enter Amount
   ↓
Payment Method
   ↓
Reference
   ↓
Save
```

System recalculates:

```text
Invoice Total
-
Payments
=
Outstanding
```

Then determines:

```text
Paid
Partially Paid
Due
Overdue
```

---

# 26. LATE PAYMENT JOURNEY

System automatically checks due dates.

Rule:

```text
Outstanding > 0
AND
Current Date > Due Date
```

Then:

```text
Invoice = Overdue
   ↓
Customer = Has Late Payment
   ↓
Dashboard alert
   ↓
Notification
   ↓
Customer Profile update
   ↓
Analytics update
```

---

# 27. PAYMENT REMINDER JOURNEY

Configured reminder:

```text
3 days before due
```

Flow:

```text
Scheduled payment
   ↓
Reminder date reached
   ↓
Background job
   ↓
Notification created
   ↓
Optional WhatsApp message
```

Overdue reminder:

```text
Due date passed
   ↓
Overdue detected
   ↓
Reminder schedule
   ↓
Notification
```

---

# 28. WEBSITE INQUIRY JOURNEY

Customer visits the SR Enterprises website.

```text
Website
   ↓
Inquiry Form
   ↓
Submit
   ↓
HTTPS API
   ↓
Fastify
   ↓
Validation
   ↓
Rate Limit / Security
   ↓
PostgreSQL
   ↓
Inquiry Created
   ↓
CRM Notification
```

The user sees the inquiry inside:

`Inquiries`

No manual import is required.

---

# 29. INQUIRY TO CUSTOMER JOURNEY

Admin opens:

`Inquiries`

Selects inquiry.

```text
New Inquiry
   ↓
Contact Customer
   ↓
In Progress
   ↓
Interested
   ↓
Convert to Customer
```

Conversion:

```text
Inquiry
   ↓
Create Customer
   ↓
Link Original Inquiry
   ↓
Customer Activity
   ↓
Customer Profile
```

The original inquiry must remain traceable.

---

# 30. WARRANTY JOURNEY

Warranty page provides:

```text
Active
Expiring Soon
Expired
Claims
Replacement History
```

User can:

```text
Warranty
   ↓
Select Asset
   ↓
View Warranty
   ↓
View Customer
   ↓
View Invoice
   ↓
View Service Timeline
```

---

# 31. TECHNICIAN JOURNEY

User:

`Technicians`

Selects technician.

View:

- Assigned services
- Upcoming services
- Job cards
- Completed services
- Workload
- Performance

Flow:

```text
Technician
   ↓
Assigned Service
   ↓
Job Card
   ↓
Service
   ↓
Completion
   ↓
Customer Activity
```

---

# 32. NOTIFICATION JOURNEY

Notifications are generated by system events.

Examples:

```text
New Inquiry
Service Due
Warranty Expiring
Payment Due
Payment Overdue
Job Card Updated
Invoice Generated
```

User clicks notification:

```text
Notification
   ↓
Relevant record
```

Example:

```text
Payment overdue
   ↓
Invoice
   ↓
Customer
```

---

# 33. ANALYTICS JOURNEY

User selects:

`Analytics`

Unlike Dashboard, Analytics provides deeper historical information.

Flow:

```text
Analytics
   │
   ├── Sales
   ├── Revenue
   ├── Profit
   ├── Services
   ├── Warranty
   ├── Customers
   ├── Technicians
   ├── Inquiries
   └── Payments
```

Analytics must calculate data from real transactions.

No hardcoded values.

---

# 34. CUSTOMER ACTIVITY JOURNEY

Every important event contributes to the customer timeline.

Example:

```text
Customer Created
      ↓
Machine Sold
      ↓
Invoice Generated
      ↓
Warranty Activated
      ↓
Service Scheduled
      ↓
Service Completed
      ↓
Payment Received
      ↓
Next Service Scheduled
```

Customer Profile provides one chronological view.

---

# 35. AUDIT JOURNEY

Administrative changes generate audit records.

Example:

```text
Admin
  ↓
Changes customer phone
  ↓
Audit event
  ↓
Before value recorded
  ↓
After value recorded
```

Audit log is for accountability and security.

Customer Activity is for customer relationship history.

These must remain separate concepts.

---

# 36. DELETE / ARCHIVE JOURNEY

User selects delete/archive.

System evaluates:

```text
Does record have related financial/service records?
```

If yes:

```text
Recommend Archive
```

If deletion is permitted:

```text
Confirm
   ↓
Require permission
   ↓
Re-authenticate where required
   ↓
Enter reason
   ↓
Archive/Delete
   ↓
Audit Log
```

Never silently delete linked business history.

---

# 37. SETTINGS JOURNEY

Settings contains:

```text
General
Business
Users & Access
Website Connection
Invoices
Services
Warranty
WhatsApp
Data & Backup
Security
About
```

Only authorized roles can modify sensitive settings.

---

# 38. USER / ROLE JOURNEY

Admin:

```text
Settings
   ↓
Users & Access
   ↓
Create User
   ↓
Assign Role
   ↓
Assign Permissions
   ↓
Save
```

Role permissions are enforced server-side.

---

# 39. CONNECTIVITY JOURNEY

Application continuously maintains connectivity awareness.

States:

```text
Connected
Connecting
Offline
Syncing
Sync Complete
Sync Failed
```

If offline:

```text
Show Offline State
   ↓
Prevent false-success operations
   ↓
Preserve drafts where supported
```

When connection returns:

```text
Connected
   ↓
Refresh stale queries
   ↓
Synchronize supported local state
   ↓
Show Sync Complete
```

---

# 40. GLOBAL SEARCH JOURNEY

User activates global search.

Search categories:

```text
Customers
Sales
Invoices
Services
Job Cards
Warranty
Inquiries
```

Example:

```text
Search: "Rahul"

   ↓

Customer
Sales
Invoice
Service
Job Card
Warranty
```

Clicking a result opens the relevant record.

---

# 41. CROSS-MODULE NAVIGATION

All important records should be interconnected.

Example:

```text
Customer
  ├── Asset
  │     ├── Sale
  │     ├── Warranty
  │     └── Services
  │             └── Job Card
  │
  ├── Invoices
  │     └── Payments
  │
  └── Activity History
```

From a service, the user can reach:

```text
Service
 → Customer
 → Asset
 → Warranty
 → Job Card
 → Invoice where applicable
```

From an invoice:

```text
Invoice
 → Customer
 → Sale
 → Asset
 → Payment
```

From a customer:

```text
Customer
 → Everything related
```

---

# 42. PRIMARY END-TO-END BUSINESS JOURNEY

## RO Machine Sale

```text
Login
  ↓
Sales
  ↓
New Sale
  ↓
Select Customer
  ↓
Select RO Machine
  ↓
Enter Price
  ↓
Set Warranty
  ↓
Set Service Interval
  ↓
Payment
  ↓
Review
  ↓
Complete Sale
  ↓
┌─────────────────────────────┐
│ System automatically creates│
│                             │
│ Sale                        │
│ Customer Asset              │
│ Invoice                     │
│ Warranty                    │
│ Service Schedule             │
│ Heatmap Entries             │
│ Customer Activity           │
│ Analytics Data              │
└─────────────────────────────┘
  ↓
Invoice available
  ↓
Print / Download / WhatsApp
```

---

# 43. PRIMARY SERVICE JOURNEY

```text
Service becomes due
       ↓
Heatmap updated
       ↓
Notification
       ↓
Admin opens service
       ↓
Assign Technician
       ↓
Job Card
       ↓
Technician performs service
       ↓
Mark Complete
       ↓
Record work
       ↓
Record parts
       ↓
Record charges
       ↓
Customer confirmation
       ↓
Service Completed
       ↓
Activity History
       ↓
Optional Next Service
```

---

# 44. PRIMARY WARRANTY JOURNEY

```text
Sale
  ↓
Warranty Created
  ↓
Warranty Service Schedule
  ↓
Heatmap
  ↓
Service Due
  ↓
Technician
  ↓
Service Completed
  ↓
Timeline Updated
```

At expiry:

```text
Warranty End Date Reached
       ↓
Warranty = Expired
       ↓
Future service classification
       ↓
General Service
```

---

# 45. PRIMARY SPARE REPLACEMENT JOURNEY

```text
Customer visits shop
       ↓
Search Customer
       ↓
Open Customer Profile
       ↓
Assets
       ↓
Select Spare Part
       ↓
Check Warranty
       │
       ├── Active
       │     ↓
       │   Free Replacement
       │     ↓
       │   Replacement History
       │
       └── Expired
             ↓
           Paid Sale
             ↓
           Invoice
             ↓
           New Asset
```

---

# 46. PRIMARY PAYMENT JOURNEY

```text
Sale
  ↓
Invoice
  ↓
Payment Due
  ↓
Reminder
  ↓
Customer Payment
  ↓
Record Payment
  ↓
Outstanding Recalculated
  ↓
Paid / Partially Paid
```

If unpaid past due date:

```text
Overdue
  ↓
Notification
  ↓
Late Payment
  ↓
Reminder
```

---

# 47. PRIMARY WEBSITE JOURNEY

```text
Website Visitor
       ↓
Inquiry Form
       ↓
API
       ↓
CRM
       ↓
New Inquiry
       ↓
Notification
       ↓
Admin Contact
       ↓
Convert
       ↓
Customer
       ↓
Sales / Service / Warranty
```

---

# 48. GLOBAL DATA FLOW

The most important overall flow is:

```text
                         CUSTOMER
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
           SALES         INQUIRY         ASSETS
             │              │              │
             ▼              ▼              ▼
         INVOICE        CONVERSION      WARRANTY
             │                             │
             ▼                             ▼
          PAYMENT                       SERVICES
                                           │
                                           ▼
                                       JOB CARD
                                           │
                                           ▼
                                      TECHNICIAN
                                           │
                                           ▼
                                      COMPLETION
                                           │
                    ┌──────────────────────┘
                    ▼
              ACTIVITY HISTORY
                    │
                    ▼
                ANALYTICS
```

---

# 49. SOURCE-OF-TRUTH FLOW

Every module must follow:

```text
USER INPUT
    ↓
FRONTEND VALIDATION
    ↓
HTTPS API
    ↓
BACKEND VALIDATION
    ↓
AUTHORIZATION
    ↓
BUSINESS LOGIC
    ↓
DATABASE TRANSACTION
    ↓
RELATED RECORDS
    ↓
ACTIVITY / AUDIT
    ↓
NOTIFICATIONS / JOBS
    ↓
UI REFRESH
```

No module should bypass this flow.

---

# 50. FINAL USER EXPERIENCE PRINCIPLE

The user should never have to think:

> "Which page do I need to go to?"

Instead:

```text
Customer
   ↓
Everything related to customer

Invoice
   ↓
Everything related to invoice

Service
   ↓
Everything related to service

Asset
   ↓
Everything related to asset
```

Every important object must lead naturally to its related records.

---

# 51. FINAL PRODUCT FLOW

The complete SR Enterprises CRM journey is:

```text
                         LOGIN
                           │
                           ▼
                       DASHBOARD
                           │
       ┌───────────┬───────┼────────┬───────────┐
       ▼           ▼       ▼        ▼           ▼
   CUSTOMERS     SALES   SERVICES INQUIRIES  ANALYTICS
       │           │       │        │
       │           │       │        │
       ▼           ▼       ▼        ▼
    PROFILE     INVOICE  JOB CARD  CUSTOMER
       │           │       │        │
       ├───────────┼───────┼────────┤
       │           │       │
       ▼           ▼       ▼
     ASSETS     PAYMENTS  TECHNICIANS
       │           │
       ▼           ▼
    WARRANTY    REMINDERS
       │
       ▼
   SERVICE
       │
       ▼
   HEATMAP
       │
       ▼
 COMPLETION
       │
       ▼
 ACTIVITY HISTORY
       │
       ▼
   ANALYTICS
```

---

# 52. NORTH STAR

The CRM must always preserve this principle:

> **One customer. One source of truth. One connected history.**

A user should be able to start from a customer, sale, invoice, service, warranty,
job card, payment, or inquiry and navigate to every related piece of
information without manually searching through unrelated modules.

This connected experience is the defining behavior of **SR Enterprises CRM**.
