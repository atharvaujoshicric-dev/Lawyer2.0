
// ════════════════════════════════════════════
//  TASKS / KANBAN
// ════════════════════════════════════════════
// ROLES:
//   Admin (Senior Advocate):  creates tasks, assigns them to anyone, reviews
//                             submitted work, approves/reworks/cancels.
//   Assistant:                only works tasks they've been given. They
//                             cannot create tasks. Their modal shows status
//                             action buttons + comments only — no form fields.
//
// Lifecycle:
//   open → in_progress → in_review → (rework → in_progress | approve → done)
//   Admin can cancel from any non-terminal state.
//   Either party can reopen done/cancelled.

const TASK_STATUS_LABELS={
  open:'Open', in_progress:'In Progress', in_review:'In Review',
  done:'Done', cancelled:'Cancelled'
};

// ── helpers ──────────────────────────────────
function buildTaskClientDropdown(){
  const sel=document.getElementById('task-client');
  if(!sel)return;
  sel.innerHTML='<option value="">— None —</option>'+
    myClients().map(c=>`<option value="${c.client_id}">${c.name} (${c.client_id})</option>`).join('');
}

function setTaskFieldsLocked(locked){
  // Lock/unlock everything except assignee (handled separately — shown for Admin only)
  ['task-title','task-desc','task-client','task-priority','task-due'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.disabled=locked;
  });
  const banner=document.getElementById('task-locked-banner');
  if(banner) banner.style.display=locked?'flex':'none';
}

