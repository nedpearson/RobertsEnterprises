-- 20260804000003_appointment_360.sql

-- =========================================================================
-- 1. FILES & MEDIA
-- =========================================================================

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    appointment_id UUID, -- References appointments(id) but we'll alter later or rely on links
    uploaded_by UUID NOT NULL, -- references auth.users(id)
    category TEXT NOT NULL, -- 'Customer Photo', 'Inspiration', 'Document', 'Contract', 'ID', etc.
    description TEXT,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    privacy_level TEXT DEFAULT 'internal', -- 'public', 'internal', 'confidential'
    retention_status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Linking table to associate files with multiple entities
CREATE TABLE file_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'appointment', 'customer', 'communication', 'task'
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE file_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID,
    role TEXT,
    permission TEXT NOT NULL, -- 'view', 'edit', 'delete'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 2. COMMUNICATIONS
-- =========================================================================

CREATE TABLE communication_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    appointment_id UUID,
    subject TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES communication_threads(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    appointment_id UUID,
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    channel TEXT NOT NULL, -- 'sms', 'email', 'phone', 'portal', 'voice_note', 'system_event'
    sender_id UUID, -- If outbound employee
    sender_name TEXT,
    recipient_identifier TEXT, -- Email address or phone number
    body TEXT,
    html_body TEXT,
    provider_message_id TEXT,
    status TEXT DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'failed', 'read'
    is_automated BOOLEAN DEFAULT false,
    follow_up_required BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE communication_attachments (
    communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    PRIMARY KEY (communication_id, file_id)
);

CREATE TABLE communication_delivery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    provider_status TEXT,
    error_message TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID REFERENCES communications(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    appointment_id UUID,
    employee_id UUID NOT NULL,
    outcome TEXT NOT NULL, -- 'reached', 'voicemail', 'no_answer', 'wrong_number'
    customer_confirmed BOOLEAN DEFAULT false,
    follow_up_required BOOLEAN DEFAULT false,
    next_contact_date DATE,
    duration_seconds INTEGER,
    voice_to_text_transcript TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 3. INTERNAL NOTES
-- =========================================================================

CREATE TABLE appointment_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employee_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 4. TASKS & FOLLOW-UPS
-- =========================================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    appointment_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'canceled'
    due_date TIMESTAMPTZ,
    task_type TEXT, -- 'follow_up', 'preparation', 'document_review', etc.
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_assignments (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assignee_id UUID NOT NULL, -- References auth.users(id)
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (task_id, assignee_id)
);

CREATE TABLE task_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL,
    event_type TEXT NOT NULL, -- 'status_changed', 'comment_added', 'assigned'
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 5. FINANCIALS (Payments & Booking Fees)
-- =========================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    appointment_id UUID,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL,
    payment_method TEXT NOT NULL, -- 'credit_card', 'cash', 'transfer'
    provider_transaction_id TEXT,
    status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
    notes TEXT,
    processed_by UUID,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE booking_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL,
    amount_cents INTEGER NOT NULL,
    is_refundable BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'unpaid', -- 'unpaid', 'paid', 'refunded', 'applied_to_invoice'
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'completed',
    processed_by UUID,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 6. APPOINTMENT EXECUTION & OUTCOMES
-- =========================================================================

ALTER TABLE appointments ADD COLUMN check_in_time TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN start_time TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN end_time TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN outcome TEXT; -- 'Purchased', 'Did not buy', 'No-show', 'Canceled'
ALTER TABLE appointments ADD COLUMN revenue_cents INTEGER DEFAULT 0;
ALTER TABLE appointments ADD COLUMN lost_reason TEXT;
ALTER TABLE appointments ADD COLUMN sentiment TEXT;
ALTER TABLE appointments ADD COLUMN next_action_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Update Files referencing now
ALTER TABLE files ADD CONSTRAINT fk_files_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
ALTER TABLE appointment_notes ADD CONSTRAINT fk_notes_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

-- =========================================================================
-- 7. INTEGRATIONS (Reminders & Sync)
-- =========================================================================

CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL, -- 'relative', 'absolute'
    trigger_offset_minutes INTEGER, -- e.g., -1440 for 1 day before
    trigger_at TIMESTAMPTZ,
    channel TEXT NOT NULL, -- 'sms', 'email'
    template_id TEXT,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'sent', 'failed', 'canceled'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reminder_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    communication_id UUID REFERENCES communications(id) ON DELETE SET NULL,
    error_message TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE calendar_sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    provider TEXT NOT NULL, -- 'google', 'microsoft'
    event_type TEXT NOT NULL, -- 'push_appointment', 'fetch_busy'
    status TEXT NOT NULL, -- 'success', 'failed'
    provider_event_id TEXT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    error_message TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE communication_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE appointment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_events ENABLE ROW LEVEL SECURITY;

-- Apply standard multi-tenant RLS Policies
CREATE POLICY "Enable all access for business members" ON files FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON file_versions FOR ALL USING (file_id IN (SELECT id FROM files WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())));
CREATE POLICY "Enable all access for business members" ON file_links FOR ALL USING (file_id IN (SELECT id FROM files WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())));
CREATE POLICY "Enable all access for business members" ON file_permissions FOR ALL USING (file_id IN (SELECT id FROM files WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())));

CREATE POLICY "Enable all access for business members" ON communication_threads FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON communications FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON communication_attachments FOR ALL USING (communication_id IN (SELECT id FROM communications WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())));
CREATE POLICY "Enable all access for business members" ON communication_delivery_events FOR ALL USING (communication_id IN (SELECT id FROM communications WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())));
CREATE POLICY "Enable all access for business members" ON call_logs FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON appointment_notes FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON customer_notes FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON employee_notes FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON tasks FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON task_assignments FOR ALL USING (task_id IN (SELECT id FROM tasks WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())));
CREATE POLICY "Enable all access for business members" ON task_events FOR ALL USING (task_id IN (SELECT id FROM tasks WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())));

CREATE POLICY "Enable all access for business members" ON payments FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON booking_fees FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON refunds FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON reminders FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON reminder_events FOR ALL USING (reminder_id IN (SELECT id FROM reminders WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())));

CREATE POLICY "Enable access to own calendar sync events" ON calendar_sync_events FOR ALL USING (employee_id = auth.uid());
