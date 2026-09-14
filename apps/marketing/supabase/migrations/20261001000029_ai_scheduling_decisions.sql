-- AI Scheduling Decisions: tracks every AI recommendation and human override
-- Forward-only migration, idempotent via IF NOT EXISTS

-- 1. AI Scheduling Decisions table
CREATE TABLE IF NOT EXISTS ai_scheduling_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    request_id UUID REFERENCES appointment_requests(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    mode TEXT NOT NULL DEFAULT 'recommend_only' CHECK (mode IN ('recommend_only', 'auto_assign_review', 'safe_auto_assign')),
    recommended_employee_id UUID,
    assigned_employee_id UUID,
    recommended_start_at TIMESTAMPTZ,
    score INTEGER,
    confidence TEXT CHECK (confidence IN ('High', 'Medium', 'Low')),
    reasons_json JSONB DEFAULT '[]',
    data_limitations_json JSONB DEFAULT '[]',
    alternatives_json JSONB DEFAULT '[]',
    model_version TEXT DEFAULT '1.0',
    was_auto_assigned BOOLEAN DEFAULT FALSE,
    was_overridden BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    override_by UUID,
    override_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Appointment Locks: manager can lock an appointment to prevent AI reassignment
CREATE TABLE IF NOT EXISTS appointment_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    locked_by UUID NOT NULL,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    lock_reason TEXT,
    UNIQUE(appointment_id)
);

-- 3. Add note_visibility and note_category to appointment_notes if not exist
ALTER TABLE appointment_notes ADD COLUMN IF NOT EXISTS note_category TEXT DEFAULT 'general';
ALTER TABLE appointment_notes ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'staff' CHECK (visibility IN ('staff', 'manager', 'private'));
ALTER TABLE appointment_notes ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES appointment_requests(id) ON DELETE CASCADE;

-- Same for customer_notes
ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS note_category TEXT DEFAULT 'general';
ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'staff' CHECK (visibility IN ('staff', 'manager', 'private'));

-- 4. Enable RLS
ALTER TABLE ai_scheduling_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_locks ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Business members can access ai_scheduling_decisions" ON ai_scheduling_decisions;
    CREATE POLICY "Business members can access ai_scheduling_decisions" ON ai_scheduling_decisions
        FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

    DROP POLICY IF EXISTS "Business members can manage appointment_locks" ON appointment_locks;
    CREATE POLICY "Business members can manage appointment_locks" ON appointment_locks
        FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
END $$;

-- 5. Enable Realtime for key scheduling tables
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ai_scheduling_decisions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ai_scheduling_decisions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'appointment_locks') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE appointment_locks;
    END IF;
END $$;
