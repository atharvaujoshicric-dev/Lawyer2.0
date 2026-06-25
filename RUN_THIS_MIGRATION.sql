-- ════════════════════════════════════════════════════════
--  LexDesk — FULL MIGRATION (all versions)
--  Safe to run more than once on any existing install.
--  Supabase → SQL Editor → New Query → paste → Run
-- ════════════════════════════════════════════════════════

-- ────────────────────────────────────────────
--  HELPER FUNCTIONS
-- ────────────────────────────────────────────
create or replace function is_admin() returns boolean as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and approved = true
  );
$$ language sql security definer stable;

create or replace function is_approved() returns boolean as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and approved = true
  );
$$ language sql security definer stable;

-- Breaks the notes ↔ note_shares RLS circular dependency.
-- Called inside note policies — runs as the function owner (bypasses RLS)
-- so it can read note_shares without triggering notes policy again.
create or replace function user_has_note_share(p_note_id uuid, p_user_id uuid)
returns boolean as $$
  select exists(
    select 1 from note_shares
    where note_id = p_note_id and shared_with = p_user_id
  );
$$ language sql security definer stable;

create or replace function user_has_note_editor_share(p_note_id uuid, p_user_id uuid)
returns boolean as $$
  select exists(
    select 1 from note_shares
    where note_id = p_note_id and shared_with = p_user_id and permission = 'editor'
  );
$$ language sql security definer stable;

-- Used inside note_shares policies — reads notes without triggering
-- note_shares policy again.
create or replace function user_owns_note(p_note_id uuid, p_user_id uuid)
returns boolean as $$
  select exists(
    select 1 from notes
    where id = p_note_id and owner_id = p_user_id
  );
$$ language sql security definer stable;

-- ────────────────────────────────────────────
--  v3.1 fixes
-- ────────────────────────────────────────────
drop policy if exists "profiles_select_own_or_admin"     on profiles;
drop policy if exists "profiles_select_approved_or_self" on profiles;
create policy "profiles_select_approved_or_self" on profiles for select
  using (id = auth.uid() or is_admin() or (approved = true and is_approved()));

alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('open','in_progress','in_review','done','cancelled'));

alter table messages add column if not exists edited_at timestamptz;
alter table messages add column if not exists deleted   boolean default false;
drop policy if exists "messages_update" on messages;
create policy "messages_update" on messages for update
  using (sender_id = auth.uid() and created_at > (now() - interval '5 minutes'));

-- ────────────────────────────────────────────
--  v3.2 additions
-- ────────────────────────────────────────────
alter table clients add column if not exists contact_id text
  references clients(client_id);

create table if not exists payments (
  id           uuid    primary key default gen_random_uuid(),
  client_id    text    references clients(client_id) on delete cascade,
  amount       numeric not null check (amount > 0),
  payment_date date    not null default current_date,
  method       text,
  note         text,
  recorded_by  uuid    references profiles(id),
  created_at   timestamptz default now()
);
alter table payments enable row level security;
drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments for select
  using (is_admin() or exists(
    select 1 from clients c
    where c.client_id = payments.client_id and c.assigned_to = auth.uid()
  ));
drop policy if exists "payments_insert" on payments;
create policy "payments_insert" on payments for insert
  with check (is_admin() or exists(
    select 1 from clients c
    where c.client_id = payments.client_id and c.assigned_to = auth.uid()
  ));
drop policy if exists "payments_update" on payments;
create policy "payments_update" on payments for update
  using (is_admin() or recorded_by = auth.uid());
drop policy if exists "payments_delete" on payments;
create policy "payments_delete" on payments for delete
  using (is_admin() or recorded_by = auth.uid());

create table if not exists planner_notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references profiles(id) not null,
  note_date  date not null default current_date,
  time       text,
  content    text not null,
  done       boolean default false,
  created_at timestamptz default now()
);
alter table planner_notes enable row level security;
drop policy if exists "planner_select" on planner_notes;
create policy "planner_select" on planner_notes for select using (owner_id = auth.uid());
drop policy if exists "planner_insert" on planner_notes;
create policy "planner_insert" on planner_notes for insert with check (owner_id = auth.uid());
drop policy if exists "planner_update" on planner_notes;
create policy "planner_update" on planner_notes for update using (owner_id = auth.uid());
drop policy if exists "planner_delete" on planner_notes;
create policy "planner_delete" on planner_notes for delete using (owner_id = auth.uid());

