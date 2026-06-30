
// ════════════════════════════════════════════
//  COURT FILING DEADLINE CALCULATOR
//  Admin-editable rules; auto-computes deadlines
//  for a client based on their case dates.
// ════════════════════════════════════════════
S.deadlineRules = [];

async function loadDeadlineRules(){
  const {data,error} = await sb.from('deadline_rules')
    .select('*').order('category_id').order('offset_days');
  if(!error) S.deadlineRules = data||[];
}

// ── Compute deadlines for a client ───────────────────────────────────────
function computeClientDeadlines(client){
  const data   = client.case_data||{};
  const schema = S.formSchemas[client.case_type]||[];
  const results= [];

  // Build a map of field_id → date value from the client's case data
  const fieldDates = {};
  schema.filter(f=>f.type==='date'&&data[f.id]).forEach(f=>{ fieldDates[f.id]=data[f.id]; });
  // Also include created_at as a trigger source
  if(client.created_at) fieldDates['created_at'] = client.created_at.slice(0,10);

  S.deadlineRules.filter(r=>r.is_active).forEach(rule=>{
    // Rule applies if category matches client's case type, or rule has no category (global)
    const catMatch = !rule.category_id || rule.category_id===client.case_type;
    if(!catMatch) return;

    const triggerDate = fieldDates[rule.trigger_field];
    if(!triggerDate) return;

    const base = parsePlannerDate(triggerDate);
    const offset = rule.offset_direction==='before' ? -rule.offset_days : rule.offset_days;
    const deadline = new Date(base.getTime());
    deadline.setDate(deadline.getDate()+offset);
    const ds = localDateStr(deadline);
    const daysLeft = daysUntil(ds);

    results.push({
      rule, triggerDate, deadline:ds, daysLeft,
      triggerLabel: schema.find(f=>f.id===rule.trigger_field)?.label || rule.trigger_field
    });
  });

  // Sort: overdue first, then by days left
  return results.sort((a,b)=>a.daysLeft-b.daysLeft);
}

