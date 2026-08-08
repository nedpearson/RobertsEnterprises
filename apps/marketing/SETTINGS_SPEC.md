All settings must feed the canonical scheduling and availability services. Do not let the calendar, public booking page, appointment form and employee schedule interpret scheduling rules differently.

# Online Booking Settings

Create a complete Online Booking settings section.

Support configuration by organization, brand, location and appointment type.

## Booking Availability

Configure:

* Online booking enabled
* Appointment types visible online
* Locations visible online
* Earliest booking notice
* Maximum days in advance
* Same-day booking
* Waitlist availability
* Slot-hold duration
* Booking-session expiration
* Appointment duration
* Preparation buffer
* Cleanup buffer
* Resource requirements
* Employee skill requirements
* Maximum party size
* Maximum simultaneous appointments
* Customer self-selection of employee
* Automatic employee assignment
* Preferred employee request
* Location-specific availability
* Closed-date overrides
* Holiday rules

## Booking Questions

Provide a complete metadata-driven question builder.

Support:

* Single-select dropdown
* Multi-select
* Currency-range dropdown
* Date
* Number
* Yes/no
* Short text
* Long text
* Checkbox acknowledgement
* Conditional questions
* Required questions
* Employee-only questions
* Customer-visible questions
* Reporting eligibility
* Display order
* Effective dates
* Location overrides
* Appointment-type assignments

Create default configurable questions for:

* What type of dress or service are you looking for?
* Preferred budget
* Wedding or event date
* Customer's role in the event
* Preferred silhouettes
* Preferred designers
* Size range
* Number of guests
* Purchase timeline
* Previous visits
* Accessibility requirements
* How they heard about the store
* Preferred communication method
* Special notes

Do not hard-code question options permanently.

## Booking Fee

Support:

* Default booking fee of $75
* Organization default
* Location override
* Appointment-type override
* Fee disabled
* Promotional waiver
* Employee waiver permission
* Refundable/nonrefundable rule
* Fee credited toward purchase
* Cancellation deadline
* Reschedule deadline
* No-show treatment
* Partial refund
* Full refund
* Forfeit
* Effective dates

Display the exact effective policy to customers before payment.

Store the accepted policy version with the booking.

## Booking Confirmation

Configure:

* Immediate confirmation message
* Seven-day confirmation request
* Follow-up if unanswered
* Final reminder
* Confirmation link
* Cancel link
* Reschedule link
* Inbound SMS commands
* Escalation to staff
* Employee notification
* Calendar status updates
* Timezone-aware send windows
* Quiet hours
* Maximum reminders
* Message templates

# Payment and Tax Settings

Create a complete Payments & Taxes section.

Support organization and location scope.

## Payment Methods

Configure:

* Cash
* Check
* Card
* ACH
* Gift card
* Store credit
* External/manual payment
* Financing where applicable
* Payment links
* QR payments

For each method support:

* Enabled
* Locations
* Minimum amount
* Maximum amount
* Refund support
* Reference number required
* Receipt behavior
* Reconciliation behavior
* Approval requirements

## Stripe Settings

Display secure connection status without exposing secrets.

Support:

* Test mode
* Production mode
* Account connection status
* Webhook status
* Last successful webhook
* Failed webhook count
* Checkout success URL
* Checkout cancel URL
* Accepted payment methods
* Booking-fee product configuration
* Payment-link configuration
* Refund policy
* Dispute notification recipients

Never display secret keys after storage.

Secrets must use environment variables or a secure secret-management system.

Provide:

* Test connection
* Verify webhook
* Rotate credentials workflow
* Disconnect
* Audit history

## Tax Settings

Support:

* Tax jurisdictions
* Location tax rates
* Product category taxability
* Service taxability
* Alteration taxability
* Booking-fee taxability
* Shipping taxability
* Effective dates
* Tax exemptions
* Customer exemption certificates
* Rounding rules

Historical invoices must preserve the tax configuration used at posting time.

Do not recalculate posted invoices when settings change.

## Deposit and Payment Plans

Configure:

* Default deposit percentage
* Minimum deposit
* Product-category deposit rules
* Special-order deposit
* Payment-plan eligibility
* Installment count
* Due-date calculation
* Final-payment deadline
* Pickup balance rule
* Late-payment notifications
* Manager override
* Approval thresholds

