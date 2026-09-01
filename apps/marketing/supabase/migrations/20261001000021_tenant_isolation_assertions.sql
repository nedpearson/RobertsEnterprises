-- Effective-state tenant isolation assertions.
--
-- Migrations are append-only history, so a grep over the migration folder cannot
-- tell whether a permissive policy was later closed. These assertions run against
-- the FINISHED schema on every `supabase start` / `db reset`, which is exactly
-- the CI job that gates this repository. If a future migration reintroduces a
-- global policy, a null-tenant escape, or an RLS-bypassing view, the migration
-- chain fails here rather than in production.

DO $assert$
DECLARE
    v_offenders text;
BEGIN
    -- 1. No blanket policies.
    --    Exception: a public intake form legitimately needs INSERT-only
    --    WITH CHECK (true). It is allowlisted by name so that adding another one
    --    is a deliberate edit to this assertion, not a silent drift.
    SELECT string_agg(tablename || '.' || policyname, ', ')
      INTO v_offenders
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (
            qual = 'true'
         OR (with_check = 'true' AND NOT (cmd = 'INSERT' AND tablename IN ('platform_leads')))
       );
    IF v_offenders IS NOT NULL THEN
        RAISE EXCEPTION 'tenant isolation: blanket USING/WITH CHECK (true) policies present: %', v_offenders;
    END IF;

    -- 2. No null-tenant escape hatches.
    SELECT string_agg(tablename || '.' || policyname, ', ')
      INTO v_offenders
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (
            COALESCE(qual, '') ~* '(business_id|organization_id|tenant_id) IS NULL\)?\s+OR'
         OR COALESCE(with_check, '') ~* '(business_id|organization_id|tenant_id) IS NULL\)?\s+OR'
       );
    IF v_offenders IS NOT NULL THEN
        RAISE EXCEPTION 'tenant isolation: null-tenant escape in policies: %', v_offenders;
    END IF;

    -- 3. Tenant-data views must not bypass RLS.
    SELECT string_agg(c.relname, ', ')
      INTO v_offenders
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'v'
       AND c.relname IN ('brides', 'inventory_items', 'inventory_variants')
       AND COALESCE(
             (SELECT option_value FROM pg_options_to_table(c.reloptions)
               WHERE option_name = 'security_invoker'), 'false') <> 'true';
    IF v_offenders IS NOT NULL THEN
        RAISE EXCEPTION 'tenant isolation: view(s) without security_invoker: %', v_offenders;
    END IF;

    -- 4. Portal-facing tables must carry a canonical customer reference.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'customer_id'
    ) THEN
        RAISE EXCEPTION 'tenant isolation: contracts.customer_id is missing';
    END IF;

    RAISE NOTICE 'tenant isolation assertions: passed';
END
$assert$;
