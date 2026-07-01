// ════════════════════════════════════════════
//  SUPABASE CONFIG & CLIENT
// ════════════════════════════════════════════
const CFG_KEY='ld_supabase_cfg';
let sb=null;

function getSupabaseConfig(){ try{return JSON.parse(localStorage.getItem(CFG_KEY)||'null')}catch{return null} }

function saveSupabaseConfig(){
  const url=(document.getElementById('cfg-url').value||'').trim();
  const key=(document.getElementById('cfg-key').value||'').trim();
  if(!url||!key){showToast('Both URL and key are required.','error');return;}
  localStorage.setItem(CFG_KEY,JSON.stringify({url,key}));
  location.reload();
}

function disconnectSupabase(){
  if(!confirm('Disconnect this browser from the database? You will need to re-enter the URL/key to use the app again.'))return;
  localStorage.removeItem(CFG_KEY);
  location.reload();
}

function initSupabase(){
  const cfg=getSupabaseConfig();
  if(!cfg){ document.getElementById('setup-screen').style.display='flex'; return false; }
  sb=window.supabase.createClient(cfg.url,cfg.key);
  document.getElementById('setup-screen').style.display='none';
  return true;
}

// ════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════
let S={
  user:null, profile:null,             // current auth user + profile row
  clients:[], users:[], documents:[], templates:[],
  categories:[], formSchemas:{},
  tasks:[], taskComments:{},
  messages:[], activeChatPeer:null,    // null = team broadcast channel
  editingMessageId:null, messageReadIds:new Set(),
  signupCode:null,
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
  _editingTemplateVars:[],
  _portalToken:null, portalData:null
};

const FIELD_TYPES=['text','number','date','tel','select','textarea'];

// ════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════
function showAuthTab(tab){
  document.getElementById('auth-signin').style.display=tab==='signin'?'block':'none';
  document.getElementById('auth-signup').style.display=tab==='signup'?'block':'none';
  document.getElementById('tab-signin').style.background=tab==='signin'?'var(--navy)':'';
  document.getElementById('tab-signin').style.color=tab==='signin'?'#fff':'';
  document.getElementById('tab-signup').style.background=tab==='signup'?'var(--navy)':'';
  document.getElementById('tab-signup').style.color=tab==='signup'?'#fff':'';
}

async function doSignIn(){
  const email=(document.getElementById('li-email').value||'').trim();
  const pwd=document.getElementById('li-pwd').value;
  const err=document.getElementById('li-err');
  err.style.display='none';
  if(!email||!pwd){err.textContent='Enter email and password.';err.style.display='block';return;}
  const {data,error}=await sb.auth.signInWithPassword({email,password:pwd});
  if(error){err.textContent=error.message;err.style.display='block';return;}
  await afterAuth();
}

async function doSignUp(){
  const name=(document.getElementById('su-name').value||'').trim();
  const email=(document.getElementById('su-email').value||'').trim();
  const pwd=document.getElementById('su-pwd').value;
  const code=(document.getElementById('su-code').value||'').trim();
  const err=document.getElementById('su-err');
  err.style.display='none';
  if(!name||!email||pwd.length<8){err.textContent='Name, email, and a password (8+ chars) are required.';err.style.display='block';return;}

  // Check if this is the very first user (becomes admin automatically)
  const {count}=await sb.from('profiles').select('*',{count:'exact',head:true});
  const isFirstUser=(count||0)===0;

  if(!isFirstUser){
    if(!code){err.textContent='A signup code from your admin is required.';err.style.display='block';return;}
    const {data:codeRow}=await sb.from('signup_codes').select('*').eq('code',code).eq('active',true).maybeSingle();
    if(!codeRow){err.textContent='Invalid or expired signup code.';err.style.display='block';return;}
  }

  const {data,error}=await sb.auth.signUp({email,password:pwd});
  if(error){err.textContent=error.message;err.style.display='block';return;}

  const userId=data.user?.id;
  if(!userId){err.textContent='Signup failed — check your email to confirm, then sign in.';err.style.display='block';return;}

  await sb.from('profiles').insert({
    id:userId, full_name:name, email,
    role:isFirstUser?'admin':'pending',
    approved:isFirstUser
  });

  if(isFirstUser){
    // Seed a signup code for them right away
    const newCode=genCode();
    await sb.from('signup_codes').insert({code:newCode, created_by:userId});
    showToast('Welcome! You are the Admin.','success');
    await afterAuth();
  } else {
    showToast('Account created — awaiting admin approval.','success');
    document.getElementById('login-screen').style.display='none';
    document.getElementById('pending-screen').style.display='flex';
  }
}

async function afterAuth(){
  const {data:{user}}=await sb.auth.getUser();
  if(!user){ document.getElementById('login-screen').style.display='flex'; return; }
  S.user=user;
  const {data:profile}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
  if(!profile){ document.getElementById('login-screen').style.display='flex'; return; }
  if(!profile.approved){
    S.profile=profile;
    document.getElementById('login-screen').style.display='none';
    document.getElementById('pending-screen').style.display='flex';
    return;
  }
  S.profile=profile;
  document.getElementById('login-screen').style.display='none';
  document.getElementById('pending-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  // Apply the user's saved theme (profile takes precedence over localStorage)
  if(typeof applyProfileTheme==='function') applyProfileTheme(profile);
  else if(profile.theme) applyTheme(profile.theme);
  await initApp();
}

async function doLogout(){
  if(S.profile && !confirm('Sign out?'))return;
  await sb.auth.signOut();
  // Clear saved-state markers so the next user isn't affected
  localStorage.removeItem('ld_theme_saved');
  S={...S, user:null, profile:null,
     unreadCounts:{}, locallyReadIds:new Set(), messageReadIds:new Set(),
     messages:[], lastSeenTaskTs:''};
  document.getElementById('app').style.display='none';
  document.getElementById('pending-screen').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('li-email').value='';
  document.getElementById('li-pwd').value='';
  document.getElementById('li-err').style.display='none';
}

function isAdmin(){ return S.profile?.role==='admin'; }
function genCode(){ return Math.random().toString(36).substring(2,8).toUpperCase(); }
