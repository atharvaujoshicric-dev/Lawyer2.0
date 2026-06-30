// ════════════════════════════════════════════════════════════════════════
//  SUPABASE CONFIG & CLIENT  —  SaaS edition
//
//  Unlike the original single-tenant build, this app does NOT ask each
//  browser for a Supabase URL/key. There is exactly ONE Supabase project
//  behind every deployment of this app, injected at build time via
//  env.js (see build/inject-env.js and docs/SETUP.md). Tenant isolation
//  is handled entirely by the database (firm_id + RLS), not by which
//  backend you happen to be pointed at.
// ════════════════════════════════════════════════════════════════════════
let sb = null;

function initSupabase(){
  // window.__LEXDESK_ENV__ is injected by build/inject-env.js from your
  // .env file at deploy time — see docs/SETUP.md "Environment Variables".
  const env = window.__LEXDESK_ENV__ || {};
  if(!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY){
    console.error('LexDesk: missing SUPABASE_URL / SUPABASE_ANON_KEY. Did the build step inject env.js?');
    document.getElementById('config-error-screen')?.style.removeProperty('display');
    return false;
  }
  sb = window.supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  return true;
}

// ════════════════════════════════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════════════════════════════════
let S = {
  user:null, profile:null, firm:null,
  clients:[], users:[], documents:[], templates:[],
  categories:[], formSchemas:{},
  tasks:[], taskComments:{},
  messages:[], activeChatPeer:null, activeGroupId:null,
  editingMessageId:null, messageReadIds:new Set(),
  chatGroups:[], unreadCounts:{}, locallyReadIds:new Set(), lastSeenTaskTs:'',
  editingClientId:null, detailClientId:null,
  activeCaseType:null, pendingFiles:[],
  editingTemplateId:null, activeTemplateId:null,
  editingTaskId:null, pendingChatFile:null,
  fbActiveCat:null, payingClientId:null, linkedContactId:null,
  notes:[], noteShares:{}, editingNoteId:null, sharingNoteId:null,
  finPayments:[], finExpanded:{},
  paymentsCache:{},
  deadlineRules:[], invoiceSettings:null,
  editingDeadlineRuleId:null,
  customRoles:[],
  _editingTemplateVars:[],
  _portalToken:null, portalData:null,
  _approvingUserId:null, _managingGroupId:null
};

const FIELD_TYPES = ['text','number','date','tel','select','textarea'];

// ════════════════════════════════════════════════════════════════════════
//  AUTH — two signup paths: "Create a new firm" vs "Join with invite code"
// ════════════════════════════════════════════════════════════════════════
function showAuthTab(tab){
  document.getElementById('auth-signin').style.display = tab==='signin' ? 'block' : 'none';
  document.getElementById('auth-signup').style.display = tab==='signup' ? 'block' : 'none';
  document.getElementById('tab-signin').classList.toggle('active', tab==='signin');
  document.getElementById('tab-signup').classList.toggle('active', tab==='signup');
}

