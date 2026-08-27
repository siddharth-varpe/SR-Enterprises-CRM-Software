# SRM Data Import Schema & Column Reference

## 1. Customers (`customer`)

| Column | Type | Required | Description | Example |
|---|---|---|---|---|
| `customerNumber` | String | No | Auto-generated if omitted (e.g. CUST-2026-0001) | `CUST-2026-0001` |
| `fullName` | String | **Yes** | Full customer / contact name | `Rajesh Sharma` |
| `phone` | String | **Yes** | 10-digit primary mobile number | `9876543210` |
| `email` | String | No | Valid email address | `rajesh.sharma@example.com` |
| `customerType` | Enum | No | `INDIVIDUAL` or `COMMERCIAL` (Default: `INDIVIDUAL`) | `INDIVIDUAL` |
| `companyName` | String | No | Business / Company Name for commercial clients | `TechCorp Solutions Pvt Ltd` |
| `gstNumber` | String | No | 15-character GSTIN | `27AAAAA0000A1Z5` |
| `address` | String | No | Street / Flat / Landmark Address | `Flat 402, Sunshine Apts, Baner` |
| `city` | String | No | City (Default: `Pune`) | `Pune` |
| `state` | String | No | State (Default: `Maharashtra`) | `Maharashtra` |
| `postalCode` | String | No | 6-digit PIN code | `411045` |
| `notes` | String | No | Operational / machine notes | `RO installed in 2024` |

---

## 2. Products (`product`)

| Column | Type | Required | Description | Example |
|---|---|---|---|---|
| `sku` | String | **Yes** | Unique Product SKU / Code | `RO-KENT-GP` |
| `name` | String | **Yes** | Commercial Product Name | `Kent Grand Plus RO` |
| `productType` | Enum | No | `RO_MACHINE` or `SPARE_PART` (Default: `RO_MACHINE`) | `RO_MACHINE` |
| `brand` | String | No | Manufacturer brand (Default: `Kent`) | `Kent` |
| `model` | String | No | Specific model number | `Grand Plus 2026` |
| `description` | String | No | Technical description | `8L Storage, RO+UV+UF+TDS` |
| `unitPrice` | Number | **Yes** | Selling price in INR (e.g. 18500) | `18500` |
| `taxRatePercent` | Number | No | Applicable GST % (Default: 18.00) | `18` |
| `defaultWarrantyMonths` | Number | No | Warranty coverage in months (Default: 12) | `12` |
| `defaultServiceIntervalMonths`| Number | No | Recommended service interval (Default: 6) | `6` |
| `initialStock` | Number | No | Opening inventory stock count (Default: 0) | `10` |

---

## 3. Customer Assets (`asset`)

| Column | Type | Required | Description | Example |
|---|---|---|---|---|
| `serialNumber` | String | **Yes** | Unique physical machine serial number | `KENT-GP-2026-9021` |
| `customerPhone` | String | **Yes** | Phone or Customer Number to associate asset | `9876543210` |
| `productSku` | String | **Yes** | Product SKU in catalog | `RO-KENT-GP` |
| `customName` | String | No | Friendly asset nickname | `Kitchen RO Unit` |
| `purchaseDate` | Date | No | Purchase / Installation Date (YYYY-MM-DD) | `2026-01-15` |
| `initialWarrantyMonths` | Number | No | Warranty months (Default from product or 12) | `12` |
| `serviceIntervalMonths` | Number | No | Service cycle in months (Default: 6) | `6` |
| `status` | Enum | No | `ACTIVE`, `IN_SERVICE`, `REPLACED`, `DECOMMISSIONED` | `ACTIVE` |
| `notes` | String | No | Installation / location notes | `Installed under sink` |

---

## 4. Inventory Balances (`inventory`)

| Column | Type | Required | Description | Example |
|---|---|---|---|---|
| `productSku` | String | **Yes** | Product SKU to update stock | `RO-KENT-GP` |
| `quantity` | Number | **Yes** | Target stock balance | `25` |
| `minimumAlertStock` | Number | No | Minimum low-stock alert threshold (Default: 5) | `5` |
| `reason` | String | No | Audit ledger reason | `Initial Warehouse Opening Stock` |

---

## 5. Warranties (`warranty`)

| Column | Type | Required | Description | Example |
|---|---|---|---|---|
| `assetSerial` | String | **Yes** | Machine serial number (resolves asset & customer) | `KENT-GP-2026-9021` |
| `warrantyType` | Enum | No | `STANDARD_MACHINE`, `EXTENDED_MACHINE`, `AMC_COMPREHENSIVE` | `STANDARD_MACHINE` |
| `startDate` | Date | **Yes** | Warranty effective start date (YYYY-MM-DD) | `2026-01-15` |
| `endDate` | Date | **Yes** | Warranty expiration date (YYYY-MM-DD) | `2027-01-14` |
| `durationMonths` | Number | No | Total coverage duration (calculated if missing) | `12` |
| `status` | Enum | No | `ACTIVE`, `EXPIRED`, `VOID`, `CLAIMED` | `ACTIVE` |
| `terms` | String | No | Warranty terms & conditions summary | `Comprehensive coverage` |
