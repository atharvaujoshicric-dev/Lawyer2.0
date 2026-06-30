
// ════════════════════════════════════════════
//  CLIENT TABLE RENDER
// ════════════════════════════════════════════
function renderClientTable(){
  const search=(document.getElementById('client-search')?.value||'').toLowerCase();
  const typeF=document.getElementById('filter-type')?.value||'';
  const statF=document.getElementById('filter-status')?.value||'';
  const assignF=document.getElementById('filter-assignee')?.value||'';
  let clients=myClients().filter(c=>{
    const ms=!search||c.name.toLowerCase().includes(search)||c.client_id.toLowerCase().includes(search)||JSON.stringify(c.case_data||{}).toLowerCase().includes(search);
    const mt=!typeF||c.case_type===typeF;
    const ms2=!statF||c.status===statF;
    const ma=!assignF||c.assigned_to===assignF;
    return ms&&mt&&ms2&&ma;
  });
  const tbody=document.getElementById('clients-tbody');
  const empty=document.getElementById('clients-empty');
  if(!clients.length){tbody.innerHTML='';if(empty)empty.style.display='block';return;}
  if(empty)empty.style.display='none';
  tbody.innerHTML=clients.map(c=>{
    const au=S.users.find(u=>u.id===c.assigned_to);
    const dl=getDeadline(c);
    return `<tr onclick="viewClient('${c.client_id}')">
      <td><div class="client-name-cell"><div class="avatar-sm av-navy">${initials(c.name)}</div><div><div class="font-medium">${c.name}</div><div class="client-id">${c.client_id}</div></div></div></td>
      <td>${catBadge(c.case_type)}</td>
      <td><span style="font-size:13px;">${au?au.full_name:'—'}</span></td>
      <td>${statusBadge(c.status)}</td>
      <td>${dl?deadlinePill(dl):'<span class="text-muted">—</span>'}</td>
      <td onclick="event.stopPropagation()"><div style="display:flex;gap:6px;">
        <button class="btn btn-outline btn-sm btn-icon" onclick="viewClient('${c.client_id}')"><i class="fas fa-eye"></i></button>
        <button class="btn btn-outline btn-sm btn-icon" onclick="openEditClientById('${c.client_id}')"><i class="fas fa-edit"></i></button>
        ${isAdmin()?`<button class="btn btn-danger btn-sm btn-icon" onclick="deleteClientById('${c.client_id}')"><i class="fas fa-trash"></i></button>`:''}
      </div></td>
    </tr>`;
  }).join('');
  renderRecentClients();
}
function renderRecentClients(){
  const tbody=document.getElementById('recent-tbody');
  if(!tbody)return;
  const clients=myClients().slice(0,6);
  if(!clients.length){tbody.innerHTML='<tr><td colspan="4"><div class="empty-state"><i class="fas fa-users"></i><div class="empty-state-title">No clients yet</div></div></td></tr>';return;}
  tbody.innerHTML=clients.map(c=>{
    const au=S.users.find(u=>u.id===c.assigned_to);
    return `<tr onclick="viewClient('${c.client_id}')">
      <td><div class="client-name-cell"><div class="avatar-sm av-navy">${initials(c.name)}</div><div><div class="font-medium">${c.name}</div><div class="client-id">${c.client_id}</div></div></div></td>
      <td>${catBadge(c.case_type)}</td><td>${au?au.full_name:'—'}</td><td>${statusBadge(c.status)}</td>
    </tr>`;
  }).join('');
}
function openEditClientById(id){S.detailClientId=id;editCurrentClient();}
function deleteClientById(id){S.detailClientId=id;deleteCurrentClient();}