# Sales, Quote and Invoice Settings

Support:

* Quote numbering
* Invoice numbering
* Prefixes by location
* Number-reset rules
* Quote expiration
* Default terms
* Default notes
* Default salesperson assignment
* Discount types
* Discount limits
* Discount approval thresholds
* Automatic tax
* Fee rules
* Price override rules
* Quote-to-invoice behavior
* Invoice-lock behavior
* Void policy
* Refund policy
* Credit policy
* Receipt templates
* Customer document delivery
* Signature requirements
* Required fields before posting

Use immutable posted-document snapshots.

# Commission Settings

Build a configurable commission-plan system.

Support:

* Commission plan name
* Description
* Effective dates
* Eligible employees
* Eligible locations
* Eligible product categories
* Designer-specific rates
* Service-specific rates
* Flat rate
* Percentage rate
* Tiered rate
* Goal-based bonuses
* Team bonuses
* Split commission
* Primary salesperson
* Assisting salesperson
* Refund clawback
* Cancellation treatment
* Payment timing
* Recognition date
* Manager approval

Keep commission visibility separate from general sales access.

Staff should only view compensation data they are authorized to see.

Create commission preview and reconciliation tools.

# Inventory Settings

Support:

* Inventory tracking enabled
* Negative inventory prevention
* Low-stock thresholds
* Reorder thresholds
* Safety stock
* Barcode formats
* SKU-generation rules
* Variant requirements
* Size lists
* Color lists
* Product categories
* Inventory bins
* Cycle-count frequency
* Adjustment-reason codes
* Damage-reason codes
* Inventory valuation method
* Cost visibility
* Reservation expiration
* Customer reservation rules
* Special-order treatment
* Discontinued-product behavior
* Product image requirements
* Duplicate-SKU prevention

All inventory adjustments must use the inventory ledger and require appropriate permissions.

# Purchasing and Designer Settings

Support:

* Vendor/designer records
* Ordering contacts
* Confirmation contacts
* Payment terms
* Shipping methods
* Default lead time
* Rush lead time
* Order cutoff
* Required PO fields
* PO numbering
* PO approval threshold
* Automatic PO candidate generation
* Electronic transmission enabled
* Transmission adapter
* Confirmation expectation
* Confirmation reminder
* Discrepancy tolerance
* Escalation recipients
* Cancellation rules
* Attachment requirements
* Designer question routing

Never report an order as transmitted unless an authorized adapter confirms submission.

# Transfer Settings

Create comprehensive inter-location transfer settings.

Configure:

* Transfers enabled
* Locations allowed to send
* Locations allowed to receive
* Approval required
* Approval thresholds
* Customer-reserved item rules
* Automatic source recommendation
* Minimum source stock
* Shipping methods
* Expected transit days
* Tracking required
* Barcode scan required
* Partial receiving allowed
* Damage workflow
* Missing-item workflow
* Cancellation rules
* Overdue alerts
* Receiving inspection
* Inventory-ledger behavior
* Transfer-number format
* Responsible departments
* Notification recipients

Allow location-specific transfer rules where appropriate.

# Alteration and Pickup Settings

Support:

* Alteration services
* Standard alteration pricing
* Estimated duration
* Employee skill requirements
* Fitting types
* Fitting duration
* Number of fittings
* Due-date buffer before event
* Rush alteration fee
* Assignment rules
* Quality-check requirement
* Ready-for-pickup communication
* Final-balance requirement
* Pickup appointment requirement
* Pickup identification requirement
* Garment-storage policy
* Abandoned-item policy
* Pickup reminder schedule

# Communications Settings

Build a complete Communications settings section.

## Channels

Support:

* SMS
* Email
* Internal notifications
* Vendor messages
* Customer portal messages where implemented

Configure by location:

* Sender phone
* Sender email
* Reply-to email
* Display name
* Quiet hours
* Timezone
* Allowed communication types
* Escalation contact
* Failed-message recipients

## Twilio Settings

Display:

* Connection state
* Messaging Service SID status
* Sender status
* Inbound webhook status
* Delivery callback status
* Last successful message
* Failed-message count
* Opt-out health
* Test-message function

