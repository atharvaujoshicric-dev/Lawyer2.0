# LexDesk — Setup & Deployment Guide

This guide takes you from zero to a live, multi-tenant LexDesk deployment
that any law firm can sign up to. It assumes you (the operator) are
running ONE LexDesk instance that serves MANY law firms — that's the SaaS
model this codebase is built for. Each firm's data is isolated entirely
by the database (Row Level Security), not by separate deployments.

Time estimate: 30–45 minutes for first-time setup.

---

## 1. Prerequisites

- A [Supabase](https://supabase.com) account (the free tier works for
  testing; production needs at least the Pro plan — see the cost
  estimate in §9)
- A GitHub account with this repo pushed to it (this guide assumes
  GitHub Pages as the host, since that's what this deployment is
  configured for — no build step, no Node.js required)
- A domain name (optional — GitHub Pages gives you a free
  `<username>.github.io/<repo>` URL, a custom domain is just nicer)

---

## 2. Create your Supabase project

1. Go to supabase.com/dashboard → **New Project**.
2. Pick a region close to your customers. For an India-focused product,
   `ap-south-1` (Mumbai) gives the lowest latency.
3. Set a strong database password and save it somewhere safe — you'll
   need it for `DATABASE_URL` if you use the CLI migration script.
4. Wait ~2 minutes for provisioning.

### 2.1 Get your API credentials

Go to **Project Settings → API**. You need:

| Value | Where | Used for |
|---|---|---|
| Project URL | `Project URL` | `SUPABASE_URL` |
| anon / public key | `Project API keys → anon public` | `SUPABASE_ANON_KEY` |
| service_role key | `Project API keys → service_role` | `SUPABASE_SERVICE_ROLE_KEY` (CLI/admin tooling only — never ship to the browser) |

Go to **Project Settings → Database → Connection string → URI** for
`DATABASE_URL` if you plan to use `scripts/deploy-migration.sh`.

---

## 3. Apply the database schema

You have two options — pick whichever you're comfortable with.

### Option A — Supabase Dashboard (no command line needed)

Go to **SQL Editor → New Query** and paste + run each file from
`database/` **in this exact order**:

```
1. database/migrations/001_tenants_and_auth.sql
2. database/migrations/002_business_tables.sql
3. database/migrations/003_communication.sql
4. database/migrations/004_storage.sql
5. database/functions/onboarding.sql
```

Run each one fully before starting the next — migration 002 references
functions created in 001, and so on. Every file is idempotent, so if
something fails partway through, fix the issue and re-run the same file;
it's safe.

### Option B — Command line (psql)

```bash
cp .env.example .env
# Fill in DATABASE_URL from §2.1 above
./scripts/deploy-migration.sh
```

This applies all five files in order and prints a sanity-check table
listing at the end.

### 3.1 Verify the schema applied correctly

Run this in the SQL Editor (or via psql) to confirm the core tables and
functions exist:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('firms','profiles','clients','custom_roles','chat_groups')
order by table_name;

select routine_name from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('current_firm_id','is_firm_admin','create_firm_and_admin','join_firm_with_invite')
order by routine_name;
```

You should see 5 rows in the first query and 4 in the second.

---

## 4. Configure email (for password reset + signup confirmation)

By default, Supabase sends auth emails from its own shared sender, which
is fine for testing but will get rate-limited and look unprofessional in
production.

1. **Authentication → Email Templates** — customise the "Confirm signup"
   and "Reset password" templates with your branding.
2. **Project Settings → Auth → SMTP Settings** — connect your own SMTP
   provider (Postmark, SendGrid, AWS SES, or your domain's SMTP) so
   emails come from `noreply@yourdomain.com` instead of Supabase's
   shared sender. This step is **strongly recommended before launch** —
   the shared sender has a low daily send limit that a multi-tenant
   SaaS will hit quickly.

---

## 5. Set your Supabase credentials

No build step — open `assets/js/env.js` directly and fill in the two
values from §2.1:

```js
window.__LEXDESK_ENV__ = {
  SUPABASE_URL: "https://your-project-ref.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key-here",
  ...
};
```

Save the file. That's the entire configuration step — there is nothing
to compile or bundle. The anon key is safe to commit; see
`database/README.md` for why Row Level Security (not key secrecy) is
what protects every firm's data.

To preview locally before pushing, run a tiny local server (plain
`fetch()` for the page partials is blocked by browsers when you open
`index.html` directly via `file://`):

