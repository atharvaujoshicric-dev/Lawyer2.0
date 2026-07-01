-- ════════════════════════════════════════════════════════════════════════
--  LexDesk SaaS — Migration 002: Core Business Tables
--  Every table here is firm-scoped: firm_id + RLS using current_firm_id().
--  Run AFTER 001_tenants_and_auth.sql
-- ════════════════════════════════════════════════════════════════════════

-- ── CATEGORIES (case types) — each firm has its own set, seeded on signup
-- NOTE: id is a TEXT slug (e.g. "cyber", "rental"), not a uuid — matching
-- every application call site that treats category id as a short string
-- (S.categories.find(c=>c.id===catId), dynamic-field rendering keyed by
-- id, clients.case_type values, etc. — ~67 references across 11 files).
-- It is scoped per firm via the composite primary key, so two firms can
-- each have their own "cyber" category without colliding.
create table if not exists categories (
  firm_id     uuid not null references firms(id) on delete cascade,
  id          text not null,        -- e.g. "cyber" — the real key, scoped to firm_id
  label       text not null,
  icon        text default 'fas fa-folder',
  color       text default 'blue',
  built_in    boolean default false,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now(),
  primary key (firm_id, id)
);
create index if not exists idx_categories_firm on categories(firm_id);
alter table categories enable row level security;

drop policy if exists "categories_select" on categories;
create policy "categories_select" on categories for select using (firm_id = current_firm_id());
drop policy if exists "categories_insert" on categories;
create policy "categories_insert" on categories for insert with check (firm_id = current_firm_id() and is_firm_approved());
drop policy if exists "categories_update" on categories;
create policy "categories_update" on categories for update using (firm_id = current_firm_id() and is_firm_admin());
drop policy if exists "categories_delete" on categories;
create policy "categories_delete" on categories for delete using (firm_id = current_firm_id() and is_firm_admin());

-- ── FORM SCHEMAS (dynamic fields per category)
create table if not exists form_schemas (
  firm_id     uuid not null references firms(id) on delete cascade,
  category_id text not null,
  fields      jsonb not null default '[]'::jsonb,
  updated_at  timestamptz default now(),
  primary key (firm_id, category_id),
  foreign key (firm_id, category_id) references categories(firm_id, id) on delete cascade
);
create index if not exists idx_form_schemas_firm on form_schemas(firm_id);
alter table form_schemas enable row level security;

drop policy if exists "form_schemas_select" on form_schemas;
create policy "form_schemas_select" on form_schemas for select using (firm_id = current_firm_id());
drop policy if exists "form_schemas_write" on form_schemas;
create policy "form_schemas_write" on form_schemas for all
  using (firm_id = current_firm_id() and is_firm_admin())
  with check (firm_id = current_firm_id() and is_firm_admin());

-- ── CUSTOM ROLES (per-firm permission tiers)
create table if not exists custom_roles (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  name        text not null,
  permissions jsonb not null default '{}',
  sort_order  int default 99,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (firm_id, name)
);
create index if not exists idx_custom_roles_firm on custom_roles(firm_id);
alter table custom_roles enable row level security;

drop policy if exists "custom_roles_select" on custom_roles;
create policy "custom_roles_select" on custom_roles for select using (firm_id = current_firm_id());
drop policy if exists "custom_roles_write" on custom_roles;
create policy "custom_roles_write" on custom_roles for all
  using (firm_id = current_firm_id() and is_firm_admin())
  with check (firm_id = current_firm_id() and is_firm_admin());

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'profiles_custom_role_id_fkey'
  ) then
    alter table profiles add constraint profiles_custom_role_id_fkey
      foreign key (custom_role_id) references custom_roles(id) on delete set null;
  end if;
end $$;

-- ── CLIENTS (cases/matters)
-- NOTE: client_id is the REAL key here (matching every existing
-- application call site — assets/js/03-client-form-builder.js genId(), and
-- ~80 other places across the codebase that do .eq('client_id', x) or
-- pass client_id directly as a foreign key value). It is no longer
-- globally unique like the single-tenant version was — it's scoped to
-- firm_id via the composite primary key below, so two different firms
-- can each independently have a "CL-1001" without colliding.
create table if not exists clients (
  firm_id               uuid not null references firms(id) on delete cascade,
  client_id             text not null,        -- e.g. "CL-1042" — the real key, scoped to firm_id
  contact_id            text,                  -- another client_id in the same firm; FK added below
  name                  text not null,
  case_type             text,        -- composite FK to categories(firm_id, id), added below
  status                text default 'active' check (status in ('active','pending','closed')),
  phone                 text,
  email                 text,
  address               text,
  fee                   numeric,
  notes                 text,
  case_data             jsonb default '{}'::jsonb,
  opposite_party        text,
  assigned_to           uuid references profiles(id),
  created_by            uuid references profiles(id),
  history               jsonb default '[]'::jsonb,
  onedrive_folder_link  text,
  synced                boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  primary key (firm_id, client_id)
);

