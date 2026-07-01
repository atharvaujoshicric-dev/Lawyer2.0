// ════════════════════════════════════════════════════════════════════════
//  PARTIAL LOADER — runtime HTML assembly
//  Fetches every screen/view/modal from partials/ and injects them into
//  the DOM before any other script runs. The boot sequence in
//  23-helpers-boot.js awaits window.__lexdeskPartialsReady before calling
//  initApp(), so nothing touches a DOM element before it exists.
// ════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // Build paths relative to this script's own location, not window.location.
  // This means the app works correctly whether served from the root or a
  // GitHub Pages project subpath (e.g. /Lawyer2.0/).
  const SELF_SRC = document.currentScript ? document.currentScript.src : '';
  const BASE = SELF_SRC ? SELF_SRC.replace(/assets\/js\/[^/]+$/, '') : './';

  function p(path){ return BASE + path; }

  const SCREENS = [
    p('partials/views/screen-setup.html'),
    p('partials/views/screen-login.html'),
    p('partials/views/screen-pending.html'),
    p('partials/views/screen-portal.html'),
    p('partials/views/screen-portal-view.html'),
  ];

  const SHELL = p('partials/_app-shell.html');

  const VIEWS = [
    'view-dashboard','view-clients','view-deadlines','view-planner',
    'view-notes','view-activity','view-roles','view-deadline-rules',
    'view-finances','view-documents','view-templates','view-chat',
    'view-tasks','view-users','view-formbuilder','view-settings'
  ].map(v => p(`partials/views/${v}.html`));

  const MODALS = [
    'modal-detail','modal-client','modal-preview','modal-note',
    'modal-note-share','modal-payment','modal-add-user','modal-template',
    'modal-use-template','modal-new-cat','modal-task','modal-portal-link',
    'modal-deadline-rule','modal-create-group','modal-manage-group',
    'modal-change-password','modal-forgot-password','modal-set-new-password',
    'modal-group-settings','modal-role'
  ].map(m => p(`partials/modals/${m}.html`));

  async function fetchText(path) {
    let res;
    try { res = await fetch(path, { cache: 'no-cache' }); }
    catch (e) { throw new Error(`Network error fetching ${path}: ${e.message}`); }
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${path}`);
    return res.text();
  }

  async function fetchAll(paths) {
    return (await Promise.all(paths.map(fetchText))).join('\n');
  }

  async function loadEverything() {
    const [screensHtml, shellHtml, viewsHtml, modalsHtml] = await Promise.all([
      fetchAll(SCREENS), fetchText(SHELL), fetchAll(VIEWS), fetchAll(MODALS)
    ]);

    // Screens (login, setup, pending, portal) — injected before the shell
    const sc = document.createElement('div');
    sc.id = 'lexdesk-screens';
    sc.innerHTML = screensHtml;
    document.body.appendChild(sc);

    // App shell (sidebar + topbar + empty #page)
    const sh = document.createElement('div');
    sh.innerHTML = shellHtml;
    if (!sh.firstElementChild) throw new Error('_app-shell.html did not parse into an element — file may be empty or malformed.');
    document.body.appendChild(sh.firstElementChild);

    // Views injected into #page
    const pageEl = document.getElementById('page');
    if (!pageEl) throw new Error('#page not found after shell injection — check partials/_app-shell.html contains <div id="page">');
    pageEl.innerHTML = viewsHtml;

    // Modals
    const md = document.createElement('div');
    md.id = 'lexdesk-modals';
    md.innerHTML = modalsHtml;
    document.body.appendChild(md);
  }

  window.__lexdeskPartialsReady = loadEverything().catch(err => {
    console.error('LexDesk partial loader failed:', err);
    const isFile = window.location.protocol === 'file:';
    document.body.innerHTML = `
      <div style="padding:48px;font-family:system-ui,sans-serif;max-width:620px;margin:80px auto;
                  background:rgba(255,255,255,.06);border-radius:16px;border:1px solid rgba(255,255,255,.12);">
        <h2 style="color:#f87171;margin:0 0 16px;">Failed to load LexDesk</h2>
        <p style="color:#e2e8f0;background:rgba(0,0,0,.3);padding:12px 16px;border-radius:8px;
                  font-family:monospace;font-size:13px;word-break:break-all;">${err.message}</p>
        ${isFile
          ? '<p style="color:#94a3b8;">You opened index.html directly as a local file. Browsers block <code>fetch()</code> for <code>file://</code> URLs. Run a local server: <code>python3 -m http.server 8080</code></p>'
          : '<p style="color:#94a3b8;">Check that the <code>partials/</code> folder and all its files were pushed to GitHub, and that <code>.nojekyll</code> exists at the repo root.</p>'}
      </div>`;
    throw err;
  });
})();
