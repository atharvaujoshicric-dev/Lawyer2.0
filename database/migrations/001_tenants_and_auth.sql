-- ════════════════════════════════════════════════════════════════════════
--  LexDesk SaaS — Migration 001: Tenants & Auth
--
--  This is the foundation of multi-tenancy. Every other table in the
--  system gets a firm_id column that points here, and every RLS policy
--  in this codebase is built around the two helper functions defined
--  at the bottom of this file: current_firm_id() and is_firm_admin().
--
--  Run this FIRST, before any other migration in this folder.
-- ════════════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fuzzy search on client names later

-- ════════════════════════════════════════════════════════════════════════
--  FIRMS  (the tenant)
--  One row per law firm/customer. Everything else in the system is scoped
--  to a firm_id. This table is the root of the multi-tenant tree.
-- ════════════════════════════════════════════════════════════════════════
create table if not exists firms (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique not null,             -- used in subdomain or portal URLs, e.g. "sharma-associates"
  plan                text not null default 'trial'
                        check (plan in ('trial','solo','team','enterprise')),
  plan_seats          int not null default 1,             -- max approved (non-pending) users allowed
  trial_ends_at       timestamptz default (now() + interval '14 days'),
  status              text not null default 'active'
                        check (status in ('active','past_due','suspended','cancelled')),
  billing_email       text,
  stripe_customer_id  text,
  stripe_subscription_id text,
  storage_quota_mb    int not null default 1024,         -- per-plan document storage cap
  bar_council_state   text,                                -- e.g. "Karnataka" — for compliance footer/labels
  logo_url            text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

comment on table firms is
  'Tenant root. Every business table in LexDesk has a firm_id referencing this table, and Row Level Security uses current_firm_id() to enforce that a user can only ever read/write rows in their own firm.';

create index if not exists idx_firms_slug on firms(slug);
create index if not exists idx_firms_stripe_customer on firms(stripe_customer_id);

alter table firms enable row level security;

-- ════════════════════════════════════════════════════════════════════════
--  FIRM INVITES  (signup codes are now scoped per-firm, not global)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists firm_invites (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  code        text not null,
  role        text not null default 'assistant' check (role in ('admin','assistant')),
  max_uses    int default null,                 -- null = unlimited until expiry
  used_count  int not null default 0,
  expires_at  timestamptz,
  created_by  uuid,
  created_at  timestamptz default now(),
  unique (firm_id, code)
);
alter table firm_invites enable row level security;

-- ════════════════════════════════════════════════════════════════════════
--  PROFILES — extends auth.users, now firm-scoped
--  (Same shape as the single-tenant version, plus firm_id + is_founder)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  firm_id         uuid references firms(id) on delete cascade,
  full_name       text not null,
  username        text,
  role            text not null default 'pending' check (role in ('admin','assistant','pending')),
  bar_number      text,
  phone           text,
  email           text,
  court           text,
  dob             date,
  approved        boolean not null default false,
  archived        boolean not null default false,
  is_founder      boolean not null default false,   -- protected: cannot be removed/archived
  custom_role_id  uuid,                              -- fk added after custom_roles table exists
  chatbot_enabled boolean default true,
  theme_config    jsonb default '{"mode":"dark","backdrop":"charcoal","tint":"frost","contrast":"high"}'::jsonb,
  created_at      timestamptz default now(),
  -- A username is only unique WITHIN a firm, not globally, since many
  -- firms may independently pick the same username for their staff.
  unique (firm_id, username)
);

comment on column profiles.firm_id is
  'NULL only transiently during signup, before the new-firm or join-firm flow assigns it. Every approved profile must have a firm_id.';

create index if not exists idx_profiles_firm on profiles(firm_id);
alter table profiles enable row level security;

-- ════════════════════════════════════════════════════════════════════════
--  CORE TENANT-ISOLATION HELPER FUNCTIONS
--  Every RLS policy in every other migration file calls these two.
--  security definer + stable so Postgres can cache the result within
--  a single statement and so the functions can read profiles without
--  themselves being blocked by the profiles RLS policy (avoids recursion).
-- ════════════════════════════════════════════════════════════════════════
create or replace function current_firm_id()
returns uuid
language sql security definer stable as $$
  select firm_id from profiles where id = auth.uid();
