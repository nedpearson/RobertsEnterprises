# Data Mapping Audit — Phase 1

This document records the entity relationship mappings and foreign key configurations within the application databases.

## Entity Map and Database Schema

### 1. Boutique / Location (`boutiques` table)
- **Primary Key**: `id` (autoincrement integer)
- **Scope**: Global
- **Usage**: Used to scope all operations, customers, and bookings to specific physical storefronts (Baton Rouge or Covington) and brands (I Do Bridal Couture or Proper & Co.).

### 2. User / Employee (`users` table)
- **Primary Key**: `id` (autoincrement integer)
- **Foreign Key**: `boutique_id` references `boutiques(id)`
- **Role Scope**: owner, manager, stylist

### 3. Customer / Bride (`customers` table)
- **Primary Key**: `id` (autoincrement integer)
- **Foreign Key**: `boutique_id` references `boutiques(id)`
- **Unique Constraint**: `email` (unique per database)

### 4. Booking / Appointment (`bookings` table)
- **Primary Key**: `id` (autoincrement integer)
- **Foreign Keys**:
  - `customer_id` references `customers(id)`
  - `boutique_id` references `boutiques(id)`
  - `stylist_id` references `users(id)` (or stored as text / missing constraint)

### 5. Invoices & Sales (`invoices` table)
- **Primary Key**: `id` (autoincrement integer)
- **Foreign Keys**:
  - `customer_id` references `customers(id)`
  - `boutique_id` references `boutiques(id)`

### 6. Inventory (`inventory_variants` table)
- **Primary Key**: `id` (autoincrement integer)
- **Foreign Keys**:
  - `boutique_id` references `boutiques(id)`

---

## Mismatch and Integrity Risks
1. **Stylist and Room mapping**: Several calendar appointments use raw string names for stylists or rooms instead of relational foreign keys pointing to `users(id)` or a dedicated `rooms` table.
2. **Missing Database-level Foreign Keys**: Several tables (like `payroll_timesheets` and `chat_messages`) lack physical foreign key constraints referencing `users` or `boutiques` in their migrations, relying entirely on application code to maintain integrity.
3. **Cross-Location Scoping**: Several reporting endpoints query global tables without filtering by the active user's assigned `boutique_id`.