// ════════════════════════════════════════════
//  STATS
// ════════════════════════════════════════════
function updateStats(){
  const cl=myClients();
  const alerts=getUpcomingDeadlines(60).length;
  const myOpenTasks=S.tasks.filter(t=>t.assigned_to===S.user?.id&&t.status!=='done'&&t.status!=='cancelled').length;
  let html=`<div class="stat-card gold"><div class="stat-label">Total Clients</div><div class="stat-value">${cl.length}</div><div class="stat-sub">Active matters</div><i class="fas fa-users stat-icon"></i></div>`;
  S.categories.slice(0,3).forEach((cat,i)=>{
    const colors=['blue','green','purple'];
    const cnt=cl.filter(c=>c.case_type===cat.id).length;
    html+=`<div class="stat-card ${colors[i]||'blue'}"><div class="stat-label">${cat.label}</div><div class="stat-value">${cnt}</div><i class="${cat.icon} stat-icon"></i></div>`;
  });
  html+=`<div class="stat-card red"><div class="stat-label">Alerts</div><div class="stat-value">${alerts}</div><div class="stat-sub">60-day window</div><i class="fas fa-bell stat-icon"></i></div>`;
  html+=`<div class="stat-card purple"><div class="stat-label">My Tasks</div><div class="stat-value">${myOpenTasks}</div><div class="stat-sub">Open</div><i class="fas fa-tasks stat-icon"></i></div>`;
  document.getElementById('stats-grid').innerHTML=html;
  const dlBadge=document.getElementById('dl-badge');
  if(dlBadge){dlBadge.textContent=alerts;dlBadge.style.display=alerts?'inline-block':'none';}
  const taskBadge=document.getElementById('task-badge');
  if(taskBadge){taskBadge.textContent=myOpenTasks;taskBadge.style.display=myOpenTasks?'inline-block':'none';}
  renderDashDeadlines();
  renderDashTasks();
}

