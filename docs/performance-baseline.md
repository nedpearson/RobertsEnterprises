# Performance Baseline — Phase 1

This document records the initial performance metrics of the application.

## Key API Response Times (SQLite in-memory)
These response times represent the integration tests baseline running against an in-memory SQLite database:

| Endpoint | Average Latency |
|---|---|
| `GET /api/health` | 4 ms |
| `POST /api/demo-login` | 20 ms |
| `POST /api/login` (Auth validation) | 14 ms |
| `GET /api/reports/sales` | 5 ms |
| `GET /api/reports/open-orders` | 4 ms |
| `GET /api/reports/expected-deliveries` | 6 ms |
| `GET /api/reports/bookings` | 4 ms |
| `GET /api/reports/cancellations` | 3 ms |
| `GET /api/reports/did-not-buy` | 4 ms |
| `GET /api/reports/transfers` | 3 ms |
| `GET /api/follow-ups` | 2 ms |
| `GET /api/bookings` | 2 ms |
| `GET /api/bookings/availability` | 4 ms |
| `GET /api/bookings/slot-rank` | 2 ms |
| `POST /api/webhooks/sms` | 22 ms |

## Bundle Sizes
Vite build outputs:
- **Main application chunk**: `dist/assets/index-*.js` (1.59 MB) - *Triggers size warning*
- **Main CSS stylesheet**: `dist/assets/index-*.css` (43.15 kB)
- **Vendors/exporters chunk**: `dist/assets/index.es-*.js` (150.90 kB)
- **jspdf / html2canvas**: `dist/assets/html2canvas-*.js` (199.56 kB)

## Database Query Baseline
Currently, there are no database indices beyond primary keys. High-risk operations (e.g. searching customers by email/phone or scheduling calendar lookups) do full table scans under production loads. No N+1 query patterns have been explicitly profiled yet, but queries exist within loops in reporting endpoints.
