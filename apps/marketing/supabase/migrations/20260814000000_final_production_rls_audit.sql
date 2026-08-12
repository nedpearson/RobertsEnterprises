-- 20260814000000_final_production_rls_audit.sql
-- FINAL PRODUCTION AUDIT: Enforce RLS on all operational child tables and remove duplicate tenant/AI schemas.

-- 1. DROP DUPLICATE/DISCONNECTED PARALLEL IMPLEMENTATIONS
-- The vowos_ control plane tables were a duplicate implementation of the existing business/memberships architecture.
DROP TABLE IF EXISTS vowos_subscriptions CASCADE;
DROP TABLE IF EXISTS vowos_tenant_brands CASCADE;
DROP TABLE IF EXISTS vowos_tenant_users CASCADE;
DROP TABLE IF EXISTS vowos_tenants CASCADE;

-- Drop disconnected AI schemas that are not wired to the tenant architecture and lack RLS
DROP TABLE IF EXISTS ai_model_registry CASCADE;
DROP TABLE IF EXISTS ai_model_versions CASCADE;
DROP TABLE IF EXISTS ai_prompt_registry CASCADE;
DROP TABLE IF EXISTS ai_prediction_events CASCADE;
DROP TABLE IF EXISTS ai_recommendations CASCADE;
DROP TABLE IF EXISTS ai_recommendation_actions CASCADE;
DROP TABLE IF EXISTS ai_explanations CASCADE;
DROP TABLE IF EXISTS ai_feature_definitions CASCADE;
DROP TABLE IF EXISTS ai_feature_snapshots CASCADE;
DROP TABLE IF EXISTS ai_training_runs CASCADE;
DROP TABLE IF EXISTS ai_evaluation_runs CASCADE;
DROP TABLE IF EXISTS ai_drift_metrics CASCADE;
DROP TABLE IF EXISTS marketing_experiments CASCADE;
DROP TABLE IF EXISTS marketing_experiment_variants CASCADE;
DROP TABLE IF EXISTS marketing_experiment_assignments CASCADE;
DROP TABLE IF EXISTS marketing_experiment_outcomes CASCADE;
DROP TABLE IF EXISTS marketing_bandit_states CASCADE;
DROP TABLE IF EXISTS marketing_causal_estimates CASCADE;
DROP TABLE IF EXISTS marketing_budget_scenarios CASCADE;
DROP TABLE IF EXISTS marketing_optimizer_runs CASCADE;
DROP TABLE IF EXISTS marketing_optimizer_allocations CASCADE;
DROP TABLE IF EXISTS marketing_competitors CASCADE;
DROP TABLE IF EXISTS marketing_competitor_signals CASCADE;
DROP TABLE IF EXISTS marketing_trend_signals CASCADE;
DROP TABLE IF EXISTS marketing_creative_attributes CASCADE;
DROP TABLE IF EXISTS marketing_creative_scores CASCADE;
DROP TABLE IF EXISTS marketing_lifecycle_segments CASCADE;
DROP TABLE IF EXISTS marketing_capacity_snapshots CASCADE;
DROP TABLE IF EXISTS marketing_data_quality_metrics CASCADE;
DROP TABLE IF EXISTS marketing_intelligence_briefs CASCADE;
DROP TABLE IF EXISTS marketing_budgets CASCADE;
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS automation_rules CASCADE;
DROP TABLE IF EXISTS durable_jobs CASCADE;
DROP TABLE IF EXISTS provider_connections CASCADE;

-- 2. ENABLE RLS ON ALL MISSING CHILD TABLES
ALTER TABLE employee_schedule_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_request_location_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_assignment_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_permissions ENABLE ROW LEVEL SECURITY;

-- 3. CREATE RLS POLICIES FOR CHILD TABLES (Via JOIN to parent table)

CREATE POLICY "Enable all access for schedule breaks via business" ON employee_schedule_breaks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM employee_schedules 
        WHERE employee_schedules.id = employee_schedule_breaks.schedule_id 
        AND employee_schedules.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Enable all access for request location preferences via business" ON appointment_request_location_preferences FOR ALL USING (
    EXISTS (
        SELECT 1 FROM appointment_requests 
        WHERE appointment_requests.id = appointment_request_location_preferences.request_id 
        AND appointment_requests.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Enable all access for assignment recommendations via business" ON appointment_assignment_recommendations FOR ALL USING (
    EXISTS (
        SELECT 1 FROM appointment_requests 
        WHERE appointment_requests.id = appointment_assignment_recommendations.request_id 
        AND appointment_requests.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Enable all access for employee calendar connections via user_id" ON employee_calendar_connections FOR ALL USING (
    employee_id = auth.uid()
);

-- File child tables link to files
CREATE POLICY "Enable all access for file versions via business" ON file_versions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM files 
        WHERE files.id = file_versions.file_id 
        AND files.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Enable all access for file links via business" ON file_links FOR ALL USING (
    EXISTS (
        SELECT 1 FROM files 
        WHERE files.id = file_links.file_id 
        AND files.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Enable all access for file permissions via business" ON file_permissions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM files 
        WHERE files.id = file_permissions.file_id 
        AND files.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

-- Communication child tables
CREATE POLICY "Enable all access for communication attachments via business" ON communication_attachments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM communications 
        WHERE communications.id = communication_attachments.communication_id 
        AND communications.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Enable all access for communication delivery events via business" ON communication_delivery_events FOR ALL USING (
    EXISTS (
        SELECT 1 FROM communications 
        WHERE communications.id = communication_delivery_events.communication_id 
        AND communications.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Enable all access for communication recipients via business" ON communication_recipients FOR ALL USING (
    EXISTS (
        SELECT 1 FROM communications 
        WHERE communications.id = communication_recipients.communication_id 
        AND communications.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

-- Task child tables
CREATE POLICY "Enable all access for task assignments via business" ON task_assignments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = task_assignments.task_id 
        AND tasks.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Enable all access for task events via business" ON task_events FOR ALL USING (
    EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = task_events.task_id 
        AND tasks.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Enable all access for reminder events via business" ON reminder_events FOR ALL USING (
    EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = reminder_events.task_id 
        AND tasks.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Enable all access for settings versions via business" ON settings_versions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM app_settings 
        WHERE app_settings.id = settings_versions.settings_id 
        AND app_settings.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Enable all access for location permissions via business memberships" ON location_permissions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM business_memberships 
        WHERE business_memberships.id = location_permissions.membership_id 
        AND business_memberships.user_id = auth.uid()
    )
);

-- The calendar_sync_events table connects to employee_calendar_connections
CREATE POLICY "Enable all access for calendar sync events via user_id" ON calendar_sync_events FOR ALL USING (
    EXISTS (
        SELECT 1 FROM employee_calendar_connections 
        WHERE employee_calendar_connections.employee_id = calendar_sync_events.employee_id 
        AND employee_calendar_connections.employee_id = auth.uid()
    )
);
