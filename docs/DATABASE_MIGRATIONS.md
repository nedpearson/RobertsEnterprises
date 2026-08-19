# Database Migrations Runbook

This project uses Supabase for database migrations.

## Automated Application
Migrations are automatically applied to the production database via GitHub Actions (`deploy-migrations` job in `certify.yml`) whenever code is pushed to `main` and passes all certification checks.
This guarantees that committed migrations always reach the database, preventing schema drift.

## Manual Apply Runbook (For One-time Catch-up or Recovery)
If you ever need to manually apply pending migrations to production (e.g. recovering from a stalled pipeline), follow these steps strictly:

1. **Take a Backup FIRST**
   Go to the Supabase Dashboard -> Database -> Backups, and trigger a manual backup. Do not skip this.

2. **Link the Project**
   ```bash
   supabase link --project-ref yyexmcaumkzxvhplipkl
   ```

3. **Push Migrations**
   This applies all pending migrations in chronological version order:
   ```bash
   supabase db push
   ```

4. **Handling Failures**
   If a migration fails, **fix it in the repository**, commit the fix, and re-run `supabase db push`.
   **NEVER edit the database by hand** to bypass a migration error, as it will cause permanent schema drift between code and production.

5. **Verify and Reload Cache**
   Confirm the new functions (e.g. `provision_full_tenant`) exist:
   ```sql
   SELECT proname FROM pg_proc WHERE proname='provision_full_tenant';
   ```
   Then reload PostgREST's schema cache so the API can see the new functions:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
   (Alternatively, use the Supabase Dashboard API settings to reload the schema cache).
