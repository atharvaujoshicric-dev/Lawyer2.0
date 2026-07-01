// ════════════════════════════════════════════
//  GROUP CHAT
//  Groups have admins (creator + Senior Advocate)
//  who can add/remove members and rename the group.
//  Regular members can only send and read messages.
// ════════════════════════════════════════════
S.chatGroups   = [];   // [{id,name,created_by,members:[{user_id,is_admin}]}]
S.activeGroupId = null; // null=DM/broadcast, uuid=group

async function loadChatGroups(){
  // Load groups the current user is a member of
  const {data:memberRows} = await sb.from('group_members')
    .select('group_id').eq('user_id',S.user?.id);
  if(!memberRows?.length){ S.chatGroups=[]; return; }
  const groupIds = memberRows.map(r=>r.group_id);
  const {data:groups} = await sb.from('chat_groups')
    .select('*').in('id',groupIds).order('created_at');
  // Load members for each group
  const {data:allMembers} = await sb.from('group_members')
    .select('*').in('group_id',groupIds);
  S.chatGroups = (groups||[]).map(g=>({
    ...g,
    members:(allMembers||[]).filter(m=>m.group_id===g.id)
  }));
}

// ── Render chat contacts (DMs + Groups) ──────────────────────────────────
// This completely replaces the old renderChatContacts
function renderChatContacts(){
  const cnt=document.getElementById('chat-contact-list');
  if(!cnt)return;

  const searchEl=document.getElementById('chat-search-input');
  const searchQ=(searchEl?.value||'').toLowerCase().trim();

  const others=S.users.filter(u=>{
    if(u.id===S.user?.id)return false;
    if(searchQ&&!u.full_name.toLowerCase().includes(searchQ))return false;
    return true;
  });
  const filteredGroups=S.chatGroups.filter(g=>
    !searchQ||g.name.toLowerCase().includes(searchQ)
  );

  const bc=S.unreadCounts['broadcast']||0;
  const showTeam=!searchQ||'team channel'.includes(searchQ);
  let html='';

  // Search bar
  html+=`<div style="padding:10px 12px 6px;">
    <div style="position:relative;">
      <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text-muted);pointer-events:none;"></i>
      <input type="text" id="chat-search-input" placeholder="Search conversations…"
        value="${escHtml(searchQ)}"
        oninput="renderChatContacts()"
        style="width:100%;padding:7px 10px 7px 30px;border-radius:8px;font-size:12.5px;
               background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
               color:var(--text-primary);outline:none;"/>
    </div>
  </div>`;

  if(showTeam){
    html+=`<div class="chat-contact${S.activeChatPeer===null&&!S.activeGroupId?' active':''}" onclick="selectChatPeer(null)">
      <div class="avatar-sm av-navy" style="position:relative;">
        <i class="fas fa-users"></i>
        <span id="chat-badge-broadcast" class="chat-unread-badge" style="display:${bc?'inline-flex':'none'}">${bc||''}</span>
      </div>
      <div class="chat-contact-name">Team Channel</div>
    </div>`;
  }

  if(filteredGroups.length){
    html+=`<div class="chat-section-label">Groups</div>`;
    html+=filteredGroups.map(g=>{
      const isActive=S.activeGroupId===g.id;
      const unread=S.unreadCounts[`group_${g.id}`]||0;
      const myRole=g.members.find(m=>m.user_id===S.user?.id);
      const isAdmin=myRole?.is_admin;
      return `<div class="chat-contact${isActive?' active':''}" onclick="selectChatGroup('${g.id}')">
        <div class="avatar-sm av-purple" style="position:relative;">
          <i class="fas fa-layer-group" style="font-size:11px;"></i>
          <span class="chat-unread-badge" style="display:${unread?'inline-flex':'none'}">${unread||''}</span>
        </div>
        <div style="flex:1;min-width:0;">
          <div class="chat-contact-name">${escHtml(g.name)}</div>
          <div style="font-size:10px;color:var(--text-muted);">${g.members.length} member${g.members.length!==1?'s':''}${isAdmin?' · Admin':''}</div>
        </div>
        ${isAdmin?`<button onclick="event.stopPropagation();openGroupSettings('${g.id}')"
          style="background:var(--glass);border:1px solid var(--glass-border);border-radius:6px;
                 width:26px;height:26px;display:flex;align-items:center;justify-content:center;
                 cursor:pointer;flex-shrink:0;color:var(--text-secondary);font-size:12px;
                 transition:all .15s;" title="Group settings">
          <i class="fas fa-cog"></i></button>`:''}
      </div>`;
    }).join('');
  }

  if(others.length||!searchQ){
    html+=`<div class="chat-section-label">Direct Messages</div>`;
  }
  if(!others.length&&!searchQ){
    html+=`<div style="padding:10px 14px;font-size:12px;color:var(--text-muted);">No other team members yet.</div>`;
  }
  html+=others.map(u=>{
    const count=S.unreadCounts[u.id]||0;
    const isActive=S.activeChatPeer===u.id&&!S.activeGroupId;
    return `<div class="chat-contact${isActive?' active':''}" onclick="selectChatPeer('${u.id}')">
      <div class="avatar-sm ${u.role==='admin'?'av-purple':'av-blue'}" style="position:relative;">
        ${initials(u.full_name)}
        <span id="chat-badge-${u.id}" class="chat-unread-badge" style="display:${count?'inline-flex':'none'}">${count||''}</span>
      </div>
      <div style="flex:1;min-width:0;">
        <div class="chat-contact-name">${escHtml(u.full_name)}</div>
        <div style="font-size:10px;color:var(--text-muted);">${u.role==='admin'?'Admin':'Member'}</div>
      </div>
    </div>`;
  }).join('');

  html+=`<div style="padding:8px 12px 12px;">
    <button class="btn btn-outline btn-sm w-full" style="justify-content:center;font-size:12px;" onclick="openCreateGroupModal()">
      <i class="fas fa-plus" style="margin-right:6px;"></i>New Group
    </button>
  </div>`;

  cnt.innerHTML=html;
  if(searchQ){
    const inp=cnt.querySelector('#chat-search-input');
    if(inp){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);}
  }
}
function markGroupRead(groupId){
  const key=`group_${groupId}`;
  S.unreadCounts[key]=0;
  updateAllChatBadges();
}

