# Search Query & Filtering Reference
**SR Enterprises CRM / SRM**
*Phase 30 — Advanced Search + Global Search + Filtering Engine*

---

## 1. Global Multi-Domain Search
**Endpoint**: `GET /api/v1/search`
- `q`: Search string (e.g. `INV-2026-0012`, `Rahul`, `9876543210`, `RO-MEM-001`).
- `types`: Optional comma-separated list of entities (`customer,product,invoice,sale,asset,service,job_card,warranty,technician,inquiry,inventory`).
- `limit`: Per-category limit (1 to 30, default 8).

---

## 2. Command Palette Suggestions
**Endpoint**: `GET /api/v1/search/suggest`
- `q`: Search prefix or keywords.
- `limit`: Number of suggestions (default 6).

---

## 3. Advanced Entity-Targeted Search
**Endpoint**: `POST /api/v1/search/advanced`
**Payload**:
```json
{
  "entityType": "customer",
  "q": "Rahul",
  "filters": [
    { "field": "status", "operator": "eq", "value": "ACTIVE" },
    { "field": "city", "operator": "eq", "value": "Pune" }
  ],
  "sortBy": "createdAt",
  "sortOrder": "desc",
  "page": 1,
  "limit": 20
}
```

### Supported Operators
- `eq`: Equal
- `neq`: Not Equal
- `gt`: Greater Than
- `gte`: Greater Than or Equal
- `lt`: Less Than
- `lte`: Less Than or Equal
- `in`: Value within array
- `not_in`: Value not within array
- `between`: Value within range `[min, max]`
- `contains`: Substring match
- `starts_with`: Prefix match
