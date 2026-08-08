# Demo vs. Production Data Isolation Architecture
**Project**: Roberts Enterprises / VowOS — FamousAI Version  

---

## 1. Isolation Rules
1. **Session Scope**: Demo Mode operates in an isolated client/server session container (`demo_session_id`).
2. **Production Safeguards**: Real accounts (`ramseysims@gmail.com`, `nedpearson@gmail.com`) maintain production credentials and access Demo Mode strictly via temporary session tokens.
3. **Provider Sandbox Isolation**: All API calls for payments, SMS, email, and payroll route to local mock simulators when `isDemo` is active.
4. **Visual Indicator**: Persistent banner rendered in header: `DEMO MODE — SYNTHETIC DATA — NO REAL TRANSACTIONS`.
5. **Zero Pollution**: Demo actions are discarded on session reset and never alter production financial ledgers or KPI calculations.