create table if not exists onedrive_tokens (
  user_id        uuid primary key references profiles(id) on delete cascade,
  access_token   text,
  refresh_token  text,
  expires_at     timestamptz,
  root_folder_id text,
  updated_at     timestamptz default now()
);
alter table onedrive_tokens enable row level security;
drop policy if exists "onedrive_tokens_all" on onedrive_tokens;
create policy "onedrive_tokens_all" on onedrive_tokens for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ────────────────────────────────────────────
--  v3.3 — message read receipts
-- ────────────────────────────────────────────
create table if not exists message_reads (
  message_id uuid references messages(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  read_at    timestamptz default now(),
  primary key (message_id, user_id)
);
alter table message_reads enable row level security;
drop policy if exists "mreads_select" on message_reads;
create policy "mreads_select" on message_reads for select using (user_id = auth.uid());
drop policy if exists "mreads_insert" on message_reads;
create policy "mreads_insert" on message_reads for insert with check (user_id = auth.uid());
drop policy if exists "mreads_delete" on message_reads;
create policy "mreads_delete" on message_reads for delete using (user_id = auth.uid());

-- ────────────────────────────────────────────
--  v3.3 — note_shares  (created FIRST, no FK to notes yet)
-- ────────────────────────────────────────────
create table if not exists note_shares (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid,          -- FK added below after notes exists
  shared_with uuid references profiles(id) on delete cascade,
  permission  text not null check (permission in ('viewer','editor')),
  shared_by   uuid references profiles(id),
  shared_at   timestamptz default now(),
  unique (note_id, shared_with)
);
alter table note_shares enable row level security;

-- note_shares policies use user_owns_note() — no direct subquery on notes,
-- so no recursion here.
drop policy if exists "nshares_select" on note_shares;
create policy "nshares_select" on note_shares for select
  using (shared_with = auth.uid() or user_owns_note(note_id, auth.uid()));

drop policy if exists "nshares_insert" on note_shares;
create policy "nshares_insert" on note_shares for insert
  with check (user_owns_note(note_id, auth.uid()));

drop policy if exists "nshares_update" on note_shares;
create policy "nshares_update" on note_shares for update
  using (user_owns_note(note_id, auth.uid()));

drop policy if exists "nshares_delete" on note_shares;
create policy "nshares_delete" on note_shares for delete
  using (user_owns_note(note_id, auth.uid()));

-- ────────────────────────────────────────────
--  v3.3 — notes  (created after note_shares)
-- ────────────────────────────────────────────
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references profiles(id) not null,
  title      text not null,
  content    text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table notes enable row level security;

-- Add FK from note_shares → notes (idempotent)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'note_shares_note_id_fkey'
      and table_name = 'note_shares'
  ) then
    alter table note_shares
      add constraint note_shares_note_id_fkey
      foreign key (note_id) references notes(id) on delete cascade;
  end if;
end $$;

-- notes policies use user_has_note_share() / user_has_note_editor_share()
-- — security definer functions that read note_shares bypassing RLS,
-- so no recursion back into the notes policy.
drop policy if exists "notes_select" on notes;
create policy "notes_select" on notes for select
  using (
    owner_id = auth.uid()
    or user_has_note_share(id, auth.uid())
  );

drop policy if exists "notes_insert" on notes;
create policy "notes_insert" on notes for insert
  with check (owner_id = auth.uid());

drop policy if exists "notes_update" on notes;
create policy "notes_update" on notes for update
  using (
    owner_id = auth.uid()
    or user_has_note_editor_share(id, auth.uid())
  );

drop policy if exists "notes_delete" on notes;
create policy "notes_delete" on notes for delete
  using (owner_id = auth.uid());

-- ────────────────────────────────────────────
--  v3.3 — note history
-- ────────────────────────────────────────────
create table if not exists note_history (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid references notes(id) on delete cascade,
  changed_by uuid references profiles(id),
  snapshot   text not null,
  changed_at timestamptz default now()
);
alter table note_history enable row level security;
drop policy if exists "nhist_select" on note_history;
create policy "nhist_select" on note_history for select
  using (user_owns_note(note_id, auth.uid()));
drop policy if exists "nhist_insert" on note_history;
create policy "nhist_insert" on note_history for insert
  with check (is_approved());

