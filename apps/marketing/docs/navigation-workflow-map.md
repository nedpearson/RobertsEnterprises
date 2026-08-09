# Navigation & Workflow Map
**Project**: Roberts Enterprises / VowOS — FamousAI Version  

---

## 1. Single Application Shell Navigation Architecture

```
[ App Shell: AppLayout.tsx ]
   ├── Header (Boutique Location Switcher, Search, Notifications, Auth Control)
   ├── Collapsible Sidebar / Mobile Drawer (Sidebar.tsx)
   └── Main View Container (Dynamic View Routing)
        ├── 1. Dashboard (DashboardView.tsx)
        ├── 2. Brides / Customers (CustomersView.tsx)
        ├── 3. Leads (LeadsView.tsx)
        ├── 4. Gown Inventory (InventoryView.tsx)
        ├── 5. Store Transfers (TransfersView.tsx)
        ├── 6. Appointments & Schedule (AppointmentsView.tsx)
        ├── 7. Time Clock & Kiosk (TimeClockView.tsx)
        ├── 8. Communications (CommunicationsView.tsx)
        ├── 9. Contracts (ContractsView.tsx)
        ├── 10. Alterations (AlterationsView.tsx)
        ├── 11. Invoices & POS (InvoicesView.tsx)
        ├── 12. Purchase Orders (PurchasesView.tsx)
        ├── 13. Reports (ReportsView.tsx)
        ├── 14. Ledgers (LedgersView.tsx)
        ├── 15. Staff & Roles (StaffView.tsx)
        ├── 16. Payroll & Workforce (PayrollView.tsx)
        └── 17. Settings (SettingsShell.tsx)
```

---

## 2. Deep Linking & Location Context Preservation
- Every view respects `activeLocation` (`'ido-br'`, `'ido-cov'`, `'pc-br'`, `'pc-cov'`, or `'all'`).
- Selected location state persists seamlessly across tab switches, search queries, and record edits.
