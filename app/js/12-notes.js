// ════════════════════════════════════════════
//  NOTES — private rich-text documents, shareable with
//  viewer/editor permissions per person, with full history.
//  Owner sees their own change history.
//  Senior Advocate sees firm-wide activity feed.
// ════════════════════════════════════════════
S.notes       = S.notes       || [];
S.noteShares  = S.noteShares  || {};   // note_id → [{shared_with, permission, ...}]
S.editingNoteId = S.editingNoteId || null;

// ── Load all notes visible to me ─────────────────────────────────────────
async function loadNotes(){
  const {data,error}=await sb.from('notes').select('*').order('updated_at',{ascending:false});
  if(error){ console.error('loadNotes:',error); return; }
  S.notes=data||[];
}

// ── Render notes grid ─────────────────────────────────────────────────────
function renderNotes(){
  const grid=document.getElementById('notes-grid');
  const empty=document.getElementById('notes-empty');
  if(!grid)return;
  if(!S.notes.length){ grid.innerHTML=''; if(empty)empty.style.display='block'; return; }
  if(empty)empty.style.display='none';

  grid.innerHTML=S.notes.map(n=>{
    const isOwner=n.owner_id===S.user?.id;
    const owner=S.users.find(u=>u.id===n.owner_id);
    const preview=n.content.replace(/<[^>]+>/g,' ').slice(0,120);
    return `<div class="template-card" onclick="openNoteEditor('${n.id}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px;">
        <div class="template-card-title">${escHtml(n.title)}</div>
        ${isOwner?'<span class="badge badge-admin" style="font-size:10px;flex-shrink:0;">Owner</span>':'<span class="badge badge-assistant" style="font-size:10px;flex-shrink:0;">Shared</span>'}
      </div>
      <div class="template-card-meta">By ${owner?owner.full_name:'—'} · ${fmtDT(n.updated_at)}</div>
      <div class="template-preview">${preview}…</div>
      <div style="display:flex;gap:8px;margin-top:12px;" onclick="event.stopPropagation()">
        <button class="btn btn-gold btn-sm" onclick="openNoteEditor('${n.id}')"><i class="fas fa-edit"></i> Open</button>
        ${isOwner?`<button class="btn btn-outline btn-sm" onclick="openNoteShareModal('${n.id}')"><i class="fas fa-share-alt"></i> Share</button>`:''}
        ${isOwner?`<button class="btn btn-danger btn-sm" onclick="deleteNote('${n.id}')"><i class="fas fa-trash"></i></button>`:''}
      </div>
    </div>`;
  }).join('');
}

// ── Open note editor modal ────────────────────────────────────────────────
function openNoteEditor(noteId=null){
  S.editingNoteId=noteId;
  if(noteId){
    const n=S.notes.find(x=>x.id===noteId);
    if(!n)return;
    document.getElementById('note-modal-title').textContent=n.title;
    document.getElementById('note-title-input').value=n.title;
    document.getElementById('note-content-editor').innerHTML=n.content;
    // Check if user can edit
    const isOwner=n.owner_id===S.user?.id;
    // Check editor permission from shares (already loaded or fetch inline)
    loadNoteEditorAccess(noteId,isOwner);
    renderNoteHistory(noteId);
  } else {
    document.getElementById('note-modal-title').textContent='New Note';
    document.getElementById('note-title-input').value='';
    document.getElementById('note-content-editor').innerHTML='';
    document.getElementById('note-history-section').style.display='none';
    document.getElementById('note-save-btn').style.display='inline-flex';
    document.getElementById('note-content-editor').contentEditable='true';
    document.getElementById('note-rich-toolbar').style.display='flex';
  }
  openModal('modal-note');
}

async function loadNoteEditorAccess(noteId,isOwner){
  // Determine if viewer or editor
  let canEdit=isOwner;
  if(!isOwner){
    const {data}=await sb.from('note_shares')
      .select('permission').eq('note_id',noteId).eq('shared_with',S.user?.id).maybeSingle();
    canEdit=data?.permission==='editor';
  }
  const editor=document.getElementById('note-content-editor');
  const toolbar=document.getElementById('note-rich-toolbar');
  const saveBtn=document.getElementById('note-save-btn');
  if(editor) editor.contentEditable=canEdit?'true':'false';
  if(toolbar) toolbar.style.display=canEdit?'flex':'none';
  if(saveBtn) saveBtn.style.display=canEdit?'inline-flex':'none';
  if(!canEdit && editor){
    editor.style.background='var(--bg)';
    editor.style.cursor='default';
  }
}

