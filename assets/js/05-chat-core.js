// ════════════════════════════════════════════
//  CHAT / MESSAGING
// ════════════════════════════════════════════
const MSG_EDIT_WINDOW_MS = 5*60*1000; // 5 minutes
let _chatTickTimer=null;

// renderChatContacts() — defined in _js20_groups.html (group-aware version)

// selectChatPeer() — defined in _js20_groups.html (group-aware version)

async function loadMessages(){
  // If a group is active, delegate to group message loader
  if(S.activeGroupId){
    if(typeof loadGroupMessages==='function') await loadGroupMessages(S.activeGroupId);
    return;
  }
  let query=sb.from('messages').select('*').order('created_at',{ascending:true}).limit(200);
  if(S.activeChatPeer===null){
    query=query.is('recipient_id',null).is('group_id',null);
  } else {
    query=query.or(`and(sender_id.eq.${S.user.id},recipient_id.eq.${S.activeChatPeer}),and(sender_id.eq.${S.activeChatPeer},recipient_id.eq.${S.user.id})`);
  }
  const {data,error}=await query;
  if(!error) S.messages=data||[];
  else console.error('loadMessages failed:',error);

  // Load read receipts
  if(S.messages.length){
    const myMsgIds=S.messages.filter(m=>m.sender_id===S.user.id&&!m.deleted).map(m=>m.id);
    if(myMsgIds.length){
      const {data:reads}=await sb.from('message_reads')
        .select('message_id').in('message_id',myMsgIds).neq('user_id',S.user.id);
      S.messageReadIds=new Set((reads||[]).map(r=>r.message_id));
    } else { S.messageReadIds=new Set(); }
  } else { S.messageReadIds=new Set(); }
}
function withinEditWindow(m){
  return (Date.now()-new Date(m.created_at).getTime())<MSG_EDIT_WINDOW_MS;
}
function renderChatMessages(){
  const cnt=document.getElementById('chat-messages');
  if(!cnt)return;
  if(!S.messages.length){
    cnt.innerHTML='<p class="text-muted text-sm" style="text-align:center;margin-top:20px;">No messages yet. Say hello!</p>';
    return;
  }
  cnt.innerHTML=S.messages.map(m=>{
    const mine=m.sender_id===S.user.id;
    const sender=S.users.find(u=>u.id===m.sender_id);
    const editable=mine&&!m.deleted&&withinEditWindow(m);
    let bodyHTML='';
    let attachHTML='';
    if(m.deleted){
      bodyHTML=`<span style="font-style:italic;opacity:.65;">This message was deleted</span>`;
    } else {
      bodyHTML=m.body?escHtml(m.body):'';
      if(m.attachment_path){
        attachHTML=`<div class="chat-msg-attach" onclick="openChatAttachment('${m.id}')">
          <i class="fas fa-paperclip"></i> ${escHtml(m.attachment_name||'Attachment')}
        </div>`;
      }
    }
    const editedTag=(m.edited_at&&!m.deleted)
      ?` <span style="opacity:.55;font-style:italic;font-size:9px;">(edited)</span>`:'' ;
    const controls=editable?`
      <span class="chat-msg-controls" style="margin-left:6px;">
        <i class="fas fa-pen" title="Edit" onclick="startEditMessage('${m.id}')"
           style="cursor:pointer;margin-right:7px;opacity:.75;"></i>
        <i class="fas fa-trash" title="Delete" onclick="deleteChatMessage('${m.id}')"
           style="cursor:pointer;opacity:.75;"></i>
      </span>`:'';

    // Read receipt — shown only on messages I sent, not deleted ones
    let receiptHTML='';
    if(mine && !m.deleted){
      const isRead=(S.messageReadIds||new Set()).has(m.id);
      if(isRead){
        // Eye icon = seen by recipient
        receiptHTML=`<span class="msg-receipt seen" title="Seen">
          <i class="fas fa-eye"></i>
        </span>`;
      } else {
        // Single tick = delivered to server (not yet seen)
        receiptHTML=`<span class="msg-receipt delivered" title="Delivered">
          <i class="fas fa-check"></i>
        </span>`;
      }
    }

    return `<div class="chat-msg ${mine?'mine':'theirs'}" data-msg-id="${m.id}" data-created="${m.created_at}">
      ${!mine&&S.activeChatPeer===null
        ?`<div style="font-size:11px;font-weight:600;opacity:.7;margin-bottom:2px;">${sender?sender.full_name:'Unknown'}</div>`
        :''}
      <div class="chat-msg-body">${bodyHTML}</div>
      ${attachHTML}
      <div class="chat-msg-time">
        ${fmtDT(m.created_at)}${editedTag}${receiptHTML}${controls}
      </div>
    </div>`;
  }).join('');
  cnt.scrollTop=cnt.scrollHeight;
  scheduleEditWindowRefresh();
}
// Re-render once the soonest editable message crosses the 5-min mark,
// so edit/delete controls disappear on their own without user action.
function scheduleEditWindowRefresh(){
  if(_chatTickTimer){clearTimeout(_chatTickTimer);_chatTickTimer=null;}
  const mine=S.messages.filter(m=>m.sender_id===S.user.id&&!m.deleted);
  if(!mine.length)return;
  const soonestExpiry=Math.min(...mine.map(m=>new Date(m.created_at).getTime()+MSG_EDIT_WINDOW_MS));
  const delay=soonestExpiry-Date.now();
  if(delay>0&&delay<MSG_EDIT_WINDOW_MS+1000){
    _chatTickTimer=setTimeout(()=>{ if(document.getElementById('view-chat')?.classList.contains('active')) renderChatMessages(); },delay+200);
  }
}
function startEditMessage(msgId){
  const m=S.messages.find(x=>x.id===msgId);
  if(!m)return;
  if(!withinEditWindow(m)){showToast('The 5-minute edit window for this message has passed.','error');return;}
  const input=document.getElementById('chat-text-input');
  input.value=m.body||'';
  input.focus();
  S.editingMessageId=msgId;
  document.getElementById('chat-send-btn-icon').className='fas fa-check';
  showToast('Editing message — press Enter or tap send to save.','info');
}
async function saveEditedMessage(msgId,newBody){
  const m=S.messages.find(x=>x.id===msgId);
  if(!m){showToast('Message no longer exists.','error');return;}
  if(!withinEditWindow(m)){showToast('The 5-minute edit window has passed.','error');S.editingMessageId=null;resetChatSendButton();return;}
  const {error}=await sb.from('messages').update({body:newBody,edited_at:new Date().toISOString()}).eq('id',msgId);
  if(error){showToast('Edit failed: '+error.message,'error');return;}
  S.editingMessageId=null;
  resetChatSendButton();
  document.getElementById('chat-text-input').value='';
  await loadMessages();
  renderChatMessages();
}
function resetChatSendButton(){
  const icon=document.getElementById('chat-send-btn-icon');
  if(icon) icon.className='fas fa-paper-plane';
}
async function deleteChatMessage(msgId){
  const m=S.messages.find(x=>x.id===msgId);
  if(!m)return;
  if(!withinEditWindow(m)){showToast('The 5-minute delete window has passed.','error');return;}
  if(!confirm('Delete this message? This cannot be undone.'))return;
  const {error}=await sb.from('messages').update({deleted:true,body:null,attachment_path:null,attachment_name:null}).eq('id',msgId);
  if(error){showToast('Delete failed: '+error.message,'error');return;}
  await loadMessages();
  renderChatMessages();
}
async function openChatAttachment(msgId){
  const m=S.messages.find(x=>x.id===msgId);
  if(!m||!m.attachment_path||m.deleted)return;
  const {data,error}=await sb.storage.from('lexdesk-files').createSignedUrl(m.attachment_path,3600);
  if(error||!data){showToast('Could not load attachment.','error');return;}
  window.open(data.signedUrl,'_blank');
}
function handleChatFileSelect(e){
  const f=e.target.files[0];
  if(!f)return;
  if(f.size>20*1024*1024){showToast('File exceeds 20MB.','error');e.target.value='';return;}
  S.pendingChatFile=f;
  document.getElementById('chat-pending-file-name').textContent=f.name;
  document.getElementById('chat-pending-file').style.display='flex';
  e.target.value='';
}
function clearChatPendingFile(){ S.pendingChatFile=null; document.getElementById('chat-pending-file').style.display='none'; }

async function sendChatMessage(){
  const input=document.getElementById('chat-text-input');
  const body=(input.value||'').trim();

  // If we're mid-edit, save the edit instead of sending a new message
  if(S.editingMessageId){
    if(!body){showToast('Message cannot be empty.','error');return;}
    await saveEditedMessage(S.editingMessageId,body);
    return;
  }

  if(!body&&!S.pendingChatFile)return;
  const payload={sender_id:S.user.id,recipient_id:S.activeChatPeer,body:body||null};
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
}
