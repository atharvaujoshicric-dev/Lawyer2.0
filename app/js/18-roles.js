// ════════════════════════════════════════════
//  CUSTOM ROLES & PERMISSIONS
//  Admin-defined role hierarchy. Every non-admin
//  user gets a custom_role_id. Permissions are
//  checked here instead of hardcoded role names.
// ════════════════════════════════════════════
S.customRoles = [];

const PERMISSION_LABELS = {
  can_view_all_clients: 'View All Clients (not just assigned)',
  can_add_clients:      'Add New Clients',
  can_delete_clients:   'Delete Clients',
  can_assign_tasks:     'Assign Tasks to Others',
  can_create_tasks:     'Create New Tasks',
  can_view_finances:    'View Finances Page',
  can_manage_users:     'Manage Users & Roles',
  can_view_documents:   'View Documents',
  can_export:           'Export to Excel'
};

async function loadCustomRoles(){
  const {data,error} = await sb.from('custom_roles').select('*').order('sort_order');
  if(!error) S.customRoles = data||[];
}

// ── Permission helpers ────────────────────────────────────────────────────
// Admin always has all permissions. Non-admin checks their custom role.
function hasPerm(perm){
  if(isAdmin()) return true;
  const role = S.customRoles.find(r=>r.id===S.profile?.custom_role_id);
  return role?.permissions?.[perm] === true;
}

// Convenience wrappers used throughout the app
function canViewAllClients(){ return hasPerm('can_view_all_clients'); }
function canAddClients()     { return hasPerm('can_add_clients'); }
function canDeleteClients()  { return hasPerm('can_delete_clients'); }
function canAssignTasks()    { return hasPerm('can_assign_tasks'); }
function canCreateTasks()    { return hasPerm('can_create_tasks'); }
function canViewFinances()   { return hasPerm('can_view_finances'); }
function canManageUsers()    { return hasPerm('can_manage_users'); }
function canExport()         { return hasPerm('can_export'); }

// ── Roles management page ─────────────────────────────────────────────────
function renderRolesPage(){
  const cnt = document.getElementById('roles-list');
  if(!cnt) return;
  if(!S.customRoles.length){
    cnt.innerHTML='<div class="empty-state"><i class="fas fa-user-tag"></i><div class="empty-state-title">No roles defined</div></div>';
    return;
  }
  cnt.innerHTML = S.customRoles.map(r=>`
    <div class="card mb-3">
      <div class="card-header">
        <span class="card-title">${escHtml(r.name)}</span>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="openRoleModal('${r.id}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCustomRole('${r.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;">
          ${Object.entries(PERMISSION_LABELS).map(([key,label])=>`
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;">
              <i class="fas ${r.permissions?.[key]?'fa-check-circle':'fa-times-circle'}"
                 style="color:${r.permissions?.[key]?'var(--success)':'var(--text-muted)'};width:16px;"></i>
              ${label}
            </div>`).join('')}
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--text-muted);">
          ${S.users.filter(u=>u.custom_role_id===r.id).length} team member(s) assigned
        </div>
      </div>
    </div>`).join('');
}

function openRoleModal(roleId=null){
  const r = roleId ? S.customRoles.find(x=>x.id===roleId) : null;
  S._editingRoleId = roleId;
  document.getElementById('role-modal-title').textContent = r ? 'Edit Role' : 'New Role';
  document.getElementById('role-name-input').value = r?.name||'';
  // Render permission checkboxes
  const permCnt = document.getElementById('role-permissions');
  permCnt.innerHTML = Object.entries(PERMISSION_LABELS).map(([key,label])=>`
    <label style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border-light);cursor:pointer;font-size:13.5px;">
      <input type="checkbox" id="perm-${key}" ${r?.permissions?.[key]?'checked':''}
        style="width:16px;height:16px;accent-color:var(--navy);"/>
      ${label}
    </label>`).join('');
  openModal('modal-role');
}

async function saveCustomRole(){
  const name=(document.getElementById('role-name-input').value||'').trim();
  if(!name){showToast('Role name is required.','error');return;}
  const perms={};
  Object.keys(PERMISSION_LABELS).forEach(key=>{
    perms[key]=document.getElementById(`perm-${key}`)?.checked||false;
  });
  const payload={name, permissions:perms};
  if(S._editingRoleId){
    const {error}=await sb.from('custom_roles').update(payload).eq('id',S._editingRoleId);
    if(error){showToast('Save failed: '+error.message,'error');return;}
  } else {
    payload.created_by=S.user?.id;
    const {error}=await sb.from('custom_roles').insert(payload);
    if(error){showToast('Save failed: '+error.message,'error');return;}
  }
  closeModal('modal-role');
  await loadCustomRoles();
  renderRolesPage();
  showToast('Role saved.','success');
}

async function deleteCustomRole(id){
  const members=S.users.filter(u=>u.custom_role_id===id);
  if(members.length){
    showToast(`Cannot delete — ${members.length} member(s) use this role. Reassign them first.`,'error');
    return;
  }
  if(!confirm('Delete this role?')) return;
  const {error}=await sb.from('custom_roles').delete().eq('id',id);
  if(error){showToast('Delete failed: '+error.message,'error');return;}
  await loadCustomRoles(); renderRolesPage();
  showToast('Role deleted.','warning');
}

// ── Apply permission-based UI visibility after init ───────────────────────
function applyPermissionVisibility(){
  // Finances nav item — admin only
  document.querySelectorAll('.nav-finances').forEach(el=>{
    el.style.display = canViewFinances()?'':'none';
  });
  // New Client button
  const ncb=document.getElementById('topbar-new-client-btn');
  if(ncb) ncb.style.display=canAddClients()?'inline-flex':'none';
  // Export button in settings
  const exportRow=document.getElementById('export-row');
  if(exportRow) exportRow.style.display=canExport()?'flex':'none';
}