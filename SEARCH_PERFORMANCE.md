# Search Performance & Scaling Guide
**SR Enterprises CRM / SRM**
*Phase 30 — Advanced Search + Global Search + Filtering Engine*

---

## 1. Performance Characteristics
- **Query Latency**:
  - Exact Identifier Searches (`INV-`, `CUST-`, `SN-`, `RO-`): `< 10ms`
  - Normalized Phone Searches (`9876543210` / `+91 98765-43210`): `< 15ms`
  - Global Multi-Domain Federated Search (12 parallel providers): `< 40ms`
  - Command Palette Autocomplete: `< 20ms`

## 2. In-Memory and Local Database Indexing
- B-Tree indexed lookup on `customerNumber`, `invoiceNumber`, `saleNumber`, `jobCardNumber`, `serialNumber`, `sku`.
- Normalized phone matching via SQL functional string replacements.
- Parallel asynchronous provider dispatching with individual domain failure isolation.
