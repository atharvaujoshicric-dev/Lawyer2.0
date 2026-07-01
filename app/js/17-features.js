// ════════════════════════════════════════════
//  CONFLICT OF INTEREST CHECKER
//  Checks if an opposite party name matches
//  any existing client in the firm.
// ════════════════════════════════════════════
function checkConflictOfInterest(oppPartyName){
  if(!oppPartyName||oppPartyName.length<2) return [];
  const query=oppPartyName.toLowerCase().trim();
  return S.clients.filter(c=>{
    // Check client name
    if(c.name.toLowerCase().includes(query)) return true;
    // Check opposite party field in case data
    const opp=(c.case_data?.oppositeParty||'').toLowerCase();
    if(opp&&opp.includes(query)) return true;
    return false;
  });
}

function renderConflictCheck(){
  const val=(document.getElementById('f-conflict-check')?.value||'').trim();
  const cnt=document.getElementById('conflict-results');
  if(!cnt) return;
  if(!val||val.length<2){cnt.innerHTML='';return;}
  const matches=checkConflictOfInterest(val);
  if(!matches.length){
    cnt.innerHTML=`<div style="color:var(--success);font-size:12.5px;display:flex;align-items:center;gap:6px;"><i class="fas fa-check-circle"></i> No conflicts found for "${escHtml(val)}"</div>`;
    return;
  }
  cnt.innerHTML=`<div style="color:var(--danger);font-size:12.5px;margin-bottom:6px;font-weight:600;">
    <i class="fas fa-exclamation-triangle"></i> Potential conflict — "${escHtml(val)}" matches ${matches.length} existing record${matches.length>1?'s':''}:
  </div>`+matches.map(c=>`
    <div style="background:var(--danger-bg);border:1px solid #fed7d7;border-radius:6px;padding:8px 12px;margin-bottom:6px;font-size:12.5px;cursor:pointer;" onclick="viewClient('${c.client_id}')">
      <strong>${escHtml(c.name)}</strong> · ${c.client_id} · ${c.case_type}
      ${c.case_data?.oppositeParty?`<br/><span style="color:var(--text-muted);">Opposite party: ${escHtml(c.case_data.oppositeParty)}</span>`:''}
    </div>`).join('');
}

// ════════════════════════════════════════════
//  AUDIT TRAIL — field-level diffs on client updates
//  Called from saveClient() with old and new payloads.
// ════════════════════════════════════════════
function buildClientDiff(oldClient, newPayload){
  const fields={
    name:'Name', case_type:'Case Type', status:'Status',
    phone:'Phone', email:'Email', address:'Address',
    fee:'Fee', notes:'Notes', assigned_to:'Assigned To'
  };
  const diffs=[];
  Object.entries(fields).forEach(([key,label])=>{
    const oldVal = key==='assigned_to'
      ? (S.users.find(u=>u.id===oldClient[key])?.full_name||oldClient[key]||'—')
      : String(oldClient[key]||'');
    const newVal = key==='assigned_to'
      ? (S.users.find(u=>u.id===newPayload[key])?.full_name||newPayload[key]||'—')
      : String(newPayload[key]||'');
    if(oldVal!==newVal) diffs.push({field:label,from:oldVal,to:newVal});
  });
  return diffs;
}

async function logClientUpdate(clientId, diffs){
  if(!diffs.length) return;
  await sb.from('activity_log').insert({
    actor_id: S.user?.id,
    action:   'client_updated',
    entity_type:'client',
    entity_id:  clientId,
    detail: {
      updated_by: S.profile.full_name,
      changes: diffs
    }
  });
}

// ════════════════════════════════════════════
//  DOCUMENT TEMPLATES WITH VARIABLE FORMS
//  Templates can now define custom variables
//  (beyond {{CLIENT_NAME}} etc.) that show as
//  form fields when "Use" is clicked.
// ════════════════════════════════════════════

// Extend openUseTemplate to show variable fields
function openUseTemplateWithVars(tplId){
  S.activeTemplateId=tplId;
  const t=S.templates.find(x=>x.id===tplId);
  if(!t){ showToast('Template not found.','error'); return; }

  // Client selector
  const sel=document.getElementById('ut-client');
  sel.innerHTML=myClients().map(c=>`<option value="${c.client_id}">${c.name} (${c.client_id})</option>`).join('');

  document.getElementById('ut-title').textContent='Use: '+t.name;

  // Render custom variable fields
  const varCnt=document.getElementById('ut-variable-fields');
  const vars=t.variables||[];
  if(vars.length&&varCnt){
    varCnt.style.display='block';
    varCnt.innerHTML=`<div class="section-divider">Fill in Variables</div>
      <div class="form-grid" style="gap:10px;margin-top:8px;">
        ${vars.map(v=>`
          <div class="form-group">
            <label class="form-label">${escHtml(v.label)}</label>
            ${v.type==='date'
              ?`<input class="form-control" id="ut-var-${v.id}" type="date"/>`
              :v.type==='number'
              ?`<input class="form-control" id="ut-var-${v.id}" type="number"/>`
              :`<input class="form-control" id="ut-var-${v.id}" type="text" placeholder="${escHtml(v.placeholder||'')}"/>`
            }
          </div>`).join('')}
      </div>`;
  } else if(varCnt){
    varCnt.style.display='none';
  }

  previewTemplateWithVars();
  openModal('modal-use-template');
}

function previewTemplateWithVars(){
  const t=S.templates.find(x=>x.id===S.activeTemplateId);
  if(!t) return;
  const clientId=document.getElementById('ut-client').value;
  let content=fillTemplatePlaceholders(t.content,clientId);
  // Fill custom variables
  (t.variables||[]).forEach(v=>{
    const el=document.getElementById(`ut-var-${v.id}`);
    if(el) content=content.replace(new RegExp(`\\{\\{${v.id}\\}\\}`,'g'),el.value||`{{${v.id}}}`);
  });
  document.getElementById('ut-preview').innerHTML=content;
}

// Variable editor in template modal
function addTemplateVariable(){
  const vars=S._editingTemplateVars||[];
  vars.push({id:'var_'+Date.now(),label:'Variable Name',type:'text',placeholder:''});
  S._editingTemplateVars=vars;
  renderTemplateVarEditor();
}
function renderTemplateVarEditor(){
  const cnt=document.getElementById('tpl-variable-editor');
  if(!cnt) return;
  const vars=S._editingTemplateVars||[];
  if(!vars.length){cnt.innerHTML='<p class="text-muted text-sm">No custom variables. Click "Add Variable" to create one.</p>';return;}
  cnt.innerHTML=vars.map((v,i)=>`
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
      <input class="form-control" style="flex:1;min-width:120px;" type="text" value="${escHtml(v.label)}"
        placeholder="Label" onchange="S._editingTemplateVars[${i}].label=this.value"/>
      <input class="form-control" style="width:130px;" type="text" value="${escHtml(v.id)}"
        placeholder="{{placeholder}}" onchange="S._editingTemplateVars[${i}].id=this.value"/>
      <select class="form-control" style="width:90px;" onchange="S._editingTemplateVars[${i}].type=this.value">
        <option value="text" ${v.type==='text'?'selected':''}>Text</option>
        <option value="date" ${v.type==='date'?'selected':''}>Date</option>
        <option value="number" ${v.type==='number'?'selected':''}>Number</option>
      </select>
      <button class="btn btn-danger btn-xs btn-icon" onclick="S._editingTemplateVars.splice(${i},1);renderTemplateVarEditor()">
        <i class="fas fa-times"></i></button>
    </div>`).join('');
}