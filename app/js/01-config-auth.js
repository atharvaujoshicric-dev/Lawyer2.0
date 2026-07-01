// ════════════════════════════════════════════════════════════════════════
//  01-config-auth.js — Supabase Client & Authentication
//
//  FIX: Credentials are now hardcoded as the DEFAULT.
//  localStorage can still override them (for dev/staging use).
//  This fixes: "signin button does nothing" on fresh browsers / GitHub Pages.
// ════════════════════════════════════════════════════════════════════════

// ── Default credentials (hardcoded for production) ──────────────────────
const SUPABASE_URL_DEFAULT = 'https://nvojtsmurbvpclwcwrca.supabase.co';
const SUPABASE_KEY_DEFAULT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52b2p0c211cmJ2cGNsd2N3cmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTYxODgsImV4cCI6MjA5NzE3MjE4OH0.83E5nAY27tX15ClrqwxjmAsPXj3Wx5na9j3Lg24I63E';

const CFG_KEY = 'ld_supabase_cfg';
let sb = null;

function getSupabaseConfig(){
  // localStorage override takes priority (dev use), then fall back to hardcoded defaults
  try {
    const stored = JSON.parse(localStorage.getItem(CFG_KEY) || 'null');
    if (stored && stored.url && stored.key) return stored;
  } catch(e) {}
  // Always return hardcoded defaults — never return null on production
  return { url: SUPABASE_URL_DEFAULT, key: SUPABASE_KEY_DEFAULT };
}

function saveSupabaseConfig(){
  const url = (document.getElementById('cfg-url')?.value || '').trim();
  const key = (document.getElementById('cfg-key')?.value || '').trim();
  if(!url || !url.startsWith('https://')){ showToast('Enter a valid Supabase URL', 'error'); return; }
  if(!key || key.length < 100){ showToast('Enter a valid anon key', 'error'); return; }
  localStorage.setItem(CFG_KEY, JSON.stringify({url, key}));
  initSupabase();
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  showToast('Supabase connected!', 'success');
}

function disconnectSupabase(){
  localStorage.removeItem(CFG_KEY);
  sb = null;
  showToast('Disconnected. Reload to reconnect.', 'info');
}

function initSupabase(){
  const cfg = getSupabaseConfig();
  // getSupabaseConfig now always returns a config, never null
  sb = window.supabase.createClient(cfg.url, cfg.key);
  // Hide setup screen — credentials are always available
  const setupEl = document.getElementById('setup-screen');
  if (setupEl) setupEl.style.display = 'none';
  return true;
}

// ── Authentication functions ─────────────────────────────────────────────
async function doSignIn(){
  const email   = (document.getElementById('li-email')?.value || '').trim().toLowerCase();
  const pwd     = document.getElementById('li-pwd')?.value || '';
  const errEl   = document.getElementById('li-err');
  if (errEl) errEl.style.display = 'none';

  if (!email || !pwd){
    if (errEl){ errEl.textContent = 'Enter your email and password.'; errEl.style.display = 'block'; }
    return;
  }

  // Show loading state
  const btn = document.querySelector('#auth-signin .btn-gold');
  if (btn){ btn.disabled = true; btn.textContent = 'Signing in…'; }

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pwd });
    if (error){
      if (errEl){ errEl.textContent = humanizeAuthError(error.message); errEl.style.display = 'block'; }
      return;
    }
    await afterAuth();
  } catch(e) {
    if (errEl){ errEl.textContent = 'Connection error. Please try again.'; errEl.style.display = 'block'; }
  } finally {
    if (btn){ btn.disabled = false; btn.textContent = 'Sign In'; }
  }
}