Do not expose credentials.

Verify Twilio webhook signatures.

## Message Templates

Create a template manager for:

* Booking created
* Booking fee due
* Payment received
* Appointment confirmation request
* Appointment confirmed
* Appointment cancelled
* Reschedule requested
* Appointment rescheduled
* Final reminder
* No-show follow-up
* Quote ready
* Payment due
* Order confirmed
* Delivery delayed
* Product received
* Fitting reminder
* Alteration ready
* Pickup ready
* Follow-up
* Did Not Buy recovery
* Transfer arrival where operationally relevant
* Internal escalation

Each template must support:

* Name
* Channel
* Location
* Appointment type
* Language
* Subject where applicable
* Body
* Typed variables
* Preview
* Test send
* Active state
* Version
* Effective dates
* Approval status

Validate template variables before activation.

Do not send a message with unresolved placeholders.

## Communication Consent

Configure and track:

* Transactional SMS consent
* Marketing SMS consent
* Email consent
* Consent language
* Opt-out behavior
* Opt-in keywords
* Help response
* Quiet hours
* Retention period

Transactional and marketing communication must remain separate.

# Automation Settings

Build a durable automation-rules interface.

Support rules for:

* Appointment confirmation
* Booking-fee reminder
* Appointment reminder
* Unconfirmed appointment escalation
* Cancellation follow-up
* Reschedule follow-up
* Did Not Buy follow-up
* Quote expiration
* Payment due
* Late payment
* Purchase-order confirmation overdue
* Expected delivery overdue
* Transfer overdue
* Inventory below threshold
* Alteration due
* Pickup ready
* Pickup overdue
* Failed communications
* Import conflicts
* Data-quality exceptions

Each rule must define:

* Trigger
* Conditions
* Delay
* Timezone
* Quiet hours
* Action
* Template
* Recipient
* Owner
* Retry policy
* Escalation
* Active state
* Effective dates
* Last run
* Next run
* Success count
* Failure count

Provide:

* Enable
* Disable
* Test
* Duplicate
* View history
* View affected records

Do not let administrators create arbitrary executable code.

Use an allowlisted rule and action system.

# Notification Settings

Support personal, role, department and location defaults.

Notification categories:

* Appointments
* Booking payments
* Confirmations
* Reschedules
* Cancellations
* Communications
* Sales
* Payments
* Refunds
* Purchase orders
* Confirmations
* Deliveries
* Transfers
* Inventory
* Alterations
* Pickups
* Reports
* Imports
* Security
* System health

Delivery options:

* In-app
* Email
* SMS where appropriate

Support:

* Immediate
* Digest
* Disabled
* Escalation only
* Quiet hours
* Location scope
* Personal override where allowed

Critical security and payment alerts must not be completely disabled by ordinary users.

# Documents and Template Settings

Build a document-template manager.

Support:

* Quotes
* Invoices
* Receipts
* Purchase orders
* Transfer documents
* Alteration tickets
* Pickup forms
* Booking policies
* Customer agreements
* Reports
* Email attachments

Each template must support:

* Name
* Document type
* Brand
* Location
* Version
* Effective dates
* Header
* Logo
* Footer
* Terms
* Typed variables
* Required fields
* Preview
* Test generation
* Active state
* Archive state

Historical documents must retain the template version used at generation.

Do not silently regenerate historical documents with new terms.

# Integration Settings

Create a real integration-management section.

Potential integrations:

* Stripe
* Twilio
* Email provider
* Designer-ordering adapters
* Calendar integrations
* Accounting integration
* Storage
* AI provider
* Import sources
* Webhooks

Every integration card must display:

* Name
* Purpose
* Connection status
* Environment
* Last successful activity
* Last failure
* Configuration owner
* Locations
* Permissions
* Test connection
* View logs
* Disconnect
* Reconnect

Do not display "Connected" unless the system has verified the integration.

Do not expose credentials.

## AI Settings

Support:

* AI enabled
* Approved use cases
* Provider
* Model
* Temperature or equivalent safe controls
* Usage limits
* Cost limits
* Data-retention setting
* Human-approval requirement
* Allowed modules
* Prohibited data
* Logging
* Fallback behavior