-- ────────────────────────────────────────────
--  v3.3 — activity log
-- ────────────────────────────────────────────
create table if not exists activity_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id),
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  detail      jsonb,
  created_at  timestamptz default now()
);
alter table activity_log enable row level security;
drop policy if exists "actlog_select" on activity_log;
create policy "actlog_select" on activity_log for select
  using (
    (entity_type = 'client' and is_admin())
    or (entity_type = 'note' and user_owns_note(entity_id::uuid, auth.uid()))
  );
drop policy if exists "actlog_insert" on activity_log;
create policy "actlog_insert" on activity_log for insert
  with check (is_approved());

-- ────────────────────────────────────────────
--  v3.3 — note_id column on messages
-- ────────────────────────────────────────────
alter table messages
  add column if not exists note_id uuid references notes(id) on delete set null;

-- ────────────────────────────────────────────
--  STORAGE BUCKET
-- ────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('lexdesk-files', 'lexdesk-files', false)
  on conflict (id) do nothing;

drop policy if exists "storage_select" on storage.objects;
create policy "storage_select" on storage.objects for select
  using (bucket_id = 'lexdesk-files' and auth.role() = 'authenticated');
drop policy if exists "storage_insert" on storage.objects;
create policy "storage_insert" on storage.objects for insert
  with check (bucket_id = 'lexdesk-files' and auth.role() = 'authenticated');
drop policy if exists "storage_delete" on storage.objects;
create policy "storage_delete" on storage.objects for delete
  using (bucket_id = 'lexdesk-files' and auth.role() = 'authenticated');

-- ────────────────────────────────────────────
--  SANITY CHECKS
-- ────────────────────────────────────────────
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles','categories','form_schemas','clients','documents',
    'templates','tasks','task_comments','messages','signup_codes',
    'payments','planner_notes','onedrive_tokens','message_reads',
    'notes','note_shares','note_history','activity_log'
  )
order by table_name;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conname = 'tasks_status_check';

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_admin','is_approved',
    'user_has_note_share','user_has_note_editor_share','user_owns_note'
  );

-- ────────────────────────────────────────────
--  v3.4 additions
-- ────────────────────────────────────────────
-- DOB field in profiles
alter table profiles add column if not exists dob date;

-- ────────────────────────────────────────────
--  v3.5 additions (7 new features)
-- ────────────────────────────────────────────

-- ── Client portal tokens (magic link + PIN) ──
create table if not exists portal_tokens (
  id          uuid    primary key default gen_random_uuid(),
  client_id   text    references clients(client_id) on delete cascade,
  token       text    unique not null default gen_random_uuid()::text,
  pin_hash    text    not null,     -- sha256 hex of the 4-digit PIN
  expires_at  timestamptz not null default (now() + interval '90 days'),
  created_by  uuid    references profiles(id),
  created_at  timestamptz default now()
);
alter table portal_tokens enable row level security;
-- Admin and assigned lawyer can manage tokens; public (anon) can SELECT
-- (needed so the portal page can validate the token before auth)
drop policy if exists "portal_tokens_select" on portal_tokens;
create policy "portal_tokens_select" on portal_tokens for select using (true);
drop policy if exists "portal_tokens_insert" on portal_tokens;
create policy "portal_tokens_insert" on portal_tokens for insert
  with check (is_approved());
drop policy if exists "portal_tokens_delete" on portal_tokens;
create policy "portal_tokens_delete" on portal_tokens for delete
  using (is_admin() or created_by = auth.uid());

-- ── Invoice / firm settings ──
create table if not exists invoice_settings (
  id          uuid    primary key default gen_random_uuid(),
  firm_name   text    not null default 'Law Firm',
  firm_address text,
  firm_phone  text,
  firm_email  text,
  bar_number  text,
  footer_text text    default 'Thank you for your trust.',
  invoice_prefix text default 'INV',
  next_number int     default 1,
  created_by  uuid    references profiles(id),
  updated_at  timestamptz default now()
);
alter table invoice_settings enable row level security;
drop policy if exists "invoice_settings_select" on invoice_settings;
create policy "invoice_settings_select" on invoice_settings for select using (is_approved());
drop policy if exists "invoice_settings_insert" on invoice_settings;
create policy "invoice_settings_insert" on invoice_settings for insert with check (is_admin());
drop policy if exists "invoice_settings_update" on invoice_settings;
create policy "invoice_settings_update" on invoice_settings for update using (is_admin());

