# Data Isolation Model & Privacy Architecture
**Project**: Roberts Enterprises / VowOS — FamousAI Version  

---

## 1. Per-Employee & Multi-Store Data Isolation
1. **Employee Self-Service Isolation**: Ordinary staff members (Stylists, Seamstresses, Front Desk) can view only their own personal profile, shift logs, timecards, paystubs, and assigned appointments.
2. **Multi-Store Location Scoping**: Store-level records (appointments, POS transactions, sample inventory, transfer requests) strictly respect `activeLocation` (`'ido-br'`, `'ido-cov'`, `'pc-br'`, `'pc-cov'`).
3. **Manager Store Boundaries**: Store Managers are isolated to their authorized boutique locations.
