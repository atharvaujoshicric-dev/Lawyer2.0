
// ════════════════════════════════════════════
//  DATA LOADING
// ════════════════════════════════════════════
async function loadAllData(){
  const [catRes,schemaRes,clientRes,userRes,docRes,tplRes,taskRes,codeRes]=await Promise.all([
    sb.from('categories').select('*').order('created_at'),
    sb.from('form_schemas').select('*'),
    sb.from('clients').select('*').order('created_at',{ascending:false}),
    sb.from('profiles').select('*').eq('approved',true).order('created_at'),
    sb.from('documents').select('*').order('uploaded_at',{ascending:false}),
    sb.from('templates').select('*').order('created_at',{ascending:false}),
    sb.from('tasks').select('*').order('created_at',{ascending:false}),
    isAdmin()?sb.from('firm_invites').select('*').eq('firm_id',S.profile.firm_id).order('created_at',{ascending:false}).limit(1):Promise.resolve({data:[]})
  ]);
  S.categories=catRes.data||[];
  S.formSchemas={};
  (schemaRes.data||[]).forEach(r=>S.formSchemas[r.category_id]=r.fields||[]);
  S.clients=clientRes.data||[];
  S.users=userRes.data||[];
  S.documents=docRes.data||[];
  S.templates=tplRes.data||[];
  S.tasks=taskRes.data||[];
  S.signupCode=(codeRes.data&&codeRes.data[0])?codeRes.data[0].code:null;

  if(isAdmin()){
    const {data:pending}=await sb.from('profiles').select('*').eq('approved',false).eq('archived',false);
    S.pendingUsers=pending||[];
    const {data:archived}=await sb.from('profiles').select('*').eq('archived',true);
    S.archivedUsers=archived||[];
  } else { S.pendingUsers=[]; S.archivedUsers=[]; }
  // Also load chat groups for the current user
  if(typeof loadChatGroups==='function') await loadChatGroups();
}

async function refreshAll(){
  await loadAllData();
  buildSidebar();
  buildCaseTypeTabs();
  buildCategoryFilter();
  buildAssigneeFilter();
  updateStats();
  renderClientTable();
  renderDeadlines();
  renderDocuments();
  renderUsers();
  renderTemplates();
  renderFormBuilder();
  renderTasks();
  renderChatContacts();
}

// ════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════
async function initApp(){
  await loadAllData();
  buildSidebar();
  updateSidebarProfile();
  buildCaseTypeTabs();
  buildCategoryFilter();
  buildAssigneeFilter();
  updateStats();
  renderClientTable();
  renderDeadlines();
  renderDocuments();
  renderUsers();
  renderTemplates();
  renderFormBuilder();
  renderTasks();
  renderChatContacts();
  loadSettingsUI();
  checkAlerts();
  updateSyncStatus('synced','Live');
  loadLastSeenState();           // restore last-seen message state from localStorage
  await checkForNewItems();      // initial unread count from DB + badge update
  startPolling();                // 5s fast poll (active view) + 30s background poll
  await loadDeadlineRules();     // preload for client detail deadlines tab
  await loadInvoiceSettings();   // preload for invoice generation
  await loadCustomRoles();        // preload custom roles for permission checks
  await loadChatGroups();         // preload group memberships
  applyPermissionVisibility();    // hide/show UI based on role permissions
  applyFinancesVisibility();      // hide Finances from non-admins
  autoDeleteOldTasks();           // hard-delete done/cancelled tasks >15 days old
  initChatbot();                  // init floating chatbot widget
}