async function renderNoteHistory(noteId){
  const histSection=document.getElementById('note-history-section');
  const histList=document.getElementById('note-history-list');
  if(!histSection||!histList)return;
  const n=S.notes.find(x=>x.id===noteId);
  const isOwner=n?.owner_id===S.user?.id;
  if(!isOwner){ histSection.style.display='none'; return; }
  histSection.style.display='block';
  const {data}=await sb.from('note_history')
    .select('*').eq('note_id',noteId).order('changed_at',{ascending:false}).limit(10);
  if(!data||!data.length){ histList.innerHTML='<p class="text-muted text-sm">No edits yet.</p>'; return; }
  histList.innerHTML=data.map(h=>{
    const who=S.users.find(u=>u.id===h.changed_by);
    return `<div style="padding:7px 0;border-bottom:1px solid var(--border-light);">
      <span style="font-size:12px;color:var(--text-muted);">${fmtDT(h.changed_at)} · ${who?who.full_name:'Unknown'}</span>
    </div>`;
  }).join('');
}

async function saveNote(){
  const title=(document.getElementById('note-title-input').value||'').trim();
  const content=document.getElementById('note-content-editor').innerHTML;
  if(!title){ showToast('Note title is required.','error'); return; }

  if(S.editingNoteId){
    // Save history snapshot before overwriting
    const existing=S.notes.find(x=>x.id===S.editingNoteId);
    if(existing){
      await sb.from('note_history').insert({
        note_id:S.editingNoteId, changed_by:S.user?.id, snapshot:existing.content
      });
      // Log to activity_log
      await sb.from('activity_log').insert({
        actor_id:S.user?.id, action:'note_edited',
        entity_type:'note', entity_id:S.editingNoteId,
        detail:{title}
      });
    }
    const {error}=await sb.from('notes')
      .update({title,content,updated_at:new Date().toISOString()}).eq('id',S.editingNoteId);
    if(error){ showToast('Save failed: '+error.message,'error'); return; }
    showToast('Note saved.','success');
  } else {
    const {data,error}=await sb.from('notes')
      .insert({owner_id:S.user?.id,title,content}).select().single();
    if(error){ showToast('Create failed: '+error.message,'error'); return; }
    S.editingNoteId=data.id;
    showToast('Note created.','success');
    await sb.from('activity_log').insert({
      actor_id:S.user?.id, action:'note_created',
      entity_type:'note', entity_id:data.id, detail:{title}
    });
  }
  closeModal('modal-note');
  await loadNotes();
  renderNotes();
}

async function deleteNote(id){
  if(!confirm('Delete this note permanently? This cannot be undone.'))return;
  const {error}=await sb.from('notes').delete().eq('id',id);
  if(error){ showToast('Delete failed: '+error.message,'error'); return; }
  S.notes=S.notes.filter(x=>x.id!==id);
  renderNotes();
  showToast('Note deleted.','warning');
}

// ── Share modal ───────────────────────────────────────────────────────────
async function openNoteShareModal(noteId){
  S.sharingNoteId=noteId;
  const n=S.notes.find(x=>x.id===noteId);
  document.getElementById('note-share-title').textContent=n?`Share "${n.title}"`:' Share Note';

  // Build people picker (everyone except owner)
  const sel=document.getElementById('note-share-user');
  const others=S.users.filter(u=>u.id!==S.user?.id);
  sel.innerHTML=others.map(u=>`<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('');

  // Load current shares
  await renderCurrentShares(noteId);
  openModal('modal-note-share');
}

async function renderCurrentShares(noteId){
  const cnt=document.getElementById('note-current-shares');
  const {data}=await sb.from('note_shares').select('*').eq('note_id',noteId);
  S.noteShares[noteId]=data||[];
  if(!data||!data.length){
    cnt.innerHTML='<p class="text-muted text-sm">Not shared with anyone yet.</p>';
    return;
  }
  cnt.innerHTML=data.map(s=>{
    const who=S.users.find(u=>u.id===s.shared_with);
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);">
      <div style="flex:1;font-size:13.5px;">${who?who.full_name:'Unknown'}</div>
      <select class="form-control" style="width:auto;font-size:12px;" onchange="updateSharePermission('${noteId}','${s.shared_with}',this.value)">
        <option value="viewer" ${s.permission==='viewer'?'selected':''}>Viewer</option>
        <option value="editor" ${s.permission==='editor'?'selected':''}>Editor</option>
      </select>
      <button class="btn btn-danger btn-xs btn-icon" onclick="revokeShare('${noteId}','${s.shared_with}')"><i class="fas fa-times"></i></button>
    </div>`;
  }).join('');
}

