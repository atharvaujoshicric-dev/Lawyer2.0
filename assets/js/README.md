# assets/js — Load Order

Files are numbered `01` through `23` and **must stay in that numeric
order** when loaded by `index.html` at the repo root (each one is an explicit `<script src>` tag, in order). Later
modules reference globals (`sb`, `S`, helper functions) defined by
earlier ones; there is no module bundler resolving dependencies for you,
so the order is load-bearing.

| # | File | Owns |
|---|---|---|
| — | `env.js` | Supabase URL + anon key — **loads first**, before everything else |
| 00 | `00-partial-loader.js` | Fetches every screen/view/modal from `partials/` and injects them into the DOM — **must load before 01-23** |
| 01 | `01-supabase-config.js` | `sb` client, global `S` state object, auth (sign in/up/out), firm onboarding RPC calls |
| 02 | `02-data-loading.js` | `loadAllData()`, `refreshAll()` — the bulk fetch that populates `S` after login |
| 03 | `03-client-form-builder.js` | Case type tabs, dynamic fields, client CRUD, form builder, conflict-check-aware save |
| 04 | `04-client-table.js` | Client list rendering, stats, file staging, user approval, invite codes |
| 05 | `05-chat-core.js` | 1:1 direct messages — load/send/edit/delete |
| 06 | `06-tasks-kanban.js` | Task CRUD, kanban board, task comments |
| 07 | `07-templates.js` | Document templates, Excel export, Settings page load |
| 08 | `08-payments.js` | Fee ledger entries on a single client |
| 09 | `09-planner.js` | Daily/monthly planner calendar |
| 10 | `10-onedrive-sync.js` | OneDrive OAuth stub |
| 11 | `11-notifications.js` | Polling loop, unread badges |
| 12 | `12-notes.js` | Private notes, sharing, history, activity log |
| 13 | `13-finances.js` | Firm-wide fee tracker (admin only) |
| 14 | `14-client-portal.js` | Unauthenticated client-facing portal (magic link + PIN) |
| 15 | `15-invoice-generation.js` | PDF invoice generation, invoice settings |
| 16 | `16-deadline-calculator.js` | Court filing deadline rules engine |
| 17 | `17-conflict-checker.js` | Conflict-of-interest search, client audit trail |
| 18 | `18-custom-roles.js` | Custom role CRUD, permission checks |
| 19 | `19-group-chat.js` | Group chat — overrides some of `05`'s rendering to be group-aware |
| 20 | `20-misc-features.js` | Password reset, archive/restore users, task auto-cleanup |
| 21 | `21-ai-assistant.js` | LexDesk Assistant chatbot — system help + Indian law Q&A |
| 22 | `22-theme-system.js` | Liquid Glass theme customiser (mode/backdrop/tint/contrast) |
| 23 | `23-helpers-boot.js` | Generic helpers (escHtml, formatters), DOMContentLoaded boot sequence — **must load last**, since it calls `initApp()` which depends on everything above |

## Adding a new module

1. Pick the next free number, or insert a fractional-feeling name like
   `19b-` if it genuinely belongs adjacent to an existing module (the
   build script sorts lexically, so `19b` sorts after `19` and before
   `20` — avoid this where possible, prefer appending at the end).
2. Keep one module = one feature area. The split exists so a future
   contributor (or you, in six months) can find "the chat code" without
   reading a 7,000-line file.
3. If your module defines a function another module needs, document
   that dependency with a one-line comment at the call site, the way the
   existing modules do (e.g. `19-group-chat.js` overriding `05`'s
   `renderChatContacts()`).
