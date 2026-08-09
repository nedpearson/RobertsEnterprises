# Settings & Workforce Permission Matrix

This document maps access permissions across settings configuration modules and employee actions.

| Access Permission / Module | Owner | Manager | Stylist | Front Desk |
| :--- | :---: | :---: | :---: | :---: |
| **Settings Navigation & Scope** | | | | |
| `settings.view` | ✓ | ✓ | — | — |
| `settings.manage` | ✓ | — | — | — |
| `settings.organization.manage` | ✓ | — | — | — |
| `settings.locations.manage` | ✓ | ✓ | — | — |
| `settings.security.manage` | ✓ | — | — | — |
| `settings.integrations.manage` | ✓ | — | — | — |
| `settings.payroll.manage` | ✓ | — | — | — |
| **Staff & Lifecycle Management** | | | | |
| `staff.view` | ✓ | ✓ | — | — |
| `staff.invite` | ✓ | — | — | — |
| `staff.edit` | ✓ | — | — | — |
| `staff.suspend` | ✓ | — | — | — |
| `staff.terminate` | ✓ | — | — | — |
| `staff.manage_locations` | ✓ | — | — | — |
| `staff.manage_roles` | ✓ | — | — | — |
| `staff.view_compensation` | ✓ | — | — | — |
| `staff.edit_compensation` | ✓ | — | — | — |
| `staff.view_security` | ✓ | — | — | — |
| **Time Clock & Shifts** | | | | |
| `timeclock.use` | ✓ | ✓ | ✓ | ✓ |
| `timeclock.kiosk_use` | ✓ | ✓ | ✓ | ✓ |
| `timeclock.view_own` | ✓ | ✓ | ✓ | ✓ |
| `timeclock.view_team` | ✓ | ✓ | — | — |
| `timeclock.manager_punch` | ✓ | ✓ | — | — |
| `timeclock.override_location` | ✓ | ✓ | — | — |
| `timeclock.request_correction` | ✓ | ✓ | ✓ | ✓ |
| `timeclock.edit_directly` | ✓ | — | — | — |
| **Timecards & Approvals** | | | | |
| `timecards.view_own` | ✓ | ✓ | ✓ | ✓ |
| `timecards.submit_own` | ✓ | ✓ | ✓ | ✓ |
| `timecards.view_team` | ✓ | ✓ | — | — |
| `timecards.edit` | ✓ | ✓ | — | — |
| `timecards.approve` | ✓ | ✓ | — | — |
| `timecards.reject` | ✓ | ✓ | — | — |
| `timecards.reopen` | ✓ | ✓ | — | — |
| `timecards.lock` | ✓ | — | — | — |
| **Payroll Processing** | | | | |
| `payroll.view_summary` | ✓ | — | — | — |
| `payroll.view_employee_detail` | ✓ | — | — | — |
| `payroll.create_run` | ✓ | — | — | — |
| `payroll.calculate` | ✓ | — | — | — |
| `payroll.approve` | ✓ | — | — | — |
| `payroll.post` | ✓ | — | — | — |
| `payroll.submit_provider` | ✓ | — | — | — |
| `payroll.void` | ✓ | — | — | — |
| `payroll.correct` | ✓ | — | — | — |
| `payroll.reconcile` | ✓ | — | — | — |
| `payroll.export` | ✓ | — | — | — |
| **Bonuses & Commissions** | | | | |
| `bonuses.view` | ✓ | ✓ | — | — |
| `bonuses.create` | ✓ | ✓ | — | — |
| `bonuses.approve` | ✓ | — | — | — |
| `bonuses.import` | ✓ | — | — | — |
| `commissions.view` | ✓ | ✓ | — | — |
| `commissions.calculate` | ✓ | — | — | — |
| `commissions.approve` | ✓ | — | — | — |
| `commissions.adjust` | ✓ | — | — | — |
| **Leave & PTO** | | | | |
| `leave.request` | ✓ | ✓ | ✓ | ✓ |
| `leave.view_team` | ✓ | ✓ | — | — |
| `leave.approve` | ✓ | ✓ | — | — |
| `leave.adjust_balance` | ✓ | — | — | — |
| `leave.manage_policies` | ✓ | — | — | — |
