# Role-Based Access Control (RBAC) Authorization Matrix
**Project**: Roberts Enterprises / VowOS — FamousAI Version  

---

## 1. Access Privilege Matrix by Staff Role

| Operational View | Owner | Manager | Stylist / Staff | Seamstress | Front Desk | Pending User |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | Full | Full | Full | Full | Full | Preview Only |
| **Brides & Fit Profiles** | Full | Full | Full | Read | Read | Blocked |
| **Schedule & Appointments** | Full | Full | Full | Read | Full | Blocked |
| **Time Clock & Punch** | Full | Full | Self | Self | Self | Blocked |
| **Invoices & POS** | Full | Full | Create/Pay | Read | Create/Pay | Blocked |
| **Purchase Orders & Vault** | Full | Full | Read | Blocked | Read | Blocked |
| **Staff & Approval Queue** | Full | Nonprivileged | Blocked | Blocked | Blocked | Blocked |
| **Manager Promotion** | Full | Blocked | Blocked | Blocked | Blocked | Blocked |
| **Owner Elevation** | Protected | Blocked | Blocked | Blocked | Blocked | Blocked |
| **Payroll & Wages** | Full | Store-Scoped | Self-Stubs | Blocked | Blocked | Blocked |
| **Ledgers & Accounting** | Full | Full | Blocked | Blocked | Blocked | Blocked |