async function addNoteShare(){
  const noteId=S.sharingNoteId;
  const userId=document.getElementById('note-share-user').value;
  const perm=document.getElementById('note-share-perm').value;
  if(!userId||!noteId)return;
  const {error}=await sb.from('note_shares').upsert(
    {note_id:noteId, shared_with:userId, permission:perm, shared_by:S.user?.id},
    {onConflict:'note_id,shared_with'}
  );
  if(error){ showToast('Share failed: '+error.message,'error'); return; }
  await sb.from('activity_log').insert({
    actor_id:S.user?.id, action:'note_shared',
    entity_type:'note', entity_id:noteId,
    detail:{shared_with:userId, permission:perm}
  });
  await renderCurrentShares(noteId);
  showToast('Shared successfully.','success');
  // Option: also send a chat message with an internal link to the note
  const sendToChat=document.getElementById('note-share-send-chat').checked;
  if(sendToChat){
    const n=S.notes.find(x=>x.id===noteId);
    const body=`📝 Shared a note with you: "${n?.title||'Note'}" (${perm} access)`;
    await sb.from('messages').insert({
      sender_id:S.user?.id, recipient_id:userId, body, note_id:noteId
    });
    showToast('Also sent as a chat message.','success');
  }
}

async function updateSharePermission(noteId,userId,perm){
  const {error}=await sb.from('note_shares')
    .update({permission:perm}).eq('note_id',noteId).eq('shared_with',userId);
  if(error){ showToast('Update failed: '+error.message,'error'); return; }
  await sb.from('activity_log').insert({
    actor_id:S.user?.id, action:'note_permission_changed',
    entity_type:'note', entity_id:noteId,
    detail:{shared_with:userId, new_permission:perm}
  });
  showToast('Permission updated.','success');
}

async function revokeShare(noteId,userId){
  if(!confirm('Remove this person\'s access to the note?'))return;
  const {error}=await sb.from('note_shares')
    .delete().eq('note_id',noteId).eq('shared_with',userId);
  if(error){ showToast('Revoke failed: '+error.message,'error'); return; }
  await renderCurrentShares(noteId);
  showToast('Access revoked.','warning');
}

// ── Activity log (admin = client changes; note owner = their note changes) ──
async function loadActivityLog(){
  const cnt=document.getElementById('activity-log-list');
  if(!cnt)return;
  const {data,error}=await sb.from('activity_log')
    .select('*').order('created_at',{ascending:false}).limit(100);
  if(error){ cnt.innerHTML=`<p class="text-muted text-sm">Could not load activity.</p>`; return; }
  if(!data||!data.length){ cnt.innerHTML='<p class="text-muted text-sm">No activity yet.</p>'; return; }
  const ACTION_LABELS={
    client_updated:'Updated client',client_created:'Added client',
    note_created:'Created note',note_edited:'Edited note',
    note_shared:'Shared note',note_permission_changed:'Changed note permission'
  };
  cnt.innerHTML=data.map(e=>{
    const actor=S.users.find(u=>u.id===e.actor_id);
    const label=ACTION_LABELS[e.action]||e.action;
    const detail=e.detail?Object.entries(e.detail).map(([k,v])=>`${k}: ${v}`).join(' · '):'';
    return `<div style="padding:9px 0;border-bottom:1px solid var(--border-light);">
      <div style="font-size:13px;font-weight:500;">${actor?actor.full_name:'Unknown'} — ${label}</div>
      <div style="font-size:11.5px;color:var(--text-muted);">${fmtDT(e.created_at)}${detail?' · '+detail:''}</div>
    </div>`;
  }).join('');
}

// Rich text helpers for the note editor
function noteCmd(cmd){ document.execCommand(cmd,false,null); document.getElementById('note-content-editor').focus(); }