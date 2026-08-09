-- Create action_center_records table
CREATE TABLE IF NOT EXISTS action_center_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_plane VARCHAR NOT NULL DEFAULT 'production',
    business_id UUID NOT NULL,
    location_id UUID,
    
    action_type VARCHAR NOT NULL,
    source_module VARCHAR NOT NULL,
    source_record_type VARCHAR NOT NULL,
    source_record_id VARCHAR NOT NULL,
    
    title VARCHAR NOT NULL,
    description TEXT,
    
    status VARCHAR NOT NULL DEFAULT 'Open',
    priority VARCHAR NOT NULL DEFAULT 'Medium',
    severity VARCHAR,
    
    assigned_user_id UUID,
    assigned_role VARCHAR,
    
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    
    financial_impact_cents INTEGER,
    operational_impact TEXT,
    customer_impact TEXT,
    
    ai_generated BOOLEAN NOT NULL DEFAULT false,
    ai_confidence INTEGER,
    
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    approval_type VARCHAR,
    
    deep_link VARCHAR NOT NULL,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes for fast querying
CREATE INDEX idx_action_center_records_business ON action_center_records(business_id);
CREATE INDEX idx_action_center_records_location ON action_center_records(location_id);
CREATE INDEX idx_action_center_records_status ON action_center_records(status);
CREATE INDEX idx_action_center_records_priority ON action_center_records(priority);
CREATE INDEX idx_action_center_records_assigned_user ON action_center_records(assigned_user_id);
CREATE INDEX idx_action_center_records_assigned_role ON action_center_records(assigned_role);
CREATE INDEX idx_action_center_records_due_at ON action_center_records(due_at);
CREATE INDEX idx_action_center_records_deduplication ON action_center_records(business_id, source_record_id, action_type) WHERE status NOT IN ('Completed', 'Dismissed', 'Superseded', 'Failed');

-- Enable RLS
ALTER TABLE action_center_records ENABLE ROW LEVEL SECURITY;

-- Owner sees all business actions
CREATE POLICY "action_center_owner_policy" ON action_center_records
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM business_memberships bm
            WHERE bm.user_id = auth.uid()
            AND bm.business_id = action_center_records.business_id
            AND bm.role = 'Owner'
        )
    );

-- Manager sees location actions
CREATE POLICY "action_center_manager_policy" ON action_center_records
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM business_memberships bm
            WHERE bm.user_id = auth.uid()
            AND bm.business_id = action_center_records.business_id
            AND bm.role = 'Manager'
        )
        AND (
            action_center_records.location_id IS NULL OR
            EXISTS (
                SELECT 1 FROM location_permissions lp
                JOIN business_memberships bm ON lp.membership_id = bm.id
                WHERE bm.user_id = auth.uid()
                AND lp.location_id = action_center_records.location_id
            )
        )
    );

-- Stylist / Front Desk sees assigned actions
CREATE POLICY "action_center_assigned_policy" ON action_center_records
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM business_memberships bm
            WHERE bm.user_id = auth.uid()
            AND bm.business_id = action_center_records.business_id
        )
        AND (
            action_center_records.assigned_user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM business_memberships bm
                WHERE bm.user_id = auth.uid()
                AND bm.business_id = action_center_records.business_id
                AND bm.role = action_center_records.assigned_role
            )
        )
    );