function toggleSignupMode(mode){
  document.getElementById('su-newfirm-fields').style.display = mode==='new' ? 'block' : 'none';
  document.getElementById('su-invite-fields').style.display  = mode==='invite' ? 'block' : 'none';
  document.querySelectorAll('.su-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode===mode));
  document.getElementById('su-mode-selected').value = mode;
}

async function doSignIn(){
  const email = (document.getElementById('li-email').value||'').trim();
  const pwd = document.getElementById('li-pwd').value;
  const err = document.getElementById('li-err');
  err.style.display = 'none';
  if(!email || !pwd){ err.textContent='Enter email and password.'; err.style.display='block'; return; }
  const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
  if(error){ err.textContent = error.message; err.style.display = 'block'; return; }
  await afterAuth();
}

async function doSignUp(){
  const mode = document.getElementById('su-mode-selected')?.value || 'new';
  const name = (document.getElementById('su-name').value||'').trim();
  const email = (document.getElementById('su-email').value||'').trim();
  const pwd = document.getElementById('su-pwd').value;
  const err = document.getElementById('su-err');
  err.style.display = 'none';

  if(!name || !email || pwd.length < 8){
    err.textContent = 'Name, email, and a password (8+ characters) are required.';
    err.style.display = 'block';
    return;
  }

  let firmName = '', barCouncilState = '', inviteCode = '';
  if(mode === 'new'){
    firmName = (document.getElementById('su-firm-name').value||'').trim();
    barCouncilState = (document.getElementById('su-bar-state').value||'').trim();
    if(!firmName){ err.textContent='Firm / chamber name is required.'; err.style.display='block'; return; }
  } else {
    inviteCode = (document.getElementById('su-invite-code').value||'').trim();
    if(!inviteCode){ err.textContent='An invite code from your firm admin is required.'; err.style.display='block'; return; }
  }

  const { data, error } = await sb.auth.signUp({ email, password: pwd });
  if(error){ err.textContent = error.message; err.style.display = 'block'; return; }
  const userId = data.user?.id;
  if(!userId){ err.textContent='Signup failed — check your email to confirm, then sign in.'; err.style.display='block'; return; }

  try{
    if(mode === 'new'){
      await sb.rpc('create_firm_and_admin', {
        p_firm_name: firmName, p_full_name: name, p_bar_council_state: barCouncilState || null
      });
      showToast(`Welcome to LexDesk! "${firmName}" is set up — you're the admin.`, 'success');
      await afterAuth();
    } else {
      await sb.rpc('join_firm_with_invite', { p_invite_code: inviteCode, p_full_name: name });
      showToast('Account created — awaiting approval from your firm admin.', 'success');
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('pending-screen').style.display = 'flex';
    }
  } catch(rpcErr){
    err.textContent = 'Account created, but firm setup failed: ' + (rpcErr.message||rpcErr);
    err.style.display = 'block';
  }
}

async function afterAuth(){
  const { data:{ user } } = await sb.auth.getUser();
  if(!user){ document.getElementById('login-screen').style.display='flex'; return; }
  S.user = user;

  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if(!profile){ document.getElementById('login-screen').style.display='flex'; return; }

  if(!profile.approved || profile.archived){
    S.profile = profile;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('pending-screen').style.display = 'flex';
    return;
  }

  S.profile = profile;

  const { data: firm } = await sb.from('firms').select('*').eq('id', profile.firm_id).maybeSingle();
  S.firm = firm;
  if(firm && ['suspended','cancelled'].includes(firm.status)){
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('billing-blocked-screen')?.style.removeProperty('display');
    return;
  }

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('pending-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  if(typeof applyProfileTheme === 'function') applyProfileTheme(profile);
  else if(profile.theme_config) applyThemeConfig(profile.theme_config);

  await initApp();
}

async function doLogout(){
  if(S.profile && !confirm('Sign out?')) return;
  await sb.auth.signOut();
  localStorage.removeItem('ld_theme_saved');
  S = {
    ...S, user:null, profile:null, firm:null,
    unreadCounts:{}, locallyReadIds:new Set(), messageReadIds:new Set(),
    messages:[], lastSeenTaskTs:''
  };
  document.getElementById('app').style.display = 'none';
  document.getElementById('pending-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('li-email').value = '';
  document.getElementById('li-pwd').value = '';
  document.getElementById('li-err').style.display = 'none';
}

function isAdmin(){ return S.profile?.role === 'admin'; }

// ── File upload helper — ALWAYS namespaces by firm_id, enforced by the
//    storage RLS policy in database/migrations/004_storage.sql ──────────
async function uploadFirmFile(file, clientId){
  const path = `${S.profile.firm_id}/${clientId}/${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from('lexdesk-files').upload(path, file);
  if(error) throw error;
  return path;
}