-- ── Template variables (extend existing templates table) ──
alter table templates add column if not exists
  variables jsonb default '[]'::jsonb;
-- variables: [{id, label, placeholder, type: text|date|number}]

-- ── Deadline rules (court filing calculator) ──
create table if not exists deadline_rules (
  id              uuid    primary key default gen_random_uuid(),
  category_id     text    references categories(id) on delete set null,
  rule_name       text    not null,
  statute         text,                        -- e.g. "CPC Order VIII Rule 1"
  trigger_field   text,                        -- field id in form_schema, or 'created_at'
  offset_days     int     not null default 30,
  offset_direction text   not null default 'after'
                          check (offset_direction in ('after','before')),
  description     text,
  is_active       boolean default true,
  created_by      uuid    references profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table deadline_rules enable row level security;
drop policy if exists "drules_select" on deadline_rules;
create policy "drules_select" on deadline_rules for select using (is_approved());
drop policy if exists "drules_insert" on deadline_rules;
create policy "drules_insert" on deadline_rules for insert with check (is_admin());
drop policy if exists "drules_update" on deadline_rules;
create policy "drules_update" on deadline_rules for update using (is_admin());
drop policy if exists "drules_delete" on deadline_rules;
create policy "drules_delete" on deadline_rules for delete using (is_admin());

-- ── Seed: common Indian court deadline rules ──
insert into deadline_rules
  (rule_name, statute, category_id, trigger_field, offset_days, offset_direction, description)
values
  ('Written Statement (Civil)', 'CPC Order VIII Rule 1', 'general', 'created_at', 30, 'after',
   'Defendant must file written statement within 30 days of service of summons'),
  ('Written Statement (Extended)', 'CPC Order VIII Rule 1 proviso', 'general', 'created_at', 90, 'after',
   'Court may extend up to 90 days from date of service'),
  ('First Appeal', 'CPC Section 96 r/w Order XLI', 'general', 'nextHearing', 90, 'after',
   '90 days from date of decree for first appeal to High Court'),
  ('Second Appeal', 'CPC Section 100', 'general', 'nextHearing', 90, 'after',
   '90 days from date of decree of first appellate court'),
  ('Revision Petition (CPC)', 'CPC Section 115', 'general', 'nextHearing', 90, 'after',
   '90 days from date of order for civil revision'),
  ('Bail Application Hearing', 'CrPC Section 437', 'general', 'created_at', 1, 'after',
   'Bail application should be heard within 24 hours of arrest/remand'),
  ('Charge Sheet Filing', 'CrPC Section 167(2)', 'general', 'created_at', 60, 'after',
   'Police must file charge sheet within 60 days for offences punishable with imprisonment < 10 years'),
  ('Charge Sheet (Serious)', 'CrPC Section 167(2) proviso', 'general', 'created_at', 90, 'after',
   'Police must file charge sheet within 90 days for offences punishable with death/life/≥10 years'),
  ('Criminal Appeal (Sessions)', 'CrPC Section 374', 'general', 'nextHearing', 90, 'after',
   '90 days from date of conviction for appeal to High Court'),
  ('Limitation — Contract', 'Limitation Act Article 55', 'general', 'created_at', 1095, 'after',
   '3 years (1095 days) from date of breach for suit on contract'),
  ('Limitation — Tort', 'Limitation Act Article 72-74', 'general', 'created_at', 1095, 'after',
   '3 years from date when injury/cause of action arose'),
  ('Limitation — Recovery of Land', 'Limitation Act Article 65', 'general', 'created_at', 4380, 'after',
   '12 years for suit for recovery of immovable property'),
  ('CERT-In Incident Reporting', 'IT Act Section 70B / CERT-In Rules', 'cyber', 'incidentDate', 6, 'after',
   '6 hours from detection of cybersecurity incident — report to CERT-In'),
  ('CERT-In Root Cause Report', 'CERT-In Directions 2022', 'cyber', 'incidentDate', 30, 'after',
   '30 days from incident for detailed root cause analysis report'),
  ('PDPB Data Breach Notification', 'DPDP Act Section 8', 'cyber', 'incidentDate', 72, 'after',
   '72 hours from discovery of personal data breach — notify Data Protection Board'),
  ('RBI Cyber Fraud Reporting', 'RBI Circular on Cyber Security', 'cyber', 'incidentDate', 1, 'after',
   '2–6 hours from detection of cyber fraud — report to RBI'),
  ('Rent Agreement Renewal Notice', 'Transfer of Property Act', 'rental', 'agreementExpiry', 30, 'before',
   'Give 30 days notice before lease expiry for renewal or vacation'),
  ('Eviction Notice Period', 'Transfer of Property Act Section 106', 'rental', 'agreementExpiry', 15, 'before',
   '15 days notice for month-to-month tenancy; longer for annual tenancy')
on conflict do nothing;

-- ── Seed invoice settings row (one per firm) ──
insert into invoice_settings (firm_name, invoice_prefix)
  select 'Law Firm', 'INV'
  where not exists (select 1 from invoice_settings);

-- ── Updated sanity check ──
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'portal_tokens','invoice_settings','deadline_rules'
  )