AI settings must never allow AI to bypass deterministic rules, authorization, payments or financial controls.

# Reporting Settings

Support:

* Fiscal calendar
* Default date field
* Default date range
* Timezone
* Default location scope
* Saved views
* Shared views
* Scheduled reports
* Export formats
* Export row limits
* Cost visibility
* Profit visibility
* Cross-location reporting
* Report subscriptions
* Data freshness
* Comparison periods
* Default grouping

Permissions must control:

* Cost
* Margin
* Commission
* Customer export
* Cross-location data
* Employee performance

# Security Settings

Build a complete Security section.

## Authentication Policy

Support:

* Minimum password length
* Complexity requirements
* Password expiration where appropriate
* Password history
* Failed-login lockout
* Lockout duration
* Session duration
* Idle timeout
* Remember-device policy
* Invitation expiration
* Password-reset expiration
* MFA requirement
* MFA requirement by role
* Trusted-device duration
* Concurrent-session limit

Use modern secure defaults.

Do not weaken security merely for convenience.

## Session Management

Authorized administrators must be able to:

* View active sessions
* View device and approximate location metadata
* Revoke one session
* Revoke all sessions for a user
* Force reauthentication
* Require password reset
* Require MFA enrollment

Do not expose full tokens.

## Security Events

Track:

* Login success
* Login failure
* Lockout
* Password reset
* MFA enrollment
* MFA removal
* Invitation acceptance
* Session revocation
* Role change
* Permission change
* Sensitive export
* Refund
* Void
* Inventory adjustment
* Integration change
* Webhook failure

Provide filters and drilldowns.

# Data and Import Settings

Support:

* Import sources
* File types
* Maximum file size
* Allowed extensions
* Duplicate handling
* Match rules
* Confidence thresholds
* Dry-run requirement
* Approval requirement
* Error threshold
* Rollback retention
* Source-document retention
* PII classification
* Import notification recipients

Provide:

* Run discovery
* Run dry run
* View conflicts
* Approve import
* Apply import
* Roll back batch
* Download reconciliation report

Never import into production without validation and authorization.

# Data Retention and Privacy

Support configurable retention policies for:

* Audit events
* Communications
* Failed jobs
* Import files
* Import staging records
* Security events
* Customer documents
* Generated documents
* Archived employees
* System logs

Do not allow retention settings to violate legal, accounting or historical requirements.

Use archival rather than destructive deletion when records have business history.

# Audit Log

Create a complete Audit Log section.

Track:

* Actor
* Action
* Entity
* Entity ID
* Location
* Prior value
* New value
* Reason
* Timestamp
* Request ID
* IP metadata where appropriate
* Session
* Source
* Sensitive-action classification

Audit filters:

* Date range
* Employee
* Location
* Action
* Entity
* Permission
* Security event
* Financial event
* Inventory event
* Settings category

Audit records must be append-only.

Ordinary users must not be able to edit or delete audit events.

Redact secrets and protected data.

# System Health

Create an owner/system-administrator System Health section.

Display:

* Web application version
* API version
* Commit SHA
* Environment
* Database status
* Database migration status
* Queue status
* Scheduler status
* Stripe status
* Twilio status
* Email status
* Storage status
* AI-provider status
* Failed jobs
* Failed webhooks
* Slow queries
* Error rate
* Last deployment
* Last successful backup
* Import health
* Data-quality exceptions

Provide safe actions:

* Retry failed job
* Reprocess safe webhook
* Download diagnostics
* Run health check
* Verify integration
* View incident details

Do not expose secrets, SQL or raw stack traces.

# Feature Flags

Create a controlled feature-flag system for staged releases.

Support:

* Flag key
* Description
* Environment
* Organization
* Brand
* Location
* Role
* Employee
* Percentage rollout where justified
* Start date
* End date
* Owner
* Audit history

Do not use feature flags as a permanent substitute for permissions or incomplete code.

# Settings Search

Create a global Settings search.

Search:

* Setting names
* Descriptions
* Employees
* Roles
* Permissions
* Locations
* Integrations
* Templates
* Automations
* Security policies

Results must deep-link to the exact setting.

Respect permissions.

# Unsaved Changes and Save Behavior

Implement a shared settings-editing framework.

