-- ════════════════════════════════════════════════════════════════════════
--  LexDesk SaaS — Migration 003: Communication (Chat, Groups, Notes)
--  Run AFTER 002_business_tables.sql
--
--  Group chat and notes-sharing both have circular RLS dependencies
--  (a message's visibility depends on group membership, and group
--  membership's visibility depends on the group) — solved here with
--  security definer helper functions, same pattern as the original
--  single-tenant app, now firm-scoped throughout.
-- ════════════════════════════════════════════════════════════════════════

-- ── MESSAGES (DMs, team broadcast, group chat) ─────────────────────────
create table if not exists messages (
  id               uuid primary key default gen_random_uuid(),
  firm_id          uuid not null references firms(id) on delete cascade,
  sender_id        uuid references profiles(id),
  recipient_id     uuid references profiles(id),   -- null + group_id null = firm broadcast channel
  group_id         uuid,                            -- fk added after chat_groups exists
  note_id          uuid,                            -- fk added after notes exists
  body             text,
  attachment_path  text,
  attachment_name  text,
  edited_at        timestamptz,
  deleted          boolean default false,
  created_at       timestamptz default now()
);
create index if not exists idx_messages_firm on messages(firm_id);
create index if not exists idx_messages_firm_recipient on messages(firm_id, recipient_id);
create index if not exists idx_messages_firm_group on messages(firm_id, group_id);
alter table messages enable row level security;

create table if not exists message_reads (
  message_id  uuid references messages(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  read_at     timestamptz default now(),
  primary key (message_id, user_id)
);
alter table message_reads enable row level security;

drop policy if exists "message_reads_select" on message_reads;
create policy "message_reads_select" on message_reads for select using (user_id = auth.uid());
drop policy if exists "message_reads_insert" on message_reads;
create policy "message_reads_insert" on message_reads for insert with check (user_id = auth.uid());
drop policy if exists "message_reads_delete" on message_reads;
create policy "message_reads_delete" on message_reads for delete using (user_id = auth.uid());

-- ── CHAT GROUPS ─────────────────────────────────────────────────────────
create table if not exists chat_groups (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  name        text not null,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now()
);
create index if not exists idx_chat_groups_firm on chat_groups(firm_id);
alter table chat_groups enable row level security;

create table if not exists group_members (
  group_id   uuid references chat_groups(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  is_admin   boolean default false,
  joined_at  timestamptz default now(),
  primary key (group_id, user_id)
);
alter table group_members enable row level security;

-- security definer functions break the circular dependency between
-- chat_groups <-> group_members RLS (same pattern proven in v3)
create or replace function user_in_group(p_group_id uuid, p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists(select 1 from group_members where group_id = p_group_id and user_id = p_user_id);
$$;

create or replace function user_is_group_admin(p_group_id uuid, p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists(select 1 from group_members where group_id = p_group_id and user_id = p_user_id and is_admin = true);
$$;

drop policy if exists "chat_groups_select" on chat_groups;
create policy "chat_groups_select" on chat_groups for select
  using (firm_id = current_firm_id() and user_in_group(id, auth.uid()));
drop policy if exists "chat_groups_insert" on chat_groups;
create policy "chat_groups_insert" on chat_groups for insert with check (firm_id = current_firm_id() and is_firm_approved());
drop policy if exists "chat_groups_update" on chat_groups;
create policy "chat_groups_update" on chat_groups for update
  using (firm_id = current_firm_id() and user_is_group_admin(id, auth.uid()));
drop policy if exists "chat_groups_delete" on chat_groups;
create policy "chat_groups_delete" on chat_groups for delete
  using (firm_id = current_firm_id() and user_is_group_admin(id, auth.uid()));

drop policy if exists "group_members_select" on group_members;
create policy "group_members_select" on group_members for select
  using (user_id = auth.uid() or user_in_group(group_id, auth.uid()));
drop policy if exists "group_members_insert" on group_members;
create policy "group_members_insert" on group_members for insert with check (is_firm_approved());
drop policy if exists "group_members_delete" on group_members;
create policy "group_members_delete" on group_members for delete
  using (user_id = auth.uid() or user_is_group_admin(group_id, auth.uid()));
drop policy if exists "group_members_update" on group_members;
create policy "group_members_update" on group_members for update using (is_firm_admin());

-- ── NOTES + SHARING (note_shares created before notes to avoid the
--    same circular-RLS problem) ────────────────────────────────────────
create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  owner_id    uuid references profiles(id) not null,
  title       text not null,
  content     text not null default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_notes_firm on notes(firm_id);
alter table notes enable row level security;

create table if not exists note_shares (
  id           uuid primary key default gen_random_uuid(),
  note_id      uuid references notes(id) on delete cascade,
  shared_with  uuid references profiles(id) on delete cascade,
  permission   text not null check (permission in ('viewer','editor')),
  shared_by    uuid references profiles(id),
  shared_at    timestamptz default now(),
  unique (note_id, shared_with)
);
alter table note_shares enable row level security;

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
  select exists(select 1 from note_shares where note_id = p_note_id and shared_with = p_user_id and permission = 'editor');
$$;

drop policy if exists "notes_select" on notes;
create policy "notes_select" on notes for select
  using (firm_id = current_firm_id() and (owner_id = auth.uid() or user_has_note_share(id, auth.uid())));
drop policy if exists "notes_insert" on notes;
create policy "notes_insert" on notes for insert with check (firm_id = current_firm_id() and owner_id = auth.uid());
drop policy if exists "notes_update" on notes;
create policy "notes_update" on notes for update
  using (firm_id = current_firm_id() and (owner_id = auth.uid() or user_has_note_editor_share(id, auth.uid())));
drop policy if exists "notes_delete" on notes;
create policy "notes_delete" on notes for delete using (firm_id = current_firm_id() and owner_id = auth.uid());

drop policy if exists "note_shares_select" on note_shares;
create policy "note_shares_select" on note_shares for select
  using (shared_with = auth.uid() or user_owns_note(note_id, auth.uid()));
drop policy if exists "note_shares_insert" on note_shares;
create policy "note_shares_insert" on note_shares for insert with check (user_owns_note(note_id, auth.uid()));
drop policy if exists "note_shares_update" on note_shares;
create policy "note_shares_update" on note_shares for update using (user_owns_note(note_id, auth.uid()));
drop policy if exists "note_shares_delete" on note_shares;
create policy "note_shares_delete" on note_shares for delete using (user_owns_note(note_id, auth.uid()));

create table if not exists note_history (
  id           uuid primary key default gen_random_uuid(),
  note_id      uuid references notes(id) on delete cascade,
  changed_by   uuid references profiles(id),
  snapshot     text not null,
  changed_at   timestamptz default now()
);
alter table note_history enable row level security;
drop policy if exists "note_history_select" on note_history;
create policy "note_history_select" on note_history for select using (user_owns_note(note_id, auth.uid()));
drop policy if exists "note_history_insert" on note_history;
create policy "note_history_insert" on note_history for insert with check (is_firm_approved());

-- ── Now wire the deferred FKs back on messages ──────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'messages_group_id_fkey') then
    alter table messages add constraint messages_group_id_fkey foreign key (group_id) references chat_groups(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'messages_note_id_fkey') then
    alter table messages add constraint messages_note_id_fkey foreign key (note_id) references notes(id) on delete set null;
  end if;
end $$;

-- ── MESSAGES RLS (depends on group + firm helpers defined above) ───────
drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages for select
  using (
    firm_id = current_firm_id() and (
      sender_id = auth.uid()
      or recipient_id = auth.uid()
      or (recipient_id is null and group_id is null)             -- firm broadcast channel
      or (group_id is not null and user_in_group(group_id, auth.uid()))
    )
  );
drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages for insert
  with check (
    firm_id = current_firm_id() and is_firm_approved() and (
      group_id is null or user_in_group(group_id, auth.uid())
    )
  );
drop policy if exists "messages_update" on messages;
create policy "messages_update" on messages for update
  using (sender_id = auth.uid() and created_at > (now() - interval '5 minutes'));
