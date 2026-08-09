# API Contract Audit — Phase 1

This document outlines the current state of list-returning API endpoints and identifies where the frontend expects raw arrays versus paginated envelopes.

## Audit Findings

All list-endpoints currently return raw JSON arrays. There is no pagination implemented on the backend database layer, nor is there any pagination envelope returned.

### Audited Endpoints

| Endpoint | Current Backend Output | Current Frontend Expectation | Status |
|---|---|---|---|
| `GET /api/customers` | Array `Customer[]` | Expects raw Array | Mismatch Risk |
| `GET /api/leads` | Array `Lead[]` | Expects raw Array | Mismatch Risk |
| `GET /api/inventory` | Array `InventoryItem[]` | Expects raw Array | Mismatch Risk |
| `GET /api/invoices` | Array `Invoice[]` | Expects raw Array | Mismatch Risk |
| `GET /api/bookings` | Array `Booking[]` | Expects raw Array | Mismatch Risk |
| `GET /api/follow-ups` | Array `FollowUp[]` | Expects raw Array | Mismatch Risk |
| `GET /api/alterations` | Array `Alteration[]` | Expects raw Array | Mismatch Risk |
| `GET /api/transfers` | Array `Transfer[]` | Expects raw Array | Mismatch Risk |
| `GET /api/payroll/timesheets` | Array `Timesheet[]` | Expects raw Array | Mismatch Risk |
| `GET /api/payroll/paystubs` | Array `Paystub[]` | Expects raw Array | Mismatch Risk |
| `GET /api/chat/channels` | Array `Channel[]` | Expects raw Array | Mismatch Risk |
| `GET /api/chat/channels/:id/messages` | Array `Message[]` | Expects raw Array | Mismatch Risk |

## Proposed Contract

We will introduce a canonical `PaginatedResponse<T>` shape:

```typescript
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T, TContext = undefined> {
  data: T[];
  meta: PaginationMeta;
  context?: TContext;
}
```

### Action Plan
1. Update backend controllers to accept `page` and `limit` query parameters, calculate `total` count, and wrap responses in the `PaginatedResponse<T>` envelope.
2. Update the frontend React state and fetch handlers to consume the paginated envelope safely, handling cases where pages are loading or empty.
