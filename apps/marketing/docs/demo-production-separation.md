# Demo vs. Production Data Separation
**Project**: Roberts Enterprises / VowOS — FamousAI Version  

---

## 1. Data Isolation Guardrails
1. **Mock Seed Isolation**: Synthetic demo records are flagged with `is_demo: true` and excluded from production financial KPIs, payroll runs, and tax filings.
2. **Provider Isolation**: Live Stripe checkout and SMS messaging providers operate strictly in sandbox mode when evaluating demo or test accounts.
3. **Visual Banner**: Persistent `DEMO MODE` visual banner renders whenever demo data mode is toggled.