// ════════════════════════════════════════════
//  DEADLINES
// ════════════════════════════════════════════
function getDeadline(c){
  const d=c.case_data||{};
  const schema=S.formSchemas[c.case_type]||[];
  for(const f of schema){ if(f.type==='date'&&d[f.id]) return d[f.id]; }
  return null;
}
function getUpcomingDeadlines(days=60){
  return myClients().flatMap(c=>{
    const schema=S.formSchemas[c.case_type]||[];
    const data=c.case_data||{};
    return schema.filter(f=>f.type==='date'&&data[f.id]).map(f=>{
      const dl=daysUntil(data[f.id]);
      return dl!==null&&dl<=days?{client:c,field:f.label,deadline:data[f.id],daysLeft:dl}:null;
    }).filter(Boolean);
  }).sort((a,b)=>a.daysLeft-b.daysLeft);
}
function daysUntil(ds){ if(!ds)return null;const t=new Date(ds),n=new Date();n.setHours(0,0,0,0);t.setHours(0,0,0,0);return Math.round((t-n)/86400000); }
function deadlinePill(ds){
  const d=daysUntil(ds);
  if(d===null)return fmtD(ds);
  const cls=d<0?'urgent':d<=30?'soon':'ok';
  const lbl=d<0?`${Math.abs(d)}d overdue`:d===0?'Today':`${d}d`;
  return `<span class="deadline-days ${cls}" title="${fmtD(ds)}">${lbl}</span>`;
}
function renderDeadlines(){
  const dl=getUpcomingDeadlines(60);
  const ov=dl.filter(d=>d.daysLeft<0),d30=dl.filter(d=>d.daysLeft>=0&&d.daysLeft<=30),d60=dl.filter(d=>d.daysLeft>30&&d.daysLeft<=60);
  const setEl=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  setEl('dl-overdue',ov.length);setEl('dl-30',d30.length);setEl('dl-60',d60.length);
  const cnt=document.getElementById('deadlines-list');
  if(!cnt)return;
  if(!dl.length){cnt.innerHTML=`<div class="card"><div class="card-body empty-state"><i class="fas fa-calendar-check"></i><div class="empty-state-title">No upcoming deadlines</div></div></div>`;return;}
  const sections=[{label:'Overdue',items:ov,type:'danger'},{label:'Within 30 days',items:d30,type:'warning'},{label:'Within 60 days',items:d60,type:'info'}];
  cnt.innerHTML=sections.filter(s=>s.items.length).map(s=>`
    <div class="card" style="margin-bottom:14px;">
      <div class="card-header"><span class="card-title" style="color:${s.type==='danger'?'var(--danger)':s.type==='warning'?'#92400e':'var(--info)'}">${s.label}</span><span class="badge ${s.type==='danger'?'badge-alert':s.type==='warning'?'badge-pending':'badge-active'}">${s.items.length}</span></div>
      <div class="card-body">${s.items.map(d=>`
        <div class="deadline-item" onclick="viewClient('${d.client.client_id}')" style="cursor:pointer;">
          <div><div style="font-size:13.5px;font-weight:500;">${d.client.name} <span class="client-id">${d.client.client_id}</span></div><div style="font-size:12px;color:var(--text-muted);">${d.field} · ${fmtD(d.deadline)}</div></div>
          ${deadlinePill(d.deadline)}
        </div>`).join('')}
      </div>
    </div>`).join('');
}
function renderDashDeadlines(){
  const dl=getUpcomingDeadlines(60).slice(0,5);
  const cnt=document.getElementById('dash-deadlines');
  if(!cnt)return;
  if(!dl.length){cnt.innerHTML='<p class="text-muted text-sm">No upcoming deadlines.</p>';return;}
  cnt.innerHTML=dl.map(d=>`
    <div class="deadline-item" onclick="viewClient('${d.client.client_id}')" style="cursor:pointer;">
      <div><div style="font-size:13.5px;font-weight:500;">${d.client.name}</div><div style="font-size:12px;color:var(--text-muted);">${d.field} · ${fmtD(d.deadline)}</div></div>
      ${deadlinePill(d.deadline)}
    </div>`).join('');
}
function renderDashTasks(){
  const cnt=document.getElementById('dash-tasks');
  if(!cnt)return;
  const mine=S.tasks.filter(t=>t.assigned_to===S.user?.id&&t.status!=='done'&&t.status!=='cancelled').slice(0,5);
  if(!mine.length){cnt.innerHTML='<p class="text-muted text-sm">No open tasks assigned to you.</p>';return;}
  cnt.innerHTML=mine.map(t=>`
    <div class="deadline-item" onclick="openTaskModal('${t.id}')" style="cursor:pointer;">
      <div><div style="font-size:13.5px;font-weight:500;">${escHtml(t.title)}</div><div style="font-size:12px;color:var(--text-muted);">${t.due_date?fmtD(t.due_date):'No due date'}</div></div>
      <span class="badge ${t.priority==='high'?'badge-alert':t.priority==='low'?'badge-active':'badge-pending'}">${capitalize(t.priority)}</span>
    </div>`).join('');
}
function checkAlerts(){
  getUpcomingDeadlines(7).forEach(d=>{ if(d.daysLeft>=0) setTimeout(()=>showToast(`⚠ Deadline in ${d.daysLeft}d: ${d.client.name} — ${d.field}`,'warning'),2000); });
}

// ════════════════════════════════════════════
//  FILE UPLOAD (modal staging)
// ════════════════════════════════════════════
function handleFileSelect(e){ addFiles(Array.from(e.target.files)); e.target.value=''; }
function handleFileDrop(e){ e.preventDefault();document.getElementById('file-drop-zone').classList.remove('drag-over');addFiles(Array.from(e.dataTransfer.files)); }
function addFiles(files){
  if(!S.pendingFiles)S.pendingFiles=[];
  files.forEach(f=>{
    if(f.size>20*1024*1024){showToast(`"${f.name}" exceeds 20MB.`,'error');return;}
    S.pendingFiles.push({name:f.name,size:f.size,type:f.type,_file:f});
  });
  renderFileList();
}
function renderFileList(){
  const list=document.getElementById('file-list');
  if(!list)return;
  list.innerHTML=(S.pendingFiles||[]).map((f,i)=>`
    <div class="file-item">
      <i class="${fileIcon(f.name)}" style="font-size:18px;color:var(--navy-mid);"></i>
      <span class="file-item-name">${escHtml(f.name)}</span>
      <span class="file-item-size">${formatBytes(f.size)}</span>
      <button class="file-item-remove" onclick="removeFile(${i})"><i class="fas fa-times"></i></button>
    </div>`).join('');
}
function removeFile(i){ S.pendingFiles.splice(i,1); renderFileList(); }