// ════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════
function buildSidebar(){
  const nav=document.getElementById('sidebar-nav');
  const admin=isAdmin();
  let html=`
    <div class="nav-section-label">Overview</div>
    <button class="nav-item active" onclick="navigate('dashboard')"><i class="fas fa-th-large"></i> Dashboard</button>
    <button class="nav-item" onclick="navigate('planner')"><i class="fas fa-calendar-day"></i> Daily Planner</button>
    <button class="nav-item" onclick="navigate('deadlines')"><i class="fas fa-calendar-exclamation"></i> Deadlines <span id="dl-badge" class="nav-badge" style="display:none;"></span></button>
    <div class="nav-section-label">Clients</div>
    <button class="nav-item" onclick="navigate('clients')"><i class="fas fa-users"></i> All Clients</button>`;
  S.categories.forEach(cat=>{
    html+=`<button class="nav-item" onclick="navigateCat('${cat.id}')"><i class="${cat.icon}"></i> ${cat.label}</button>`;
  });
  html+=`<div class="nav-section-label">Workspace</div>
    <button class="nav-item" onclick="navigate('documents')"><i class="fas fa-folder-open"></i> Documents</button>
    <button class="nav-item" onclick="navigate('templates')"><i class="fas fa-file-alt"></i> Templates</button>
    <button class="nav-item" onclick="navigate('notes')"><i class="fas fa-sticky-note"></i> Notes</button>
    <button class="nav-item" onclick="navigate('chat')"><i class="fas fa-comments"></i> Messages <span id="chat-nav-badge" class="nav-badge" style="display:none;"></span></button>
    <button class="nav-item" onclick="navigate('tasks')"><i class="fas fa-tasks"></i> Tasks <span id="task-badge" class="nav-badge" style="display:none;"></span></button>
    <button class="nav-item nav-finances" onclick="navigate('finances')"><i class="fas fa-rupee-sign"></i> Finances</button>`;
  if(admin){
    html+=`<div class="nav-section-label">Admin</div>
      <button class="nav-item" onclick="navigate('users')"><i class="fas fa-user-shield"></i> Users <span id="pending-badge" class="nav-badge" style="display:none;"></span></button>
      <button class="nav-item" onclick="navigate('formbuilder')"><i class="fas fa-sliders-h"></i> Form Builder</button>
      <button class="nav-item" onclick="navigate('roles')"><i class="fas fa-user-tag"></i> Roles &amp; Permissions</button>
      <button class="nav-item" onclick="navigate('deadline-rules')"><i class="fas fa-gavel"></i> Deadline Rules</button>
      <button class="nav-item" onclick="navigate('activity')"><i class="fas fa-history"></i> Activity Log</button>`;
  }
  html+=`<button class="nav-item" onclick="navigate('settings')"><i class="fas fa-cog"></i> Settings</button>`;
  nav.innerHTML=html;
  const pb=document.getElementById('pending-badge');
  if(pb && S.pendingUsers?.length){pb.textContent=S.pendingUsers.length;pb.style.display='inline-block';}
}

function updateSidebarProfile(){
  const n=S.profile?.full_name||'User';
  document.getElementById('sb-name').textContent=n;
  document.getElementById('sb-role').textContent=isAdmin()?'Senior Advocate (Admin)':'Assistant Lawyer';
  document.getElementById('sb-avatar').textContent=initials(n);
}

// ════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════
const NAV_TITLES={
  dashboard:'Dashboard',planner:'Daily Planner',clients:'All Clients',deadlines:'Deadlines & Alerts',
  documents:'Documents',templates:'Draft Templates',chat:'Messages',tasks:'Tasks',
  users:'User Management',formbuilder:'Form Builder',settings:'Settings',
  notes:'Notes',activity:'Activity Log',finances:'Finances',roles:'Roles & Permissions',
  'deadline-rules':'Deadline Rules'
};

function navigate(view){
  document.querySelectorAll('.page-view').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  const el=document.getElementById(`view-${view}`);
  if(el) el.classList.add('active');
  document.getElementById('topbar-title').textContent=NAV_TITLES[view]||view;
  closeSidebarMobile();
  if(view==='planner') renderPlanner();
  if(view==='deadlines') renderDeadlines();
  if(view==='documents') renderDocuments();
  if(view==='users') renderUsers();
  if(view==='templates') renderTemplates();
  if(view==='notes'){ loadNotes().then(renderNotes); }
  if(view==='activity') loadActivityLog();
  if(view==='deadline-rules'){ loadDeadlineRules().then(renderDeadlineRulesPage); }
  if(view==='roles'){ loadCustomRoles().then(renderRolesPage); }
  if(view==='finances') renderFinances();
  if(view==='formbuilder') renderFormBuilder();
  if(view==='tasks') renderTasks();
  if(view==='settings') renderThemeCustomiser();
  if(view==='chat'){
    renderChatContacts();
    loadMessages().then(()=>{
      renderChatMessages();
      markConversationRead(S.activeChatPeer);
    });
  }
  const ncb=document.getElementById('topbar-new-client-btn');
  if(ncb) ncb.style.display=['dashboard','clients'].includes(view)?'inline-flex':'none';
}

function navigateCat(catId){
  const cat=S.categories.find(c=>c.id===catId);
  navigate('clients');
  document.getElementById('filter-type').value=catId;
  document.getElementById('topbar-title').textContent=cat?cat.label+' Cases':'Cases';
  renderClientTable();
}

function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebar-overlay').classList.toggle('open'); }
function closeSidebarMobile(){ if(window.innerWidth<=768){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebar-overlay').classList.remove('open');} }

function myClients(){
  if(isAdmin()) return S.clients;
  return S.clients.filter(c=>c.assigned_to===S.user?.id);
}
