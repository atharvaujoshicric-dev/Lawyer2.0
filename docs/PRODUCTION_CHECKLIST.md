# LexDesk — Production Readiness Checklist

Run through this before announcing LexDesk publicly or onboarding your
first paying customer. Items are grouped by how much it would hurt if
you skipped them.

---

## 🔴 Must-do before ANY real customer data touches this system

- [ ] **Row Level Security verified, not assumed.** Every table in
      `database/migrations/` has `alter table ... enable row level
      security;` — confirm this is actually ON in production with:
      ```sql
      select tablename, rowsecurity from pg_tables
      where schemaname='public' and rowsecurity = false;
      ```
      This should return **zero rows**. If any table shows up, RLS is
      off and any authenticated user can read every firm's data.

- [ ] **Cross-tenant isolation tested manually**, not just by code
      review. Create two firms (Firm A, Firm B) as separate signups.
      Log in as Firm A, open browser dev tools, and attempt:
      `await sb.from('clients').select('*')` — confirm it returns ONLY
      Firm A's clients, never Firm B's, even though both are valid rows
      in the same physical table.

- [ ] **Storage bucket isolation tested.** As Firm A, attempt to fetch a
      signed URL for a file path you know belongs to Firm B (you'll need
      to create test data in both firms first). Confirm the storage
      policy in `004_storage.sql` rejects it.

- [ ] **service_role key is never in client-side code.** Search the
      built `index.html` and every file in `assets/js/` for the string `service_role` — it must
      not appear. Only the anon key ships to the browser.
      ```bash
      grep -rc "service_role" index.html assets/js/   # every line must print 0
      ```

- [ ] **SMTP configured** (see SETUP.md §4) so password reset and
      signup confirmation emails don't get rate-limited by Supabase's
      shared sender once you have more than a handful of signups.

- [ ] **Database backups confirmed enabled.** Supabase Free tier has
      no automated backups. Pro tier ($25/mo) gives daily backups with
      7-day retention — confirm this is active under **Database →
      Backups** before you have customer data you can't afford to lose.

---

## 🟡 Should-do before public launch (week 1)

- [ ] **Rate limiting on signup.** The `create_firm_and_admin` and
      `join_firm_with_invite` RPCs have no built-in rate limit. A
      script could spam-create thousands of firms. Add Supabase's
      built-in Auth rate limiting (**Authentication → Rate Limits**) and
      consider a Cloudflare Turnstile / hCaptcha on the signup form if
      abuse becomes a problem.

- [ ] **Seat limit enforcement tested.** Set a firm's `plan_seats` to 1,
      try to approve a second user, confirm `firm_seats_available()`
      blocks it (wire this into `04-client-table.js` `approveUser()` if
      not already enforced in the UI — currently only enforced at the
      database function level, add a friendly error message client-side
      too).

- [ ] **Trial expiry enforcement.** `firms.trial_ends_at` exists in the
      schema but nothing currently blocks login after it passes. Decide
      your grace-period policy and either (a) add a banner + read-only
      mode after expiry, or (b) wire up Stripe billing before trials
      start expiring for real customers — see `BUSINESS_MODEL.md`.

- [ ] **Error monitoring.** Add a lightweight error tracker (Sentry's
      free tier, or even a simple `window.onerror` → webhook to Slack)
      so you find out about JS errors in production before customers
      report them.

- [ ] **Uptime monitoring.** A free UptimeRobot or Better Uptime check
      hitting your login page every 5 minutes, alerting you (not your
      customers) first if the app or Supabase project goes down.

- [ ] **Content Security Policy header.** Add a CSP via your hosting
      provider's config (Cloudflare Pages `_headers` file, Vercel
      `vercel.json` headers) restricting script sources to your domain
      + the Supabase/jsDelivr/cdnjs CDNs actually used. Reduces XSS
      blast radius.

- [ ] **Privacy Policy + Terms of Service.** Required before processing
      any Indian client's personal data per the DPDP Act 2023 — link
      these from the signup screen. (Not legal advice — have an actual
      lawyer draft these; ironic to skip this step in a legal practice
      tool.)

---

## 🟢 Nice-to-have (can wait until you have 10+ paying firms)

- [ ] **Staging environment.** A second Supabase project +
      a second GitHub Pages deployment (e.g. a `staging` branch) to test schema changes before
      they touch production. Currently `APP_ENV` exists as a variable
      but there's no separate staging Supabase project provisioned —
      create one when you're ready to stop testing schema changes
      directly in prod.

- [ ] **Automated migration testing.** A CI step that spins up a fresh
      Supabase local instance (via the Supabase CLI + Docker) and runs
      all migrations against it on every PR, catching SQL errors before
      they reach a human running them by hand.

- [ ] **Audit log retention policy.** `activity_log` grows unbounded.
      Decide a retention window (e.g. 2 years, matching typical
      professional-conduct record-keeping expectations) and add a
      scheduled cleanup — either a Supabase cron Edge Function or a
      manual quarterly `delete from activity_log where created_at <
      now() - interval '2 years'`.

- [ ] **Multi-region consideration.** If you expand beyond India, a
      single `ap-south-1` Supabase project means non-Indian customers
      get higher latency. Cross that bridge when you actually have
      international customers — premature multi-region setup is wasted
      effort at this stage.

- [ ] **Penetration test.** Once you have meaningful revenue at stake,
      a paid third-party security review of the RLS policies and auth
      flow is worth the cost — self-review (even careful self-review,
      like the manual cross-tenant test above) misses things a
      specialist won't.

---

## How to re-run this checklist

This file doesn't expire — re-run the 🔴 section after every schema
migration (`database/migrations/00N_*.sql`), since a badly written new
policy is the most likely way tenant isolation breaks after launch.
