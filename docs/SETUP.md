# LexDesk — Setup Guide

## Folder Structure

```
lexdesk-saas/
├── index.html              ← Main app entry point (GitHub Pages root)
├── .nojekyll               ← Required for GitHub Pages
├── app/
│   ├── css/
│   │   └── app.css         ← All styles (Liquid Glass UI)
│   └── js/
│       ├── 01-config-auth.js    ← Supabase client + sign in/up/out
│       ├── 02-init-data.js      ← App boot, data loading, navigation
│       ├── 03-clients.js        ← Client list & case type UI
│       ├── 04-client-table.js   ← Client table, detail view
│       ├── 05-chat.js           ← Chat messages (DM + broadcast)
│       ├── 06-tasks.js          ← Kanban task board
│       ├── 07-templates-settings.js ← Templates, export, settings
│       ├── 08-payments.js       ← Payment recording
│       ├── 09-planner.js        ← Daily planner calendar
│       ├── 10-onedrive.js       ← OneDrive integration
│       ├── 11-notifications.js  ← Unread counts, polling
│       ├── 12-notes.js          ← Notes with sharing
│       ├── 13-finances.js       ← Firm finances view
│       ├── 14-portal.js         ← Client portal (magic link)
│       ├── 15-invoice.js        ← Invoice generation
│       ├── 16-deadlines.js      ← Statute deadline rules
│       ├── 17-features.js       ← Conflict check, misc
│       ├── 18-roles.js          ← Custom roles
│       ├── 19-groups-chat.js    ← Group chat
│       ├── 20-misc.js           ← Logout, misc helpers
│       ├── 21-chatbot.js        ← Legal Q&A assistant
│       ├── 22-themes.js         ← Theme customiser
│       ├── 23-boot.js           ← escHtml, showToast (loads first)
│       └── modals-loader.js     ← All modal HTML injection
├── database/
│   └── FULL_DATABASE_RESET.sql ← Run once in Supabase SQL Editor
└── docs/
    └── SETUP.md                ← This file
```

## Step 1: Database Setup

1. Go to your Supabase project → **SQL Editor** → New Query
2. Paste entire `database/FULL_DATABASE_RESET.sql` → **Run**
3. Wait ~10 seconds for "23 tables — OK" confirmation

## Step 2: Make Yourself Admin

```sql
-- Run in Supabase SQL Editor after signing up:
update profiles
set role = 'admin', approved = true, is_founder = true
where email = 'YOUR_EMAIL@example.com';
```

## Step 3: Deploy to GitHub Pages

1. Upload ALL files to your GitHub repo (keeping the folder structure)
2. Settings → Pages → Branch: main → Folder: / (root)
3. Visit your `username.github.io/repo-name` URL

## Credentials

The Supabase credentials are already hardcoded in `app/js/01-config-auth.js`.
No configuration needed for deployment.

To change them: edit the `SUPABASE_URL_DEFAULT` and `SUPABASE_KEY_DEFAULT`
constants at the top of `01-config-auth.js`.

## Adding Team Members

1. Go to **Settings** → Generate a signup code
2. Share the code with your team member
3. They sign up at the login screen using the code
4. They get auto-approved; you can change their role in **Users**

## Bugs Fixed in This Version

| Bug | Fix |
|-----|-----|
| Sign in button did nothing | `initSupabase()` now always works — credentials hardcoded, never waits for localStorage |
| Group chat broken | `chat_group_members` → `group_members` table name (3 places) |
| App crash after logout | `S.user?.id` null-safety added throughout |
| Group messages reverted to DM | `S.activeGroupId` read consistently |
| Theme buttons invisible in light mode | Uses CSS vars instead of hardcoded rgba |
| Tasks couldn't be closed | DB constraint now allows both `done` and `approved` |
