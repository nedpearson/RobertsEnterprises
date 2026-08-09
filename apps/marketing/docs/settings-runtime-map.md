# Settings Runtime Map

This document maps all the settings found in the Roberts Enterprises VowOS settings system, tracing them from their configuration UI to their storage and ultimately to their consumers.

## Organization Settings
- **Key:** `org_settings`
- **Description:** Primary business identity and settings inherited by all locations.
- **Consumer:** None (Mock Frontend)
- **Fake/Mock behaviors:** `fetchJsonSetting` / `saveJsonSetting` save to Supabase mock, reason logged in `audit_last_change_reason`.

## Location Settings
- **Key:** `location_settings`
- **Description:** Store locations, hours, and holiday rules.
- **Consumer:** None
- **Fake/Mock behaviors:** `setTimeout` placeholders for saving.

## Booking Settings
- **Key:** `booking_settings`, `booking_questions`, `booking_fee_settings`
- **Description:** Appointment rules, custom intake questions, and booking fees.
- **Consumer:** `fetchBookingFeeCents` in `lib/settings.ts` is the only active consumer method.
- **Fake/Mock behaviors:** Questions can be reordered in UI with mock toast.

## Payment & Tax Settings
- **Key:** `payment_tax_settings`
- **Description:** Enabled payment methods and tax rates by location.
- **Consumer:** None
- **Fake/Mock behaviors:** Standard mocked UI save.

## Sales & Quotes Settings
- **Key:** `sales_settings`
- **Description:** Prefixes, expiration, default terms, and discount limits.
- **Consumer:** None
- **Fake/Mock behaviors:** Mocked UI save.

## Security Settings
- **Key:** `security_settings_extended`
- **Description:** Password requirements, lockout policies, and MFA.
- **Consumer:** None
- **Fake/Mock behaviors:** `setTimeout(..., 1500)` used to mock testing IP allowlist.

## AI Integration Settings
- **Key:** `ai_settings`
- **Description:** AI provider, model, temperature, and cost limits.
- **Consumer:** `AIModelSettingsTab` features a mock benchmarking suite.
- **Fake/Mock behaviors:** `setTimeout` used for running benchmark suite.

## Inventory Settings
- **Key:** `inventory_settings`
- **Description:** Stock tracking, reorder thresholds, and SKU generation.
- **Consumer:** None
- **Fake/Mock behaviors:** Mocked saving.

## Purchasing Settings
- **Key:** `purchasing_settings`
- **Description:** Vendor list, lead times, and contact info.
- **Consumer:** `vendorPortalStore.ts`
- **Fake/Mock behaviors:** Mocked UI saving.

## Transfer Settings
- **Key:** `transfer_settings`
- **Description:** Approval thresholds, transit days, and tracking for inventory transfers.
- **Consumer:** None
- **Fake/Mock behaviors:** Mocked UI saving.

## Alteration Settings
- **Key:** `alteration_settings`
- **Description:** Services, fittings max, rush fees, and templates.
- **Consumer:** None
- **Fake/Mock behaviors:** Placeholders like "e.g. Bustle Adjustments" and "Price ($)". Mocked save.

## Communications Settings
- **Key:** `twilio_settings`, `channel_settings`, `message_templates`
- **Description:** Twilio integration connection status, templates and routing.
- **Consumer:** None
- **Fake/Mock behaviors:** `setTimeout(..., 1500)` used to simulate Twilio API connection check.

## Feature Flags
- **Key:** `feature_flags`
- **Description:** Toggle experimental features and set rollout percentages.
- **Consumer:** None
- **Fake/Mock behaviors:** UI mocking saving.

## Audit Logging
- **Key:** `audit_last_change_reason`
- **Description:** Stores the last reason provided for a setting change.
- **Consumer:** Displayed in `AuditSettingsTab.tsx`.
- **Fake/Mock behaviors:** Placeholder text for audit log filtering.

### Summary of Fake/Static Values
- `DEFAULT_ORG_SETTINGS`, `DEFAULT_LOCATION_SETTINGS`, `DEFAULT_BOOKING_SETTINGS`, etc. in `lib/settings.ts` are all static seeds.
- UI Tabs widely use `toast()` on save completion.
- `setTimeout` is used extensively for fake loading states (e.g., benchmark running in `AIModelSettingsTab.tsx`, Twilio connection in `CommunicationsSettingsTab.tsx`, DB sync in `SystemHealthSettingsTab.tsx`, loading logs in `DataSettingsTab.tsx`).
- Input placeholders such as `e.g. 192.168.1.1`, `e.g. Ines Di Santo`, `e.g. 10:00 AM` are spread across the tab inputs.
