-- ═══════════════════════════════════════════════════════════════════════════
-- LexDesk Enterprise — FULL DATABASE RESET & REBUILD
-- 
-- ⚠️  WARNING: This DROPS all existing LexDesk tables and recreates them.
--     Your auth.users (Supabase logins) are PRESERVED.
--     All case data, clients, messages, documents WILL BE DELETED.
--
-- HOW TO RUN:
--   1. Go to your Supabase project → SQL Editor
--   2. Paste this entire file → Click Run
--   3. Wait for "Success" confirmation
--   4. After run: find your user email in the output at the bottom
--      and run the admin grant query shown there
--
-- Run order: This is a single file — run it all at once.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 1: DROP ALL OLD TABLES (in dependency order) ────────────────────

drop table if exists deadline_rules      cascade;
drop table if exists invoice_settings    cascade;
drop table if exists portal_tokens       cascade;
drop table if exists note_history        cascade;
drop table if exists note_shares         cascade;
drop table if exists notes               cascade;
drop table if exists activity_log        cascade;
drop table if exists message_reads       cascade;
drop table if exists task_comments       cascade;
drop table if exists messages            cascade;
drop table if exists group_members       cascade;
drop table if exists chat_groups         cascade;
drop table if exists payments            cascade;
drop table if exists documents           cascade;
drop table if exists tasks               cascade;
drop table if exists templates           cascade;
drop table if exists planner_notes       cascade;
drop table if exists form_schemas        cascade;
drop table if exists clients             cascade;
drop table if exists custom_roles        cascade;
drop table if exists signup_codes        cascade;
drop table if exists firm_invites        cascade;
drop table if exists categories          cascade;
drop table if exists profiles            cascade;
drop table if exists onedrive_tokens     cascade;

-- Drop old functions
drop function if exists is_admin()              cascade;
drop function if exists is_approved()           cascade;
drop function if exists user_has_note_share(uuid,uuid)  cascade;
drop function if exists user_has_note_editor_share(uuid,uuid) cascade;
drop function if exists user_owns_note(uuid,uuid)       cascade;
drop function if exists user_in_group(uuid,uuid)        cascade;
drop function if exists user_is_group_admin(uuid,uuid)  cascade;

-- ── STEP 2: REBUILD SCHEMA ────────────────────────────────────────────────

-- ── HELPER: auto-update updated_at ──────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ── PROFILES (extends Supabase auth.users) ──────────────────────────────
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null default '',
  email           text,
  phone           text,
  bar_number      text,
  court           text,
  dob             date,
  role            text not null default 'pending'
                    check (role in ('admin','assistant','pending')),
  approved        boolean not null default false,
  is_founder      boolean not null default false,
  archived        boolean not null default false,
  custom_role_id  uuid,
  chatbot_enabled boolean not null default true,
  theme           text default 'dark' check (theme in ('dark','light')),
  theme_config    jsonb default '{"mode":"dark","backdrop":"charcoal","tint":"frost","contrast":"high"}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ── CUSTOM ROLES ─────────────────────────────────────────────────────────
create table custom_roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  permissions jsonb not null default '{}',
  sort_order  int default 99,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_custom_roles_updated_at before update on custom_roles
  for each row execute function set_updated_at();

-- Add FK from profiles to custom_roles
alter table profiles add constraint profiles_custom_role_id_fkey
  foreign key (custom_role_id) references custom_roles(id) on delete set null;

-- ── SIGNUP CODES (invite codes for joining the firm) ─────────────────────
create table signup_codes (
  code        text primary key,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  active      boolean not null default true
);

