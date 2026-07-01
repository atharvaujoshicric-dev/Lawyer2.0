# LexDesk — Production Setup Guide

## What's in this package

```
lexdesk-saas/
├── index.html              ← THE APP (upload to GitHub repo root)
├── .nojekyll               ← Required for GitHub Pages
├── .github/
│   └── workflows/
│       └── deploy.yml      ← Auto-deployment workflow (fixed)
├── app/
│   ├── css/app.css         ← Styles (reference only — embedded in index.html)
│   └── js/                 ← JavaScript modules (reference only — embedded in index.html)
│       ├── 00-blank-guard.js   ← Safety net for blank screen
│       ├── 01-config-auth.js   ← Supabase client + authentication
│       ├── 02-init-data.js     ← App boot + data loading
│       ├── 03-clients.js       ← Client/case list
│       ├── 04-client-table.js  ← Client detail view
│       ├── 05-chat.js          ← Direct messages
│       ├── 06-tasks.js         ← Kanban board
│       ├── 07-templates-settings.js
│       ├── 08-payments.js
│       ├── 09-planner.js       ← Daily calendar
│       ├── 10-onedrive.js
│       ├── 11-notifications.js
│       ├── 12-notes.js
│       ├── 13-finances.js
│       ├── 14-portal.js        ← Client portal
│       ├── 15-invoice.js
│       ├── 16-deadlines.js     ← Statute deadline rules
│       ├── 17-features.js
│       ├── 18-roles.js         ← Custom roles
│       ├── 19-groups-chat.js   ← Group chat
│       ├── 20-misc.js          ← Logout, archive user
│       ├── 21-chatbot.js       ← Legal Q&A (56 Q&As)
│       ├── 22-themes.js        ← Theme customiser
│       ├── 23-boot.js          ← Boot helpers (escHtml, showToast)
│       └── modals-loader.js    ← Modal HTML fragments
├── database/
│   └── FULL_DATABASE_RESET.sql ← Run once in Supabase SQL Editor
└── docs/
    └── SETUP.md                ← This file
```

> **IMPORTANT**: `index.html` is the complete self-contained app.
> The `app/js/` and `app/css/` folders contain the same code split into
> separate files for readability/editing. Only `index.html` needs to be
> on GitHub Pages.

---

## Step 1: Reset Your Supabase Database

1. Open **Supabase Dashboard** → **SQL Editor** → New Query
2. Paste the entire `database/FULL_DATABASE_RESET.sql` file
3. Click **Run** — takes about 10 seconds
4. You'll see "23 tables: OK" in the results

⚠️ This **deletes all existing case data**. Your auth.users accounts are preserved.

## Step 2: Make Yourself Admin

After running the SQL, run this (replace with your email):
```sql
update profiles
set role = 'admin', approved = true, is_founder = true
where email = 'YOUR_EMAIL@example.com';

-- Not sure of your email? Find it with:
select email from auth.users order by created_at limit 10;
```

## Step 3: Set Up GitHub Pages

### Option A — GitHub Actions (recommended)
1. Go to repo **Settings → Pages → Source → GitHub Actions**
2. The `.github/workflows/deploy.yml` file handles everything
3. Push any file to main branch → auto-deploys
4. Or: **Actions → Deploy LexDesk → Run workflow**

### Option B — Direct branch deploy
1. Go to repo **Settings → Pages → Source → Deploy from branch**
2. Branch: `main`, Folder: `/` (root)
3. Every push to main auto-deploys

## Step 4: First Login

1. Visit your GitHub Pages URL
2. Sign up with your email
3. Enter your firm name (you'll see this as the first screen)
4. Go to Supabase SQL Editor and run the admin grant from Step 2
5. Refresh and sign in — you're in!

## Adding Team Members

1. In LexDesk: **Settings → Signup Codes → Generate Code**
2. Share the 6-character code with your team member
3. They sign up at the login screen, enter the code
4. They're auto-approved and can log in immediately

---

## Bugs Fixed (this version)

| Bug | Root Cause | Fix |
|-----|------------|-----|
| **Blank screen on GitHub Pages** | `initSupabase()` checked localStorage for credentials — empty on first visit — showed setup screen which was off-screen | Credentials hardcoded. `initSupabase()` always succeeds. Added 5s blank-screen guard |
| **"Deployment cancelled"** | Missing `id-token: write` permission in GitHub Actions workflow | Added to `deploy.yml` |
| **Sign in button did nothing** | Same root cause as blank screen | Fixed by credential hardcoding |
| **Group chat broken** | `chat_group_members` table doesn't exist — correct name is `group_members` | Fixed across 3 call sites |
| **App crash after logout** | `S.user.id` without null safety throughout | Fixed to `S.user?.id` everywhere |
| **Theme buttons invisible (light mode)** | Hardcoded `rgba(255,255,255,...)` borders | Fixed to CSS vars |