-- Self-referencing FK added after table creation (composite self-FK).
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'clients_contact_id_fkey'
  ) then
    alter table clients add constraint clients_contact_id_fkey
      foreign key (firm_id, contact_id) references clients(firm_id, client_id) on delete set null;
  end if;
end $$;

create index if not exists idx_clients_firm on clients(firm_id);
create index if not exists idx_clients_firm_assigned on clients(firm_id, assigned_to);
create index if not exists idx_clients_name_trgm on clients using gin (name gin_trgm_ops);
create index if not exists idx_clients_opposite_party_trgm on clients using gin (opposite_party gin_trgm_ops);
alter table clients enable row level security;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'clients_case_type_fkey'
  ) then
    alter table clients add constraint clients_case_type_fkey
      foreign key (firm_id, case_type) references categories(firm_id, id) on delete set null;
  end if;
end $$;

create or replace function can_view_all_firm_clients()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select (cr.permissions->>'can_view_all_clients')::boolean
       from profiles p join custom_roles cr on cr.id = p.custom_role_id
       where p.id = auth.uid()),
    false
  ) or is_firm_admin();
$$;

drop policy if exists "clients_select" on clients;
create policy "clients_select" on clients for select
  using (firm_id = current_firm_id() and (can_view_all_firm_clients() or assigned_to = auth.uid()));
drop policy if exists "clients_insert" on clients;
create policy "clients_insert" on clients for insert
  with check (firm_id = current_firm_id() and is_firm_approved());
drop policy if exists "clients_update" on clients;
create policy "clients_update" on clients for update
  using (firm_id = current_firm_id() and (is_firm_admin() or assigned_to = auth.uid()));
drop policy if exists "clients_delete" on clients;
create policy "clients_delete" on clients for delete
  using (firm_id = current_firm_id() and is_firm_admin());

-- ── DOCUMENTS
create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  firm_id       uuid not null references firms(id) on delete cascade,
  client_id     text,        -- composite FK to clients(firm_id, client_id), added below
  name          text not null,
  category      text,
  size          bigint,
  mime_type     text,
  storage_path  text,   -- namespaced "{firm_id}/{client_id}/{filename}" — see storage policy
  onedrive_link text,
  uploaded_by   uuid references profiles(id),
  uploaded_at   timestamptz default now()
);
create index if not exists idx_documents_firm on documents(firm_id);
create index if not exists idx_documents_client on documents(client_id);
alter table documents enable row level security;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'documents_client_id_fkey'
  ) then
    alter table documents add constraint documents_client_id_fkey
      foreign key (firm_id, client_id) references clients(firm_id, client_id) on delete cascade;
  end if;
end $$;

drop policy if exists "documents_select" on documents;
create policy "documents_select" on documents for select
  using (firm_id = current_firm_id() and (
    is_firm_admin() or exists(select 1 from clients c where c.firm_id = documents.firm_id and c.client_id = documents.client_id and c.assigned_to = auth.uid())
  ));
drop policy if exists "documents_insert" on documents;
create policy "documents_insert" on documents for insert
  with check (firm_id = current_firm_id() and is_firm_approved());
drop policy if exists "documents_delete" on documents;
create policy "documents_delete" on documents for delete
  using (firm_id = current_firm_id() and (is_firm_admin() or uploaded_by = auth.uid()));

-- ── TEMPLATES
create table if not exists templates (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  name        text not null,
  category    text,
  content     text not null,
  variables   jsonb default '[]'::jsonb,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_templates_firm on templates(firm_id);
alter table templates enable row level security;

drop policy if exists "templates_select" on templates;
create policy "templates_select" on templates for select using (firm_id = current_firm_id() and is_firm_approved());
drop policy if exists "templates_insert" on templates;
create policy "templates_insert" on templates for insert with check (firm_id = current_firm_id() and is_firm_approved());
drop policy if exists "templates_update" on templates;
create policy "templates_update" on templates for update using (firm_id = current_firm_id() and (is_firm_admin() or created_by = auth.uid()));
drop policy if exists "templates_delete" on templates;
create policy "templates_delete" on templates for delete using (firm_id = current_firm_id() and (is_firm_admin() or created_by = auth.uid()));

-- ── TASKS
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  firm_id      uuid not null references firms(id) on delete cascade,
  title        text not null,
  description  text,
  client_id    text,         -- composite FK to clients(firm_id, client_id), added below
  assigned_by  uuid references profiles(id),
  assigned_to  uuid references profiles(id),
  status       text default 'open' check (status in ('open','in_progress','in_review','done','cancelled')),
  priority     text default 'medium' check (priority in ('low','medium','high')),
  due_date     date,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_tasks_firm on tasks(firm_id);
create index if not exists idx_tasks_firm_status on tasks(firm_id, status);
alter table tasks enable row level security;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'tasks_client_id_fkey'
  ) then
    alter table tasks add constraint tasks_client_id_fkey
      foreign key (firm_id, client_id) references clients(firm_id, client_id) on delete cascade;
  end if;
