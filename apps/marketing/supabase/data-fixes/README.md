# Supabase data fixes

One-time, hand-run SQL against a specific production database. **These are not
migrations.** They live outside `supabase/migrations/` on purpose:

- they reference real production UUIDs, so they are meaningless against the
  empty database `supabase start` builds in CI;
- they carry assertions that would fail (correctly) on an empty database and
  take `test-migrations` down with them;
- they are run once, by a human, in the Supabase SQL editor.

Every fix ships with a matching `_ROLLBACK_` script and writes the pre-change
values into a backup table before touching anything, so it can always be undone.

## Running one

1. Open the Supabase SQL editor for the target project.
2. Paste the forward script whole and run it. It is wrapped in a single
   `BEGIN … COMMIT`; if any assertion fails, nothing is committed.
3. Verify with the checks named in the script header.
4. If something is wrong, paste and run the matching `_ROLLBACK_` script.

## Index

| Date | Script | What it does |
| --- | --- | --- |
| 2026-09-02 | `20260902_consolidate_orgs_into_roberts.sql` | Moves 3,692 appointment requests, 3,094 customers and their related rows off the two legacy top-level businesses (I Do Bridal Couture, Proper & Company) into the Roberts Enterprises organization, remapped onto its brand-scoped locations. Requires the brand-scoped location resolution in `worker/src/modules/scheduling/publicIntake.ts` to be deployed first, or the form bridge will reject submissions as ambiguous. |