-- ── CATEGORIES (case types) ──────────────────────────────────────────────
create table categories (
  id          text primary key,  -- slug like 'cyber','civil','general'
  label       text not null,
  icon        text default 'fas fa-folder',
  color       text default 'blue',
  built_in    boolean default false,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── FORM SCHEMAS (dynamic fields per category) ───────────────────────────
create table form_schemas (
  category_id text primary key references categories(id) on delete cascade,
  fields      jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

-- ── CLIENTS (cases) ──────────────────────────────────────────────────────
create table clients (
  client_id   text primary key,
  contact_id  text references clients(client_id) on delete set null,
  name        text not null,
  case_type   text references categories(id) on delete set null,
  status      text not null default 'active'
                check (status in ('active','pending','closed')),
  phone       text,
  email       text,
  address     text,
  fee         numeric,
  notes       text,
  case_data   jsonb not null default '{}',
  assigned_to uuid references profiles(id) on delete set null,
  created_by  uuid references profiles(id) on delete set null,
  history     jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_clients_status      on clients(status);
create index idx_clients_case_type   on clients(case_type);
create index idx_clients_assigned_to on clients(assigned_to);
create trigger trg_clients_updated_at before update on clients
  for each row execute function set_updated_at();

-- ── DOCUMENTS ────────────────────────────────────────────────────────────
create table documents (
  id           uuid primary key default gen_random_uuid(),
  client_id    text references clients(client_id) on delete cascade,
  name         text not null,
  category     text,
  size         bigint,
  mime_type    text,
  storage_path text,
  uploaded_by  uuid references profiles(id) on delete set null,
  uploaded_at  timestamptz not null default now()
);
create index idx_documents_client on documents(client_id);

-- ── TEMPLATES ────────────────────────────────────────────────────────────
create table templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,
  content     text not null default '',
  variables   jsonb not null default '[]',
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_templates_updated_at before update on templates
  for each row execute function set_updated_at();

-- ── TASKS ────────────────────────────────────────────────────────────────
-- Status includes both 'done' (legacy) and 'approved' for completeness
create table tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  client_id   text references clients(client_id) on delete set null,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  status      text not null default 'open'
                check (status in ('open','in_progress','in_review','done','approved','rework','cancelled')),
  priority    text not null default 'medium'
                check (priority in ('low','medium','high','urgent')),
  due_date    date,
  review_note text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_tasks_assigned_to on tasks(assigned_to);
create index idx_tasks_status      on tasks(status);
create trigger trg_tasks_updated_at before update on tasks
  for each row execute function set_updated_at();

-- ── TASK COMMENTS ────────────────────────────────────────────────────────
create table task_comments (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid references tasks(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  body      text not null,
  created_at timestamptz not null default now()
);

-- ── CHAT GROUPS ──────────────────────────────────────────────────────────
create table chat_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── GROUP MEMBERS ─────────────────────────────────────────────────────────
create table group_members (
  group_id  uuid references chat_groups(id) on delete cascade,
  user_id   uuid references profiles(id) on delete cascade,
  is_admin  boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index idx_group_members_user on group_members(user_id);

-- ── MESSAGES ─────────────────────────────────────────────────────────────
create table messages (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid references profiles(id) on delete set null,
  recipient_id    uuid references profiles(id) on delete set null,
  group_id        uuid references chat_groups(id) on delete cascade,
  body            text,
  attachment_path text,
  attachment_name text,
  note_id         uuid,  -- FK added after notes table
  edited_at       timestamptz,
  deleted         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index idx_messages_sender    on messages(sender_id);
create index idx_messages_recipient on messages(recipient_id);
create index idx_messages_group     on messages(group_id);
create index idx_messages_created   on messages(created_at desc);

-- ── MESSAGE READS ─────────────────────────────────────────────────────────
create table message_reads (
  message_id uuid references messages(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- ── PAYMENTS ─────────────────────────────────────────────────────────────
create table payments (
  id           uuid primary key default gen_random_uuid(),
  client_id    text references clients(client_id) on delete cascade,
  amount       numeric not null check (amount > 0),
  payment_date date not null default current_date,
  method       text,
  note         text,
  recorded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index idx_payments_client on payments(client_id);

-- ── PLANNER NOTES ─────────────────────────────────────────────────────────
create table planner_notes (
  id        uuid primary key default gen_random_uuid(),
  owner_id  uuid references profiles(id) on delete cascade not null,
  note_date date not null default current_date,
  time      text,
  content   text not null,
  done      boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_planner_owner_date on planner_notes(owner_id, note_date);

-- ── NOTES ────────────────────────────────────────────────────────────────
create table notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references profiles(id) on delete cascade not null,
  title      text not null default 'Untitled Note',
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_notes_owner on notes(owner_id);
create trigger trg_notes_updated_at before update on notes
  for each row execute function set_updated_at();

-- Add FK from messages to notes now that notes exists
alter table messages add constraint messages_note_id_fkey
  foreign key (note_id) references notes(id) on delete set null;

-- ── NOTE SHARES ───────────────────────────────────────────────────────────
create table note_shares (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid references notes(id) on delete cascade,
  shared_with uuid references profiles(id) on delete cascade,
  permission  text not null check (permission in ('viewer','editor')),
  shared_by   uuid references profiles(id) on delete set null,
  shared_at   timestamptz not null default now(),
  unique (note_id, shared_with)
);

-- ── NOTE HISTORY ──────────────────────────────────────────────────────────
create table note_history (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid references notes(id) on delete cascade,
  changed_by uuid references profiles(id) on delete set null,
  snapshot   text not null,
  changed_at timestamptz not null default now()
);

-- ── ACTIVITY LOG ──────────────────────────────────────────────────────────
create table activity_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index idx_activity_actor    on activity_log(actor_id, created_at desc);
create index idx_activity_entity   on activity_log(entity_type, entity_id);

-- ── PORTAL TOKENS ─────────────────────────────────────────────────────────
create table portal_tokens (
  id          uuid primary key default gen_random_uuid(),
  client_id   text references clients(client_id) on delete cascade,
  token       text unique not null default gen_random_uuid()::text,
  pin_hash    text not null,
  expires_at  timestamptz not null default (now() + interval '90 days'),
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index idx_portal_tokens_client on portal_tokens(client_id);
create index idx_portal_tokens_token  on portal_tokens(token);

-- ── INVOICE SETTINGS ──────────────────────────────────────────────────────
create table invoice_settings (
  id              uuid primary key default gen_random_uuid(),
  firm_name       text not null default 'Law Firm',
  firm_address    text,
  firm_phone      text,
  firm_email      text,
  bar_number      text,
  footer_text     text default 'Thank you for your trust.',
  invoice_prefix  text not null default 'INV',
  next_number     int  not null default 1,
  created_by      uuid references profiles(id) on delete set null,
  updated_at      timestamptz not null default now()
);
create trigger trg_invoice_updated_at before update on invoice_settings
  for each row execute function set_updated_at();

-- ── DEADLINE RULES ────────────────────────────────────────────────────────
create table deadline_rules (
  id               uuid primary key default gen_random_uuid(),
  category_id      text references categories(id) on delete set null,
  rule_name        text not null,
  statute          text,
  trigger_field    text,
  offset_days      int  not null default 30,
  offset_direction text not null default 'after'
                     check (offset_direction in ('after','before')),
  description      text,
  is_active        boolean not null default true,
  created_by       uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_deadlines_updated_at before update on deadline_rules
  for each row execute function set_updated_at();

-- ── STORAGE BUCKET ────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('lexdesk-files', 'lexdesk-files', false)
  on conflict (id) do nothing;


-- ── STEP 3: ENABLE ROW LEVEL SECURITY ────────────────────────────────────
alter table profiles         enable row level security;
alter table custom_roles     enable row level security;
alter table signup_codes     enable row level security;
alter table categories       enable row level security;
alter table form_schemas     enable row level security;
alter table clients          enable row level security;
alter table documents        enable row level security;
alter table templates        enable row level security;
alter table tasks            enable row level security;
alter table task_comments    enable row level security;
alter table chat_groups      enable row level security;
alter table group_members    enable row level security;
alter table messages         enable row level security;
alter table message_reads    enable row level security;
alter table payments         enable row level security;
alter table planner_notes    enable row level security;
alter table notes            enable row level security;
alter table note_shares      enable row level security;
alter table note_history     enable row level security;
alter table activity_log     enable row level security;
alter table portal_tokens    enable row level security;
alter table invoice_settings enable row level security;
alter table deadline_rules   enable row level security;


-- ── STEP 4: HELPER FUNCTIONS ──────────────────────────────────────────────
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and approved = true and archived = false
  );
$$;

create or replace function is_approved()
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and approved = true and archived = false
  );
$$;

create or replace function user_owns_note(p_note_id uuid, p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists(select 1 from notes where id = p_note_id and owner_id = p_user_id);
$$;

create or replace function user_has_note_share(p_note_id uuid, p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists(select 1 from note_shares where note_id = p_note_id and shared_with = p_user_id);
$$;

create or replace function user_has_note_editor_share(p_note_id uuid, p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from note_shares
    where note_id = p_note_id and shared_with = p_user_id and permission = 'editor'
  );
$$;

create or replace function user_in_group(p_group_id uuid, p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from group_members where group_id = p_group_id and user_id = p_user_id
  );
$$;

create or replace function user_is_group_admin(p_group_id uuid, p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from group_members
    where group_id = p_group_id and user_id = p_user_id and is_admin = true
  );
$$;


-- ── STEP 5: ROW LEVEL SECURITY POLICIES ──────────────────────────────────

-- PROFILES
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or is_admin() or (approved = true and is_approved()));
create policy "profiles_insert" on profiles for insert
  with check (id = auth.uid());
create policy "profiles_update" on profiles for update
  using (id = auth.uid() or is_admin());

-- CUSTOM ROLES
create policy "croles_select" on custom_roles for select using (is_approved());
create policy "croles_write"  on custom_roles for all   using (is_admin()) with check (is_admin());

-- SIGNUP CODES
create policy "codes_select" on signup_codes for select using (true);
create policy "codes_insert" on signup_codes for insert with check (is_admin());
create policy "codes_update" on signup_codes for update using (is_admin());

-- CATEGORIES
create policy "cats_select" on categories for select using (is_approved());
create policy "cats_insert" on categories for insert with check (is_admin());
create policy "cats_update" on categories for update using (is_admin());
create policy "cats_delete" on categories for delete using (is_admin());

-- FORM SCHEMAS
create policy "schemas_select" on form_schemas for select using (is_approved());
create policy "schemas_insert" on form_schemas for insert with check (is_admin());
create policy "schemas_update" on form_schemas for update using (is_admin());

-- CLIENTS
create policy "clients_select" on clients for select
  using (is_admin() or assigned_to = auth.uid());
create policy "clients_insert" on clients for insert
  with check (is_approved());
create policy "clients_update" on clients for update
  using (is_admin() or assigned_to = auth.uid());
create policy "clients_delete" on clients for delete
  using (is_admin());

-- DOCUMENTS
create policy "docs_select" on documents for select
  using (is_admin() or exists(
    select 1 from clients c where c.client_id = documents.client_id
      and c.assigned_to = auth.uid()
  ));
create policy "docs_insert" on documents for insert with check (is_approved());
create policy "docs_delete" on documents for delete
  using (is_admin() or uploaded_by = auth.uid());

-- TEMPLATES
create policy "tmpl_select" on templates for select using (is_approved());
create policy "tmpl_insert" on templates for insert with check (is_approved());
create policy "tmpl_update" on templates for update
  using (is_admin() or created_by = auth.uid());
create policy "tmpl_delete" on templates for delete
  using (is_admin() or created_by = auth.uid());

-- TASKS
create policy "tasks_select" on tasks for select
  using (is_admin() or assigned_to = auth.uid() or assigned_by = auth.uid());
create policy "tasks_insert" on tasks for insert with check (is_approved());
create policy "tasks_update" on tasks for update
  using (is_admin() or assigned_to = auth.uid() or assigned_by = auth.uid());
create policy "tasks_delete" on tasks for delete
  using (is_admin() or assigned_by = auth.uid());

-- TASK COMMENTS
create policy "tcomments_select" on task_comments for select
  using (is_admin() or exists(
    select 1 from tasks t where t.id = task_comments.task_id
      and (t.assigned_to = auth.uid() or t.assigned_by = auth.uid())
  ));
create policy "tcomments_insert" on task_comments for insert with check (is_approved());

-- CHAT GROUPS
create policy "cgroups_select" on chat_groups for select
  using (user_in_group(id, auth.uid()));
create policy "cgroups_insert" on chat_groups for insert
  with check (auth.uid() is not null and is_approved());
create policy "cgroups_update" on chat_groups for update
  using (user_is_group_admin(id, auth.uid()) or is_admin());
create policy "cgroups_delete" on chat_groups for delete
  using (created_by = auth.uid() or is_admin());

-- GROUP MEMBERS
create policy "gmembers_select" on group_members for select
  using (user_id = auth.uid() or user_in_group(group_id, auth.uid()));
create policy "gmembers_insert" on group_members for insert
  with check (is_approved());
create policy "gmembers_update" on group_members for update
  using (user_is_group_admin(group_id, auth.uid()) or is_admin());
create policy "gmembers_delete" on group_members for delete
  using (user_id = auth.uid() or user_is_group_admin(group_id, auth.uid()) or is_admin());

-- MESSAGES
create policy "messages_select" on messages for select
  using (
    sender_id = auth.uid() or
    recipient_id = auth.uid() or
    recipient_id is null or
    (group_id is not null and user_in_group(group_id, auth.uid()))
  );
create policy "messages_insert" on messages for insert
  with check (
    is_approved() and
    sender_id = auth.uid() and
    (group_id is null or user_in_group(group_id, auth.uid()))
  );
create policy "messages_update" on messages for update
  using (sender_id = auth.uid() and created_at > (now() - interval '5 minutes'));

-- MESSAGE READS
create policy "mreads_select" on message_reads for select using (user_id = auth.uid());
create policy "mreads_insert" on message_reads for insert with check (user_id = auth.uid());
create policy "mreads_delete" on message_reads for delete using (user_id = auth.uid());

-- PAYMENTS
create policy "pay_select" on payments for select
  using (is_admin() or exists(
    select 1 from clients c where c.client_id = payments.client_id
      and c.assigned_to = auth.uid()
  ));
create policy "pay_insert" on payments for insert
  with check (is_admin() or exists(
    select 1 from clients c where c.client_id = payments.client_id
      and c.assigned_to = auth.uid()
  ));
create policy "pay_update" on payments for update
  using (is_admin() or recorded_by = auth.uid());
create policy "pay_delete" on payments for delete
  using (is_admin() or recorded_by = auth.uid());

-- PLANNER
create policy "planner_select" on planner_notes for select using (owner_id = auth.uid());
create policy "planner_insert" on planner_notes for insert with check (owner_id = auth.uid());
create policy "planner_update" on planner_notes for update using (owner_id = auth.uid());
create policy "planner_delete" on planner_notes for delete using (owner_id = auth.uid());

-- NOTES
create policy "notes_select" on notes for select
  using (owner_id = auth.uid() or user_has_note_share(id, auth.uid()));
create policy "notes_insert" on notes for insert with check (owner_id = auth.uid());
create policy "notes_update" on notes for update
  using (owner_id = auth.uid() or user_has_note_editor_share(id, auth.uid()));
create policy "notes_delete" on notes for delete using (owner_id = auth.uid());

-- NOTE SHARES
create policy "nshares_select" on note_shares for select
  using (shared_with = auth.uid() or user_owns_note(note_id, auth.uid()));
create policy "nshares_insert" on note_shares for insert
  with check (user_owns_note(note_id, auth.uid()));
create policy "nshares_update" on note_shares for update
  using (user_owns_note(note_id, auth.uid()));
create policy "nshares_delete" on note_shares for delete
  using (user_owns_note(note_id, auth.uid()));

-- NOTE HISTORY
create policy "nhist_select" on note_history for select
  using (user_owns_note(note_id, auth.uid()));
create policy "nhist_insert" on note_history for insert with check (is_approved());

-- ACTIVITY LOG
create policy "actlog_select" on activity_log for select using (is_admin());
create policy "actlog_insert" on activity_log for insert with check (is_approved());

-- PORTAL TOKENS
create policy "portal_select" on portal_tokens for select using (true);
create policy "portal_insert" on portal_tokens for insert with check (is_approved());
create policy "portal_delete" on portal_tokens for delete
  using (is_admin() or created_by = auth.uid());

-- INVOICE SETTINGS
create policy "inv_select" on invoice_settings for select using (is_approved());
create policy "inv_insert" on invoice_settings for insert with check (is_admin());
create policy "inv_update" on invoice_settings for update using (is_admin());

-- DEADLINE RULES
create policy "drules_select" on deadline_rules for select using (is_approved());
create policy "drules_insert" on deadline_rules for insert with check (is_admin());
create policy "drules_update" on deadline_rules for update using (is_admin());
create policy "drules_delete" on deadline_rules for delete using (is_admin());

-- STORAGE
drop policy if exists "storage_select" on storage.objects;
drop policy if exists "storage_insert" on storage.objects;
drop policy if exists "storage_delete" on storage.objects;
create policy "storage_select" on storage.objects for select
  using (bucket_id = 'lexdesk-files' and auth.role() = 'authenticated');
create policy "storage_insert" on storage.objects for insert
  with check (bucket_id = 'lexdesk-files' and auth.role() = 'authenticated');
create policy "storage_delete" on storage.objects for delete
  using (bucket_id = 'lexdesk-files' and auth.role() = 'authenticated');


-- ── STEP 6: SEED DEFAULT DATA ─────────────────────────────────────────────

-- Default categories
insert into categories (id, label, icon, color, built_in) values
  ('cyber',     'Cybersecurity / IT Law', 'fas fa-shield-alt',   'blue',   true),
  ('civil',     'Civil Law',              'fas fa-balance-scale', 'indigo', true),
  ('criminal',  'Criminal Law',           'fas fa-gavel',         'red',    true),
  ('corporate', 'Corporate / Company',    'fas fa-building',      'amber',  true),
  ('family',    'Family Law',             'fas fa-heart',         'pink',   true),
  ('tax',       'Tax / GST',              'fas fa-receipt',       'green',  true),
  ('labour',    'Labour Law',             'fas fa-people-carry',  'orange', true),
  ('property',  'Property / Rental',      'fas fa-home',          'teal',   true),
  ('consumer',  'Consumer Law',           'fas fa-user-shield',   'purple', true),
  ('general',   'General Practice',       'fas fa-folder',        'gray',   true)
on conflict (id) do nothing;

-- Form schemas
insert into form_schemas (category_id, fields) values
('cyber', '[
  {"id":"incidentDate","label":"Incident Date","type":"date","required":true},
  {"id":"breachType","label":"Breach Type","type":"select","required":true,"options":["Ransomware Attack","Data Exfiltration","Phishing / Social Engineering","Unauthorized Access","DDoS Attack","Insider Threat","Supply Chain Compromise","Zero-Day Exploit","Other"]},
  {"id":"affectedSystems","label":"Affected Systems","type":"text","required":false},
  {"id":"recordsCompromised","label":"Records Compromised","type":"number","required":false},
  {"id":"regulatoryBody","label":"Regulatory Body","type":"select","required":false,"options":["CERT-In (India)","DPDP Board","RBI Guidelines","SEBI Guidelines","GDPR (EU)","HIPAA (US)","Other"]},
  {"id":"certInReported","label":"CERT-In Reported","type":"select","required":false,"options":["No","Yes","In Progress"]},
  {"id":"incidentSummary","label":"Incident Summary","type":"textarea","required":false},
  {"id":"forensicReport","label":"Forensic Report Filed","type":"select","required":false,"options":["No","Yes","In Progress"]},
  {"id":"oppositeParty","label":"Opposite Party / Accused","type":"text","required":false},
  {"id":"court","label":"Court / Tribunal","type":"text","required":false},
  {"id":"caseNumber","label":"Case Number","type":"text","required":false},
  {"id":"nextHearing","label":"Next Hearing Date","type":"date","required":false}
]'::jsonb),
('civil', '[
  {"id":"oppositeParty","label":"Opposite Party","type":"text","required":true},
  {"id":"court","label":"Court / Tribunal","type":"text","required":true},
  {"id":"caseNumber","label":"Case Number","type":"text","required":false},
  {"id":"judge","label":"Judge / Bench","type":"text","required":false},
  {"id":"nextHearing","label":"Next Hearing Date","type":"date","required":false},
  {"id":"stage","label":"Stage of Proceedings","type":"select","required":false,"options":["Filing / Pleading Stage","Evidence Stage","Arguments Stage","Judgment Pending","Appeal Filed","Execution Proceedings","Settled / Disposed"]},
  {"id":"relief","label":"Relief Sought","type":"textarea","required":false}
]'::jsonb),
('criminal', '[
  {"id":"fir","label":"FIR Number","type":"text","required":false},
  {"id":"policeStation","label":"Police Station","type":"text","required":false},
  {"id":"sections","label":"Sections Applied","type":"text","required":false},
  {"id":"court","label":"Court","type":"text","required":false},
  {"id":"caseNumber","label":"Case Number","type":"text","required":false},
  {"id":"nextHearing","label":"Next Hearing Date","type":"date","required":false},
  {"id":"bailStatus","label":"Bail Status","type":"select","required":false,"options":["In Custody","Bail Granted","Bail Application Pending","Anticipatory Bail","Released on PR Bond"]},
  {"id":"oppositeParty","label":"Complainant / Opposite Party","type":"text","required":false}
]'::jsonb),
('general', '[
  {"id":"matterDescription","label":"Matter Description","type":"text","required":true},
  {"id":"practiceArea","label":"Practice Area","type":"select","required":false,"options":["Civil Law","Criminal Law","Corporate Law","Family Law","Labour Law","Constitutional Law","Consumer Law","Intellectual Property","Tax Law","Other"]},
  {"id":"court","label":"Court / Tribunal","type":"text","required":false},
  {"id":"caseNumber","label":"Case Number / FIR","type":"text","required":false},
  {"id":"oppositeParty","label":"Opposite Party","type":"text","required":false},
  {"id":"nextHearing","label":"Next Hearing Date","type":"date","required":false},
  {"id":"judge","label":"Judge / Bench","type":"text","required":false},
  {"id":"stage","label":"Stage of Proceedings","type":"select","required":false,"options":["Filing / Pleading Stage","Evidence Stage","Arguments Stage","Judgment Pending","Appeal Filed","Execution Proceedings","Settled / Disposed"]}
]'::jsonb)
on conflict (category_id) do nothing;

-- Default invoice settings row
insert into invoice_settings (firm_name, invoice_prefix)
  select 'Law Firm', 'INV'
  where not exists (select 1 from invoice_settings);

-- Default custom roles
insert into custom_roles (name, permissions, sort_order) values
  ('Senior Advocate',  '{"can_view_all_clients":true,"can_add_clients":true,"can_delete_clients":true,"can_assign_tasks":true,"can_create_tasks":true,"can_view_finances":true,"can_manage_users":true,"can_view_documents":true,"can_export":true}', 1),
  ('Junior Advocate',  '{"can_view_all_clients":false,"can_add_clients":true,"can_delete_clients":false,"can_assign_tasks":true,"can_create_tasks":true,"can_view_finances":false,"can_manage_users":false,"can_view_documents":true,"can_export":true}', 2),
  ('Senior Assistant', '{"can_view_all_clients":false,"can_add_clients":true,"can_delete_clients":false,"can_assign_tasks":false,"can_create_tasks":false,"can_view_finances":false,"can_manage_users":false,"can_view_documents":true,"can_export":false}', 3),
  ('Junior Assistant', '{"can_view_all_clients":false,"can_add_clients":false,"can_delete_clients":false,"can_assign_tasks":false,"can_create_tasks":false,"can_view_finances":false,"can_manage_users":false,"can_view_documents":true,"can_export":false}', 4)
on conflict (name) do nothing;

-- Deadline rules
insert into deadline_rules (rule_name, statute, category_id, trigger_field, offset_days, offset_direction, description) values
  ('Written Statement',           'CPC Order VIII Rule 1',          'general',  'created_at',   30,   'after',  'File written statement within 30 days of service'),
  ('Written Statement Extended',  'CPC Order VIII Rule 1 proviso',  'general',  'created_at',   90,   'after',  'Court may extend to 90 days maximum'),
  ('First Appeal',                'CPC Section 96',                 'general',  'nextHearing',  90,   'after',  '90 days from decree for first appeal'),
  ('Second Appeal',               'CPC Section 100',                'general',  'nextHearing',  90,   'after',  '90 days from first appellate decree'),
  ('Revision Petition',           'CPC Section 115',                'general',  'nextHearing',  90,   'after',  '90 days from order for civil revision'),
  ('Bail Application Hearing',    'BNSS Section 480',               'criminal', 'created_at',   1,    'after',  'Bail should be heard within 24 hours'),
  ('Zero FIR Transfer',           'BNSS Section 173',               'criminal', 'created_at',   15,   'after',  'Zero FIR must be transferred to jurisdiction station within 15 days'),
  ('Anticipatory Bail Reply',     'BNSS Section 482',               'criminal', 'created_at',   3,    'after',  'Prosecution to file reply within 3 days'),
  ('Charge Sheet',                'BNSS Section 193',               'criminal', 'created_at',   60,   'after',  'Police must file charge sheet within 60 days'),
  ('Charge Sheet Serious',        'BNSS Section 193 proviso',       'criminal', 'created_at',   90,   'after',  '90 days for death/life sentence offences'),
  ('Criminal Appeal',             'BNSS Section 415',               'criminal', 'nextHearing',  90,   'after',  '90 days from conviction for appeal'),
  ('Contract Limitation',         'Limitation Act Article 55',      'general',  'created_at',   1095, 'after',  '3 years from breach of contract'),
  ('Tort Limitation',             'Limitation Act Article 72',      'general',  'created_at',   1095, 'after',  '3 years from cause of action in tort'),
  ('Land Recovery Limitation',    'Limitation Act Article 65',      'general',  'created_at',   4380, 'after',  '12 years for recovery of immovable property'),
  ('CERT-In Incident Report',     'CERT-In Directions 2022',        'cyber',    'incidentDate', 0,    'after',  '6 hours from detection to report to CERT-In'),
  ('CERT-In Root Cause Analysis', 'CERT-In Directions 2022',        'cyber',    'incidentDate', 30,   'after',  '30 days for root cause analysis report'),
  ('DPDP Data Breach Notice',     'DPDP Act 2023 Section 8',        'cyber',    'incidentDate', 0,    'after',  'Immediate notification to Data Protection Board'),
  ('Rent Renewal Notice',         'Transfer of Property Act',       'property', 'created_at',   30,   'before', '30 days notice before lease expiry'),
  ('Eviction Notice',             'TPA Section 106',                'property', 'created_at',   15,   'before', '15 days notice for month-to-month tenancy'),
  ('GST Appeal',                  'CGST Act Section 112',           'tax',      'created_at',   90,   'after',  '90 days to file GST appeal before Tribunal'),
  ('Income Tax Rectification',    'IT Act Section 154',             'tax',      'created_at',   30,   'after',  '30 days to file rectification application'),
  ('IBC CIRP Timeline',           'IBC 2016',                       'corporate','created_at',   180,  'after',  'CIRP must be completed within 180 days'),
  ('NCLT Petition Response',      'Companies Act Section 241',      'corporate','created_at',   21,   'after',  '21 days to respond to NCLT petition'),
  ('Consumer Complaint',          'CPA 2019 Section 69',            'consumer', 'created_at',   730,  'after',  '2 years from cause of action for consumer complaint'),
  ('Labour Court Response',       'Industrial Disputes Act',        'labour',   'created_at',   30,   'after',  '30 days to respond to labour court notice')
on conflict do nothing;


-- ── STEP 7: VERIFICATION ──────────────────────────────────────────────────
-- Run after migration to confirm everything created correctly

select 'TABLES' as check_type, table_name, 'OK' as status
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles','custom_roles','signup_codes','categories','form_schemas',
    'clients','documents','templates','tasks','task_comments',
    'chat_groups','group_members','messages','message_reads',
    'payments','planner_notes','notes','note_shares','note_history',
    'activity_log','portal_tokens','invoice_settings','deadline_rules'
  )
order by table_name;

select 'FUNCTIONS' as check_type, routine_name as table_name, 'OK' as status
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_admin','is_approved','user_owns_note',
    'user_has_note_share','user_has_note_editor_share',
    'user_in_group','user_is_group_admin','set_updated_at'
  )
order by routine_name;


-- ── STEP 8: MAKE YOURSELF ADMIN ──────────────────────────────────────────
-- After running this script, sign up / log in to LexDesk with your email.
-- Then run this query (replace with your email):
--
-- update profiles
-- set role = 'admin', approved = true, is_founder = true
-- where email = 'YOUR_EMAIL@example.com';
--
-- You can find your email from auth.users:
-- select email from auth.users order by created_at limit 10;
