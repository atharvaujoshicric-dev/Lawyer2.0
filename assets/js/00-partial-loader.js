// ════════════════════════════════════════════════════════════════════════
//  PARTIAL LOADER — runtime HTML assembly (no build step)
//
//  GitHub Pages serves static files with no build pipeline, so instead of
//  pre-assembling one giant index.html (like a bundler would), this file
//  fetches every screen/view/modal fragment from partials/ at page load
//  and stitches them into the DOM before any other script runs.
//
//  Load order in index.html:
//    1. assets/js/env.js              (Supabase credentials)
//    2. assets/js/00-partial-loader.js (THIS FILE — must run first)
//    3. assets/js/01-supabase-config.js ... 23-helpers-boot.js
//
//  This file calls window.__lexdeskPartialsReady (a Promise) which
//  23-helpers-boot.js awaits before calling initApp(), so nothing tries
//  to touch a DOM element before its HTML has actually arrived.
// ════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // Screens that exist outside the main #app shell (rendered directly
  // into <body>, before the shell). Order doesn't matter for these.
  const SCREENS = [
    'partials/views/screen-setup.html',
    'partials/views/screen-login.html',
    'partials/views/screen-pending.html',
    'partials/views/screen-portal.html',
    'partials/views/screen-portal-view.html'
  ];

  // The #app shell itself (sidebar + topbar + empty #page container)
  const SHELL = 'partials/_app-shell.html';

  // Every view that gets injected into #page inside the shell. Order here
  // doesn't affect anything since each view is a div the JS shows/hides
  // by id — but dashboard first keeps source order matching the nav menu.
  const VIEWS = [
    'view-dashboard', 'view-clients', 'view-deadlines', 'view-planner',
    'view-notes', 'view-activity', 'view-roles', 'view-deadline-rules',
    'view-finances', 'view-documents', 'view-templates', 'view-chat',
    'view-tasks', 'view-users', 'view-formbuilder', 'view-settings'
  ].map(v => `partials/views/${v}.html`);

  // Every modal dialog — fetched dynamically by listing the directory
  // isn't possible from a static host, so this is an explicit list.
  // If you add a new modal file, add its name here too.
  const MODALS = [
    'modal-detail', 'modal-client', 'modal-preview', 'modal-note',
    'modal-note-share', 'modal-payment', 'modal-add-user', 'modal-template',
    'modal-use-template', 'modal-new-cat', 'modal-task', 'modal-portal-link',
    'modal-deadline-rule', 'modal-create-group', 'modal-manage-group',
    'modal-change-password', 'modal-forgot-password', 'modal-set-new-password',
    'modal-group-settings', 'modal-role'
  ].map(m => `partials/modals/${m}.html`);

  async function fetchText(path) {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) {
      console.error(`LexDesk: failed to load partial ${path} (${res.status})`);
      return `<!-- failed to load ${path} -->`;
    }
    return res.text();
  }

  async function fetchAll(paths) {
    const texts = await Promise.all(paths.map(fetchText));
    return texts.join('\n');
  }

  async function loadEverything() {
    // Fetch screens, shell, views, and modals in parallel for speed
    const [screensHtml, shellHtml, viewsHtml, modalsHtml] = await Promise.all([
      fetchAll(SCREENS),
      fetchText(SHELL),
      fetchAll(VIEWS),
      fetchAll(MODALS)
    ]);

    // Inject screens directly into body (before the shell)
    const screensContainer = document.createElement('div');
    screensContainer.id = 'lexdesk-screens';
    screensContainer.innerHTML = screensHtml;
    document.body.appendChild(screensContainer);

    // Inject the shell, then inject views into its #page container
    const shellContainer = document.createElement('div');
    shellContainer.innerHTML = shellHtml;
    document.body.appendChild(shellContainer.firstElementChild);

    const pageEl = document.getElementById('page');
    if (pageEl) {
      pageEl.innerHTML = viewsHtml;
    } else {
      console.error('LexDesk: #page container not found after shell injection — check partials/_app-shell.html');
    }

    // Inject modals directly into body
    const modalsContainer = document.createElement('div');
    modalsContainer.id = 'lexdesk-modals';
    modalsContainer.innerHTML = modalsHtml;
    document.body.appendChild(modalsContainer);
  }

  // Expose a promise the rest of the app can await before booting.
  window.__lexdeskPartialsReady = loadEverything().catch(err => {
    console.error('LexDesk: fatal error loading partials', err);
    document.body.innerHTML = `
      <div style="padding:40px;font-family:sans-serif;color:#f87171;max-width:600px;margin:60px auto;">
        <h2>Failed to load LexDesk</h2>
        <p>A required page fragment could not be fetched. If you're testing
        locally, this usually means you opened index.html directly with
        file:// — browsers block fetch() for local files. Run a local
        server instead (e.g. <code>python3 -m http.server</code>) or test
        on the deployed GitHub Pages URL.</p>
        <p style="color:#888;font-size:13px;">${err && err.message ? err.message : err}</p>
      </div>`;
    throw err;
  });
})();
