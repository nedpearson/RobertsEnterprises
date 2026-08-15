-- Phase 13: Customer Success & Support Schema

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    severity TEXT NOT NULL DEFAULT 'Normal',
    app_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Support Messages
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    message TEXT NOT NULL,
    is_internal_note BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge Articles
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    audience TEXT NOT NULL DEFAULT 'EMPLOYEE',
    role TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers for updated_at
CREATE TRIGGER set_timestamp_support_tickets
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_knowledge_articles
BEFORE UPDATE ON public.knowledge_articles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_support_tickets_org ON public.support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX idx_knowledge_articles_category ON public.knowledge_articles(category);
CREATE INDEX idx_knowledge_articles_status ON public.knowledge_articles(status);

-- RLS Policies: Support Tickets
DROP POLICY IF EXISTS "Users can view their organization's tickets" ON public.support_tickets;
CREATE POLICY "Users can view their organization's tickets" ON public.support_tickets
    FOR SELECT USING (
        organization_id = get_auth_tenant_id() OR
        public.get_auth_platform_role() = 'PLATFORM_OWNER'
    );

DROP POLICY IF EXISTS "Users can insert tickets for their organization" ON public.support_tickets;
CREATE POLICY "Users can insert tickets for their organization" ON public.support_tickets
    FOR INSERT WITH CHECK (
        organization_id = get_auth_tenant_id()
    );

DROP POLICY IF EXISTS "Users can update their organization's tickets" ON public.support_tickets;
CREATE POLICY "Users can update their organization's tickets" ON public.support_tickets
    FOR UPDATE USING (
        organization_id = get_auth_tenant_id() OR
        public.get_auth_platform_role() = 'PLATFORM_OWNER'
    );

-- RLS Policies: Support Messages
DROP POLICY IF EXISTS "Users can view their ticket messages" ON public.support_messages;
CREATE POLICY "Users can view their ticket messages" ON public.support_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets t 
            WHERE t.id = ticket_id AND (
                t.organization_id = get_auth_tenant_id() OR 
                public.get_auth_platform_role() = 'PLATFORM_OWNER'
            )
        ) AND 
        (is_internal_note = false OR public.get_auth_platform_role() = 'PLATFORM_OWNER')
    );

DROP POLICY IF EXISTS "Users can insert messages" ON public.support_messages;
CREATE POLICY "Users can insert messages" ON public.support_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets t 
            WHERE t.id = ticket_id AND (
                t.organization_id = get_auth_tenant_id() OR 
                public.get_auth_platform_role() = 'PLATFORM_OWNER'
            )
        ) AND 
        (is_internal_note = false OR public.get_auth_platform_role() = 'PLATFORM_OWNER')
    );

-- RLS Policies: Knowledge Articles
DROP POLICY IF EXISTS "Anyone can view published articles" ON public.knowledge_articles;
CREATE POLICY "Anyone can view published articles" ON public.knowledge_articles
    FOR SELECT USING (
        status = 'PUBLISHED' OR public.get_auth_platform_role() = 'PLATFORM_OWNER'
    );

DROP POLICY IF EXISTS "Platform Owner can manage articles" ON public.knowledge_articles;
CREATE POLICY "Platform Owner can manage articles" ON public.knowledge_articles
    FOR ALL USING (
        public.get_auth_platform_role() = 'PLATFORM_OWNER'
    );
