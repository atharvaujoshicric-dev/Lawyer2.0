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

  // Resolve every partial path against the directory this script itself
  // lives in, not against window.location. This matters because GitHub
  // Pages project sites serve from a subpath (e.g.
  // https://username.github.io/repo-name/), and a path like
  // 'partials/_app-shell.html' written as if relative to the domain root
  // will 404 there. document.currentScript gives us the actual script
  // tag, so we can compute the correct base no matter how deep the repo
  // is nested or what subpath it's served from.
  const SELF_SRC = document.currentScript ? document.currentScript.src : '';
  const BASE = SELF_SRC ? SELF_SRC.replace(/assets\/js\/[^/]+$/, '') : './';

  function resolvePath(relativePath){
    return BASE + relativePath;
  }

  // Screens that exist outside the main #app shell (rendered directly
  // into <body>, before the shell). Order doesn't matter for these.
  const SCREENS = [
    'partials/views/screen-setup.html',
    'partials/views/screen-login.html',
    'partials/views/screen-pending.html',
    'partials/views/screen-portal.html',
    'partials/views/screen-portal-view.html'
  ].map(resolvePath);

  // The #app shell itself (sidebar + topbar + empty #page container)
  const SHELL = resolvePath('partials/_app-shell.html');

  // Every view that gets injected into #page inside the shell. Order here
  // doesn't affect anything since each view is a div the JS shows/hides
  // by id — but dashboard first keeps source order matching the nav menu.
  const VIEWS = [
    'view-dashboard', 'view-clients', 'view-deadlines', 'view-planner',
    'view-notes', 'view-activity', 'view-roles', 'view-deadline-rules',
    'view-finances', 'view-documents', 'view-templates', 'view-chat',
    'view-tasks', 'view-users', 'view-formbuilder', 'view-settings'
  ].map(v => resolvePath(`partials/views/${v}.html`));

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
  ].map(m => resolvePath(`partials/modals/${m}.html`));

  // Fetches one fragment. Throws (instead of silently returning a
  // placeholder comment) so a missing/404 file produces a clear, specific
  // error message rather than a confusing downstream DOM crash.
  async function fetchText(path) {
    let res;
    try {
      res = await fetch(path, { cache: 'no-cache' });
    } catch (networkErr) {
      throw new Error(`Network error fetching ${path}: ${networkErr.message}`);
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${path} — check the file exists at that exact path on your deployed site.`);
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
    if (!shellContainer.firstElementChild) {
      throw new Error(`partials/_app-shell.html fetched successfully but did not parse into any element — check the file isn't empty or malformed.`);
    }
    document.body.appendChild(shellContainer.firstElementChild);

    const pageEl = document.getElementById('page');
    if (pageEl) {
      pageEl.innerHTML = viewsHtml;
    } else {
      throw new Error('#page container not found after shell injection — check partials/_app-shell.html contains <div id="page">.');
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
    const isLocalFile = window.location.protocol === 'file:';
    document.body.innerHTML = `
      <div style="padding:40px;font-family:sans-serif;color:#f87171;max-width:640px;margin:60px auto;">
        <h2>Failed to load LexDesk</h2>
        <p style="color:#ddd;">${(err && err.message) ? err.message : String(err)}</p>
        ${isLocalFile ? `
        <p style="color:#aaa;">You opened this file directly via <code>file://</code> — browsers block
        <code>fetch()</code> for local files. Run a local server instead:
        <code>python3 -m http.server 8080</code> then open
        <code>http://localhost:8080</code>.</p>` : `
        <p style="color:#aaa;">If this is happening on your deployed GitHub Pages site, double-check:
        the <code>partials/</code> folder was actually pushed and committed, GitHub Pages is set to
        deploy from the correct branch and the repo root, and there's no typo in the filename the
        error above is pointing at.</p>`}
      </div>`;
    throw err;
  });
})();
