// ════════════════════════════════════════════
//  MISC FEATURES — password, user management,
//  archive/restore, task cleanup, group helpers
// ════════════════════════════════════════════

// ── Forgot / Change password ──────────────────────────────────────────────
async function doForgotPassword(){
  const email=(document.getElementById('forgot-email')?.value||'').trim();
  if(!email){showToast('Enter your email address.','error');return;}
  const {error}=await sb.auth.resetPasswordForEmail(email,{
    redirectTo:window.location.href.split('#')[0]+'#reset'
  });
  if(error){showToast('Could not send reset email: '+error.message,'error');return;}
  showToast('Reset link sent! Check your inbox.','success');
}

async function checkPasswordResetMode(){
  const hash=window.location.hash;
  if(hash.includes('type=recovery')||hash.includes('#reset')){
    openModal('modal-change-password');
  }
}

async function doChangePassword(){
  const pw=(document.getElementById('new-password')?.value||'').trim();
  const pw2=(document.getElementById('new-password-confirm')?.value||'').trim();
  if(!pw||pw.length<8){showToast('Password must be at least 8 characters.','error');return;}
  if(pw!==pw2){showToast('Passwords do not match.','error');return;}
  const {error}=await sb.auth.updateUser({password:pw});
  if(error){showToast('Failed: '+error.message,'error');return;}
  closeModal('modal-change-password');
  showToast('Password changed successfully!','success');
  window.location.hash='';
}

// ── Archive / restore / permanently remove users ──────────────────────────
async function archiveUser(userId){
  if(!confirm('Archive this user? They will lose access but their data is preserved. You can restore them later.'))return;
  const {error}=await sb.from('profiles').update({approved:false,archived:true}).eq('id',userId);
  if(error){showToast('Archive failed: '+error.message,'error');return;}
  await refreshAll();
  showToast('User archived.','warning');
}

async function restoreUser(userId){
  const {error}=await sb.from('profiles').update({approved:true,archived:false}).eq('id',userId);
  if(error){showToast('Restore failed: '+error.message,'error');return;}
  await refreshAll();
  showToast('User restored.','success');
}

async function permanentlyRemoveUser(userId){
  const u=S.users.find(x=>x.id===userId)||S.archivedUsers?.find(x=>x.id===userId);
  if(u?.is_founder){showToast('The founding Admin cannot be removed.','error');return;}
  if(!confirm(`Permanently remove ${u?.full_name||'this user'}? This cannot be undone. Their assigned clients will be unassigned.`))return;
  await sb.from('clients').update({assigned_to:null}).eq('assigned_to',userId);
  const {error}=await sb.from('profiles').delete().eq('id',userId);
  if(error){showToast('Remove failed: '+error.message,'error');return;}
  await refreshAll();
  showToast('User permanently removed.','warning');
}

// ── Auto-delete old completed/cancelled tasks (hard delete, 15 days) ──────
async function autoDeleteOldTasks(){
  const cutoff=new Date(Date.now()-15*86400000).toISOString();
  const {data:old}=await sb.from('tasks')
    .select('id').in('status',['done','cancelled']).lt('updated_at',cutoff);
  if(!old?.length)return;
  const ids=old.map(t=>t.id);
  await sb.from('task_comments').delete().in('task_id',ids);
  await sb.from('tasks').delete().in('id',ids);
  // Refresh local cache
  const {data}=await sb.from('tasks').select('*').order('created_at',{ascending:false});
  if(data) S.tasks=data;
}


// ── Apply finances visibility (admin-only) ────────────────────────────────
function applyFinancesVisibility(){
  document.querySelectorAll('.nav-finances').forEach(el=>{
    el.style.display=(isAdmin()||canViewFinances())?'':'none';
  });
}

// ── UI onclick aliases ────────────────────────────────────────────────────
function forgotPassword()        { doForgotPassword(); }
function changePassword()        { doChangePassword(); }
function setNewPasswordFromReset(){ doChangePassword(); }

function toggleChatbotSetting(btn){
  const nowEnabled=!btn.classList.contains('on');
  btn.classList.toggle('on',nowEnabled);
  setChatbotEnabled(nowEnabled);
  showToast(nowEnabled?'Chatbot enabled.':'Chatbot disabled.','info');
}

// ── Group modal helpers ───────────────────────────────────────────────────
// These are thin wrappers — the real logic is in _js20_groups.html.
// The modal HTML calls createGroup() which is defined in _js20_groups.html.

async function deleteGroup(){
  const groupId=S._managingGroupId;
  if(!groupId){showToast('No group selected.','error');return;}
  const group=S.chatGroups?.find(g=>g.id===groupId);
  if(!confirm(`Delete group "${group?.name||'this group'}" permanently?`))return;
  await sb.from('messages').delete().eq('group_id',groupId);
  await sb.from('group_members').delete().eq('group_id',groupId);
  const {error}=await sb.from('chat_groups').delete().eq('id',groupId);
  if(error){showToast('Delete failed: '+error.message,'error');return;}
  closeModal('modal-group-settings');
  S.activeGroupId=null; S.activeChatPeer=null; S._managingGroupId=null;
  await loadChatGroups();
  renderChatContacts();
  showToast('Group deleted.','warning');
}