Requirements:

* Dirty-state detection
* Save
* Cancel
* Reset to inherited/default
* Validation before save
* Field-level errors
* Conflict detection
* Optimistic locking
* Version numbers
* Stale-edit warning
* Confirmation for sensitive changes
* Reason field for sensitive changes
* Audit event
* Success toast
* Error recovery

Do not save every keystroke directly to production.

Support transactional saves for related settings.

Do not partially save a logically atomic configuration.

# Settings Inheritance Viewer

For scoped settings, show:

* Effective value
* Source scope
* Organization default
* Brand override
* Location override
* Department override
* Role override
* Employee override
* Effective dates

Provide:

* Override
* Remove override
* Reset to inherited
* View history

Prevent conflicting overrides from becoming invisible.

# Backend Architecture

Do not continue placing the entire Settings API inside one large server file.

Extract modular services incrementally.

Recommended structure:

```text
apps/api/src/modules/settings/
  settings.routes.ts
  settings.service.ts
  settings.repository.ts
  settings.validation.ts
  settings.registry.ts

apps/api/src/modules/staff/
  staff.routes.ts
  staff.service.ts
  staff.repository.ts
  staff.validation.ts
  invitations.service.ts

apps/api/src/modules/roles/
  roles.routes.ts
  roles.service.ts
  permissions.service.ts
  authorization.service.ts

apps/api/src/modules/security/
  sessions.routes.ts
  security-events.service.ts
  authentication-policy.service.ts
```

Adapt this to the actual repository language and conventions.

Do not create a second API server.

# Database Migrations

Inspect all existing migrations first.

Add additive, reversible migrations for concepts such as:

```text
setting_definitions
setting_values
setting_value_history

brands
locations
location_hours
location_holiday_hours
location_resources

departments
job_titles
employee_profiles
employee_status_history
employee_location_assignments
employee_skills
employee_schedule_rules
employee_schedule_exceptions

permissions
roles
role_permissions
user_roles
user_permission_overrides
permission_change_events
approval_limits

staff_invitations
active_sessions
security_events
password_reset_tokens

appointment_types
booking_question_definitions
booking_question_options
appointment_type_questions
booking_fee_policies
policy_versions

communication_templates
automation_rules
notification_preferences

integration_configurations
integration_health_events

document_templates
document_template_versions

feature_flags
feature_flag_assignments
```

Adapt names to existing tables.

Do not duplicate existing correct tables.

Requirements:

* Foreign keys
* Unique constraints
* Effective dates
* Location scope
* Organization scope
* Audit fields
* Created/updated timestamps
* Soft archive where needed
* Appropriate indexes
* PostgreSQL and SQLite compatibility where required
* Clean migration
* Existing-data migration
* Rollback test

# API Endpoints

Create validated and permission-protected APIs.

Potential structure:

```text
ORGANIZATION
GET    /api/settings/organization
PUT    /api/settings/organization

LOCATIONS
GET    /api/settings/locations
POST   /api/settings/locations
GET    /api/settings/locations/:id
PUT    /api/settings/locations/:id
POST   /api/settings/locations/:id/archive

STAFF
GET    /api/staff
POST   /api/staff/invitations
GET    /api/staff/:id
PUT    /api/staff/:id
POST   /api/staff/:id/activate
POST   /api/staff/:id/suspend
POST   /api/staff/:id/leave
POST   /api/staff/:id/terminate
POST   /api/staff/:id/reactivate
POST   /api/staff/:id/revoke-sessions
POST   /api/staff/:id/require-password-reset
GET    /api/staff/:id/effective-access

INVITATIONS
POST   /api/staff/invitations/:id/resend
POST   /api/staff/invitations/:id/revoke
POST   /api/public/staff-invitations/:token/accept

ROLES
GET    /api/roles
POST   /api/roles
GET    /api/roles/:id
PUT    /api/roles/:id
POST   /api/roles/:id/clone
POST   /api/roles/:id/archive
GET    /api/roles/:id/permissions
PUT    /api/roles/:id/permissions
POST   /api/staff/:id/roles
DELETE /api/staff/:id/roles/:roleId

PERMISSIONS
GET    /api/permissions
POST   /api/permissions/evaluate
GET    /api/staff/:id/permissions

SETTINGS
GET    /api/settings/definitions
GET    /api/settings/values
PUT    /api/settings/values
GET    /api/settings/history
POST   /api/settings/resolve

INTEGRATIONS
GET    /api/settings/integrations
POST   /api/settings/integrations/:key/test
POST   /api/settings/integrations/:key/connect
POST   /api/settings/integrations/:key/disconnect

AUTOMATIONS
GET    /api/settings/automations
POST   /api/settings/automations
PUT    /api/settings/automations/:id
POST   /api/settings/automations/:id/test
POST   /api/settings/automations/:id/enable
POST   /api/settings/automations/:id/disable

SECURITY
GET    /api/settings/security
PUT    /api/settings/security
GET    /api/security/sessions
DELETE /api/security/sessions/:id
GET    /api/security/events

AUDIT
GET    /api/audit-events
```

