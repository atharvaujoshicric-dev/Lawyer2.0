// ════════════════════════════════════════════
//  ROLE SYSTEM (4-tier hierarchy)
// ════════════════════════════════════════════
const ROLE_HIERARCHY = [
  { key:'senior_advocate',  label:'Senior Advocate',   short:'Sr. Advocate',  icon:'fas fa-crown',    badgeClass:'badge-senior-advocate', rank:1 },
  { key:'junior_advocate',  label:'Junior Advocate',   short:'Jr. Advocate',  icon:'fas fa-gavel',    badgeClass:'badge-junior-advocate', rank:2 },
  { key:'senior_assistant', label:'Senior Assistant',  short:'Sr. Assistant', icon:'fas fa-briefcase',badgeClass:'badge-senior-assistant',rank:3 },
  { key:'junior_assistant', label:'Junior Assistant',  short:'Jr. Assistant', icon:'fas fa-user',     badgeClass:'badge-junior-assistant',rank:4 },
];
const ROLE_KEYS = ROLE_HIERARCHY.map(r => r.key);

function getRoleInfo(key) {
  return ROLE_HIERARCHY.find(r => r.key === key) ||
         { key, label: key, short: key, icon:'fas fa-user', badgeClass:'badge-junior-assistant', rank:99 };
}
function roleBadgeHtml(key) {
  const r = getRoleInfo(key);
  return `<span class="badge ${r.badgeClass}"><i class="${r.icon}"></i> ${r.label}</span>`;
}
function roleRank(key) { const r = getRoleInfo(key); return r.rank; }

// ── Permission helpers ─────────────────────────────────────────────────────
// S.hierarchyPerms = { role: { perm_key: bool } }  loaded from DB after login

function isSeniorAdvocate() { return S.profile?.role === 'senior_advocate'; }
function isAdmin()          { return isSeniorAdvocate() && S.profile?.approved; }

function hasPerm(permKey) {
  if (isSeniorAdvocate()) return true;
  const role = S.profile?.role;
  if (!role || !S.hierarchyPerms) return false;
  return S.hierarchyPerms[role]?.[permKey] === true;
}

// Specific permission checks (fallback-safe)
function canSeeFinances()    { return isSeniorAdvocate(); }               // ALWAYS senior only
function canSeeAllClients()  { return isSeniorAdvocate() || hasPerm('see_all_clients'); }
function canManageClients()  { return isSeniorAdvocate() || hasPerm('manage_clients'); }
function canUploadDocs()     { return isSeniorAdvocate() || hasPerm('upload_documents'); }
function canUseTemplates()   { return isSeniorAdvocate() || hasPerm('use_templates'); }
function canCreateTasks()    { return isSeniorAdvocate() || hasPerm('create_tasks'); }
function canViewActivity()   { return isSeniorAdvocate() || hasPerm('view_activity_log'); }
function canChat()           { return isSeniorAdvocate() || hasPerm('access_chat'); }
function canUsePlanner()     { return isSeniorAdvocate() || hasPerm('access_planner'); }
function canUseNotes()       { return isSeniorAdvocate() || hasPerm('access_notes'); }

// Load hierarchy permissions from DB
async function loadHierarchyPerms() {
  try {
    const { data } = await sb.from('hierarchy_permissions').select('*');
    const perms = {};
    (data || []).forEach(row => {
      if (!perms[row.role]) perms[row.role] = {};
      perms[row.role][row.perm_key] = row.allowed;
    });
    S.hierarchyPerms = perms;
  } catch(e) {
    S.hierarchyPerms = {}; // safe fallback
  }
}

// ════════════════════════════════════════════
//  AUTH FUNCTIONS
// ════════════════════════════════════════════

async function doSignIn() {
  const email = (document.getElementById('li-email').value || '').trim();
  const pwd   = document.getElementById('li-pwd').value;
  const err   = document.getElementById('li-err');
  err.style.display = 'none';
  if (!email || !pwd) { err.textContent = 'Enter email and password.'; err.style.display = 'block'; return; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pwd });
  if (error) { err.textContent = error.message; err.style.display = 'block'; return; }
  await afterAuth();
}