// ── modal open ───────────────────────────────
function openTaskModal(taskId=null){
  // Assistants cannot create tasks — only Admins can.
  if(!taskId && !isAdmin()){
    showToast('Only the Senior Advocate can create tasks.','error');
    return;
  }

  S.editingTaskId=taskId;
  buildTaskClientDropdown();
  document.getElementById('task-comments-section').style.display=taskId?'block':'none';
  document.getElementById('task-status-actions').innerHTML='';
  setTaskFieldsLocked(false);

  // Show/hide Assign To row based on role.
  // Assistants never see it — there's no concept of them picking an assignee.
  const assigneeRow=document.getElementById('task-assignee-row');
  if(assigneeRow) assigneeRow.style.display=isAdmin()?'':'none';

  // Populate assignee dropdown for Admin only
  if(isAdmin()){
    const ta=document.getElementById('task-assignee');
    if(ta) ta.innerHTML=S.users.map(u=>`<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('');
  }

  if(taskId){
    const t=S.tasks.find(x=>x.id===taskId);
    if(!t)return;

    document.getElementById('task-modal-title').textContent='Task Details';
    document.getElementById('task-save-txt').textContent='Update Task';

    document.getElementById('task-title').value=t.title;
    document.getElementById('task-desc').value=t.description||'';
    document.getElementById('task-client').value=t.client_id||'';
    document.getElementById('task-priority').value=t.priority||'medium';
    document.getElementById('task-due').value=t.due_date||'';
    if(isAdmin()){
      const ta=document.getElementById('task-assignee');
      if(ta) ta.value=t.assigned_to||'';
    }

    renderTaskComments(taskId);
    document.getElementById('task-status-actions').innerHTML=buildTaskStatusActions(t);

    // Fields are locked once work has started.
    // For Assistants, fields are always locked — they act only via buttons.
    const fieldsShouldLock = !isAdmin() || t.status!=='open';
    setTaskFieldsLocked(fieldsShouldLock);

    // Hide the Save button when there's nothing editable left.
    // For Assistants this is always hidden; for Admin it hides once task is underway.
    const saveBtn=document.getElementById('task-save-btn');
    if(saveBtn) saveBtn.style.display=(isAdmin() && t.status==='open')?'inline-flex':'none';

  } else {
    // New task — Admin only path
    document.getElementById('task-modal-title').textContent='New Task';
    document.getElementById('task-save-txt').textContent='Create Task';
    document.getElementById('task-title').value='';
    document.getElementById('task-desc').value='';
    document.getElementById('task-client').value='';
    document.getElementById('task-priority').value='medium';
    document.getElementById('task-due').value='';
    const saveBtn=document.getElementById('task-save-btn');
    if(saveBtn) saveBtn.style.display='inline-flex';
  }

  openModal('modal-task');
}

// ── status action buttons ────────────────────
// Builds the contextual action row in the modal footer.
// What appears depends strictly on who is viewing and what state the task is in.
function buildTaskStatusActions(t){
  if(!t) return '';
  const isDoer    = t.assigned_to === S.user.id;
  const isReviewer= t.assigned_by === S.user.id || isAdmin();
  const btns=[];

  // Doer moves the task forward
  if(t.status==='open' && isDoer)
    btns.push(['in_progress','Start Work','btn-outline']);
  if(t.status==='in_progress' && isDoer)
    btns.push(['in_review','Send for Review','btn-gold']);

  // Reviewer resolves it
  if(t.status==='in_review' && isReviewer){
    btns.push(['in_progress','Rework','btn-outline']);
    btns.push(['open','Reopen','btn-outline']);
    btns.push(['done','Approve & Close','btn-success']);
  }

  // Reviewer/Admin can cancel from any active state
  if(!['done','cancelled'].includes(t.status) && isReviewer)
    btns.push(['cancelled','Cancel','btn-danger']);

  // Either party can reopen a closed/cancelled task
  if(['done','cancelled'].includes(t.status) && (isReviewer||isDoer))
    btns.push(['open','Reopen','btn-outline']);

  return btns.map(([k,l,cls])=>
    `<button class="btn ${cls} btn-sm" onclick="updateTaskStatus('${t.id}','${k}')">${l}</button>`
  ).join('');
}

// ── save (Admin only) ────────────────────────
async function saveTask(){
  // Double-check: only Admin can create/edit task definitions
  if(!isAdmin()){
    showToast('Only the Senior Advocate can create or edit tasks.','error');
    return;
  }

  const title=(document.getElementById('task-title').value||'').trim();
  const assignee=document.getElementById('task-assignee').value;
  if(!title){showToast('Task title is required.','error');return;}
  if(!assignee){showToast('Please select who to assign this task to.','error');return;}

  // Field-lock guard: if task has already moved past Open, only status
  // buttons should be used — this Save path is for Open tasks only.
  if(S.editingTaskId){
    const existing=S.tasks.find(x=>x.id===S.editingTaskId);
    if(existing && existing.status!=='open'){
      showToast('This task has started — use the action buttons to move it forward.','error');
      return;
    }
  }

  const payload={
    firm_id:     S.profile.firm_id,
    title,
    description: document.getElementById('task-desc').value,
    client_id:   document.getElementById('task-client').value||null,
    assigned_to: assignee,
    priority:    document.getElementById('task-priority').value,
    due_date:    document.getElementById('task-due').value||null,
    updated_at:  new Date().toISOString()
  };

  if(S.editingTaskId){
    const {error}=await sb.from('tasks').update(payload).eq('id',S.editingTaskId);
    if(error){showToast('Update failed: '+error.message,'error');return;}
    showToast('Task updated.','success');
  } else {
    payload.assigned_by = S.user.id;
    payload.status      = 'open';
    const {error}=await sb.from('tasks').insert(payload);
    if(error){showToast('Create failed: '+error.message,'error');return;}
    showToast('Task created.','success');
  }

  closeModal('modal-task');
  const {data}=await sb.from('tasks').select('*').order('created_at',{ascending:false});
  S.tasks=data||[];
  renderTasks();
  updateStats();
}

// ── status transitions ───────────────────────
async function updateTaskStatus(taskId,status){
  const t=S.tasks.find(x=>x.id===taskId);
  if(!t)return;
  const isDoer    = t.assigned_to===S.user.id;
  const isReviewer= t.assigned_by===S.user.id||isAdmin();

  // Workflow guards (server RLS also enforces these, this is an extra UX layer)
  if(status==='done'     && !isReviewer){showToast('Only the Senior Advocate can approve and close a task.','error');return;}
  if(status==='in_review'&& !isDoer)   {showToast('Only the assignee can send a task for review.','error');return;}
  if(status==='in_progress' && t.status==='in_review' && !isReviewer){
    showToast('Only the Senior Advocate can send a task back for rework.','error');return;
  }

  const {error}=await sb.from('tasks')
    .update({status, updated_at:new Date().toISOString()})
    .eq('id',taskId);
  if(error){showToast('Failed: '+error.message,'error');return;}

  closeModal('modal-task');
  const {data}=await sb.from('tasks').select('*').order('created_at',{ascending:false});
  S.tasks=data||[];
  renderTasks();
  updateStats();

  const msgs={
    in_progress: t.status==='in_review' ? 'Sent back for rework.' : 'Task started — In Progress.',
    in_review:   'Sent for review.',
    done:        'Task approved and closed.',
    open:        'Task reopened.',
    cancelled:   'Task cancelled.'
  };
  showToast(msgs[status]||'Status updated.','success');
}

// ── comments ─────────────────────────────────
async function renderTaskComments(taskId){
  const {data}=await sb.from('task_comments')
    .select('*').eq('task_id',taskId).order('created_at',{ascending:true});
  S.taskComments[taskId]=data||[];
  const cnt=document.getElementById('task-comments-list');
  if(!cnt)return;
  if(!data||!data.length){
    cnt.innerHTML='<p class="text-muted text-sm">No comments yet.</p>';
    return;
  }
  cnt.innerHTML=data.map(c=>{
    const author=S.users.find(u=>u.id===c.author_id);
    return `<div style="padding:7px 0;border-bottom:1px solid var(--border-light);font-size:13px;">
      <strong>${author?author.full_name:'Unknown'}:</strong> ${escHtml(c.body)}
      <span style="font-size:11px;color:var(--text-muted);">${fmtDT(c.created_at)}</span>
    </div>`;
  }).join('');
}

async function addTaskComment(){
  const input=document.getElementById('task-comment-input');
  const body=(input.value||'').trim();
  if(!body||!S.editingTaskId)return;
  const {error}=await sb.from('task_comments')
    .insert({firm_id:S.profile.firm_id, task_id:S.editingTaskId, author_id:S.user.id, body});
  if(error){showToast('Failed: '+error.message,'error');return;}
  input.value='';
  renderTaskComments(S.editingTaskId);
}

// ── kanban render ─────────────────────────────
function renderTasks(){
  // New Task button is Admin-only
  const newBtn=document.getElementById('new-task-btn');
  if(newBtn) newBtn.style.display=isAdmin()?'inline-flex':'none';

  const statusF=document.getElementById('task-filter-status')?.value||'';
  let tasks=S.tasks.filter(t=>
    isAdmin() || t.assigned_to===S.user?.id || t.assigned_by===S.user?.id
  );
  if(statusF) tasks=tasks.filter(t=>t.status===statusF);

  const cols={open:[],in_progress:[],in_review:[],done:[],cancelled:[]};
  tasks.forEach(t=>{ if(cols[t.status]) cols[t.status].push(t); });

  Object.keys(cols).forEach(key=>{
    const colId  =`kc-${key.replace('_','-')}`;
    const countId=`kc-${key.replace('_','-')}-count`;
    const colEl  =document.getElementById(colId);
    const countEl=document.getElementById(countId);
    if(countEl) countEl.textContent=cols[key].length;
    if(!colEl)return;
    colEl.innerHTML=cols[key].length
      ? cols[key].map(t=>{
          const assignee=S.users.find(u=>u.id===t.assigned_to);
          const client=t.client_id?S.clients.find(c=>c.client_id===t.client_id):null;
          return `<div class="task-card priority-${t.priority} ${t.status==='done'?'status-done':''}"
                       onclick="openTaskModal('${t.id}')">
            <div class="task-title">${escHtml(t.title)}</div>
            <div class="task-meta">
              <span><i class="fas fa-user"></i> ${assignee?assignee.full_name:'—'}</span>
              ${t.due_date?`<span><i class="fas fa-calendar"></i> ${fmtD(t.due_date)}</span>`:''}
              ${client?`<span><i class="fas fa-folder"></i> ${client.name}</span>`:''}
            </div>
          </div>`;
        }).join('')
      : '<p class="text-muted text-sm" style="padding:8px 4px;">Empty</p>';
  });
}
