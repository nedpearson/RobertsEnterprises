# User Approval State Machine Specification
**Project**: Roberts Enterprises / VowOS — FamousAI Version  

---

## 1. User Account Lifecycle States

```
[ New Registration / Invite ]
             │
             ▼
    ( Pending Approval )  <── Minimal Pending Screen Access Only
             │
     ┌───────┴───────┐
     ▼               ▼
( Approved )    ( Rejected )
     │
     ▼
  ( Active )  <── Ordinary Application Access Granted
     │
     ├──► ( Suspended )
     └──► ( Terminated / Archived )
```

---

## 2. Elevation Safeguards
- **Nonprivileged Default**: Public registration assigns `Pending Approval` state with baseline nonprivileged role request.
- **Manager Approval Boundaries**: Managers can approve only nonprivileged staff within their assigned store location. Managers cannot approve themselves or promote any user to Manager or Owner.
- **Owner Protected Workflow**: Owner account creation requires active Owner authentication, MFA confirmation, and explicit audit logging.
