import os
import re

tables_text = '''action_center_records
alterations
app_settings
appointment_assignment_recommendations
appointment_audit_events
appointment_gowns
appointment_holds
appointment_requests
appointment_services
appointments
audit_logs
automation_rules
automation_runs
brides
business_brands
business_memberships
businesses
communication_threads
communications
contracts
customers
document_templates
durable_jobs
employee_schedules
files
gowns
growth_attribution_touchpoints
growth_channel_spend
growth_local_listings
growth_local_metrics
growth_provider_connections
growth_reviews
growth_search_metrics
growth_seo_audits
growth_seo_page_results
integration_sync_status
internal_notes
inventory_items
inventory_variants
invoices
leads
location_permissions
locations
marketing_budgets
measurements
messages
organization_feature_overrides
organization_health_scores
organization_module_preferences
organization_subscriptions
organizations
payment_schedules
payments
pickups
platform_failed_jobs
platform_leads
platform_users
products
purchase_orders
returns
rooms
sales_goals
settings
settings_values
settings_versions
shopify_location_mappings
staff_contacts
staff_profiles
staff_schedules
support_sessions
support_tickets
system_events
tasks
tenant_subscriptions
time_entries
time_off_requests
transfers
try_on_notes
vendors
workforce_audit_logs'''

tables = [t.strip() for t in tables_text.split('\n') if t.strip()]

tabs_dir = 'apps/marketing/src/components/vowos/settings/tabs'
tab_files = [f for f in os.listdir(tabs_dir) if f.endswith('.tsx')]

print(\"# Forensic Settings Tab Audit Report\\n\")

for f in sorted(tab_files):
    path = os.path.join(tabs_dir, f)
    with open(path, 'r', encoding='utf8') as file:
        content = file.read()
    
    # Check if it uses saveScopedSetting
    uses_settings = 'saveScopedSetting' in content
    
    # Check if it uses supabase
    uses_supabase = 'supabase.from' in content
    
    # Extract interfaces/types
    interfaces = re.findall(r'interface\s+([A-Za-z0-9_]+)', content)
    types = re.findall(r'type\s+([A-Za-z0-9_]+)', content)
    
    entities = interfaces + types
    
    # Check for arrays of objects in state that might be entities
    array_states = re.findall(r'useState<([^>]+)\[\]>', content)
    
    print(f"## {f}")
    print(f"- **Uses Scoped Settings API:** {'Yes' if uses_settings else 'No'}")
    print(f"- **Uses Supabase Directly:** {'Yes' if uses_supabase else 'No'}")
    if entities:
        print(f"- **Local Types/Interfaces:** {', '.join(entities)}")
    if array_states:
        print(f"- **Array States Managed Locally:** {', '.join(array_states)}")
    
    print()