// ════════════════════════════════════════════
//  DOCUMENTS PAGE + FILE PREVIEW (real, working)
// ════════════════════════════════════════════
function renderDocuments(){
  const search=(document.getElementById('doc-search')?.value||'').toLowerCase();
  const typeF=document.getElementById('doc-filter-type')?.value||'';
  const clientF=document.getElementById('doc-filter-client')?.value||'';
  const visibleClientIds=new Set(myClients().map(c=>c.client_id));
  const docs=S.documents.filter(d=>{
    if(!isAdmin()&&!visibleClientIds.has(d.client_id))return false;
    if(clientF&&d.client_id!==clientF)return false;
    const client=S.clients.find(c=>c.client_id===d.client_id);
    const cname=client?client.name:'';
    const ms=!search||d.name.toLowerCase().includes(search)||cname.toLowerCase().includes(search);
    const mt=!typeF||getDocExt(d.name)===typeF;
    return ms&&mt;
  });
  const tbody=document.getElementById('documents-tbody');
  const empty=document.getElementById('documents-empty');
  if(!tbody)return;
  if(!docs.length){tbody.innerHTML='';if(empty)empty.style.display='block';return;}
  if(empty)empty.style.display='none';
  tbody.innerHTML=docs.map(d=>{
    const client=S.clients.find(c=>c.client_id===d.client_id);
    const canDelete=isAdmin()||d.uploaded_by===S.user.id;
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:8px;"><i class="${fileIcon(d.name)}" style="font-size:18px;color:var(--navy-mid);"></i><span class="font-medium">${escHtml(d.name)}</span></div></td>
      <td>${client?client.name:'—'} <span class="client-id">${d.client_id}</span></td>
      <td>${d.category||'—'}</td>
      <td>${formatBytes(d.size)}</td>
      <td style="font-size:12px;color:var(--text-muted);">${fmtD(d.uploaded_at)}</td>
      <td><div style="display:flex;gap:6px;">
        <button class="btn btn-outline btn-xs" onclick="openFilePreview('${d.id}')"><i class="fas fa-eye"></i> View</button>
        ${canDelete?`<button class="btn btn-danger btn-xs" onclick="deleteDocument('${d.id}')"><i class="fas fa-trash"></i></button>`:''}
      </div></td>
    </tr>`;
  }).join('');
}
async function deleteDocument(docId){
  const d=S.documents.find(x=>x.id===docId);
  if(!d)return;
  if(!isAdmin()&&d.uploaded_by!==S.user.id){showToast('You can only delete files you uploaded.','error');return;}
  if(!confirm(`Delete "${d.name}"? This cannot be undone.`))return;
  if(d.storage_path){
    const {error:rmErr}=await sb.storage.from('lexdesk-files').remove([d.storage_path]);
    if(rmErr) console.warn('Storage removal warning:',rmErr.message);
  }
  const {error}=await sb.from('documents').delete().eq('id',docId);
  if(error){showToast('Delete failed: '+error.message,'error');return;}
  S.documents=S.documents.filter(x=>x.id!==docId);
  renderDocuments();
  showToast('Document deleted.','warning');
}

let _previewDoc=null;
async function openFilePreview(docId){
  const d=S.documents.find(x=>x.id===docId);
  if(!d){showToast('Document not found.','error');return;}
  _previewDoc=d;
  document.getElementById('prev-title').textContent=d.name;
  document.getElementById('prev-sub').textContent=`${formatBytes(d.size)} · Uploaded ${fmtD(d.uploaded_at)}`;
  const body=document.getElementById('prev-body');
  body.innerHTML='<i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--text-muted);"></i>';
  openModal('modal-preview');

  const {data,error}=await sb.storage.from('lexdesk-files').createSignedUrl(d.storage_path,3600);
  if(error||!data){ body.innerHTML='<p class="text-muted">Could not load file preview.</p>'; return; }
  const url=data.signedUrl;
  const ext=(d.name.split('.').pop()||'').toLowerCase();
  if(['jpg','jpeg','png','gif','webp'].includes(ext)){
    body.innerHTML=`<img src="${url}" alt="${escHtml(d.name)}"/>`;
  } else if(ext==='pdf'){
    body.innerHTML=`<iframe src="${url}"></iframe>`;
  } else if(['txt'].includes(ext)){
    const txt=await fetch(url).then(r=>r.text()).catch(()=>'Could not load text content.');
    body.innerHTML=`<pre style="white-space:pre-wrap;padding:16px;font-size:13px;width:100%;">${escHtml(txt)}</pre>`;
  } else {
    body.innerHTML=`<div style="text-align:center;padding:40px;"><i class="${fileIcon(d.name)}" style="font-size:48px;color:var(--text-muted);margin-bottom:14px;display:block;"></i><p class="text-muted">Preview not available for this file type.</p><p class="text-sm text-muted">Click Download to view it.</p></div>`;
  }
  document.getElementById('prev-download-btn').dataset.url=url;
}
function downloadPreviewFile(){
  const url=document.getElementById('prev-download-btn').dataset.url;
  if(!url||!_previewDoc)return;
  const a=document.createElement('a');a.href=url;a.download=_previewDoc.name;a.target='_blank';a.click();
}

// ════════════════════════════════════════════
//  USERS MANAGEMENT (admin only)
// ════════════════════════════════════════════
function copySignupCode(){
  if(!S.signupCode){showToast('No active code.','error');return;}
  navigator.clipboard.writeText(S.signupCode).then(()=>showToast('Code copied!','success'));
}
async function regenerateSignupCode(){
  if(!confirm('Generate a new invite code? The old one will stop working.'))return;
  const newCode=genCode();
  const {error:insErr}=await sb.from('firm_invites').insert({
    firm_id:S.profile.firm_id, code:newCode, role:'assistant', created_by:S.user.id
  });
  if(insErr){showToast('Could not generate new code: '+insErr.message,'error');return;}
  if(S.signupCode){
    const {error:delErr}=await sb.from('firm_invites').delete().eq('firm_id',S.profile.firm_id).eq('code',S.signupCode);
    if(delErr) console.warn('Old invite could not be removed:',delErr.message);
  }
  S.signupCode=newCode;
  renderUsers();
  showToast('New signup code generated.','success');
}
function openAddUserModal(userId){
  const u=[...S.users,...(S.pendingUsers||[])].find(x=>x.id===userId);
  if(!u)return;
  document.getElementById('au-title').textContent = u.approved ? 'Edit Team Member' : 'Approve & Assign Role';
  document.getElementById('au-name').value  = u.full_name;
  document.getElementById('au-email').value = u.email||'';
  document.getElementById('au-role').value  = u.role==='pending'?'assistant':u.role;
  document.getElementById('au-bar').value   = u.bar_number||'';
  // Populate custom role dropdown with all defined roles
  const crSel = document.getElementById('au-custom-role');
  if(crSel){
    crSel.innerHTML = '<option value="">— No custom role assigned —</option>' +
      (S.customRoles||[]).map(r=>`<option value="${r.id}">${escHtml(r.name)}</option>`).join('');
    crSel.value = u.custom_role_id||'';
  }
  S._approvingUserId = userId;
  openModal('modal-add-user');
}
async function approveUser(){
  const id  = S._approvingUserId;
  const role = document.getElementById('au-role').value;
  const bar  = document.getElementById('au-bar').value;
  const customRoleId = document.getElementById('au-custom-role')?.value || null;
  const payload = {
    role, approved:true, bar_number:bar,
    custom_role_id: customRoleId||null
  };
  const {error}=await sb.from('profiles').update(payload).eq('id',id);
  if(error){showToast('Failed: '+error.message,'error');return;}
  closeModal('modal-add-user');
  await refreshAll();
  showToast('User approved and role assigned!','success');
}
async function changeUserRole(userId,newRole){
  if(userId===S.user.id&&newRole!=='admin'){showToast('You cannot demote yourself.','error');return;}
  const {error}=await sb.from('profiles').update({role:newRole}).eq('id',userId);
  if(error){showToast('Failed: '+error.message,'error');return;}
  await refreshAll();
  showToast('Role updated.','success');
}
async function removeUserAccess(userId){
  if(userId===S.user.id){showToast('You cannot remove your own access.','error');return;}
  if(!confirm('Revoke this user\'s access? Their assigned clients will remain but unassigned.'))return;
  await sb.from('clients').update({assigned_to:null}).eq('assigned_to',userId);
  const {error}=await sb.from('profiles').update({approved:false}).eq('id',userId);
  if(error){showToast('Failed: '+error.message,'error');return;}
  await refreshAll();
  showToast('Access revoked.','warning');
}
function renderUsers(){
  if(!isAdmin())return;
  const codeDisp=document.getElementById('signup-code-display');
  if(codeDisp) codeDisp.textContent=S.signupCode||'—';

  // ── Hierarchy overview strip ──────────────────────────────────────────
  // Shows all custom roles in sort_order, with member count per role.
  // Clicking a role name navigates to Roles & Permissions to edit it.
  const hierEl=document.getElementById('users-hierarchy-strip');
  if(hierEl && S.customRoles?.length){
    const sorted=[...S.customRoles].sort((a,b)=>a.sort_order-b.sort_order);
    hierEl.innerHTML=`
      <div class="card mb-4" style="overflow:hidden;">
        <div class="card-header" style="padding:12px 16px;">
          <span class="card-title" style="font-size:13.5px;"><i class="fas fa-sitemap" style="color:var(--gold);"></i> Team Hierarchy</span>
          <button class="btn btn-outline btn-sm" onclick="navigate('roles')" style="font-size:11.5px;">
            <i class="fas fa-edit"></i> Edit Roles & Permissions
          </button>
        </div>
        <div style="display:flex;align-items:stretch;overflow-x:auto;">
          ${sorted.map((r,i)=>{
            const count=S.users.filter(u=>u.custom_role_id===r.id&&!u.archived).length;
            const perms=r.permissions||{};
            const permCount=Object.values(perms).filter(v=>v===true).length;
            return `<div style="flex:1;min-width:130px;padding:12px 14px;
              border-right:${i<sorted.length-1?'1px solid var(--border-light)':'none'};
              background:${i===0?'var(--gold-pale)':'var(--bg)'};text-align:center;">
              <div style="font-size:12px;font-weight:700;color:var(--navy);">${escHtml(r.name)}</div>
              <div style="font-size:22px;font-weight:700;color:var(--navy);margin:4px 0;">${count}</div>
              <div style="font-size:11px;color:var(--text-muted);">member${count!==1?'s':''}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${permCount}/9 permissions</div>
              ${i<sorted.length-1?`<div style="font-size:10px;color:var(--text-muted);margin-top:6px;">↓</div>`:''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
  } else if(hierEl){
    hierEl.innerHTML=`<div class="card mb-4"><div class="card-body">
      <p class="text-muted text-sm">No custom roles defined yet. 
      <span style="color:var(--navy-mid);cursor:pointer;text-decoration:underline;" onclick="navigate('roles')">Create roles in Admin → Roles & Permissions</span> to set up your team hierarchy.</p>
    </div></div>`;
  }

  const pendingSection=document.getElementById('users-pending-section');
  const pendingList=document.getElementById('users-pending-list');
  if(S.pendingUsers&&S.pendingUsers.length){
    pendingSection.style.display='block';
    pendingList.innerHTML=S.pendingUsers.map(u=>`
      <div class="user-list-item">
        <div class="avatar-sm av-blue">${initials(u.full_name)}</div>
        <div class="user-list-item-info">
          <div class="user-list-item-name">${u.full_name}</div>
          <div class="user-list-item-meta">${u.email} · Signed up ${fmtD(u.created_at)}</div>
        </div>
        <button class="btn btn-gold btn-sm" onclick="openAddUserModal('${u.id}')"><i class="fas fa-check"></i> Approve</button>
      </div>`).join('');
  } else { pendingSection.style.display='none'; }
  const cnt=document.getElementById('users-list');
  if(!cnt)return;
  const activeUsers=S.users.filter(u=>!u.archived);
  if(!activeUsers.length){cnt.innerHTML='<div class="empty-state"><i class="fas fa-users"></i><div class="empty-state-title">No team members</div></div>';return;}
  cnt.innerHTML=activeUsers.map(u=>{
    const clientCount=S.clients.filter(c=>c.assigned_to===u.id).length;
    const isMe=u.id===S.user.id;
    const isFounder=u.is_founder;
    const customRole=S.customRoles?.find(r=>r.id===u.custom_role_id);
    const roleLabel=isFounder?'Founder/Admin':u.role==='admin'?'Admin':(customRole?.name||capitalize(u.role||'assistant'));
    const roleBadgeCls=u.role==='admin'?'badge-admin':'badge-assistant';
    return `<div class="user-list-item">
      <div class="avatar-sm ${u.role==='admin'?'av-purple':'av-blue'}">${initials(u.full_name)}</div>
      <div class="user-list-item-info">
        <div class="user-list-item-name">${u.full_name}${isMe?' (You)':''}
          <span class="badge ${roleBadgeCls}">${escHtml(roleLabel)}</span>
          ${isFounder?'<span class="badge" style="background:#faf5ff;color:#6b46c1;font-size:10px;"><i class="fas fa-crown"></i></span>':''}
        </div>
        <div class="user-list-item-meta">${u.email} · ${u.bar_number||'No bar no.'} · ${clientCount} client${clientCount!==1?'s':''}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="showUserClients('${u.id}')"><i class="fas fa-users"></i></button>
        ${!isMe&&!isFounder?`
          <button class="btn btn-outline btn-sm" onclick="openAddUserModal('${u.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-outline btn-sm" title="Archive user" onclick="archiveUser('${u.id}')"><i class="fas fa-archive"></i></button>
          <button class="btn btn-danger btn-sm" title="Permanently remove" onclick="permanentlyRemoveUser('${u.id}')"><i class="fas fa-user-times"></i></button>
        `:''}
      </div>
    </div>`;
  }).join('');
  // Archived users section
  const archivedUsers=(S.archivedUsers||[]);
  let archivedEl=document.getElementById('users-archived-section');
  if(!archivedEl){
    archivedEl=document.createElement('div');
    archivedEl.id='users-archived-section';
    cnt.parentElement.appendChild(archivedEl);
  }
  if(archivedUsers.length){
    archivedEl.innerHTML=`<div class="card" style="margin-top:16px;">
      <div class="card-header"><span class="card-title" style="color:var(--text-muted);"><i class="fas fa-archive"></i> Archived (${archivedUsers.length})</span></div>
      <div class="card-body">${archivedUsers.map(u=>`
        <div class="user-list-item" style="opacity:.65;">
          <div class="avatar-sm" style="background:var(--border);color:var(--text-muted);">${initials(u.full_name)}</div>
          <div class="user-list-item-info">
            <div class="user-list-item-name">${u.full_name}</div>
            <div class="user-list-item-meta">${u.email} · Archived</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-success btn-sm" onclick="restoreUser('${u.id}')"><i class="fas fa-undo"></i> Restore</button>
            <button class="btn btn-danger btn-sm" onclick="permanentlyRemoveUser('${u.id}')"><i class="fas fa-user-times"></i></button>
          </div>
        </div>`).join('')}
      </div></div>`;
  } else { archivedEl.innerHTML=''; }
}
function showUserClients(userId){
  const u=S.users.find(x=>x.id===userId);
  navigate('clients');
  document.getElementById('filter-assignee').value=userId;
  document.getElementById('topbar-title').textContent=`${u?.full_name||'User'}'s Clients`;
  renderClientTable();
}
