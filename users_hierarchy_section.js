// ════════════════════════════════════════════
//  USERS MANAGEMENT (hierarchy-aware)
// ════════════════════════════════════════════

function renderUsers() {
  if (!isAdmin()) return;
  const codeDisp = document.getElementById('signup-code-display');
  if (codeDisp) codeDisp.textContent = S.signupCode || '—';

  // Pending section
  const pendingSection = document.getElementById('users-pending-section');
  const pendingList    = document.getElementById('users-pending-list');
  if (S.pendingUsers && S.pendingUsers.length) {
    pendingSection.style.display = 'block';
    pendingList.innerHTML = S.pendingUsers.map(u => `
      <div class="user-list-item">
        <div class="avatar-sm av-blue">${initials(u.full_name)}</div>
        <div class="user-list-item-info">
          <div class="user-list-item-name">${u.full_name}</div>
          <div class="user-list-item-meta">${u.email} · Signed up ${fmtD(u.created_at)}</div>
        </div>
        <button class="btn btn-gold btn-sm" onclick="openApproveUserModal('${u.id}')">
          <i class="fas fa-check"></i> Approve
        </button>
        <button class="btn btn-danger btn-sm" onclick="rejectUser('${u.id}')">
          <i class="fas fa-times"></i> Reject
        </button>
      </div>`).join('');
  } else {
    pendingSection.style.display = 'none';
  }

  // Active users tabs
  const tab = S._usersTab || 'active';
  document.querySelectorAll('#users-tab-bar .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

  const cnt = document.getElementById('users-list');
  if (!cnt) return;

  let users = S.users;
  if (tab === 'active')   users = S.users.filter(u => u.approved && !u.archived);
  if (tab === 'archived') users = (S.allUsers || S.users).filter(u => u.archived);

  if (!users.length) {
    cnt.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i>
      <div class="empty-state-title">No ${tab} members</div></div>`;
    return;
  }

  cnt.innerHTML = users.map(u => {
    const isMe      = u.id === S.user.id;
    const isFounder = u.is_founder;
    const roleInfo  = getRoleInfo(u.role);
    const clientCount = S.clients.filter(c => c.assigned_to === u.id).length;

    let actions = '';
    if (!isMe) {
      if (!isFounder) {
        if (tab === 'active') {
          actions += `<button class="btn btn-outline btn-sm" onclick="openEditRoleModal('${u.id}')">
            <i class="fas fa-user-tag"></i> Role</button>`;
          actions += `<button class="btn btn-outline btn-sm" onclick="archiveUser('${u.id}')">
            <i class="fas fa-archive"></i> Archive</button>`;
          actions += `<button class="btn btn-danger btn-sm" onclick="removeUserAccess('${u.id}')">
            <i class="fas fa-user-slash"></i> Remove</button>`;
        }
        if (tab === 'archived') {
          actions += `<button class="btn btn-success btn-sm" onclick="restoreUser('${u.id}')">
            <i class="fas fa-undo"></i> Restore</button>`;
          actions += `<button class="btn btn-danger btn-sm" onclick="permanentDeleteUser('${u.id}')">
            <i class="fas fa-trash"></i> Delete</button>`;
        }
      } else {
        actions = '<span class="badge badge-senior-advocate"><i class="fas fa-crown"></i> Founder</span>';
      }
    } else {
      actions = '<span class="text-muted text-sm">(You)</span>';
    }

    const archivedBadge = u.archived
      ? '<span class="badge badge-archived" style="margin-left:6px;">Archived</span>' : '';

    return `<div class="user-list-item ${u.archived ? 'archived' : ''}">
      <div class="avatar-sm ${roleInfo.rank === 1 ? 'av-purple' : roleInfo.rank === 2 ? 'av-blue' : 'av-green'}">
        ${initials(u.full_name)}
      </div>
      <div class="user-list-item-info">
        <div class="user-list-item-name">
          ${u.full_name}${isMe ? ' (You)' : ''}
          ${roleBadgeHtml(u.role)}${archivedBadge}
        </div>
        <div class="user-list-item-meta">
          ${u.email} · ${u.bar_number || 'No bar no.'} · ${clientCount} client${clientCount !== 1 ? 's' : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">
        ${!isMe && tab === 'active' ? `<button class="btn btn-outline btn-sm" onclick="showUserClients('${u.id}')">
          <i class="fas fa-users"></i></button>` : ''}
        ${actions}
      </div>
    </div>`;
  }).join('');
}

// ── Approve user modal ─────────────────────────────────────────────────────
function openApproveUserModal(userId) {
  const u = (S.pendingUsers || []).find(x => x.id === userId);
  if (!u) return;
  document.getElementById('au-title').textContent = 'Approve & Assign Role';
  document.getElementById('au-name').value  = u.full_name;
  document.getElementById('au-email').value = u.email || '';
  document.getElementById('au-bar').value   = u.bar_number || '';
  // Populate role selector
  const roleSel = document.getElementById('au-role');
  roleSel.innerHTML = ROLE_HIERARCHY.filter(r => r.key !== 'senior_advocate')
    .map(r => `<option value="${r.key}">${r.label}</option>`).join('');
  roleSel.value = 'junior_assistant';
  S._approvingUserId = userId;
  openModal('modal-add-user');
}

async function approveUser() {
  const id   = S._approvingUserId;
  const role = document.getElementById('au-role').value;
  const bar  = document.getElementById('au-bar').value;
  const { error } = await sb.from('profiles').update({ role, approved: true, bar_number: bar }).eq('id', id);
  if (error) { showToast('Failed: ' + error.message, 'error'); return; }
  closeModal('modal-add-user');
  await refreshAll();
  showToast('User approved!', 'success');
}

async function rejectUser(userId) {
  if (!confirm('Reject and delete this pending account? This cannot be undone.')) return;
  await sb.from('profiles').delete().eq('id', userId);
  S.pendingUsers = (S.pendingUsers || []).filter(u => u.id !== userId);
  renderUsers();
  showToast('Account rejected.', 'warning');
}

// ── Edit role modal ────────────────────────────────────────────────────────
function openEditRoleModal(userId) {
  const u = S.users.find(x => x.id === userId);
  if (!u) return;
  document.getElementById('au-title').textContent = `Change Role — ${u.full_name}`;
  document.getElementById('au-name').value  = u.full_name;
  document.getElementById('au-email').value = u.email || '';
  document.getElementById('au-bar').value   = u.bar_number || '';
  const roleSel = document.getElementById('au-role');
  roleSel.innerHTML = ROLE_HIERARCHY.filter(r => r.key !== 'senior_advocate')
    .map(r => `<option value="${r.key}" ${u.role === r.key ? 'selected' : ''}>${r.label}</option>`).join('');
  S._approvingUserId = userId;
  openModal('modal-add-user');
}

// ── Archive user ───────────────────────────────────────────────────────────
async function archiveUser(userId) {
  const u = S.users.find(x => x.id === userId);
  if (!u) return;
  if (u.is_founder) { showToast('Cannot archive the Founder account.', 'error'); return; }
  if (!confirm(`Archive ${u.full_name}? They will lose access but data is preserved.`)) return;
  await sb.from('profiles').update({ approved: false, archived: true }).eq('id', userId);
  u.approved = false; u.archived = true;
  renderUsers();
  showToast(`${u.full_name} archived.`, 'warning');
}

// ── Restore archived user ──────────────────────────────────────────────────
async function restoreUser(userId) {
  const u = (S.allUsers || S.users).find(x => x.id === userId);
  if (!u) return;
  const { error } = await sb.from('profiles').update({ approved: true, archived: false }).eq('id', userId);
  if (error) { showToast('Failed: ' + error.message, 'error'); return; }
  u.approved = true; u.archived = false;
  await refreshAll();
  showToast(`${u.full_name} restored.`, 'success');
}

// ── Permanent delete ───────────────────────────────────────────────────────
async function permanentDeleteUser(userId) {
  const u = (S.allUsers || S.users).find(x => x.id === userId);
  if (!u) return;
  if (u.is_founder) { showToast('Cannot delete the Founder account.', 'error'); return; }
  if (!confirm(`PERMANENTLY DELETE ${u.full_name}? All their data is irreversible. Type their name to confirm.`)) return;
  await sb.from('clients').update({ assigned_to: null }).eq('assigned_to', userId);
  await sb.from('profiles').delete().eq('id', userId);
  S.users = S.users.filter(x => x.id !== userId);
  renderUsers();
  showToast(`${u.full_name} permanently deleted.`, 'warning');
}

// ── Remove access (soft — keeps profile, sets approved=false) ──────────────
async function removeUserAccess(userId) {
  const u = S.users.find(x => x.id === userId);
  if (!u) return;
  if (u.is_founder) { showToast('Cannot remove the Founder account.', 'error'); return; }
  if (userId === S.user.id) { showToast('You cannot remove your own access.', 'error'); return; }
  if (!confirm(`Revoke access for ${u.full_name}? Their assigned clients will be unlinked.`)) return;
  await sb.from('clients').update({ assigned_to: null }).eq('assigned_to', userId);
  await sb.from('profiles').update({ approved: false }).eq('id', userId);
  await refreshAll();
  showToast('Access revoked.', 'warning');
}

function switchUsersTab(tab, btn) {
  S._usersTab = tab;
  document.querySelectorAll('#users-tab-bar .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderUsers();
}

// ════════════════════════════════════════════
//  HIERARCHY PERMISSIONS PAGE
// ════════════════════════════════════════════
const PERM_DEFS = [
  { key: 'see_all_clients',   label: 'View All Clients',      desc: 'Can see clients assigned to others',      icon: 'fas fa-users' },
  { key: 'manage_clients',    label: 'Add / Edit Clients',     desc: 'Create and modify client records',        icon: 'fas fa-user-edit' },
  { key: 'upload_documents',  label: 'Upload Documents',       desc: 'Upload files to client records',          icon: 'fas fa-file-upload' },
  { key: 'use_templates',     label: 'Use Templates',          desc: 'Fill and generate document templates',    icon: 'fas fa-file-alt' },
  { key: 'create_tasks',      label: 'Create Tasks',           desc: 'Create and assign tasks',                 icon: 'fas fa-tasks' },
  { key: 'access_chat',       label: 'Internal Chat',          desc: 'Send and receive messages',               icon: 'fas fa-comments' },
  { key: 'access_planner',    label: 'Daily Planner',          desc: 'View and edit personal planner',          icon: 'fas fa-calendar-alt' },
  { key: 'access_notes',      label: 'Notes',                  desc: 'Create and share notes',                  icon: 'fas fa-sticky-note' },
  { key: 'view_activity_log', label: 'View Activity Log',      desc: 'Access audit trail and activity log',     icon: 'fas fa-history' },
  { key: 'see_finances',      label: 'View Finances',          desc: 'Always restricted to Senior Advocate',    icon: 'fas fa-rupee-sign', lockedOff: true },
];

async function renderHierarchyPermissions() {
  const cnt = document.getElementById('view-hierarchy-perms');
  if (!cnt) return;
  if (!isAdmin()) { cnt.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><div class="empty-state-title">Senior Advocate only</div></div>'; return; }

  const editableRoles = ROLE_HIERARCHY.filter(r => r.key !== 'senior_advocate');

  let html = `
  <div class="card mb-4">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-shield-alt" style="color:var(--gold)"></i> Firm Hierarchy</span>
    </div>
    <div class="card-body">
      <div class="hierarchy-tree">
        ${ROLE_HIERARCHY.map((r, i) => {
          const members = S.users.filter(u => u.role === r.key && u.approved && !u.archived);
          return `<div class="hierarchy-level">
            <span class="hierarchy-rank">${i + 1}</span>
            ${i > 0 ? '<i class="fas fa-long-arrow-alt-down hierarchy-arrow"></i>' : ''}
            ${roleBadgeHtml(r.key)}
            <span style="font-size:12px;color:var(--text-muted);margin-left:8px;">${members.length} member${members.length !== 1 ? 's' : ''}</span>
            <div class="hierarchy-members">
              ${members.slice(0, 4).map(m => `<span class="avatar-sm av-navy" style="width:26px;height:26px;font-size:10px;" title="${m.full_name}">${initials(m.full_name)}</span>`).join('')}
              ${members.length > 4 ? `<span style="font-size:11px;color:var(--text-muted);">+${members.length - 4} more</span>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-lock" style="color:var(--gold)"></i> Role Permissions Matrix</span>
      <button class="btn btn-gold btn-sm" onclick="saveHierarchyPermissions()"><i class="fas fa-save"></i> Save Changes</button>
    </div>
    <div class="card-body">
      <p class="text-sm text-muted mb-3">
        Toggle what each role can access. <strong>Senior Advocate always has full access</strong> and cannot be restricted.
        Finances are permanently restricted to Senior Advocate only.
      </p>
      <div style="overflow-x:auto;">
      <table class="perm-matrix">
        <thead>
          <tr>
            <th style="min-width:180px;">Permission</th>
            <th><span class="role-tier-badge badge-senior-advocate"><i class="fas fa-crown"></i> Sr. Advocate</span></th>
            ${editableRoles.map(r => `<th><span class="role-tier-badge ${r.badgeClass}"><i class="${r.icon}"></i> ${r.short}</span></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${PERM_DEFS.map(p => `
          <tr>
            <td>
              <div style="font-weight:500;">${p.label}</div>
              <div style="font-size:11px;color:var(--text-muted);">${p.desc}</div>
            </td>
            <td style="text-align:center;">
              <i class="fas fa-check-circle" style="color:var(--success);font-size:16px;"></i>
            </td>
            ${editableRoles.map(r => {
              const isLocked = p.lockedOff;
              const checked  = isLocked ? false : (S.hierarchyPerms?.[r.key]?.[p.key] ?? false);
              return `<td style="text-align:center;">
                <button class="perm-toggle ${checked ? 'on' : ''} ${isLocked ? 'disabled' : ''}"
                  id="pt-${r.key}-${p.key}"
                  ${isLocked ? 'disabled' : ''}
                  onclick="togglePermButton(this,'${r.key}','${p.key}')"
                  title="${isLocked ? 'Always restricted to Senior Advocate' : (checked ? 'Allowed — click to deny' : 'Denied — click to allow')}">
                </button>
              </td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>
  </div>`;

  cnt.innerHTML = html;
}

function togglePermButton(btn, role, permKey) {
  btn.classList.toggle('on');
  // Update local cache immediately
  if (!S.hierarchyPerms) S.hierarchyPerms = {};
  if (!S.hierarchyPerms[role]) S.hierarchyPerms[role] = {};
  S.hierarchyPerms[role][permKey] = btn.classList.contains('on');
}

async function saveHierarchyPermissions() {
  const rows = [];
  ROLE_HIERARCHY.filter(r => r.key !== 'senior_advocate').forEach(r => {
    PERM_DEFS.forEach(p => {
      if (p.lockedOff) return;
      const btn = document.getElementById(`pt-${r.key}-${p.key}`);
      const allowed = btn ? btn.classList.contains('on') : false;
      rows.push({ role: r.key, perm_key: p.key, allowed, updated_by: S.user.id, updated_at: new Date().toISOString() });
    });
  });
  const { error } = await sb.from('hierarchy_permissions').upsert(rows, { onConflict: 'role,perm_key' });
  if (error) { showToast('Save failed: ' + error.message, 'error'); return; }
  await loadHierarchyPerms();
  showToast('Permissions saved! Changes apply on next login.', 'success');
}