Use repository conventions where better.

Validate every request.

Enforce permissions and location scope in the API.

# Frontend Architecture

Extract the current monolithic Settings interface.

Recommended structure:

```text
apps/web/src/modules/settings/
  SettingsShell.tsx
  SettingsNavigation.tsx
  SettingsSearch.tsx
  SettingsSaveBar.tsx

  organization/
  locations/
  staff/
  roles/
  scheduling/
  booking/
  payments/
  sales/
  inventory/
  purchasing/
  transfers/
  alterations/
  communications/
  automations/
  notifications/
  documents/
  integrations/
  reporting/
  security/
  data/
  audit/
  system-health/
```

Create reusable components:

* SettingsSection
* SettingsCard
* SettingsField
* ScopeSelector
* InheritanceBadge
* OverrideControl
* EffectiveValueInspector
* PermissionGuard
* RiskBadge
* StaffStatusBadge
* RoleBadge
* PermissionMatrix
* ApprovalLimitEditor
* InvitationStatus
* SecurityStatus
* IntegrationStatus
* AuditTimeline
* StickySaveBar

Use the existing Roberts Enterprises design system.

Do not create a visually disconnected admin theme.

# Staff and Role UX

## Staff Directory

Desktop:

* Search
* Filters
* Saved views
* Staff table
* Bulk actions where safe
* Invitation status
* Security warnings
* Pagination

Mobile:

* Staff cards
* Search
* Filter drawer
* Clear primary actions
* No horizontal table

## Staff Detail

Use a full page for complex staff records.

Tabs:

```text
Overview
Access
Locations
Schedule
Skills
Sales
Communications
Security
Activity
```

Use a clear header:

* Name
* Status
* Job title
* Primary role
* Primary location
* Manager
* Last login
* Primary actions

## Role Detail

Tabs:

```text
Overview
Permissions
Assigned Staff
Locations
Approval Limits
History
```

Provide:

* Permission summary
* Sensitive permission count
* Staff count
* Location scope
* Clone
* Compare
* Archive
* Save

# Authorization Middleware

Create one canonical authorization service.

It must answer:

```ts
authorize({
  userId,
  permission: "transfers.approve",
  locationId,
  entityId,
  amountCents
})
```

Authorization should evaluate:

* User status
* Assigned roles
* Direct grants
* Direct restrictions
* Location assignment
* Temporary access
* Effective dates
* Approval limits
* Entity ownership where relevant
* Protected-role safeguards

Return:

* Allowed
* Denied
* Reason code
* Permission source
* Approval required
* Approval route where applicable

Do not leak sensitive authorization logic to clients.

# Replace Hard-Coded Role Checks

Search the entire repository for:

* `role ===`
* `role !==`
* owner checks
* manager checks
* consultant checks
* hard-coded role arrays
* UI-only permission checks
* location assumptions
* first-boutique assumptions

Replace business authorization with permission checks.

Role names may still be displayed, but modules must not depend on role-name strings after RBAC exists.

# Audit Every Sensitive Action

Audit:

* Invite employee
* Activate
* Suspend
* Terminate
* Role assignment
* Permission change
* Location assignment
* Approval-limit change
* Security-policy change
* Session revocation
* Settings change
* Integration change
* Template change
* Automation change
* Feature-flag change
* Export
* Refund
* Void
* Inventory adjustment
* Transfer approval