async function doSignUp() {
  const name  = (document.getElementById('su-name').value || '').trim();
  const email = (document.getElementById('su-email').value || '').trim();
  const pwd   = document.getElementById('su-pwd').value;
  const code  = (document.getElementById('su-code').value || '').trim();
  const err   = document.getElementById('su-err');
  err.style.display = 'none';
  if (!name || !email || pwd.length < 8) {
    err.textContent = 'Name, email, and a password (8+ chars) are required.';
    err.style.display = 'block'; return;
  }

  // Is this the first user?
  const { count } = await sb.from('profiles').select('*', { count: 'exact', head: true });
  const isFirstUser = (count || 0) === 0;

  if (!isFirstUser) {
    if (!code) { err.textContent = 'A signup code from your Senior Advocate is required.'; err.style.display = 'block'; return; }
    const { data: codeRow } = await sb.from('signup_codes').select('*').eq('code', code).eq('active', true).maybeSingle();
    if (!codeRow) { err.textContent = 'Invalid or expired signup code.'; err.style.display = 'block'; return; }
    // Deactivate code (single use)
    await sb.from('signup_codes').update({ active: false }).eq('code', code);
  }

  const { data, error } = await sb.auth.signUp({ email, password: pwd });
  if (error) { err.textContent = error.message; err.style.display = 'block'; return; }
  const userId = data.user?.id;
  if (!userId) { err.textContent = 'Signup failed — please try again.'; err.style.display = 'block'; return; }

  if (isFirstUser) {
    // First user = Senior Advocate (Admin), Founder, auto-approved, cannot be removed
    await sb.from('profiles').insert({
      id: userId, full_name: name, email,
      role: 'senior_advocate', approved: true, is_founder: true
    });
    const newCode = genCode();
    await sb.from('signup_codes').insert({ code: newCode, created_by: userId });
    showToast('Welcome! You are the Senior Advocate (Admin).', 'success');
    await afterAuth();
  } else {
    await sb.from('profiles').insert({
      id: userId, full_name: name, email,
      role: 'junior_assistant', approved: false, is_founder: false
    });
    showToast('Account created — awaiting Senior Advocate approval.', 'success');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('pending-screen').style.display = 'flex';
  }
}

// ── Forgot Password ────────────────────────────────────────────────────────
function showForgotPassword() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('forgot-screen').style.display = 'flex';
  document.getElementById('forgot-email').value = document.getElementById('li-email').value || '';
  document.getElementById('forgot-err').style.display = 'none';
  document.getElementById('forgot-success').style.display = 'none';
  document.getElementById('forgot-form').style.display = 'block';
}

function hideForgotPassword() {
  document.getElementById('forgot-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

async function doForgotPassword() {
  const email = (document.getElementById('forgot-email').value || '').trim();
  const err   = document.getElementById('forgot-err');
  err.style.display = 'none';
  if (!email) { err.textContent = 'Enter your email address.'; err.style.display = 'block'; return; }
  const btn = document.getElementById('forgot-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href.split('#')[0]
  });
  if (btn) { btn.disabled = false; btn.textContent = 'Send Reset Link'; }
  if (error) { err.textContent = error.message; err.style.display = 'block'; return; }
  document.getElementById('forgot-form').style.display = 'none';
  document.getElementById('forgot-success').style.display = 'block';
}

// Handle password reset redirect (Supabase sends back with #access_token&type=recovery)
async function handlePasswordResetRedirect() {
  const hash   = window.location.hash;
  const params = new URLSearchParams(hash.replace('#', ''));
  if (params.get('type') !== 'recovery') return false;
  // Show reset password UI
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('login-screen').style.display  = 'none';
  document.getElementById('reset-pw-screen').style.display = 'flex';
  return true;
}

async function doResetPassword() {
  const p1  = document.getElementById('reset-pw1').value;
  const p2  = document.getElementById('reset-pw2').value;
  const err = document.getElementById('reset-pw-err');
  err.style.display = 'none';
  if (p1.length < 8) { err.textContent = 'Password must be at least 8 characters.'; err.style.display = 'block'; return; }
  if (p1 !== p2)     { err.textContent = 'Passwords do not match.'; err.style.display = 'block'; return; }
  const { error } = await sb.auth.updateUser({ password: p1 });
  if (error) { err.textContent = error.message; err.style.display = 'block'; return; }
  showToast('Password updated! Signing you in…', 'success');
  document.getElementById('reset-pw-screen').style.display = 'none';
  history.replaceState(null, '', window.location.pathname + window.location.search);
  await afterAuth();
}

async function afterAuth() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { document.getElementById('login-screen').style.display = 'flex'; return; }
  S.user = user;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile) { document.getElementById('login-screen').style.display = 'flex'; return; }
  if (!profile.approved) {
    S.profile = profile;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('pending-screen').style.display = 'flex';
    return;
  }
  S.profile = profile;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('pending-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  await loadHierarchyPerms();
  await initApp();
}

async function doLogout() {
  if (S.profile && !confirm('Sign out?')) return;
  await sb.auth.signOut();
  S = { ...S, user: null, profile: null, hierarchyPerms: {},
        unreadCounts: {}, locallyReadIds: new Set(), messageReadIds: new Set(),
        messages: [], lastSeenTaskTs: '' };
  document.getElementById('app').style.display = 'none';
  document.getElementById('pending-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('li-email').value = '';
  document.getElementById('li-pwd').value = '';
  document.getElementById('li-err').style.display = 'none';
}

function genCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
