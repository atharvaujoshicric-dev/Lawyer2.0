# LexDesk

A multi-tenant legal practice management SaaS for Indian law firms —
client and case management, court deadline tracking pre-seeded with
Indian statutes (BNS, BNSS, CPC, GST, IBC), team task workflow, internal
chat, fee ledger and invoicing, a client self-service portal, and an
Indian-law-aware AI assistant — wrapped in a Liquid Glass interface with
full light/dark theming.

This deployment is configured for **GitHub Pages with zero build step**
— every file in this repo is served as-is. There is no bundler, no
`npm run build`, nothing to compile. Edit a file, commit, push, and
GitHub Pages serves the new version.

---

## How this works (no build step)

`index.html` at the repo root is intentionally thin — it just loads
`assets/css/app.css`, all 23 files in `assets/js/`, and one more script,
`assets/js/00-partial-loader.js`. That loader is the only "build step"
this app has, and it runs **in the browser, on every page load**: it
fetches every screen, view, and modal from the `partials/` folder via
`fetch()` and injects them into the page before anything else runs.

This means:

- **To edit a screen or modal**, find the matching file directly in
  `partials/views/` or `partials/modals/` — you don't need to hunt
  through one giant HTML file.
- **To edit app logic**, find the matching numbered file in
  `assets/js/` — see `assets/js/README.md` for what each one owns.
- **To edit styling**, it's all in `assets/css/app.css`.
- **There is nothing to run before pushing.** Commit your change,
  GitHub Pages picks it up automatically.

---

## Folder structure

```
.
├── index.html                  Thin shell — loads CSS/JS, the partial loader fetches the rest
├── .nojekyll                   Tells GitHub Pages not to run Jekyll (which would mangle _app-shell.html)
│
├── assets/
│   ├── css/
│   │   └── app.css             All styling — single file, see note in source about why
│   └── js/
│       ├── env.js              Your Supabase URL + anon key — edit this to point at a different project
│       ├── 00-partial-loader.js  Fetches partials/ at runtime — MUST load before everything else
│       ├── 01-supabase-config.js ... 23-helpers-boot.js   23 numbered app modules, load order matters
│       └── README.md           What each numbered module owns
│
├── partials/
│   ├── _app-shell.html         Sidebar + topbar + empty #page container
│   ├── views/                  One file per screen: login, dashboard, clients, tasks, etc.
│   └── modals/                 One file per modal dialog
│
├── database/
│   ├── migrations/             Numbered, idempotent SQL — apply these to a fresh Supabase project
│   ├── functions/               Security-definer RPCs (firm signup/onboarding)
│   └── README.md                Why the schema is shaped the way it is
│
└── docs/
    ├── SETUP.md                 How to provision a new Supabase project for this app
    ├── PRODUCTION_CHECKLIST.md  Pre-launch hardening checklist
    └── BUSINESS_MODEL.md        Pricing, target market, go-to-market strategy
```

---

## Editing your Supabase connection

Open `assets/js/env.js` directly — it's two values:

```js
window.__LEXDESK_ENV__ = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key",
  ...
};
```

The anon key is safe to commit and ship to the browser — Row Level
Security (`database/migrations/`) is what actually protects every law
firm's data, not secrecy of this key. See `database/README.md` for how
that isolation works.

---

## Adding a new screen or modal

1. Create the new `.html` fragment in `partials/views/` (for a full
   screen/view) or `partials/modals/` (for a dialog).
2. Open `assets/js/00-partial-loader.js` and add the new filename to
   the `VIEWS` or `MODALS` array near the top — this is the one place
   that needs updating, since a static host can't list a folder's
   contents for you at runtime.
3. Commit and push. No build step.

---

## Local testing before you push

Partials are fetched via `fetch()`, which browsers block for files
opened directly (`file://...`). Run a tiny local server instead:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

or, if you have Node installed:

```bash
npx serve .
```

---

## Multi-tenancy in one paragraph

Every business table in `database/migrations/` has a `firm_id` column.
Two Postgres functions, `current_firm_id()` and `is_firm_admin()`, are
the foundation every Row Level Security policy is built from. A user can
only ever read or write rows where `firm_id = current_firm_id()` —
Postgres enforces this at the database layer regardless of what the
client-side JavaScript does or doesn't check.

---

## Documentation index

- **[docs/SETUP.md](docs/SETUP.md)** — provisioning a Supabase project
  and applying the database schema
- **[docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)** —
  what to verify before your first real customer
- **[docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md)** — pricing,
  target market, unit economics, go-to-market
- **[database/README.md](database/README.md)** — schema design
  rationale
- **[assets/js/README.md](assets/js/README.md)** — JS module load order