# Performance Requirements

Settings must not load all configuration, staff, roles and audit events in one initial request.

Use:

* Route-level lazy loading
* Paginated staff
* Paginated audit history
* Cached permission definitions
* Batched effective-access calculations
* Debounced settings search
* Request cancellation
* No N+1 staff-role queries
* No N+1 staff-location queries
* No repeated permission evaluation queries
* Optimized permission caching with proper invalidation

Role or permission changes must invalidate affected authorization caches immediately.

# Error Handling

Remove browser `alert()` calls.

Use:

* Toasts
* Inline validation
* Error summaries
* Confirmation dialogs
* Retry actions
* Correlation IDs
* Error boundaries

Support errors such as:

* Duplicate employee email
* Invalid invitation
* Expired invitation
* Last-owner protection
* Unauthorized role assignment
* Invalid location assignment
* Role in use
* Stale edit
* Integration failure
* Validation failure
* Network failure
* Session expiration

# Automated Testing

Add comprehensive tests.

## Organization and Location

* Edit organization profile
* Add location
* Edit location
* Archive location
* Prevent deletion with history
* Business hours
* Holiday hours
* Timezone
* Tax jurisdiction
* Location override
* Inherited setting

## Staff

* Invite employee
* Duplicate email
* Accept invitation
* Expired invitation
* Revoke invitation
* Activate
* Suspend
* Leave
* Reactivate
* Terminate
* Preserve historical activity
* Reassign future work
* Revoke sessions
* Require password reset
* MFA requirement
* Pagination
* Filters
* Mobile display

## Roles and Permissions

* Create role
* Clone role
* Edit role
* Archive role
* Assign role
* Remove role
* Temporary role
* Location-scoped role
* Direct permission grant
* Direct restriction
* Effective permission calculation
* Permission cache invalidation
* Unauthorized elevation
* Self-elevation prevention
* Last-owner protection
* Sensitive permission warning
* Approval threshold
* Cross-location denial

## Settings

* Organization default
* Brand override
* Location override
* Role override
* Employee override
* Effective-value resolution
* Remove override
* Reset to inherited
* Stale-edit conflict
* Validation
* Atomic save
* Audit history
* Version history

## Security

* Suspended login denied
* Terminated login denied
* Session revocation
* Invitation token single use
* Invitation expiration
* Password reset
* MFA-required role
* Security event
* Protected secrets

## Integrations

* Verified connected state
* Failed test
* Disconnect
* Webhook status
* Secret redaction

## Responsive and Accessibility

Test:

* Settings navigation
* Staff directory
* Staff detail
* Permission matrix
* Location editor
* Integration cards
* Audit log
* System Health

At:

```text
375 × 667
390 × 844
430 × 932
768 × 1024
820 × 1180
1024 × 768
1280 × 800
1440 × 900
1920 × 1080
```

Verify:

* Keyboard navigation
* Visible focus
* Form labels
* Error association
* Dialog focus
* No horizontal overflow
* Mobile-safe navigation
* Readable permission matrix
* Touch-friendly controls

# Migration of Existing Users

Create a safe migration plan.

Map existing roles:

```text
owner
manager
consultant
```

to new role templates.

Do not remove existing access before verifying equivalence.

Suggested initial mapping:

* `owner` → Owner
* `manager` → Store Manager
* `consultant` → Bridal Consultant

Then evaluate each existing user's:

* Location
* Actual responsibilities
* Current access
* Historical activity

Generate a migration report before applying final role changes.

Do not silently elevate or reduce access.

# Seed and Demo Data

Create safe demo data with fictional:

* Organization
* Multiple locations
* Departments
* Staff
* Roles
* Permissions
* Temporary assignments
* Invitations
* Schedules
* Approval limits
* Automations
* Integrations in test/disconnected states
* Audit events

Do not mix demo users into production reporting.

# Required Commands

Run all applicable commands:

```text
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run migrate
npm run start
npx playwright test
```

Also run:

* Fresh migration
* Existing-data migration
* Rollback
* Permission evaluation tests
* Staff lifecycle tests
* Invitation security tests
* Location-isolation tests
* Settings inheritance tests
* Accessibility tests
* Responsive visual tests
* Secret scan
* Dependency audit
* Deployment smoke tests