// ── Override selectChatPeer to clear activeGroupId ────────────────────────
const _origSelectChatPeer=typeof selectChatPeer==='function'?selectChatPeer:null;
function selectChatPeer(userId){
  S.activeGroupId=null;
  S.activeChatPeer=userId;
  S.editingMessageId=null;
  resetChatSendButton();
  document.getElementById('chat-text-input').value='';
  renderChatContacts();
  const headerEl=document.getElementById('chat-header-title');
  if(userId===null){ headerEl.textContent='Team Channel'; }
  else { const u=S.users.find(x=>x.id===userId); headerEl.textContent=u?u.full_name:'Direct Message'; }
  loadMessages().then(()=>{
    renderChatMessages();
    markConversationRead(userId);
  });
}

// ── Override sendChatMessage to handle group mode ─────────────────────────
const _origSendChatMessage=window.sendChatMessage;
window.sendChatMessage=async function(){
  if(S.activeGroupId){
    await sendGroupMessage();
    return;
  }
  // Fall through to original DM/broadcast logic
  const input=document.getElementById('chat-text-input');
  const body=(input.value||'').trim();
  if(S.editingMessageId){
    if(!body){showToast('Message cannot be empty.','error');return;}
    await saveEditedMessage(S.editingMessageId,body);
    return;
  }
  if(!body&&!S.pendingChatFile)return;
  const payload={sender_id:S.user?.id,recipient_id:S.activeChatPeer,body:body||null};
  if(S.pendingChatFile){
    const f=S.pendingChatFile;
    const path=`chat/${Date.now()}_${f.name}`;
    const {error:upErr}=await sb.storage.from('lexdesk-files').upload(path,f,{contentType:f.type});
    if(upErr){showToast('Attachment upload failed: '+upErr.message,'error');return;}
    payload.attachment_path=path;
    payload.attachment_name=f.name;
  }
  const {error}=await sb.from('messages').insert(payload);
  if(error){showToast('Send failed: '+error.message,'error');return;}
  input.value='';
  clearChatPendingFile();
  await loadMessages();
  renderChatMessages();
};



// ── Create group modal ────────────────────────────────────────────────────
function openCreateGroupModal(){
  document.getElementById('new-group-name').value='';
  // Populate member checkboxes
  const cnt=document.getElementById('new-group-members');
  cnt.innerHTML=S.users.filter(u=>u.id!==S.user?.id).map(u=>`
    <label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);cursor:pointer;">
      <input type="checkbox" value="${u.id}" class="ng-member-cb" style="width:16px;height:16px;accent-color:var(--navy);"/>
      <div class="avatar-sm ${u.role==='admin'?'av-purple':'av-blue'}" style="width:28px;height:28px;font-size:11px;">${initials(u.full_name)}</div>
      ${u.full_name} <span style="color:var(--text-muted);font-size:12px;">(${u.role})</span>
    </label>`).join('');
  openModal('modal-create-group');
}