// ── Render computed deadlines panel in client detail ─────────────────────
function renderClientDeadlines(clientId){
  const cnt = document.getElementById('tab-deadlines');
  if(!cnt) return;
  const client = S.clients.find(c=>c.client_id===clientId);
  if(!client){ cnt.innerHTML='<p class="text-muted text-sm">Client not found.</p>'; return; }

  const deadlines = computeClientDeadlines(client);
  if(!deadlines.length){
    cnt.innerHTML=`<p class="text-muted text-sm">No applicable deadline rules for this matter.<br/>
      ${isAdmin()?'<span style="color:var(--navy-mid);cursor:pointer;text-decoration:underline;" onclick="closeModal(\'modal-detail\');navigate(\'deadline-rules\')">Configure deadline rules →</span>':''}</p>`;
    return;
  }

  cnt.innerHTML = deadlines.map(d=>{
    const cls = d.daysLeft<0?'urgent':d.daysLeft<=30?'soon':'ok';
    const lbl = d.daysLeft<0?`${Math.abs(d.daysLeft)}d overdue`:d.daysLeft===0?'Today':`${d.daysLeft}d`;
    return `<div class="deadline-item">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13.5px;font-weight:500;">${escHtml(d.rule.rule_name)}</div>
        <div style="font-size:11.5px;color:var(--text-muted);">
          ${d.rule.statute?escHtml(d.rule.statute)+' · ':''}
          Triggered by: ${escHtml(d.triggerLabel)} (${fmtD(d.triggerDate)})
          → Due: ${fmtD(d.deadline)}
        </div>
        ${d.rule.description?`<div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">${escHtml(d.rule.description)}</div>`:''}
      </div>
      <span class="deadline-days ${cls}">${lbl}</span>
    </div>`;
  }).join('');
}

// ── Admin: Deadline Rules management page ────────────────────────────────
function renderDeadlineRulesPage(){
  const cnt = document.getElementById('deadline-rules-list');
  if(!cnt) return;
  if(!S.deadlineRules.length){
    cnt.innerHTML='<div class="empty-state"><i class="fas fa-calendar-times"></i><div class="empty-state-title">No rules yet</div></div>';
    return;
  }
  // Group by category
  const grouped={};
  S.deadlineRules.forEach(r=>{
    const key=r.category_id||'__global__';
    if(!grouped[key]) grouped[key]=[];
    grouped[key].push(r);
  });
  cnt.innerHTML=Object.entries(grouped).map(([catId,rules])=>{
    const cat = S.categories.find(c=>c.id===catId);
    const label = cat?cat.label:catId==='__global__'?'All Categories':'Unknown';
    return `<div style="margin-bottom:20px;">
      <div class="section-divider">${escHtml(label)}</div>
      ${rules.map(r=>`
        <div class="user-list-item" style="${!r.is_active?'opacity:.5':''}">
          <div class="user-list-item-info">
            <div class="user-list-item-name">${escHtml(r.rule_name)}
              ${r.statute?`<span style="font-size:11px;color:var(--text-muted);font-weight:400;"> · ${escHtml(r.statute)}</span>`:''}
            </div>
            <div class="user-list-item-meta">
              ${r.offset_days}d ${r.offset_direction} "${r.trigger_field}"
              ${r.description?'· '+escHtml(r.description):''}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button class="btn btn-outline btn-sm"
              onclick="openDeadlineRuleModal('${r.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn ${r.is_active?'btn-outline':'btn-success'} btn-sm"
              onclick="toggleDeadlineRule('${r.id}',${!r.is_active})">
              ${r.is_active?'Disable':'Enable'}</button>
            <button class="btn btn-danger btn-sm"
              onclick="deleteDeadlineRule('${r.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('')}
    </div>`;
  }).join('');
}

function openDeadlineRuleModal(ruleId=null){
  const r = ruleId ? S.deadlineRules.find(x=>x.id===ruleId) : null;
  S.editingDeadlineRuleId = ruleId;
  document.getElementById('dr-modal-title').textContent = r?'Edit Deadline Rule':'New Deadline Rule';
  // Build category options
  const catSel = document.getElementById('dr-category');
  catSel.innerHTML = '<option value="">All Categories</option>'+
    S.categories.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
  if(r){
    document.getElementById('dr-name').value         = r.rule_name||'';
    document.getElementById('dr-statute').value      = r.statute||'';
    document.getElementById('dr-trigger').value      = r.trigger_field||'';
    document.getElementById('dr-days').value         = r.offset_days||30;
    document.getElementById('dr-direction').value    = r.offset_direction||'after';
    document.getElementById('dr-description').value  = r.description||'';
    catSel.value = r.category_id||'';
  } else {
    ['dr-name','dr-statute','dr-trigger','dr-description'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    document.getElementById('dr-days').value = 30;
    document.getElementById('dr-direction').value = 'after';
  }
  openModal('modal-deadline-rule');
}

async function saveDeadlineRule(){
  const name=(document.getElementById('dr-name').value||'').trim();
  if(!name){showToast('Rule name is required.','error');return;}
  const payload={
    firm_id:        S.profile.firm_id,
    rule_name:      name,
    statute:        document.getElementById('dr-statute').value||null,
    category_id:    document.getElementById('dr-category').value||null,
    trigger_field:  document.getElementById('dr-trigger').value||'created_at',
    offset_days:    parseInt(document.getElementById('dr-days').value)||30,
    offset_direction:document.getElementById('dr-direction').value||'after',
    description:    document.getElementById('dr-description').value||null,
    updated_at:     new Date().toISOString()
  };
  if(S.editingDeadlineRuleId){
    const {error}=await sb.from('deadline_rules').update(payload).eq('id',S.editingDeadlineRuleId);
    if(error){showToast('Save failed: '+error.message,'error');return;}
  } else {
    payload.created_by=S.user.id;
    const {error}=await sb.from('deadline_rules').insert(payload);
    if(error){showToast('Save failed: '+error.message,'error');return;}
  }
  closeModal('modal-deadline-rule');
  await loadDeadlineRules();
  renderDeadlineRulesPage();
  showToast('Rule saved.','success');
}

async function toggleDeadlineRule(id,active){
  const {error}=await sb.from('deadline_rules').update({is_active:active}).eq('id',id);
  if(error){showToast('Failed.','error');return;}
  await loadDeadlineRules(); renderDeadlineRulesPage();
}
async function deleteDeadlineRule(id){
  if(!confirm('Delete this rule?')) return;
  const {error}=await sb.from('deadline_rules').delete().eq('id',id);
  if(error){showToast('Delete failed.','error');return;}
  await loadDeadlineRules(); renderDeadlineRulesPage();
  showToast('Rule deleted.','warning');
}