# Completion Gates

Do not declare READY unless:

1. The existing Settings module is replaced or refactored into the canonical Settings system.
2. No second Settings system exists.
3. Organization settings persist.
4. Location settings persist.
5. Business hours persist.
6. Holiday hours persist.
7. Staff records have a complete lifecycle.
8. Staff invitation does not require an administrator-entered password.
9. Invitation tokens are secure and expiring.
10. Suspended staff cannot authenticate.
11. Terminated staff cannot authenticate.
12. Historical attribution is preserved.
13. Departments work.
14. Job titles remain separate from roles.
15. Roles are configurable.
16. Permissions are granular.
17. Role assignments are location scoped where appropriate.
18. Temporary access expires automatically.
19. Approval limits work.
20. Effective permission inspection works.
21. Last-owner protection works.
22. Self-elevation protection works.
23. API authorization replaces UI-only authorization.
24. Hard-coded role checks are removed from business logic.
25. Settings inheritance works.
26. Setting overrides are visible.
27. Sensitive settings require permission.
28. Sensitive changes require confirmation and reason.
29. All settings changes are audited.
30. Employee calendar colors persist.
31. Employee schedules persist.
32. Appointment skill assignments persist.
33. Booking settings feed public booking.
34. The $75 booking fee remains configurable.
35. Payment and tax settings work.
36. Commission plans work.
37. Inventory settings work.
38. Transfer settings work.
39. Communication templates work.
40. Automation rules work.
41. Integration status is verified, not fabricated.
42. Security settings work.
43. Session revocation works.
44. Audit Log works.
45. System Health works.
46. Settings Search works.
47. Unsaved-change protection works.
48. Stale-edit conflict handling works.
49. No browser alerts remain.
50. No disabled placeholder settings remain.
51. No hard-coded support email remains.
52. No hard-coded timezone remains.
53. No plaintext password storage remains.
54. No secrets are displayed.
55. Desktop layouts pass.
56. Tablet layouts pass.
57. Mobile layouts pass.
58. Accessibility tests pass.
59. API tests pass.
60. Frontend tests pass.
61. Integration tests pass.
62. Production build passes.
63. Migrations pass on clean and existing data.
64. Deployment smoke tests pass.
65. No critical console errors remain.
66. No critical API errors remain.
67. Changes are committed to a feature branch.
68. The feature branch is pushed.
69. A reviewable pull request is prepared.
70. The pull request is not automatically merged.

# Final Response Format

Return:

1. Existing Settings audit
2. Existing staff-management audit
3. Existing role and authorization audit
4. Existing placeholder behavior removed
5. Settings information architecture
6. Organization settings implemented
7. Location settings implemented
8. Business-hours implementation
9. Staff directory implementation
10. Staff profile implementation
11. Staff invitation and onboarding
12. Staff lifecycle implementation
13. Departments and job titles
14. Role templates
15. Permission registry
16. Permission matrix
17. Effective-access inspector
18. Temporary access
19. Approval limits
20. Scheduling settings
21. Online-booking settings
22. Payment and tax settings
23. Sales and commission settings
24. Inventory settings
25. Purchasing settings
26. Transfer settings
27. Alteration and pickup settings
28. Communications settings
29. Automation settings
30. Notification settings
31. Document-template settings
32. Integration settings
33. Reporting settings
34. Security settings
35. Data and import settings
36. Audit Log
37. System Health
38. Feature flags
39. Database migrations
40. API routes
41. Frontend modules
42. Hard-coded role checks replaced
43. Authorization safeguards
44. Files created
45. Files modified
46. Tests added
47. Exact test results
48. Exact build results
49. Exact migration results
50. Responsive results
51. Accessibility results
52. Deployment results
53. Remaining risks
54. Manual verification checklist
55. Git branch
56. Commit SHA
57. Pull-request status
58. FINAL STATUS: READY or NOT READY

Begin by auditing the live Settings screen, `SettingsModule.tsx`, current user tables, current authentication, every hard-coded role check and every settings consumer.

Then implement the complete Settings, Staff and Role/Permission system.

Do not stop after the audit.

Do not wait for routine approval.

Do not claim READY unless every completion gate has been validated.