async function createGroup(){
  const name=(document.getElementById('new-group-name').value||'').trim();
  if(!name){showToast('Group name is required.','error');return;}
  const selected=[...document.querySelectorAll('.ng-member-cb:checked')].map(cb=>cb.value);
  if(!selected.length){showToast('Add at least one other member.','error');return;}

  // Create group
  const {data:group,error}=await sb.from('chat_groups')
    .insert({name,created_by:S.user?.id}).select().single();
  if(error){showToast('Create failed: '+error.message,'error');return;}

  // Add members: creator = admin, Senior Advocate (any admin profile) = admin, rest = members
  const memberRows=[{group_id:group.id,user_id:S.user?.id,is_admin:true}];
  selected.forEach(uid=>{
    const u=S.users.find(x=>x.id===uid);
    // Senior Advocate (admin role) always gets group admin status
    memberRows.push({group_id:group.id,user_id:uid,is_admin:u?.role==='admin'});
  });
  await sb.from('group_members').insert(memberRows);
  closeModal('modal-create-group');
  await loadChatGroups();
  renderChatContacts();
  await selectChatGroup(group.id);
  showToast(`Group "${name}" created.`,'success');
}

// ── Group settings ────────────────────────────────────────────────────────
function openGroupSettings(groupId){
  const g=S.chatGroups.find(x=>x.id===groupId);
  if(!g)return;
  S._managingGroupId=groupId;
  document.getElementById('gs-name').value=g.name;
  // Member list
  const cnt=document.getElementById('gs-members');
  cnt.innerHTML=g.members.map(m=>{
    const u=S.users.find(x=>x.id===m.user_id)||{full_name:'Unknown',id:m.user_id};
    const isMe=m.user_id===S.user?.id;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);">
      <div style="flex:1;font-size:13.5px;">${u.full_name} ${m.is_admin?'<span class="badge badge-admin" style="font-size:10px;">Admin</span>':''}</div>
      ${!isMe?`<button class="btn btn-danger btn-xs" onclick="removeGroupMember('${groupId}','${m.user_id}')"><i class="fas fa-times"></i></button>`:''}
    </div>`;
  }).join('');
  // Add member picker
  const existing=new Set(g.members.map(m=>m.user_id));
  const addSel=document.getElementById('gs-add-member');
  addSel.innerHTML='<option value="">Add member…</option>'+
    S.users.filter(u=>!existing.has(u.id)).map(u=>`<option value="${u.id}">${u.full_name}</option>`).join('');
  openModal('modal-group-settings');
}



async function addGroupMember(){
  const uid=document.getElementById('gs-add-member').value;
  if(!uid)return;
  const u=S.users.find(x=>x.id===uid);
  await sb.from('group_members').insert({group_id:S._managingGroupId,user_id:uid,is_admin:u?.role==='admin'});
  await loadChatGroups();
  openGroupSettings(S._managingGroupId);
  showToast('Member added.','success');
}

async function removeGroupMember(groupId,userId){
  if(!confirm('Remove this member from the group?'))return;
  await sb.from('group_members').delete().eq('group_id',groupId).eq('user_id',userId);
  await loadChatGroups();
  openGroupSettings(groupId);
  showToast('Member removed.','warning');
}

function selectChatGroup(groupId){
  S.activeChatPeer   = null;
  S.activeGroupId    = groupId;   // used by loadMessages() and fast poll
  S.activeChatGroup  = groupId;   // legacy alias
  S.editingMessageId = null;
  resetChatSendButton();
  document.getElementById('chat-text-input').value='';
  renderChatContacts();
  const grp=S.chatGroups.find(g=>g.id===groupId);
  const headerEl=document.getElementById('chat-header-title');
  if(headerEl) headerEl.textContent=grp?grp.name:'Group';
  const manageBtn=document.getElementById('chat-manage-group-btn');
  if(manageBtn) manageBtn.style.display='inline-flex';
  loadGroupMessages(groupId).then(renderChatMessages);
}

async function loadGroupMessages(groupId){
  const {data,error}=await sb.from('messages')
    .select('*').eq('group_id',groupId)
    .eq('deleted',false)
    .order('created_at',{ascending:true}).limit(200);
  if(!error) S.messages=data||[];
  // Load read receipts for my sent messages
  const myMsgIds=(S.messages||[]).filter(m=>m.sender_id===S.user?.id).map(m=>m.id);
  if(myMsgIds.length){
    const {data:reads}=await sb.from('message_reads').select('message_id')
      .in('message_id',myMsgIds).neq('user_id',S.user?.id);
    S.messageReadIds=new Set((reads||[]).map(r=>r.message_id));
  } else { S.messageReadIds=new Set(); }
}

async function sendGroupMessage(){
  const groupId=S.activeGroupId||S.activeChatGroup;
  if(!groupId) return;
  const input=document.getElementById('chat-text-input');
  const body=(input.value||'').trim();
  if(!body&&!S.pendingChatFile) return;
  const payload={sender_id:S.user?.id,group_id:groupId,recipient_id:null,body:body||null};
  if(S.pendingChatFile){
    const f=S.pendingChatFile;
    const path=`chat/${Date.now()}_${f.name}`;
    const {error:upErr}=await sb.storage.from('lexdesk-files').upload(path,f,{contentType:f.type});
    if(upErr){showToast('Upload failed: '+upErr.message,'error');return;}
    payload.attachment_path=path; payload.attachment_name=f.name;
  }
  const {error}=await sb.from('messages').insert(payload);
  if(error){showToast('Send failed: '+error.message,'error');return;}
  input.value=''; clearChatPendingFile();
  await loadGroupMessages(groupId); renderChatMessages();
}

// ── Group management modal ────────────────────────────────────────────────
async function openManageGroupModal(){
  const groupId=S.activeGroupId||S.activeChatGroup;
  if(!groupId) return;
  const grp=S.chatGroups.find(g=>g.id===groupId);
  if(!grp) return;
  document.getElementById('manage-grp-name').value=grp.name;
  const members=await loadGroupMembers(groupId);
  const iAmAdmin=members.some(m=>m.user_id===S.user?.id&&m.is_admin);
  document.getElementById('manage-grp-admin-controls').style.display=iAmAdmin?'block':'none';

  const list=document.getElementById('manage-grp-members');
  list.innerHTML=members.map(m=>{
    const u=m.profiles||S.users.find(x=>x.id===m.user_id);
    const name=u?.full_name||m.user_id;
    const isMe=m.user_id===S.user?.id;
    const isSeniorAdv=u?.role==='admin';
    return `<div class="user-list-item" style="padding:8px 12px;">
      <div class="avatar-sm ${m.is_admin?'av-purple':'av-blue'}">${initials(name)}</div>
      <div class="user-list-item-info">
        <div class="user-list-item-name">${escHtml(name)} ${m.is_admin?'<span class="badge badge-admin" style="font-size:10px;">Admin</span>':''}</div>
      </div>
      ${iAmAdmin&&!isMe&&!isSeniorAdv
        ?`<button class="btn btn-danger btn-xs" onclick="removeFromGroup('${groupId}','${m.user_id}')">Remove</button>`:''}
    </div>`;
  }).join('');

  // Populate add-member dropdown (users not already in group)
  const memberIds=new Set(members.map(m=>m.user_id));
  const addSel=document.getElementById('manage-grp-add-user');
  const eligible=S.users.filter(u=>!memberIds.has(u.id));
  addSel.innerHTML=eligible.length
    ?eligible.map(u=>`<option value="${u.id}">${u.full_name}</option>`).join('')
    :'<option value="">All users already in group</option>';
  addSel.disabled=!eligible.length;

  openModal('modal-manage-group');
}

async function saveGroupName(){
  const groupId=S.activeGroupId||S.activeChatGroup;
  const name=(document.getElementById('manage-grp-name')?.value||'').trim();
  if(!name||!groupId) return;
  const {error}=await sb.from('chat_groups').update({name}).eq('id',groupId);
  if(error){showToast('Failed: '+error.message,'error');return;}
  await loadChatGroups(); renderChatContacts();
  document.getElementById('chat-header-title').textContent=name;
  showToast('Group name updated.','success');
}

async function addToGroup(){
  const groupId=S.activeGroupId||S.activeChatGroup;
  const uid=document.getElementById('manage-grp-add-user')?.value;
  if(!groupId||!uid) return;
  const {error}=await sb.from('group_members').insert({group_id:groupId,user_id:uid,is_admin:false});
  if(error){showToast('Failed: '+error.message,'error');return;}
  await openManageGroupModal();
  showToast('Member added.','success');
}

async function removeFromGroup(groupId,uid){
  if(!confirm('Remove this member from the group?')) return;
  await sb.from('group_members').delete().eq('group_id',groupId).eq('user_id',uid);
  await openManageGroupModal();
  showToast('Member removed.','warning');
}

async function leaveGroup(){
  const groupId=S.activeGroupId||S.activeChatGroup;
  if(!groupId||!confirm('Leave this group?')) return;
  await sb.from('group_members').delete().eq('group_id',groupId).eq('user_id',S.user?.id);
  S.activeChatGroup=null;
  await loadChatGroups(); renderChatContacts();
  closeModal('modal-manage-group');
  // Switch to team channel
  selectChatPeer(null);
  showToast('You left the group.','warning');
}

// ── Build create group modal member list ─────────────────────────────────