end $$;

drop policy if exists "tasks_select" on tasks;
create policy "tasks_select" on tasks for select
  using (firm_id = current_firm_id() and (is_firm_admin() or assigned_to = auth.uid() or assigned_by = auth.uid()));
drop policy if exists "tasks_insert" on tasks;
create policy "tasks_insert" on tasks for insert with check (firm_id = current_firm_id() and is_firm_approved());
drop policy if exists "tasks_update" on tasks;
create policy "tasks_update" on tasks for update
  using (firm_id = current_firm_id() and (is_firm_admin() or assigned_to = auth.uid() or assigned_by = auth.uid()));
drop policy if exists "tasks_delete" on tasks;
create policy "tasks_delete" on tasks for delete using (firm_id = current_firm_id() and (is_firm_admin() or assigned_by = auth.uid()));

create table if not exists task_comments (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  task_id     uuid references tasks(id) on delete cascade,
  author_id   uuid references profiles(id),
  body        text not null,
  created_at  timestamptz default now()
);
create index if not exists idx_task_comments_firm on task_comments(firm_id);
alter table task_comments enable row level security;

drop policy if exists "task_comments_select" on task_comments;
create policy "task_comments_select" on task_comments for select
  using (firm_id = current_firm_id() and (
    is_firm_admin() or exists(select 1 from tasks t where t.id = task_comments.task_id and (t.assigned_to = auth.uid() or t.assigned_by = auth.uid()))
  ));
drop policy if exists "task_comments_insert" on task_comments;
create policy "task_comments_insert" on task_comments for insert with check (firm_id = current_firm_id() and is_firm_approved());

-- ── PAYMENTS (fee ledger)
create table if not exists payments (
  id            uuid primary key default gen_random_uuid(),
  firm_id       uuid not null references firms(id) on delete cascade,
  client_id     text,        -- composite FK to clients(firm_id, client_id), added below
  amount        numeric not null check (amount > 0),
  payment_date  date not null default current_date,
  method        text,
  note          text,
  recorded_by   uuid references profiles(id),
  created_at    timestamptz default now()
);
create index if not exists idx_payments_firm on payments(firm_id);
alter table payments enable row level security;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'payments_client_id_fkey'
  ) then
    alter table payments add constraint payments_client_id_fkey
      foreign key (firm_id, client_id) references clients(firm_id, client_id) on delete cascade;
  end if;
end $$;

drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments for select
  using (firm_id = current_firm_id() and (
    is_firm_admin() or exists(select 1 from clients c where c.firm_id = payments.firm_id and c.client_id = payments.client_id and c.assigned_to = auth.uid())
  ));
drop policy if exists "payments_insert" on payments;
create policy "payments_insert" on payments for insert
  with check (firm_id = current_firm_id() and (
    is_firm_admin() or exists(select 1 from clients c where c.firm_id = payments.firm_id and c.client_id = payments.client_id and c.assigned_to = auth.uid())
  ));
drop policy if exists "payments_update" on payments;
create policy "payments_update" on payments for update using (firm_id = current_firm_id() and (is_firm_admin() or recorded_by = auth.uid()));
drop policy if exists "payments_delete" on payments;
create policy "payments_delete" on payments for delete using (firm_id = current_firm_id() and (is_firm_admin() or recorded_by = auth.uid()));

-- ── INVOICE SETTINGS (one row per firm)
create table if not exists invoice_settings (
  firm_id         uuid primary key references firms(id) on delete cascade,
  firm_name       text not null default 'Law Firm',
  firm_address    text,
  firm_phone      text,
  firm_email      text,
  bar_number      text,
  footer_text     text default 'Thank you for your trust.',
  invoice_prefix  text default 'INV',
  next_number     int default 1,
  updated_at      timestamptz default now()
);
alter table invoice_settings enable row level security;

