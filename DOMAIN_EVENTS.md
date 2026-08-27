# SRM Domain Events Specification

## 1. Overview

Domain events represent immutable business facts that occurred within SR Enterprises CRM/SRM. All events use past-tense naming and are generated exclusively on the trusted server side during authenticated domain operations.

---

## 2. Event Registry

| Domain Event | Aggregate Type | Trigger Condition | Payload Summary |
|---|---|---|---|
| **`CustomerCreated`** | `CUSTOMER` | New customer profile registered | `customerId`, `fullName`, `phone`, `email`, `customerType` |
| **`CustomerUpdated`** | `CUSTOMER` | Customer details or address modified | `customerId`, `changes`, `updatedBy` |
| **`SaleCreated`** | `SALE` | Initial draft sale saved | `saleId`, `saleNumber`, `customerId`, `totalAmount` |
| **`SaleConfirmed`** | `SALE` | Sale finalized and approved | `saleId`, `saleNumber`, `customerId`, `items`, `totalAmount` |
| **`SaleCancelled`** | `SALE` | Sale cancelled/voided | `saleId`, `saleNumber`, `reason` |
| **`SaleCompleted`** | `SALE` | Goods delivered & sale fulfilled | `saleId`, `saleNumber`, `deliveredAt` |
| **`InvoiceCreated`** | `INVOICE` | Invoice draft created | `invoiceId`, `invoiceNumber`, `customerId`, `totalAmount` |
| **`InvoiceIssued`** | `INVOICE` | Invoice officially issued to customer | `invoiceId`, `invoiceNumber`, `dueDate`, `totalAmount` |
| **`InvoiceOverdue`** | `INVOICE` | Invoice past due date with remaining balance | `invoiceId`, `invoiceNumber`, `dueDate`, `balanceAmount` |
| **`InvoicePaid`** | `INVOICE` | Balance reaches zero after verified payment | `invoiceId`, `invoiceNumber`, `paidAt`, `paymentReference` |
| **`InvoiceCancelled`** | `INVOICE` | Invoice voided or cancelled | `invoiceId`, `invoiceNumber`, `cancelReason` |
| **`PaymentReceived`** | `PAYMENT` | Verified payment recorded against invoice | `paymentId`, `receiptNumber`, `invoiceId`, `amount`, `method` |
| **`PaymentFailed`** | `PAYMENT` | Online or bank payment attempt failed | `paymentId`, `invoiceId`, `amount`, `failureReason` |
| **`PaymentRefunded`** | `PAYMENT` | Refund issued to customer | `paymentId`, `refundAmount`, `reason` |
| **`AssetCreated`** | `ASSET` | Customer machine or serialized asset registered | `assetId`, `serialNumber`, `customerId`, `modelNumber` |
| **`AssetAssigned`** | `ASSET` | Asset linked to a customer site or machine | `assetId`, `customerId`, `siteAddress` |
| **`WarrantyCreated`** | `WARRANTY` | Machine warranty activated | `warrantyId`, `warrantyNumber`, `assetId`, `startDate`, `endDate` |
| **`WarrantyExpiring`** | `WARRANTY` | Warranty within notification window (30/15/7 days) | `warrantyId`, `warrantyNumber`, `daysRemaining`, `endDate` |
| **`WarrantyExpired`** | `WARRANTY` | Warranty coverage has reached expiration | `warrantyId`, `warrantyNumber`, `expiredAt` |
| **`ServiceRequestCreated`** | `SERVICE` | Service maintenance requested | `serviceId`, `serviceNumber`, `customerId`, `serviceType` |
| **`ServiceRequestAssigned`** | `SERVICE` | Technician assigned to service request | `serviceId`, `technicianId`, `scheduledDate` |
| **`ServiceCompleted`** | `SERVICE` | Field maintenance or repair completed | `serviceId`, `jobCardId`, `completedAt` |
| **`JobCardCreated`** | `JOB_CARD` | Work order generated for technician | `jobCardId`, `jobCardNumber`, `serviceId`, `technicianId` |
| **`JobCardStarted`** | `JOB_CARD` | Technician began on-site diagnostics/repair | `jobCardId`, `startedAt` |
| **`JobCardCompleted`** | `JOB_CARD` | Work completed with diagnosis & parts | `jobCardId`, `completedAt`, `partsReplaced`, `totalCharges` |
| **`JobCardCancelled`** | `JOB_CARD` | Work order cancelled | `jobCardId`, `reason` |
| **`InventoryUpdated`** | `INVENTORY` | Stock quantity adjusted via sale/purchase | `productId`, `previousStock`, `resultingStock`, `operation` |
| **`LowStockDetected`** | `INVENTORY` | Stock dropped below low stock threshold | `productId`, `productName`, `sku`, `currentStock`, `threshold` |
| **`InquiryCreated`** | `INQUIRY` | Web or manual sales lead received | `inquiryId`, `inquiryNumber`, `customerName`, `productInterest` |
| **`InquiryConverted`** | `INQUIRY` | Lead converted into customer / sale | `inquiryId`, `customerId`, `saleId` |

---

## 3. Event Envelope Structure

```json
{
  "eventId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "eventType": "SaleConfirmed",
  "aggregateType": "SALE",
  "aggregateId": "sale-2026-0042",
  "actorId": "usr-admin-1",
  "actorRole": "Super Admin",
  "payload": {
    "saleId": "sale-2026-0042",
    "saleNumber": "SALE-2026-0042",
    "customerId": "cust-2026-0015",
    "totalAmount": 18500.00,
    "items": [
      { "productId": "prod-ro-01", "quantity": 1, "unitPrice": 18500.00 }
    ]
  },
  "timestamp": "2026-08-24T11:30:00.000Z",
  "metadata": {
    "ipAddress": "127.0.0.1",
    "source": "DESKTOP_CLIENT"
  }
}
```
