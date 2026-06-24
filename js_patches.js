// ════════════════════════════════════════════════════════════════
// JS PATCH 1: Updated buildSidebar()
// Replace the ENTIRE buildSidebar() function in the original file
// ════════════════════════════════════════════════════════════════
function buildSidebar(){
  const nav=document.getElementById('sidebar-nav');
  const admin=isAdmin();
  const finances=canSeeFinances();
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
    ${finances?`<button class="nav-item" onclick="navigate('finances')"><i class="fas fa-rupee-sign"></i> Finances</button>`:''}
    <button class="nav-item" onclick="navigate('templates')"><i class="fas fa-file-alt"></i> Templates</button>
    <button class="nav-item" onclick="navigate('notes')"><i class="fas fa-sticky-note"></i> Notes</button>
    <button class="nav-item" onclick="navigate('chat')"><i class="fas fa-comments"></i> Messages <span id="chat-nav-badge" class="nav-badge" style="display:none;"></span></button>
    <button class="nav-item" onclick="navigate('tasks')"><i class="fas fa-tasks"></i> Tasks <span id="task-badge" class="nav-badge" style="display:none;"></span></button>`;
  if(admin){
    html+=`<div class="nav-section-label">Admin</div>
      <button class="nav-item" onclick="navigate('users')"><i class="fas fa-user-shield"></i> Users <span id="pending-badge" class="nav-badge" style="display:none;"></span></button>
      <button class="nav-item" onclick="navigate('hierarchy-perms')"><i class="fas fa-shield-alt"></i> Permissions</button>
      <button class="nav-item" onclick="navigate('formbuilder')"><i class="fas fa-sliders-h"></i> Form Builder</button>
      <button class="nav-item" onclick="navigate('deadline-rules')"><i class="fas fa-gavel"></i> Deadline Rules</button>
      <button class="nav-item" onclick="navigate('activity')"><i class="fas fa-history"></i> Activity Log</button>`;
  }
  html+=`<button class="nav-item" onclick="navigate('settings')"><i class="fas fa-cog"></i> Settings</button>`;
  nav.innerHTML=html;
  const pb=document.getElementById('pending-badge');
  if(pb && S.pendingUsers?.length){pb.textContent=S.pendingUsers.length;pb.style.display='inline-block';}
}

// ════════════════════════════════════════════════════════════════
// JS PATCH 2: Updated updateSidebarProfile()
// Replace the ENTIRE updateSidebarProfile() function
// ════════════════════════════════════════════════════════════════
function updateSidebarProfile(){
  const n=S.profile?.full_name||'User';
  const roleInfo=getRoleInfo(S.profile?.role||'junior_assistant');
  document.getElementById('sb-name').textContent=n;
  document.getElementById('sb-role').textContent=roleInfo.label;
  document.getElementById('sb-avatar').textContent=initials(n);
}

// ════════════════════════════════════════════════════════════════
// JS PATCH 3: Updated navigate() — add finance guard + hierarchy-perms
// Add these entries to NAV_TITLES and guard finances access
// ════════════════════════════════════════════════════════════════
// In the navigate() function, add to NAV_TITLES:
//   'hierarchy-perms':'Role Permissions'
// Add at top of navigate():
//   if(view==='finances' && !canSeeFinances()){showToast('Finances are restricted to Senior Advocate only.','error');return;}
//   if(view==='hierarchy-perms') renderHierarchyPermissions();

// ════════════════════════════════════════════════════════════════
// JS PATCH 4: Updated initApp() — add initChatbot() and load allUsers
// In initApp(), after startPolling(); add:
//   initChatbot();
//   // Load all users including archived for admin view
//   if(isAdmin()){
//     const {data:allU}=await sb.from('profiles').select('*').order('created_at');
//     S.allUsers=allU||[];
//   }
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// JS PATCH 5: Updated loadAllData() — load archived users for admin
// In loadAllData(), change the users query to load ALL profiles for admin:
//   if(isAdmin()){
//     const {data:users}=await sb.from('profiles').select('*').order('created_at');
//     S.allUsers=users||[];
//     S.users=users.filter(u=>u.approved&&!u.archived)||[];
//     const {data:pending}=await sb.from('profiles').select('*').eq('approved',false).eq('archived',false);
//     S.pendingUsers=pending||[];
//   } else {
//     const {data:users}=await sb.from('profiles').select('*').eq('approved',true).order('created_at');
//     S.users=users||[];
//     S.pendingUsers=[];
//   }
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// JS PATCH 6: Settings page - add Chatbot toggle + Change Password
// In the settings view HTML, add to "Data & Security" section:
// ════════════════════════════════════════════════════════════════
/*
  <!-- Change Password -->
  <div class="settings-row">
    <div class="settings-row-text">
      <div class="settings-row-label">Change Password</div>
      <div class="settings-row-desc">Send a reset link to your registered email</div>
    </div>
    <button class="btn btn-outline btn-sm" onclick="sendPasswordResetEmail()"><i class="fas fa-envelope"></i> Send Reset Email</button>
  </div>
  <!-- Chatbot toggle -->
  <div class="settings-row">
    <div class="settings-row-text">
      <div class="settings-row-label">LexBot Assistant</div>
      <div class="settings-row-desc">Floating AI assistant for quick lookups</div>
    </div>
    <button class="toggle" id="chatbot-toggle-btn" onclick="toggleChatbotSetting(this)" style="flex-shrink:0;"></button>
  </div>
*/

// ════════════════════════════════════════════════════════════════
// JS PATCH 7: Add sendPasswordResetEmail() and toggleChatbotSetting()
// Add these new functions (can go in any existing script block)
// ════════════════════════════════════════════════════════════════
async function sendPasswordResetEmail(){
  if(!S.user?.email){showToast('No email on file.','error');return;}
  const {error}=await sb.auth.resetPasswordForEmail(S.user.email,{redirectTo:window.location.href.split('#')[0]});
  if(error){showToast('Error: '+error.message,'error');return;}
  showToast('Password reset email sent to '+S.user.email,'success');
}

function toggleChatbotSetting(btn){
  const enabled=btn.classList.toggle('on');
  setChatbotEnabled(enabled);
  showToast(enabled?'LexBot enabled.':'LexBot hidden.','success');
}

function loadChatbotToggleUI(){
  const btn=document.getElementById('chatbot-toggle-btn');
  if(btn) btn.classList.toggle('on',isChatbotEnabled());
}

// ════════════════════════════════════════════════════════════════
// JS PATCH 8: Update boot to handle password reset hash
// In window.addEventListener('DOMContentLoaded') BEFORE the portal check, add:
//   const wasReset = await handlePasswordResetRedirect();
//   if(wasReset) return;
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// JS PATCH 9: Add forgot password link to login screen
// In the login screen HTML, add after the Sign In button:
//   <div class="auth-link-row"><a onclick="showForgotPassword()">Forgot your password?</a></div>
// ════════════════════════════════════════════════════════════════
