# VowOS Data Migration Checklist

## 1. Pre-Migration Planning
- [ ] Extract data from legacy system (e.g., BridalLive, custom CRM).
- [ ] Audit data for inconsistencies or duplicates.
- [ ] Map legacy fields to VowOS Universal Product Catalog format.

## 2. Financial Data Migration
- [ ] Ensure all financial values are converted to integer-cents format (e.g., $100.00 -> 10000).
- [ ] Import active layaways and payment plans.
- [ ] Reconcile migrated balances against legacy system reports.

## 3. Inventory Migration
- [ ] Import vendor and designer lists.
- [ ] Import universal product catalog (styles, colors, sizes).
- [ ] Import current stock levels and track physical locations.
- [ ] Validate barcode mapping.

## 4. Customer Data Migration
- [ ] Import customer profiles, contact info, and measurements.
- [ ] Import historical appointments and purchase history.
- [ ] Migrate active alterations and fittings data.

## 5. Validation
- [ ] Run automated data integrity checks via Supabase.
- [ ] Perform manual spot-checks on 10 random customer records.
- [ ] Client sign-off on migrated data.
