-- Help Categories
CREATE TABLE IF NOT EXISTS public.help_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    parent_id UUID REFERENCES public.help_categories(id),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rename existing knowledge_articles to help_articles for consistency
ALTER TABLE IF EXISTS public.knowledge_articles RENAME TO help_articles;

-- Add new columns to help_articles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'help_articles' AND column_name = 'category_id') THEN
        ALTER TABLE public.help_articles ADD COLUMN category_id UUID REFERENCES public.help_categories(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'help_articles' AND column_name = 'read_time_minutes') THEN
        ALTER TABLE public.help_articles ADD COLUMN read_time_minutes INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'help_articles' AND column_name = 'last_reviewed_at') THEN
        ALTER TABLE public.help_articles ADD COLUMN last_reviewed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'help_articles' AND column_name = 'search_vector') THEN
        ALTER TABLE public.help_articles ADD COLUMN search_vector tsvector;
    END IF;
END $$;

-- Help Article Versions (for CMS)
CREATE TABLE IF NOT EXISTS public.help_article_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Help Article Roles (for role-aware filtering)
CREATE TABLE IF NOT EXISTS public.help_article_roles (
    article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    PRIMARY KEY (article_id, role)
);

-- Help Article Entitlements
CREATE TABLE IF NOT EXISTS public.help_article_entitlements (
    article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    PRIMARY KEY (article_id, feature)
);

-- Help Article Contexts (which routes this article applies to)
CREATE TABLE IF NOT EXISTS public.help_article_contexts (
    article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
    route_pattern TEXT NOT NULL,
    workspace TEXT NOT NULL,
    PRIMARY KEY (article_id, route_pattern)
);

-- Feedback
CREATE TABLE IF NOT EXISTS public.help_article_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    is_helpful BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Views
CREATE TABLE IF NOT EXISTS public.help_article_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search Events
CREATE TABLE IF NOT EXISTS public.help_search_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    results_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support Attachments
CREATE TABLE IF NOT EXISTS public.support_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.support_messages(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for Categories
ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.help_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Platform owners can manage categories" ON public.help_categories FOR ALL USING (public.get_auth_platform_role() = 'PLATFORM_OWNER');

-- Search vector trigger
CREATE OR REPLACE FUNCTION update_help_article_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_help_article_search_vector ON public.help_articles;
CREATE TRIGGER trigger_update_help_article_search_vector
BEFORE INSERT OR UPDATE ON public.help_articles
FOR EACH ROW EXECUTE FUNCTION update_help_article_search_vector();

-- Search RPC Function
CREATE OR REPLACE FUNCTION search_help_articles(search_query text, user_role text DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    title text,
    slug text,
    summary text,
    category text,
    read_time_minutes integer,
    rank real
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.slug,
        a.summary,
        a.category,
        a.read_time_minutes,
        ts_rank(a.search_vector, websearch_to_tsquery('english', search_query)) as rank
    FROM public.help_articles a
    WHERE a.status = 'PUBLISHED'
      AND a.search_vector @@ websearch_to_tsquery('english', search_query)
      AND (
          user_role IS NULL 
          OR user_role = 'OWNER' 
          OR NOT EXISTS (SELECT 1 FROM public.help_article_roles r WHERE r.article_id = a.id)
          OR EXISTS (SELECT 1 FROM public.help_article_roles r WHERE r.article_id = a.id AND r.role = user_role)
      )
    ORDER BY rank DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expose other tables to everyone (read-only) and owner for write
ALTER TABLE public.help_article_contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view article contexts" ON public.help_article_contexts FOR SELECT USING (auth.role() = 'authenticated');

-- Fix indexes
CREATE INDEX IF NOT EXISTS idx_help_articles_search ON public.help_articles USING GIN(search_vector);
