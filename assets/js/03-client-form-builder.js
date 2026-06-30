
// ════════════════════════════════════════════
//  CASE TYPE TABS / DYNAMIC FIELDS
// ════════════════════════════════════════════
function buildCaseTypeTabs(){
  const c=document.getElementById('client-case-type-tabs');
  if(!c)return;
  c.innerHTML=S.categories.map((cat,i)=>`<button class="case-type-btn${i===0?' active':''}" id="ctt-${cat.id}" onclick="selectCaseType('${cat.id}')"><i class="${cat.icon}"></i> ${cat.label}</button>`).join('');
  S.activeCaseType=S.categories[0]?.id||'general';
  renderDynamicFields(S.activeCaseType);
}
function selectCaseType(catId){
  S.activeCaseType=catId;
  document.querySelectorAll('.case-type-btn').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('ctt-'+catId);
  if(btn)btn.classList.add('active');
  renderDynamicFields(catId);
}
function buildCategoryFilter(){
  const sel=document.getElementById('filter-type');
  if(sel) sel.innerHTML='<option value="">All Types</option>'+S.categories.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
}
function buildAssigneeFilter(){
  const sel=document.getElementById('filter-assignee');
  if(sel) sel.innerHTML='<option value="">All Lawyers</option>'+
    S.users.map(u=>`<option value="${u.id}">${u.full_name}</option>`).join('');
  const fa=document.getElementById('f-assignee');
  if(fa) fa.innerHTML=S.users.map(u=>`<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('');
  // Client filter dropdown on Documents page
  const dc=document.getElementById('doc-filter-client');
  if(dc) dc.innerHTML='<option value="">All Clients</option>'+
    myClients().map(c=>`<option value="${c.client_id}">${c.name} (${c.client_id})</option>`).join('');
  // NOTE: task-assignee dropdown is now built inside openTaskModal() directly
}

function renderDynamicFields(catId){
  const schema=S.formSchemas[catId]||[];
  const cat=S.categories.find(c=>c.id===catId);
  const cnt=document.getElementById('dynamic-case-fields');
  if(!cnt)return;
  if(!schema.length){
    cnt.innerHTML=`<p style="color:var(--text-muted);font-size:13px;margin:12px 0;">No fields for this category.${isAdmin()?` <span style="color:var(--navy-mid);cursor:pointer;text-decoration:underline;" onclick="closeModal(\'modal-client\');navigate(\'formbuilder\')">Configure in Form Builder →</span>`:''}</p>`;
    return;
  }
  const colorMap={blue:'#ebf8ff',green:'#f0fff4',purple:'#faf5ff',orange:'#fffaf0',red:'#fff5f5'};
  const borderMap={blue:'#bee3f8',green:'#9ae6b4',purple:'#d6bcfa',orange:'#fbd38d',red:'#fed7d7'};
  const c=cat?.color||'blue';
  let html=`<div class="section-divider" style="background:${colorMap[c]||'var(--bg)'};padding:6px 10px;border-radius:6px;border:1px solid ${borderMap[c]||'var(--border)'};margin-bottom:14px;border-bottom:1.5px solid ${borderMap[c]||'var(--gold-pale)'}"><i class="${cat?.icon||'fas fa-file-alt'}" style="margin-right:6px;"></i>${cat?.label||catId} Details</div><div class="form-grid form-grid-2" style="gap:13px;">`;
  schema.forEach(f=>{
    const reqStr=f.required?` <span class="required">*</span>`:'';
    let input='';
    if(['text','tel','number','date'].includes(f.type)) input=`<input class="form-control" id="df-${f.id}" type="${f.type}" data-field="${f.id}"/>`;
    else if(f.type==='textarea') input=`<textarea class="form-control" id="df-${f.id}" rows="3" data-field="${f.id}" style="grid-column:1/-1;"></textarea>`;
    else if(f.type==='select') input=`<select class="form-control" id="df-${f.id}" data-field="${f.id}"><option value="">Select…</option>${(f.options||[]).map(o=>`<option>${o}</option>`).join('')}</select>`;
    const fullWidth=f.type==='textarea';
    html+=`<div class="form-group"${fullWidth?' style="grid-column:1/-1;"':''}><label class="form-label">${f.label}${reqStr}</label>${input}</div>`;
  });
  html+='</div>';
  cnt.innerHTML=html;
}
function readDynamicFields(catId){ const schema=S.formSchemas[catId]||[];const data={};schema.forEach(f=>{const el=document.getElementById('df-'+f.id);if(el)data[f.id]=el.value;});return data; }
function fillDynamicFields(catId,data){ const schema=S.formSchemas[catId]||[];schema.forEach(f=>{const el=document.getElementById('df-'+f.id);if(el&&data)el.value=data[f.id]||'';}); }

// ════════════════════════════════════════════
//  FORM BUILDER (admin only)
// ════════════════════════════════════════════
function renderFormBuilder(){
  if(!isAdmin())return;
  const tabs=document.getElementById('fb-category-tabs');
  if(!tabs)return;
  tabs.innerHTML=S.categories.map((cat,i)=>`
    <div style="display:flex;align-items:center;gap:4px;">
      <button class="case-type-btn${i===0?' active':''}" onclick="selectFbCat('${cat.id}',this.parentElement.querySelector('.case-type-btn'))">
        <i class="${cat.icon}"></i> ${cat.label}
      </button>
      <button class="btn btn-danger btn-xs btn-icon" title="Delete category"
        onclick="deleteCategory('${cat.id}')" style="padding:5px 7px;flex-shrink:0;">
        <i class="fas fa-trash"></i>
      </button>
    </div>`).join('');
  if(S.categories.length) selectFbCat(S.categories[0].id, tabs.querySelector('.case-type-btn'));
}
function selectFbCat(catId,btn){
  S.fbActiveCat=catId;
  document.querySelectorAll('#fb-category-tabs .case-type-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const cat=S.categories.find(c=>c.id===catId);
  document.getElementById('fb-cat-label').textContent=`${cat?.label||catId} — Fields`;
  document.getElementById('fb-editor').style.display='block';
  renderFbFields();
}
function renderFbFields(){
  const schema=S.formSchemas[S.fbActiveCat]||[];
  const cnt=document.getElementById('fb-fields-list');
  if(!schema.length){cnt.innerHTML='<p class="text-muted text-sm">No fields yet. Click Add Field.</p>';return;}
  cnt.innerHTML=schema.map((f,i)=>`
    <div class="field-builder-item" data-idx="${i}">
      <i class="fas fa-grip-vertical drag-handle"></i>
      <input class="field-label-input" type="text" value="${escHtml(f.label)}" onchange="updateFbField(${i},'label',this.value)"/>
      <select style="border:1px solid var(--border);border-radius:4px;padding:4px 8px;font-size:12px;background:var(--bg);cursor:pointer;" onchange="updateFbField(${i},'type',this.value)">
        ${FIELD_TYPES.map(t=>`<option value="${t}"${f.type===t?' selected':''}>${t}</option>`).join('')}
      </select>
      ${f.type==='select'?`<button class="btn btn-outline btn-xs" onclick="editFieldOptions(${i})"><i class="fas fa-list"></i></button>`:''}
      <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;flex-shrink:0;"><input type="checkbox" ${f.required?'checked':''} onchange="updateFbField(${i},'required',this.checked)"/> Required</label>
      <button class="btn btn-danger btn-xs btn-icon" onclick="removeFbField(${i})"><i class="fas fa-trash"></i></button>
    </div>`).join('');
  setupFbDrag();
}
function addFormField(){ if(!S.fbActiveCat)return; if(!S.formSchemas[S.fbActiveCat])S.formSchemas[S.fbActiveCat]=[]; S.formSchemas[S.fbActiveCat].push({id:'field_'+Date.now(),label:'New Field',type:'text',required:false}); renderFbFields(); }
function updateFbField(idx,key,val){ S.formSchemas[S.fbActiveCat][idx][key]=val; if(key==='type')renderFbFields(); }
function removeFbField(idx){ if(!confirm('Delete this field?'))return; S.formSchemas[S.fbActiveCat].splice(idx,1); renderFbFields(); }
function editFieldOptions(idx){ const f=S.formSchemas[S.fbActiveCat][idx];const cur=(f.options||[]).join('\n');const n=prompt(`Options for "${f.label}" (one per line):`,cur);if(n===null)return;S.formSchemas[S.fbActiveCat][idx].options=n.split('\n').map(s=>s.trim()).filter(Boolean); }
async function saveFormSchema(){
  const {error}=await sb.from('form_schemas').upsert({category_id:S.fbActiveCat,fields:S.formSchemas[S.fbActiveCat],updated_at:new Date().toISOString()});
  if(error){showToast('Save failed: '+error.message,'error');return;}
  showToast('Form schema saved!','success');
}

async function deleteCategory(catId){
  // Block deletion if any clients use this category
  const inUse=S.clients.filter(c=>c.case_type===catId).length;
  if(inUse>0){
    showToast(`Cannot delete — ${inUse} client${inUse>1?'s are':' is'} using this category. Reassign them first.`,'error');
    return;
  }
  const cat=S.categories.find(c=>c.id===catId);
  if(!confirm(`Delete category "${cat?.label||catId}"? This also deletes its form schema.`))return;
  await sb.from('form_schemas').delete().eq('category_id',catId);
  const {error}=await sb.from('categories').delete().eq('id',catId);
  if(error){showToast('Delete failed: '+error.message,'error');return;}
  S.categories=S.categories.filter(c=>c.id!==catId);
  delete S.formSchemas[catId];
  S.fbActiveCat=S.categories[0]?.id||null;
  renderFormBuilder();
  buildAssigneeFilter();
  showToast(`Category "${cat?.label||catId}" deleted.`,'warning');
}
function setupFbDrag(){
  const list=document.getElementById('fb-fields-list');
  if(!list)return;
  let dragEl=null;
  list.querySelectorAll('.field-builder-item').forEach((item)=>{
    item.draggable=true;
    item.addEventListener('dragstart',()=>{dragEl=item;item.style.opacity='.4';});
    item.addEventListener('dragend',()=>{item.style.opacity='';});
    item.addEventListener('dragover',e=>{e.preventDefault();const r=item.getBoundingClientRect();if(e.clientY<r.top+r.height/2)list.insertBefore(dragEl,item);else list.insertBefore(dragEl,item.nextSibling);});
    item.addEventListener('drop',()=>{
      const items=[...list.querySelectorAll('.field-builder-item')];
      S.formSchemas[S.fbActiveCat]=items.map(el=>S.formSchemas[S.fbActiveCat][parseInt(el.dataset.idx)]);
      renderFbFields();
    });
  });
}

// ════════════════════════════════════════════
//  NEW CATEGORY
// ════════════════════════════════════════════
function openNewCategoryModal(){ document.getElementById('nc-name').value='';document.getElementById('nc-icon').value='fas fa-folder';openModal('modal-new-cat'); }
async function createCategory(){
  const name=(document.getElementById('nc-name').value||'').trim();
  if(!name){showToast('Category name required.','error');return;}
  const slug=name.toLowerCase().replace(/[^a-z0-9]/g,'_');
  if(S.categories.find(c=>c.slug===slug)){showToast('Category already exists.','error');return;}
  const {data:newCat,error:e1}=await sb.from('categories').insert({
    firm_id:S.profile.firm_id, slug,
    label:name,
    icon:document.getElementById('nc-icon').value||'fas fa-folder',
    color:document.getElementById('nc-color').value||'blue',
    built_in:false, created_by:S.user.id
  }).select().single();
  if(e1){showToast('Failed: '+e1.message,'error');return;}
  const {error:e2}=await sb.from('form_schemas').insert({category_id:newCat.id, firm_id:S.profile.firm_id, fields:[]});
  if(e2){showToast('Failed: '+e2.message,'error');return;}
  S.categories.push(newCat);
  S.formSchemas[id]=[];
  closeModal('modal-new-cat');
  buildSidebar();buildCaseTypeTabs();buildCategoryFilter();renderFormBuilder();updateStats();updateTemplateCatDropdown();
  showToast(`Category "${name}" created!`,'success');
}

// ════════════════════════════════════════════
//  CLIENT CRUD
// ════════════════════════════════════════════
function genId(){ const n=S.clients.length?Math.max(...S.clients.map(c=>parseInt((c.client_id||'').replace('CL-',''))||0))+1:1000+Math.floor(Math.random()*9000); return `CL-${n}`; }

function openAddClient(catId=null){
  S.editingClientId=null;
  S.linkedContactId=null;
  document.getElementById('mc-title').textContent='Add New Client';
  document.getElementById('mc-save-txt').textContent='Save Client';
  clearClientForm();
  document.getElementById('f-id').value=genId();
  const aw=document.getElementById('f-assignee-wrap');
  aw.style.display=isAdmin()?'':'none';
  if(!isAdmin()){ /* assistant: auto-assign to self happens on save */ }
  buildCaseTypeTabs();
  if(catId) selectCaseType(catId);
  const linkWrap=document.getElementById('f-link-existing');
  if(linkWrap){ linkWrap.closest('.form-group').style.display='flex'; linkWrap.value=''; }
  document.getElementById('f-link-hint').textContent='';
  buildExistingClientsDatalist();
  openModal('modal-client');
}
// Builds the list of distinct contacts (one entry per underlying person —
// their original/first case row — not one per case) for the "link to
// existing client" lookup.
function buildExistingClientsDatalist(){
  const dl=document.getElementById('existing-clients-list');
  if(!dl)return;
  const seen=new Set();
  const contacts=[];
  S.clients.forEach(c=>{
    const rootId=c.contact_id||c.client_id;
    if(seen.has(rootId))return;
    seen.add(rootId);
    const root=S.clients.find(x=>x.client_id===rootId)||c;
    contacts.push(root);
  });
  dl.innerHTML=contacts.map(c=>`<option value="${escHtml(c.name)} — ${c.client_id}"></option>`).join('');
  S._contactLookup=contacts;
}
function onLinkExistingClientInput(){
  const val=document.getElementById('f-link-existing').value;
  const match=(S._contactLookup||[]).find(c=>`${c.name} — ${c.client_id}`===val);
  const hint=document.getElementById('f-link-hint');
  if(!match){ S.linkedContactId=null; hint.textContent=''; return; }
  S.linkedContactId=match.contact_id||match.client_id;
  document.getElementById('f-name').value=match.name;
  document.getElementById('f-phone').value=match.phone||'';
  document.getElementById('f-email').value=match.email||'';
  document.getElementById('f-address').value=match.address||'';
  const caseCount=S.clients.filter(c=>(c.contact_id||c.client_id)===S.linkedContactId).length;
  hint.textContent=`Linked to ${match.name} — this will be case #${caseCount+1} for them. Contact details auto-filled below (you can still edit them).`;
}
function clearClientForm(){
  ['f-name','f-phone','f-email','f-address','f-fee','f-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('f-status').value='active';
  document.getElementById('file-list').innerHTML='';
  S.pendingFiles=[];
}

async function saveClient(){
  const name=(document.getElementById('f-name').value||'').trim();
  if(!name){showToast('Client name is required.','error');return;}
  const catId=S.activeCaseType;
  const schema=S.formSchemas[catId]||[];
  for(const f of schema){
    if(f.required){ const el=document.getElementById('df-'+f.id); if(el&&!el.value.trim()){showToast(`"${f.label}" is required.`,'error');return;} }
  }
  const saveBtn=document.getElementById('mc-save-btn');
  saveBtn.disabled=true;
  const now=new Date().toISOString();
  const initialClientId=document.getElementById('f-id').value||genId();
  const assignedTo=isAdmin()?(document.getElementById('f-assignee')?.value||S.user.id):S.user.id;
  const caseData=readDynamicFields(catId);

  const payload={
    firm_id:S.profile.firm_id, client_id:initialClientId,name,case_type:catId,
    contact_id:S.editingClientId?undefined:(S.linkedContactId||null),
    phone:document.getElementById('f-phone').value,
    email:document.getElementById('f-email').value,
    address:document.getElementById('f-address').value,
    status:document.getElementById('f-status').value,
    fee:document.getElementById('f-fee').value?Number(document.getElementById('f-fee').value):null,
    notes:document.getElementById('f-notes').value,
    assigned_to:assignedTo,
    case_data:caseData,
    updated_at:now
  };
  if(payload.contact_id===undefined) delete payload.contact_id; // don't touch contact_id on edits

  let isNew=false;
  if(S.editingClientId){
    const ex=S.clients.find(c=>c.client_id===S.editingClientId);
    payload.history=[...(ex?.history||[]),{date:now,text:`Updated by ${S.profile.full_name}.`}];
    // Build field-level diff for audit trail
    const diffs=ex?buildClientDiff(ex,payload):[];
    const {error}=await sb.from('clients').update(payload).eq('client_id',S.editingClientId);
    if(error){showToast('Save failed: '+error.message,'error');saveBtn.disabled=false;return;}
    logClientUpdate(S.editingClientId,diffs);
    showToast('Client updated!','success');
  } else {
    isNew=true;
    payload.created_by=S.user.id;
    payload.history=[{date:now,text:`Client created by ${S.profile.full_name} — ${catId} matter.`}];
    payload.created_at=now;
    // client_id is the primary key; two people creating clients around the same
    // moment can compute the same "next" id from a stale local cache. Retry with
    // a fresh id a few times on conflict instead of failing the whole save.
    let attempt=0, lastError=null, usedId=payload.client_id;
    while(attempt<5){
      const {error}=await sb.from('clients').insert(payload);
      if(!error){ lastError=null; break; }
      lastError=error;
      const isConflict=error.code==='23505'||/duplicate key|already exists/i.test(error.message||'');
      if(!isConflict) break;
      usedId=genId();
      payload.client_id=usedId;
      attempt++;
    }
    if(lastError){showToast('Save failed: '+lastError.message,'error');saveBtn.disabled=false;return;}
    sb.from('activity_log').insert({firm_id:S.profile.firm_id,actor_id:S.user.id,action:'client_created',entity_type:'client',entity_id:usedId,detail:{name:payload.name,created_by:S.profile.full_name,case_type:catId}});
    showToast(`${usedId} added.`,'success');
  }
  const clientId=payload.client_id;

  // Upload pending files to Supabase Storage
  if(S.pendingFiles.length){
    for(const f of S.pendingFiles){
      try{
        const path=`${S.profile.firm_id}/${clientId}/${Date.now()}_${f.name}`;
        const {error:upErr}=await sb.storage.from('lexdesk-files').upload(path,f._file,{contentType:f.type});
        if(upErr){ showToast(`Upload failed for ${f.name}: ${upErr.message}`,'error'); continue; }
        await sb.from('documents').insert({
          firm_id:S.profile.firm_id, client_id:clientId,name:f.name,
          category:S.categories.find(c=>c.id===catId)?.label||catId,
          size:f.size,mime_type:f.type,storage_path:path,uploaded_by:S.user.id
        });
      }catch(fe){ console.error(fe); showToast(`Upload error: ${f.name}`,'error'); }
    }
  }
  S.pendingFiles=[];
  saveBtn.disabled=false;
  closeModal('modal-client');
  await refreshAll();
}

async function editCurrentClient(){
  const c=S.clients.find(x=>x.client_id===S.detailClientId);
  if(!c)return;
  if(!isAdmin()&&c.assigned_to!==S.user.id){showToast('Access denied.','error');return;}
  closeModal('modal-detail');
  S.editingClientId=c.client_id;
  document.getElementById('mc-title').textContent='Edit Client';
  document.getElementById('mc-save-txt').textContent='Update Client';
  buildCaseTypeTabs();
  selectCaseType(c.case_type);
  document.getElementById('f-id').value=c.client_id;
  document.getElementById('f-name').value=c.name;
  document.getElementById('f-phone').value=c.phone||'';
  document.getElementById('f-email').value=c.email||'';
  document.getElementById('f-address').value=c.address||'';
  document.getElementById('f-status').value=c.status||'active';
  document.getElementById('f-fee').value=c.fee||'';
  document.getElementById('f-notes').value=c.notes||'';
  const aw=document.getElementById('f-assignee-wrap');
  aw.style.display=isAdmin()?'':'none';
  if(isAdmin()){ const fa=document.getElementById('f-assignee');if(fa)fa.value=c.assigned_to||''; }
  setTimeout(()=>fillDynamicFields(c.case_type,c.case_data||{}),50);
  S.pendingFiles=[];
  S.linkedContactId=null;
  const linkWrap=document.getElementById('f-link-existing');
  if(linkWrap) linkWrap.closest('.form-group').style.display='none';
  document.getElementById('file-list').innerHTML='';
  openModal('modal-client');
}

async function deleteCurrentClient(){
  const c=S.clients.find(x=>x.client_id===S.detailClientId);
  if(!c)return;
  if(!isAdmin()){ showToast('Only the Admin can delete clients.','error'); return; }
  if(!confirm(`Delete "${c.name}"? This cannot be undone.`))return;
  // Clean up storage files first — the documents rows cascade-delete via FK,
  // but the underlying Storage objects don't, and would otherwise leak forever.
  const clientDocs=S.documents.filter(d=>d.client_id===S.detailClientId&&d.storage_path);
  if(clientDocs.length){
    const {error:rmErr}=await sb.storage.from('lexdesk-files').remove(clientDocs.map(d=>d.storage_path));
    if(rmErr) console.warn('Some storage files could not be removed:',rmErr.message);
  }
  const {error}=await sb.from('clients').delete().eq('client_id',S.detailClientId);
  if(error){showToast('Delete failed: '+error.message,'error');return;}
  closeModal('modal-detail');
  await refreshAll();
  showToast('Client deleted.','warning');
}

async function viewClient(id){
  const c=S.clients.find(x=>x.client_id===id);
  if(!c)return;
  if(!isAdmin()&&c.assigned_to!==S.user.id){showToast('Access denied.','error');return;}
  S.detailClientId=id;
  const cat=S.categories.find(x=>x.id===c.case_type)||{label:c.case_type,icon:'fas fa-file'};
  const au=S.users.find(u=>u.id===c.assigned_to);
  document.getElementById('det-title').textContent=c.name;
  document.getElementById('det-sub').textContent=`${c.client_id} · ${cat.label} · ${capitalize(c.status)}`;
  document.getElementById('det-edit-btn').style.display=(isAdmin()||c.assigned_to===S.user.id)?'':'none';
  document.getElementById('det-delete-btn').style.display=isAdmin()?'':'none';
  document.getElementById('det-meta').innerHTML=`
    <div class="detail-meta-item"><div class="detail-meta-label">Client ID</div><div class="detail-meta-value">${c.client_id}</div></div>
    <div class="detail-meta-item"><div class="detail-meta-label">Case Type</div><div class="detail-meta-value">${catBadge(c.case_type)}</div></div>
    <div class="detail-meta-item"><div class="detail-meta-label">Status</div><div class="detail-meta-value">${statusBadge(c.status)}</div></div>
    <div class="detail-meta-item"><div class="detail-meta-label">Assigned To</div><div class="detail-meta-value">${au?au.full_name:'—'}</div></div>
    <div class="detail-meta-item"><div class="detail-meta-label">Total Fee</div><div class="detail-meta-value">${c.fee?'₹'+Number(c.fee).toLocaleString('en-IN'):'—'}</div></div>`;
  renderPaymentsTab(id);
  document.getElementById('tab-overview').innerHTML=`
    <div class="form-grid form-grid-2" style="gap:12px;">
      ${dr('Phone',c.phone)}${dr('Email',c.email)}
      <div class="form-group" style="grid-column:1/-1;"><div class="form-label">Address</div><div style="font-size:14px;padding:6px 0;">${c.address||'—'}</div></div>
      <div class="form-group" style="grid-column:1/-1;"><div class="form-label">Internal Notes</div><div style="font-size:14px;padding:6px 0;">${c.notes||'—'}</div></div>
    </div>
    ${renderRelatedCasesHTML(c)}`;
  const schema=S.formSchemas[c.case_type]||[];
  const caseData=c.case_data||{};
  let caseHTML='';
  if(schema.length){
    caseHTML='<div class="form-grid form-grid-2" style="gap:12px;">';
    schema.forEach(f=>{
      const val=caseData[f.id]||'—';
      const fullW=f.type==='textarea';
      const pill=(f.type==='date'&&val!=='—')?deadlinePill(val):'';
      caseHTML+=`<div class="form-group"${fullW?' style="grid-column:1/-1;"':''}><div class="form-label">${f.label}</div><div style="font-size:14px;padding:6px 0;">${val} ${pill}</div></div>`;
    });
    caseHTML+='</div>';
  } else caseHTML='<p class="text-muted">No case details.</p>';
  document.getElementById('tab-case-details').innerHTML=caseHTML;

  const clientDocs=S.documents.filter(d=>d.client_id===id);
  document.getElementById('tab-documents').innerHTML=clientDocs.length
    ?`<div class="file-list">${clientDocs.map(d=>`
        <div class="file-item" onclick="openFilePreview('${d.id}')">
          <i class="${fileIcon(d.name)}" style="color:var(--navy-mid);font-size:18px;"></i>
          <span class="file-item-name">${escHtml(d.name)}</span>
          <span class="file-item-size">${formatBytes(d.size)}</span>
        </div>`).join('')}</div>`
    :'<p class="text-muted text-sm">No documents attached.</p>';

  const hist=(c.history||[]).slice().reverse();
  document.getElementById('det-history').innerHTML=hist.length
    ?hist.map(h=>`<div class="timeline-item"><div class="timeline-date">${fmtDT(h.date)}</div><div class="timeline-text">${h.text}</div></div>`).join('')
    :'<p class="text-muted text-sm">No history.</p>';
  switchTab('overview');
  openModal('modal-detail');
}
function dr(label,val){ return `<div class="form-group"><div class="form-label">${label}</div><div style="font-size:14px;padding:6px 0;">${val||'—'}</div></div>`; }

// Shows other matters belonging to the same underlying contact (linked via
// contact_id), so a lawyer can see at a glance if this client has other
// cases with the firm.
function renderRelatedCasesHTML(c){
  const rootId=c.contact_id||c.client_id;
  // Only surface related cases the current user can actually see — an
  // Assistant shouldn't learn that a shared client has another matter
  // that belongs to a different lawyer, even just by name.
  const visibleIds=new Set(myClients().map(x=>x.client_id));
  const related=S.clients.filter(x=>(x.contact_id||x.client_id)===rootId&&x.client_id!==c.client_id&&(isAdmin()||visibleIds.has(x.client_id)));
  if(!related.length)return'';
  return `<div class="section-divider" style="margin-top:18px;"><i class="fas fa-folder-tree"></i> Other Cases for ${escHtml(c.name)}</div>
    <div class="file-list">${related.map(r=>{
      const cat=S.categories.find(x=>x.id===r.case_type);
      return `<div class="file-item" onclick="closeModal('modal-detail');viewClient('${r.client_id}')">
        <i class="${cat?.icon||'fas fa-folder'}" style="color:var(--navy-mid);font-size:16px;"></i>
        <span class="file-item-name">${escHtml(r.name)} <span class="client-id">${r.client_id}</span></span>
        ${statusBadge(r.status)}
      </div>`;
    }).join('')}</div>`;
}