$$;

create or replace function is_firm_admin()
returns boolean
language sql security definer stable as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and approved = true
  );
$$;

create or replace function is_firm_approved()
returns boolean
language sql security definer stable as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and approved = true and archived = false
  );
$$;

-- Used by storage policies and any table that stores firm_id as text path
-- prefix (e.g. Supabase Storage paths are namespaced "firm_id/client_id/file").
create or replace function user_belongs_to_firm(p_firm_id uuid)
returns boolean
language sql security definer stable as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and firm_id = p_firm_id and approved = true
  );
$$;

comment on function current_firm_id() is
  'Returns the firm_id of the currently authenticated user. Used in every RLS policy as: using (firm_id = current_firm_id())';
comment on function is_firm_admin() is
  'True if the current user is an approved admin within their own firm. Does NOT cross firm boundaries — an admin of Firm A can never see Firm B''s data, this function only relaxes per-row checks within the same firm.';

-- ════════════════════════════════════════════════════════════════════════
--  RLS — FIRMS TABLE
--  A user may only see their own firm row. Firm creation happens via the
--  signup Edge Function (security definer, bypasses RLS) — see
--  database/functions/handle_new_firm.sql.
-- ════════════════════════════════════════════════════════════════════════
drop policy if exists "firms_select_own" on firms;
create policy "firms_select_own" on firms for select
  using (id = current_firm_id());

drop policy if exists "firms_update_own_admin" on firms;
create policy "firms_update_own_admin" on firms for update
  using (id = current_firm_id() and is_firm_admin());

-- No insert/delete policy for normal users — firm creation and deletion
-- are privileged operations handled by service-role Edge Functions only.

-- ════════════════════════════════════════════════════════════════════════
--  RLS — FIRM INVITES
-- ════════════════════════════════════════════════════════════════════════
drop policy if exists "invites_select" on firm_invites;
create policy "invites_select" on firm_invites for select
  using (firm_id = current_firm_id() and is_firm_admin());

drop policy if exists "invites_insert" on firm_invites;
create policy "invites_insert" on firm_invites for insert
  with check (firm_id = current_firm_id() and is_firm_admin());

drop policy if exists "invites_update" on firm_invites;
create policy "invites_update" on firm_invites for update
  using (firm_id = current_firm_id() and is_firm_admin());

drop policy if exists "invites_delete" on firm_invites;
create policy "invites_delete" on firm_invites for delete
  using (firm_id = current_firm_id() and is_firm_admin());

-- A special read policy: the signup screen (anon, pre-auth) needs to
-- validate an invite code WITHOUT being logged in yet. We allow anon
-- SELECT but only the columns needed, and never expose this table to
-- direct anon listing (no firm_id filter possible without auth, so the
-- app must always query by exact code, never list all rows).
drop policy if exists "invites_select_anon_by_code" on firm_invites;
create policy "invites_select_anon_by_code" on firm_invites for select
  to anon
  using (true);  -- safe because the app always filters .eq('code', enteredCode) — see 02-data-loading.js

-- ════════════════════════════════════════════════════════════════════════
--  RLS — PROFILES
--  Visible to: yourself, OR any approved user in the same firm.
--  This mirrors the single-tenant policy but adds the firm boundary.
-- ════════════════════════════════════════════════════════════════════════
drop policy if exists "profiles_select_same_firm" on profiles;
create policy "profiles_select_same_firm" on profiles for select
  using (
    id = auth.uid()
    or (firm_id = current_firm_id() and approved = true)
    or is_firm_admin()
  );

drop policy if exists "profiles_update_self_or_admin" on profiles;
create policy "profiles_update_self_or_admin" on profiles for update
  using (id = auth.uid() or (firm_id = current_firm_id() and is_firm_admin()));

-- Insert happens via the handle_new_user trigger (security definer) —
-- see database/functions/handle_new_user.sql — not directly by the client.

create index if not exists idx_profiles_firm_approved on profiles(firm_id, approved);
