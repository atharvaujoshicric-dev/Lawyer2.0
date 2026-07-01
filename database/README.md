# LexDesk Database — Multi-Tenant Schema

This folder is the single source of truth for the LexDesk SaaS database.
It replaces the old single-tenant `supabase_schema.sql` — every table here
has a `firm_id` column and Row Level Security that enforces tenant
isolation through it.

## Apply order

Run these in the Supabase SQL Editor, **in this exact order**, on a fresh
project:

```
1. database/migrations/001_tenants_and_auth.sql
2. database/migrations/002_business_tables.sql
3. database/migrations/003_communication.sql
4. database/migrations/004_storage.sql
5. database/functions/onboarding.sql
```

Each file is idempotent (`create table if not exists`, `drop policy if
exists` before every `create policy`) so it is always safe to re-run the
whole sequence against an existing database — this is how future releases
ship schema changes (see `scripts/deploy-migration.sh`).

## Why this shape

**Every business table has `firm_id uuid references firms(id)`.** There is
no separate database per customer — all law firms share one Postgres
instance, isolated entirely by Row Level Security. This is what makes it a
real SaaS: you provision once, customers self-serve sign up, and adding a
new firm costs nothing but a row in `firms`.

**`current_firm_id()` and `is_firm_admin()`** (defined in migration 001)
are the only two functions every other policy is built from. If you ever
add a new table, the policy pattern is always:

```sql
create policy "mytable_select" on mytable for select
  using (firm_id = current_firm_id());
```

**Circular RLS is broken with `security definer` functions.** Three places
in this schema would otherwise deadlock Postgres's policy evaluator:
group chat (`chat_groups` ↔ `group_members`), notes sharing (`notes` ↔
`note_shares`), and firm membership checks inside `clients`/`tasks`
policies. Each is solved with a small `security definer stable` function
that bypasses RLS for just that one lookup — see `user_in_group()`,
`user_owns_note()`, `can_view_all_firm_clients()`.

**Firm creation and user-to-firm attachment never happen via direct
INSERT from the client.** They go through `create_firm_and_admin()` and
`join_firm_with_invite()` in `database/functions/onboarding.sql`, called
via `supabase.rpc(...)`. This is deliberate: the anon/authenticated
Postgres roles have no INSERT grant on `firms` at all, so even a
compromised or buggy client can never create a firm with someone else's
data, or attach a hostile user to the wrong tenant.

**Storage is namespaced by firm_id in the path itself**, not just a
database column — `database/migrations/004_storage.sql` parses
`(storage.foldername(name))[1]` and compares it to `current_firm_id()`.
The app must always upload to `{firm_id}/{client_id}/{filename}` (see
`assets/js/01-supabase-config.js`, `uploadFile()`).

## Local development

There's no local Postgres setup required for solo development — point your
`.env` at a free-tier Supabase project (see `docs/SETUP.md`) and run these
migrations there. For automated testing in CI, see
`docs/PRODUCTION_CHECKLIST.md` → "Database" section for the Supabase CLI
+ Docker workflow.

## Adding a new tenant table later

1. Add `firm_id uuid not null references firms(id) on delete cascade,`
2. Add `create index if not exists idx_<table>_firm on <table>(firm_id);`
3. `alter table <table> enable row level security;`
4. Write policies using `firm_id = current_firm_id()` as the base clause
5. Append to a new numbered migration file — never edit 001-004 once they
   have shipped to a production database; migrations are append-only.