async function doSignUp(){
  const name  = (document.getElementById('su-name')?.value || '').trim();
  const email = (document.getElementById('su-email')?.value || '').trim().toLowerCase();
  const pwd   = document.getElementById('su-pwd')?.value || '';
  const code  = (document.getElementById('su-code')?.value || '').trim().toUpperCase();
  const errEl = document.getElementById('su-err');
  if (errEl) errEl.style.display = 'none';

  if (!name || !email || !pwd){ showFormError(errEl, 'All fields are required.'); return; }
  if (pwd.length < 8){ showFormError(errEl, 'Password must be at least 8 characters.'); return; }

  const btn = document.querySelector('#auth-signup .btn-gold');
  if (btn){ btn.disabled = true; btn.textContent = 'Creating account…'; }

  try {
    // Validate signup code if provided
    if (code) {
      const { data: codeRow } = await sb.from('signup_codes')
        .select('*').eq('code', code).eq('active', true).maybeSingle();
      if (!codeRow){ showFormError(errEl, 'Invalid or expired signup code.'); return; }
    }

    const { data, error } = await sb.auth.signUp({ email, password: pwd });
    if (error){ showFormError(errEl, humanizeAuthError(error.message)); return; }

    if (data?.user) {
      // Create profile row
      await sb.from('profiles').upsert({
        id:        data.user.id,
        full_name: name,
        email,
        role:      code ? 'assistant' : 'pending',
        approved:  !!code,         // auto-approve if valid invite code
      });
      if (code) {
        // Mark code as used (deactivate single-use codes)
        await sb.from('signup_codes').update({ active: false }).eq('code', code);
      }
    }

    if (data?.session) {
      // Immediate session (email confirmation disabled)
      await afterAuth();
    } else {
      showToast('Check your email to confirm your account, then sign in.', 'info');
      showAuthTab('signin');
    }
  } catch(e) {
    showFormError(errEl, 'An error occurred. Please try again.');
  } finally {
    if (btn){ btn.disabled = false; btn.textContent = 'Create Account'; }
  }
}

async function doForgotPassword(){
  const email = (document.getElementById('reset-email')?.value || '').trim().toLowerCase();
  const errEl = document.getElementById('reset-err');
  if (errEl) errEl.style.display = 'none';
  if (!email){ showFormError(errEl, 'Enter your email address.'); return; }

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href
  });
  if (error){ showFormError(errEl, 'Failed to send reset email. Please try again.'); return; }
  showToast('Password reset email sent! Check your inbox.', 'success');
  showAuthTab('signin');
}

async function afterAuth(){
  if (!sb){ initSupabase(); }
  const { data: { user } } = await sb.auth.getUser();
  if (!user){
    document.getElementById('login-screen').style.display = 'flex';
    return;
  }
  S.user = user;

  const { data: profile } = await sb.from('profiles')
    .select('*, custom_roles(*)').eq('id', user.id).maybeSingle();

  if (!profile){
    // Profile doesn't exist yet (first login after email confirm)
    await sb.from('profiles').upsert({
      id:        user.id,
      full_name: user.email?.split('@')[0] || 'User',
      email:     user.email,
      role:      'pending',
      approved:  false,
    });
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('pending-screen').style.display = 'flex';
    return;
  }

  if (!profile.approved){
    S.profile = profile;
    document.getElementById('login-screen').style.display  = 'none';
    document.getElementById('pending-screen').style.display = 'flex';
    return;
  }

  S.profile = profile;
  document.getElementById('login-screen').style.display  = 'none';
  document.getElementById('pending-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Apply saved theme before app renders
  if (typeof applyProfileTheme === 'function') applyProfileTheme(profile);
  else if (typeof initTheme === 'function') initTheme();

  await initApp();
}

// ── Helpers ───────────────────────────────────────────────────────────────
function showFormError(el, msg){
  if (!el) return showToast(msg, 'error');
  el.textContent = msg;
  el.style.display = 'block';
}

function humanizeAuthError(msg){
  if (!msg) return 'An error occurred. Please try again.';
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Incorrect email or password.';
  if (m.includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (m.includes('too many'))    return 'Too many attempts. Please wait a few minutes.';
  if (m.includes('already registered')) return 'An account with this email already exists.';
  if (m.includes('network'))    return 'Network error. Check your connection.';
  return msg;
}

function showAuthTab(tab){
  document.getElementById('auth-signin').style.display = tab === 'signin' ? 'block' : 'none';
  document.getElementById('auth-signup').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('auth-forgot').style.display = tab === 'forgot' ? 'block' : 'none';
  document.getElementById('tab-signin').style.background = tab === 'signin' ? 'var(--navy)' : '';
  document.getElementById('tab-signin').style.color      = tab === 'signin' ? '#fff' : '';
  document.getElementById('tab-signup').style.background = tab === 'signup' ? 'var(--navy)' : '';
  document.getElementById('tab-signup').style.color      = tab === 'signup' ? '#fff' : '';
}

function showForgotPassword(){ showAuthTab('forgot'); }
function showSignIn(){  showAuthTab('signin'); }
