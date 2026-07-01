// ════════════════════════════════════════════
//  TEMPLATES
// ════════════════════════════════════════════
function updateTemplateCatDropdown(){
  const sel=document.getElementById('tpl-category');
  if(sel) sel.innerHTML='<option value="">General</option>'+S.categories.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
}
function openTemplateModal(tplId=null){
  S.editingTemplateId=tplId;
  updateTemplateCatDropdown();
  if(tplId){
    const t=S.templates.find(x=>x.id===tplId);
    if(!t)return;
    document.getElementById('tpl-modal-title').textContent='Edit Template';
    document.getElementById('tpl-name').value=t.name;
    document.getElementById('tpl-category').value=t.category||'';
    document.getElementById('tpl-content').innerHTML=t.content;
  } else {
    document.getElementById('tpl-modal-title').textContent='New Draft Template';
    document.getElementById('tpl-name').value='';
    document.getElementById('tpl-content').innerHTML='';
  }
  openModal('modal-template');
}
function richCmd(cmd){ document.execCommand(cmd,false,null); document.getElementById('tpl-content').focus(); }
function insertPlaceholder(ph){ document.execCommand('insertText',false,ph); document.getElementById('tpl-content').focus(); }
async function saveTemplate(){
  const name=(document.getElementById('tpl-name').value||'').trim();
  const content=document.getElementById('tpl-content').innerHTML;
  if(!name||!content.trim()){showToast('Name and content are required.','error');return;}
  const payload={name,category:document.getElementById('tpl-category').value||null,content,updated_at:new Date().toISOString()};
  if(S.editingTemplateId){
    const {error}=await sb.from('templates').update(payload).eq('id',S.editingTemplateId);
    if(error){showToast('Failed: '+error.message,'error');return;}
  } else {
    payload.created_by=S.user.id;
    const {error}=await sb.from('templates').insert(payload);
    if(error){showToast('Failed: '+error.message,'error');return;}
  }
  closeModal('modal-template');
  const {data}=await sb.from('templates').select('*').order('created_at',{ascending:false});
  S.templates=data||[];
  renderTemplates();
  showToast('Template saved!','success');
}
async function deleteTemplate(id){
  if(!confirm('Delete this template?'))return;
  const {error}=await sb.from('templates').delete().eq('id',id);
  if(error){showToast('Failed: '+error.message,'error');return;}
  S.templates=S.templates.filter(t=>t.id!==id);
  renderTemplates();
  showToast('Template deleted.','warning');
}
function renderTemplates(){
  const grid=document.getElementById('templates-grid');
  const empty=document.getElementById('templates-empty');
  if(!grid)return;
  if(!S.templates.length){grid.innerHTML='';if(empty)empty.style.display='block';return;}
  if(empty)empty.style.display='none';
  grid.innerHTML=S.templates.map(t=>{
    const cat=S.categories.find(c=>c.id===t.category);
    const author=S.users.find(u=>u.id===t.created_by);
    const canEdit=isAdmin()||t.created_by===S.user?.id;
    return `<div class="template-card">
      <div class="template-card-title">${escHtml(t.name)}</div>
      <div class="template-card-meta">${cat?cat.label:'General'} · by ${author?author.full_name:'—'}</div>
      <div class="template-preview">${t.content.replace(/<[^>]+>/g,' ').slice(0,140)}…</div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn btn-gold btn-sm" onclick="openUseTemplate('${t.id}')"><i class="fas fa-magic"></i> Use</button>
        ${canEdit?`<button class="btn btn-outline btn-sm" onclick="openTemplateModal('${t.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteTemplate('${t.id}')"><i class="fas fa-trash"></i></button>`:''}
      </div>
    </div>`;
  }).join('');
}
function openUseTemplate(tplId){
  S.activeTemplateId=tplId;
  const sel=document.getElementById('ut-client');
  sel.innerHTML=myClients().map(c=>`<option value="${c.client_id}">${c.name} (${c.client_id})</option>`).join('');
  const t=S.templates.find(x=>x.id===tplId);
  document.getElementById('ut-title').textContent='Use: '+(t?t.name:'Template');
  previewTemplate();
  openModal('modal-use-template');
}
function fillTemplatePlaceholders(content,clientId){
  const c=S.clients.find(x=>x.client_id===clientId);
  const cat=c?S.categories.find(x=>x.id===c.case_type):null;
  return content
    .replace(/{{CLIENT_NAME}}/g,c?c.name:'')
    .replace(/{{CLIENT_ID}}/g,c?c.client_id:'')
    .replace(/{{CASE_TYPE}}/g,cat?cat.label:'')
    .replace(/{{DATE}}/g,new Date().toLocaleDateString('en-IN'));
}
function previewTemplate(){
  const t=S.templates.find(x=>x.id===S.activeTemplateId);
  if(!t)return;
  const clientId=document.getElementById('ut-client').value;
  const filled=fillTemplatePlaceholders(t.content,clientId);
  document.getElementById('ut-preview').innerHTML=filled;
}
function copyTemplateText(){
  const txt=document.getElementById('ut-preview').innerText;
  navigator.clipboard.writeText(txt).then(()=>showToast('Copied to clipboard!','success'));
}
function downloadTemplateText(){
  const txt=document.getElementById('ut-preview').innerText;
  const t=S.templates.find(x=>x.id===S.activeTemplateId);
  const blob=new Blob([txt],{type:'text/plain'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(t?.name||'template')+'.txt';a.click();
}

// ════════════════════════════════════════════
//  EXCEL EXPORT (SheetJS, one workbook / 4 tabs)
// ════════════════════════════════════════════
async function exportExcel(){
  try{
    showToast('Building export…','info');
    const wb=XLSX.utils.book_new();

    const clientRows=myClients().map(c=>{
      const au=S.users.find(u=>u.id===c.assigned_to);
      const cat=S.categories.find(x=>x.id===c.case_type);
      return {
        'Client ID':c.client_id,'Name':c.name,'Case Type':cat?cat.label:c.case_type,
        'Status':c.status,'Phone':c.phone||'','Email':c.email||'','Address':c.address||'',
        'Total Fee':c.fee||'','Assigned To':au?au.full_name:'','Notes':c.notes||'',
        'Created':fmtD(c.created_at)
      };
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clientRows),'Clients');

    const visibleIds=new Set(myClients().map(c=>c.client_id));
    const docRows=S.documents.filter(d=>isAdmin()||visibleIds.has(d.client_id)).map(d=>{
      const c=S.clients.find(x=>x.client_id===d.client_id);
      const uploader=S.users.find(u=>u.id===d.uploaded_by);
      return {'File Name':d.name,'Client':c?c.name:'','Client ID':d.client_id,'Category':d.category||'','Size':formatBytes(d.size),'Uploaded By':uploader?uploader.full_name:'','Uploaded At':fmtDT(d.uploaded_at)};
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(docRows),'Documents');

    // Payments sheet — fetched fresh since not every payment is cached locally
    let paymentRows=[];
    const {data:allPayments,error:payErr}=await sb.from('payments').select('*').order('payment_date',{ascending:false});
    if(!payErr&&allPayments){
      paymentRows=allPayments.filter(p=>visibleIds.has(p.client_id)).map(p=>{
        const c=S.clients.find(x=>x.client_id===p.client_id);
        const recorder=S.users.find(u=>u.id===p.recorded_by);
        return {'Client':c?c.name:'','Client ID':p.client_id,'Amount':p.amount,'Date':fmtD(p.payment_date),'Method':p.method||'','Note':p.note||'','Recorded By':recorder?recorder.full_name:''};
      });
    }
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(paymentRows),'Payments');

    const userRows=S.users.map(u=>({'Name':u.full_name,'Email':u.email||'','Role':u.role,'Bar Number':u.bar_number||'','Phone':u.phone||'','Clients Assigned':S.clients.filter(c=>c.assigned_to===u.id).length}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(userRows),'Users');

    const taskRows=S.tasks.filter(t=>isAdmin()||t.assigned_to===S.user.id||t.assigned_by===S.user.id).map(t=>{
      const by=S.users.find(u=>u.id===t.assigned_by),to=S.users.find(u=>u.id===t.assigned_to);
      const c=t.client_id?S.clients.find(x=>x.client_id===t.client_id):null;
      return {'Title':t.title,'Status':t.status,'Priority':t.priority,'Assigned By':by?by.full_name:'','Assigned To':to?to.full_name:'','Client':c?c.name:'','Due Date':t.due_date||'','Created':fmtD(t.created_at)};
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(taskRows),'Tasks');

    XLSX.writeFile(wb,`LexDesk_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast('Excel file exported!','success');
  }catch(e){ console.error(e); showToast('Export failed.','error'); }
}

// ════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════
function loadSettingsUI(){
  if(!S.profile)return;
  document.getElementById('s-name').value=S.profile.full_name||'';
  document.getElementById('s-bar').value=S.profile.bar_number||'';
  document.getElementById('s-phone').value=S.profile.phone||'';
  document.getElementById('s-email').value=S.profile.email||'';
  document.getElementById('s-court').value=S.profile.court||'';
  const dobEl=document.getElementById('s-dob');
  if(dobEl) dobEl.value=S.profile.dob||'';
  document.getElementById('s-onedrive-client-id').value=localStorage.getItem('ld_onedrive_client_id')||'';
  updateOneDriveStatusUI();
  loadInvoiceSettingsUI();  // populate invoice settings fields if data already loaded
  // Initialize theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if(themeToggle){
    const isDark = getTheme() !== 'light';
    themeToggle.classList.toggle('on', isDark);
  }
  // Initialize chatbot toggle to reflect actual current state
  const botToggle = document.getElementById('chatbot-toggle');
  if(botToggle){
    const isEnabled = isChatbotEnabled();
    botToggle.classList.toggle('on', isEnabled);
  }
  // Render theme customiser
  if(typeof renderThemeCustomiser==='function') renderThemeCustomiser();
  const resetRow=document.getElementById('reset-row');
  if(resetRow) resetRow.style.display=isAdmin()?'flex':'none';
  const migRow=document.getElementById('migration-check-row');
  if(migRow){ migRow.style.display=isAdmin()?'flex':'none'; if(isAdmin()) checkMigrationStatus(); }
}

// Diagnoses whether the v3.1 SQL migration has actually been run on this
// Supabase project. Checks the two concrete symptoms reported: the profiles
// visibility policy (chat contact list) and the tasks status constraint
// (in_review). Admin-only, surfaced on the Settings page.
async function checkMigrationStatus(){
  const descEl=document.getElementById('migration-check-desc');
  if(!descEl)return;
  descEl.textContent='Checking…';
  const issues=[];

  // Check 1: can we see other approved profiles? (fails if old RLS policy is still active)
  try{
    const {data,error}=await sb.from('profiles').select('id').eq('approved',true).limit(50);
    if(error){ issues.push('profile visibility check failed: '+error.message); }
    else if((data||[]).length<=1 && S.users.length<=1){ issues.push('team members are still hidden from each other (old profiles policy is still active)'); }
  }catch(e){ issues.push('profile visibility check threw an error'); }

  // Check 2: does the tasks table actually accept 'in_review'? We test this directly
  // with a real insert + immediate delete, using a harmless throwaway row, so the
  // result reflects the live constraint rather than a proxy.
  try{
    const probeTitle='__lexdesk_migration_probe__';
    const {data:inserted,error:insErr}=await sb.from('tasks').insert({
      title:probeTitle, status:'in_review', assigned_by:S.user.id, assigned_to:S.user.id
    }).select('id').single();
    if(insErr){
      if(/check constraint|tasks_status_check/i.test(insErr.message)){
        issues.push("tasks table doesn't accept 'in_review' yet (old status constraint is still active)");
      } else {
        issues.push('tasks constraint check failed: '+insErr.message);
      }
    } else if(inserted?.id){
      await sb.from('tasks').delete().eq('id',inserted.id);
    }
  }catch(e){ issues.push('tasks constraint check threw an error'); }

  if(!issues.length){
    descEl.innerHTML='<span style="color:var(--success);"><i class="fas fa-check-circle"></i> Migration fully applied</span>';
  } else {
    descEl.innerHTML=`<span style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i> Migration NOT applied: ${issues.map(escHtml).join('; ')}. Run the MIGRATION block in supabase_schema.sql.</span>`;
  }
}
async function saveProfile(){
  const payload={full_name:document.getElementById('s-name').value,bar_number:document.getElementById('s-bar').value,phone:document.getElementById('s-phone').value,court:document.getElementById('s-court').value,dob:document.getElementById('s-dob')?.value||null};
  const {error}=await sb.from('profiles').update(payload).eq('id',S.user.id);
  if(error){showToast('Save failed: '+error.message,'error');return;}
  S.profile={...S.profile,...payload};
  updateSidebarProfile();
  showToast('Profile saved!','success');
}
function saveOneDriveClientId(){
  const id=(document.getElementById('s-onedrive-client-id').value||'').trim();
  localStorage.setItem('ld_onedrive_client_id',id);
  showToast(id?'Client ID saved — OneDrive sync wiring coming in a future update.':'Cleared.','success');
}
function updateSyncStatus(state,text){
  const dot=document.getElementById('sync-dot');
  const txt=document.getElementById('sync-text');
  if(!dot)return;
  dot.className='sync-dot'+(state==='syncing'?' syncing':state==='offline'?' offline':'');
  txt.textContent=text;
}
