# LexDesk — Enterprise Deployment Package

## Files in this ZIP

| File | Purpose |
|------|---------|
| `index.html` | Complete application — upload to GitHub repo root |
| `.nojekyll` | Required for GitHub Pages (stops Jekyll processing) |
| `FULL_DATABASE_RESET.sql` | Database setup — run once in Supabase SQL Editor |
| `README.md` | This file |

---

## Setup Instructions

### Step 1 — Reset & Rebuild Your Database

1. Go to your Supabase project → **SQL Editor** → New Query
2. Paste the entire contents of `FULL_DATABASE_RESET.sql`
3. Click **Run** (takes ~10 seconds)
4. Check the output — you should see 23 tables listed with "OK"

⚠️ **This deletes all existing case data** (clients, messages, documents).
Your login accounts (auth.users) are preserved.

### Step 2 — Make Yourself Admin

After running the SQL, run this query (change the email):
```sql
update profiles
set role = 'admin', approved = true, is_founder = true
where email = 'YOUR_EMAIL@example.com';
```

To find your email:
```sql
select email from auth.users order by created_at limit 10;
```

### Step 3 — Deploy to GitHub Pages

1. Upload `index.html` and `.nojekyll` to your GitHub repo root
2. Settings → Pages → Deploy from main branch → root (/)
3. Visit your GitHub Pages URL

### Step 4 — First Login

1. Sign up with your email at the login screen
2. Choose "Create New Firm" and enter your firm name
3. You're in! Invite team members by generating a signup code in Settings

---

## Bugs Fixed in This Release

| # | Bug | Fix |
|---|-----|-----|
| 1 | Group chat broken — wrong table name `chat_group_members` | Fixed to `group_members` (3 occurrences) |
| 2 | Group messages revert to DM — `S.activeChatGroup` inconsistency | Fixed: reads `S.activeGroupId\|\|S.activeChatGroup` |
| 3 | App crashes on logout — `S.user.id` without null check | Fixed: `S.user?.id` in 99 places |
| 4 | Theme buttons not visible in light mode | Fixed: uses CSS vars `var(--border)`, `var(--glass-bg)` |
| 5 | Tasks stuck — DB constraint didn't include 'approved' status | Fixed in DB schema: both `done` and `approved` allowed |
| 6 | 18 deadline rules upgraded to BNS/BNSS 2024 (BNSS 480, 482, 173) | Updated in seed data |
| 7 | 10 case categories (was 3) with complete form schemas | Added civil, criminal, corporate, family, tax, labour, property, consumer |
| 8 | `ld_theme_saved` not cleared on logout | Fixed in logout function |