order by table_name;

-- ────────────────────────────────────────────
--  v3.6 additions
-- ────────────────────────────────────────────
_assign_tasks":false,"can_create_tasks":false,"can_view_finances":false,"can_manage_users":false,"can_view_documents":true,"can_export":false}', 4)
on conflict (name) do nothing;

-- ── Group chat ──
create table if not exists chat_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table chat_groups enable row level security;
drop policy if exists "cgroups_select" on chat_groups;
create policy "cgroups_select" on chat_groups for select
  using (exists(select 1 from group_members gm where gm.group_id=chat_groups.id and gm.user_id=auth.uid()));
drop policy if exists "cgroups_insert" on chat_groups;
create policy "cgroups_insert" on chat_groups for insert with check (is_approved());
drop policy if exists "cgroups_update" on chat_groups;
create policy "cgroups_update" on chat_groups for update
  using (exists(select 1 from group_members gm where gm.group_id=chat_groups.id and gm.user_id=auth.uid() and gm.is_admin=true));

create table if not exists group_members (
  group_id  uuid references chat_groups(id) on delete cascade,
  user_id   uuid references profiles(id) on delete cascade,
  is_admin  boolean default false,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);
alter table group_members enable row level security;
drop policy if exists "gmembers_select" on group_members;
create policy "gmembers_select" on group_members for select
  using (user_id=auth.uid() or exists(
    select 1 from group_members gm2 where gm2.group_id=group_members.group_id and gm2.user_id=auth.uid()
  ));
drop policy if exists "gmembers_insert" on group_members;
create policy "gmembers_insert" on group_members for insert
  with check (is_approved());
drop policy if exists "gmembers_delete" on group_members;
create policy "gmembers_delete" on group_members for delete
  using (user_id=auth.uid() or exists(
    select 1 from group_members gm where gm.group_id=group_members.group_id and gm.user_id=auth.uid() and gm.is_admin=true
  ));
drop policy if exists "gmembers_update" on group_members;
create policy "gmembers_update" on group_members for update using (is_admin());

-- messages: add group_id column
alter table messages add column if not exists group_id uuid references chat_groups(id) on delete cascade;

-- Update messages RLS to also allow group messages
drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages for select
  using (
    sender_id=auth.uid() or
    recipient_id=auth.uid() or
    recipient_id is null or
    (group_id is not null and exists(
      select 1 from group_members gm where gm.group_id=messages.group_id and gm.user_id=auth.uid()
    ))
  );

-- ── Sanity check ──
select table_name from information_schema.tables
where table_schema='public'
  and table_name in ('custom_roles','chat_groups','group_members')
order by table_name;

select column_name from information_schema.columns
where table_name='profiles'
  and column_name in ('is_founder','custom_role_id','archived');

-- ── Bot conversation cache (2-day rolling clear, localStorage-backed) ──
-- We store per-user bot chat in localStorage on the client side; the
-- settings preference (enabled/disabled) is stored in profiles.
alter table profiles add column if not exists chatbot_enabled boolean default true;

-- ── messages_insert: allow group messages ──
drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages for insert
  with check (
    is_approved() and (
      group_id is null or
      exists(select 1 from group_members gm where gm.group_id=messages.group_id and gm.user_id=auth.uid())
    )
  );

-- Final sanity check v3.6
select table_name from information_schema.tables
where table_schema='public'
  and table_name in ('custom_roles','chat_groups','group_members')
order by table_name;

select column_name from information_schema.columns
where table_name='profiles'
  and column_name in ('is_founder','custom_role_id','archived','chatbot_enabled');