drop policy if exists "invoice_settings_select" on invoice_settings;
create policy "invoice_settings_select" on invoice_settings for select using (firm_id = current_firm_id() and is_firm_approved());
drop policy if exists "invoice_settings_write" on invoice_settings;
create policy "invoice_settings_write" on invoice_settings for all
  using (firm_id = current_firm_id() and is_firm_admin())
  with check (firm_id = current_firm_id() and is_firm_admin());

-- ── DEADLINE RULES (court filing calculator)
create table if not exists deadline_rules (
  id                uuid primary key default gen_random_uuid(),
  firm_id           uuid not null references firms(id) on delete cascade,
  category_id       text,        -- composite FK to categories(firm_id, id), added below
  rule_name         text not null,
  statute           text,
  trigger_field     text,
  offset_days       int not null default 30,
  offset_direction  text not null default 'after' check (offset_direction in ('after','before')),
  description       text,
  is_active         boolean default true,
  created_by        uuid references profiles(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index if not exists idx_deadline_rules_firm on deadline_rules(firm_id);
alter table deadline_rules enable row level security;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'deadline_rules_category_id_fkey'
  ) then
    alter table deadline_rules add constraint deadline_rules_category_id_fkey
      foreign key (firm_id, category_id) references categories(firm_id, id) on delete set null;
  end if;
end $$;

drop policy if exists "deadline_rules_select" on deadline_rules;
create policy "deadline_rules_select" on deadline_rules for select using (firm_id = current_firm_id() and is_firm_approved());
drop policy if exists "deadline_rules_write" on deadline_rules;
create policy "deadline_rules_write" on deadline_rules for all
  using (firm_id = current_firm_id() and is_firm_admin())
  with check (firm_id = current_firm_id() and is_firm_admin());

-- ── PLANNER NOTES (strictly private — owner only)
create table if not exists planner_notes (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  owner_id    uuid references profiles(id) not null,
  note_date   date not null default current_date,
  time        text,
  content     text not null,
  done        boolean default false,
  created_at  timestamptz default now()
);
create index if not exists idx_planner_notes_firm on planner_notes(firm_id);
alter table planner_notes enable row level security;

drop policy if exists "planner_notes_owner_only" on planner_notes;
create policy "planner_notes_owner_only" on planner_notes for all
  using (firm_id = current_firm_id() and owner_id = auth.uid())
  with check (firm_id = current_firm_id() and owner_id = auth.uid());

-- ── PORTAL TOKENS (client portal — magic link + PIN)
create table if not exists portal_tokens (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  client_id   text,          -- composite FK to clients(firm_id, client_id), added below
  token       text unique not null default gen_random_uuid()::text,
  pin_hash    text not null,
  expires_at  timestamptz not null default (now() + interval '90 days'),
  created_by  uuid references profiles(id),
  created_at  timestamptz default now()
);
create index if not exists idx_portal_tokens_firm on portal_tokens(firm_id);
alter table portal_tokens enable row level security;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'portal_tokens_client_id_fkey'
  ) then
    alter table portal_tokens add constraint portal_tokens_client_id_fkey
      foreign key (firm_id, client_id) references clients(firm_id, client_id) on delete cascade;
  end if;
end $$;

drop policy if exists "portal_tokens_select_anon" on portal_tokens;
create policy "portal_tokens_select_anon" on portal_tokens for select to anon using (true);
drop policy if exists "portal_tokens_select_auth" on portal_tokens;
create policy "portal_tokens_select_auth" on portal_tokens for select to authenticated using (firm_id = current_firm_id());
drop policy if exists "portal_tokens_insert" on portal_tokens;
create policy "portal_tokens_insert" on portal_tokens for insert with check (firm_id = current_firm_id() and is_firm_approved());
drop policy if exists "portal_tokens_delete" on portal_tokens;
create policy "portal_tokens_delete" on portal_tokens for delete using (firm_id = current_firm_id() and (is_firm_admin() or created_by = auth.uid()));

-- ── ACTIVITY LOG
create table if not exists activity_log (
  id           uuid primary key default gen_random_uuid(),
  firm_id      uuid not null references firms(id) on delete cascade,
  actor_id     uuid references profiles(id),
  action       text not null,
  entity_type  text not null,
  entity_id    text not null,
  detail       jsonb,
  created_at   timestamptz default now()
);
create index if not exists idx_activity_log_firm on activity_log(firm_id);
alter table activity_log enable row level security;

drop policy if exists "activity_log_select" on activity_log;
create policy "activity_log_select" on activity_log for select
  using (firm_id = current_firm_id() and is_firm_admin());
drop policy if exists "activity_log_insert" on activity_log;
create policy "activity_log_insert" on activity_log for insert with check (firm_id = current_firm_id() and is_firm_approved());