```bash
python3 -m http.server 8080
# or: npx serve .
# then open http://localhost:8080
```

---

## 6. Deploy to GitHub Pages

1. Push this repo to GitHub if you haven't already.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **Deploy from a
   branch**.
4. Under **Branch**, select your main branch and **/ (root)** as the
   folder, then **Save**.
5. GitHub Pages will publish at `https://<username>.github.io/<repo>/`
   within a minute or two. Every push to the branch you selected
   redeploys automatically — there is no separate build/deploy command
   to run.

The `.nojekyll` file at the repo root matters even though no file in
this project currently starts with an underscore — without it, GitHub
Pages runs your site through Jekyll, which has a number of other
default exclusions (any folder or file starting with `_` or `.`, among
others) that could silently break a future file you add. It's an empty
file; don't delete it, and if you're uploading via drag-and-drop in a
browser, see `GITHUB_PAGES_SETUP.txt` for a common pitfall where file
managers hide dot-files from drag operations by default.

### Custom domain (optional)

**Settings → Pages → Custom domain** — enter your domain, add the DNS
records GitHub shows you (a `CNAME` record pointing at
`<username>.github.io`), and GitHub provisions SSL automatically within
a few minutes to hours.

---

## 7. Domain & SSL

Point your domain's DNS at whichever host you chose (all four options
above provision free SSL automatically via Let's Encrypt or their own
CA). A typical setup:

- `app.yourdomain.com` — the LexDesk web app
- `yourdomain.com` — your marketing/landing page (not part of this repo)

---

## 8. Post-deploy checklist

- [ ] Visit your deployed URL and confirm the login screen loads (not
      the "Configuration error" screen — if you see that, your env vars
      weren't injected at build time)
- [ ] Sign up as the first firm ("Start a new firm" tab) — confirm you
      land in the dashboard as admin
- [ ] Go to **Admin → Roles** and confirm the 4 default roles (Senior
      Advocate, Junior Advocate, Senior Assistant, Junior Assistant)
      were seeded
- [ ] Go to **Admin → Users** and copy your invite code — confirm it
      shows in the Signup Code card
- [ ] Open an incognito window, sign up with "Join with invite code,"
      confirm the new user lands on the Pending Approval screen
- [ ] Approve that user from the first account, confirm they can then
      log in
- [ ] Create a test client, upload a document, confirm it appears in the
      **Documents** view
- [ ] Check Supabase **Storage → lexdesk-files** and confirm the
      uploaded file's path starts with your firm's UUID (tenant
      namespacing working correctly)
- [ ] Review `docs/PRODUCTION_CHECKLIST.md` before announcing publicly

---

## 9. Estimated infrastructure cost

| Item | Free tier sufficient until... | Paid starting point |
|---|---|---|
| Supabase | ~50,000 monthly active users, 500MB DB, 1GB storage | Pro: $25/mo (8GB DB, 100GB storage, daily backups) |
| Hosting (GitHub Pages) | Effectively unlimited for static sites | Free forever for this use case |
| SMTP (Postmark) | 100 emails/mo free | $15/mo for 10,000 emails |
| Domain | — | ~$12/year |

Realistic all-in cost to serve your first ~50 law firms: **$25–40/month**
(Supabase Pro + SMTP), comfortably covered by 2-3 paying customers at the
pricing in `docs/BUSINESS_MODEL.md`.

---

## 10. Updating a live deployment

Schema changes ship as new numbered files in `database/migrations/`
(never edit 001-004 once they've run against production — see
`database/README.md` for why). To ship an update:

1. Add `database/migrations/005_your_change.sql`
2. Run it against production (Dashboard or `scripts/deploy-migration.sh`)
3. Update any affected files in `assets/js/` or `partials/`
4. Commit and push — GitHub Pages redeploys automatically, no separate
   build or deploy command needed

Because RLS does all the tenant isolation, you never touch firm-by-firm
data when shipping an update — every firm gets the new schema and code
simultaneously, the next time their browser loads the page (which
re-fetches the latest `partials/` and `assets/js/` files since they're
served fresh by GitHub Pages on every request, not cached into a
pre-built bundle).
