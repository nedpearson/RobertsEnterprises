# VowOS Feature Settings Matrix

| Feature | Workspace | Module | Entitlement Key | Release State | Configurable? | Settings Location | Settings Scope | Role | Mobile? | Integration? | Runtime Consumers | E2E Coverage | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Organization Defaults** | N/A | CORE | `core` | GA | Yes | Settings > Business | PLATFORM | Owner | Yes | No | Layout, Invoices | Yes | Certified |
| **Locations & Hours** | N/A | CORE | `core` | GA | Yes | Settings > Locations | BUSINESS | Owner/Manager | Yes | No | Scheduling | Yes | Certified |
| **Team & Roles** | Team | CORE | `core` | GA | Yes | Settings > People | BUSINESS | Owner | Yes | No | Global | Yes | Certified |
| **Appointment Rules** | Appointments | CORE | `core` | GA | Yes | Settings > Appointments | LOCATION | Manager | Yes | No | Scheduling | Yes | Certified |
| **Online Booking** | Appointments | CORE | `core` | GA | Yes | Settings > Booking | LOCATION | Manager | Yes | Yes (Web) | Portal | Yes | Certified |
| **Customer Profiling** | Customers | CORE | `core` | GA | Yes | Settings > Customers | BUSINESS | Manager | Yes | No | Intake | Yes | Certified |
| **Sales & Contracts** | Sales | CORE | `core` | GA | Yes | Settings > Sales | LOCATION | Manager | Yes | No | Checkout | Yes | Certified |
| **Payments & Fees** | Sales | CORE | `payments` | GA | Yes | Settings > Payments | LOCATION | Owner | Yes | Yes (Stripe) | Checkout | Yes | Certified |
| **Receipts** | Sales | CORE | `core` | GA | Yes | Settings > Receipts | BUSINESS | Manager | Yes | No | Checkout | Yes | Certified |
| **Inventory Limits** | Inventory | CORE | `inventory` | GA | Yes | Settings > Inventory | LOCATION | Manager | Yes | No | Inventory | Yes | Certified |
| **Transfer Rules** | Inventory | CORE | `inventory` | GA | Yes | Settings > Transfers | BUSINESS | Manager | Yes | No | Transfers | Yes | Certified |
| **Commissions** | Team | OPTIONAL | `payroll` | GA | Yes | Settings > Commission | BUSINESS | Owner | Yes | No | Payroll | Yes | Certified |
| **Communications** | Inbox | CORE | `comms` | GA | Yes | Settings > Comms | BUSINESS | Owner | Yes | Yes (Twilio/Mail) | Notifications | Yes | Certified |
| **Automations** | Growth | OPTIONAL | `growth` | Beta | Yes | Settings > Automations | BUSINESS | Owner | No | No | Worker | Yes | Certified |
| **Shopify Sync** | Settings | OPTIONAL | `ecommerce`| GA | Yes | Settings > Connections | BUSINESS | Owner | Yes | Yes (Shopify) | Sync Worker | Yes | Certified |
| **Accounting Export** | Reports | OPTIONAL | `finance` | GA | Yes | Settings > Accounting | BUSINESS | Owner | Yes | Yes (QBO) | Reports | Yes | Certified |
| **AI Assistants** | Global | OPTIONAL | `ai` | Beta | Yes | Settings > AI | BUSINESS | Owner | Yes | Yes (OpenAI) | Global | Yes | Certified |
