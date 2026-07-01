// ════════════════════════════════════════════
//  FINANCES — firm-wide fee tracker
// ════════════════════════════════════════════
S.finPayments = S.finPayments || [];
S.finExpanded = S.finExpanded || {};

// ── Main loader (fetches fresh from DB) ──────────────────────────────────
async function renderFinances(){
  const {data:allPayments, error} = await sb.from('payments')
    .select('*').order('payment_date',{ascending:false});
  if(error){ showToast('Could not load payments: '+error.message,'error'); return; }
  S.finPayments = allPayments||[];
  const search  = (document.getElementById('fin-search')?.value||'').toLowerCase();
  const statusF = document.getElementById('fin-filter-status')?.value||'';
  renderFinancesFromCache(search, statusF);
}

// ── Renderer (uses cached data, instant re-render on expand/collapse) ─────
function renderFinancesFromCache(search='', statusF=''){
  // Group payments by client_id
  const payMap = {};
  S.finPayments.forEach(p=>{
    if(!payMap[p.client_id]) payMap[p.client_id]=[];
    payMap[p.client_id].push(p);
  });

  // Filter clients
  const clients = myClients().filter(c=>{
    if(search && !c.name.toLowerCase().includes(search) &&
                 !c.client_id.toLowerCase().includes(search)) return false;
    if(statusF){
      const paid = (payMap[c.client_id]||[]).reduce((s,p)=>s+Number(p.amount||0), 0);
      const fee  = Number(c.fee||0);
      const badge= fee<=0?'unpaid': paid>=fee?'paid': paid>0?'partial':'unpaid';
      if(badge!==statusF) return false;
    }
    return true;
  });

  // Totals
  const totalFee  = clients.reduce((s,c)=>s+Number(c.fee||0), 0);
  const totalPaid = clients.reduce((s,c)=>{
    return s+(payMap[c.client_id]||[]).reduce((ps,p)=>ps+Number(p.amount||0), 0);
  }, 0);
  const totalOut  = Math.max(0, totalFee-totalPaid);
  const partialCount = clients.filter(c=>{
    const p=(payMap[c.client_id]||[]).reduce((s,x)=>s+Number(x.amount||0),0);
    return Number(c.fee||0)>p && Number(c.fee||0)>0;
  }).length;

  // ── Summary cards ────────────────────────────────────────────────────
  const summary = document.getElementById('fin-summary-cards');
  if(summary) summary.innerHTML=`
    <div class="fin-summary-grid">
      <div class="stat-card gold fin-stat">
        <div class="stat-label">Total Fees Quoted</div>
        <div class="stat-value">₹${totalFee.toLocaleString('en-IN')}</div>
        <div class="stat-sub">${clients.length} client${clients.length!==1?'s':''}</div>
        <i class="fas fa-file-invoice stat-icon"></i>
      </div>
      <div class="stat-card green fin-stat">
        <div class="stat-label">Total Collected</div>
        <div class="stat-value">₹${totalPaid.toLocaleString('en-IN')}</div>
        <div class="stat-sub">${totalFee>0?Math.round(totalPaid/totalFee*100)+'% of quoted':'—'}</div>
        <i class="fas fa-check-circle stat-icon"></i>
      </div>
      <div class="stat-card red fin-stat">
        <div class="stat-label">Outstanding Balance</div>
        <div class="stat-value">₹${totalOut.toLocaleString('en-IN')}</div>
        <div class="stat-sub">${partialCount} client${partialCount!==1?'s':''} with balance due</div>
        <i class="fas fa-exclamation-circle stat-icon"></i>
      </div>
    </div>`;

  // ── Client rows ──────────────────────────────────────────────────────
  const cnt = document.getElementById('fin-client-list');
  if(!cnt) return;
  if(!clients.length){
    cnt.innerHTML='<div class="empty-state"><i class="fas fa-money-bill-wave"></i><div class="empty-state-title">No clients match your filter</div></div>';
    return;
  }

  cnt.innerHTML = clients.map(c=>{
    const payments = payMap[c.client_id]||[];
    const paid     = payments.reduce((s,p)=>s+Number(p.amount||0), 0);
    const fee      = Number(c.fee||0);
    const balance  = Math.max(0, fee-paid);
    const pct      = fee>0 ? Math.min(100,Math.round(paid/fee*100)) : 0;
    const badge    = fee<=0?'unpaid': paid>=fee?'paid': paid>0?'partial':'unpaid';
    const badgeCls = {paid:'fin-badge-paid',partial:'fin-badge-partial',unpaid:'fin-badge-unpaid'}[badge];
    const badgeTxt = {paid:'Paid in Full',partial:'Partial Payment',unpaid:'No Payment Yet'}[badge];
    const cat      = S.categories.find(x=>x.id===c.case_type);
    const au       = S.users.find(u=>u.id===c.assigned_to);
    const isExp    = S.finExpanded[c.client_id];
    const canRecord= isAdmin()||c.assigned_to===S.user?.id;

    // NOTE: client name goes in a data attribute to avoid quote injection in onclick
    let html = `
      <div class="fin-client-row ${isExp?'expanded':''}"
           data-cid="${c.client_id}" onclick="toggleFinRow('${c.client_id}')">
        <div class="avatar-sm av-navy">${initials(c.name)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;">${escHtml(c.name)}
            <span class="client-id">${c.client_id}</span>
          </div>
          <div style="font-size:11.5px;color:var(--text-muted);">
            ${cat?cat.label:c.case_type} · ${au?au.full_name:'Unassigned'}
          </div>
        </div>
        <div class="fin-progress-wrap" style="max-width:180px;">
          <div class="fin-progress-label">
            <span>₹${paid.toLocaleString('en-IN')} paid</span>
            <span>${pct}%</span>
          </div>
          <div class="progress">
            <div class="progress-bar" style="width:${pct}%;background:${
              badge==='paid'?'var(--gold)':badge==='partial'?'#ed8936':'var(--border)'};"></div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
            ${fee>0
              ?`of ₹${fee.toLocaleString('en-IN')} · Balance ₹${balance.toLocaleString('en-IN')}`
              :'No fee set'}
          </div>
        </div>
        <span class="${badgeCls}">${badgeTxt}</span>
        <i class="fas fa-chevron-${isExp?'up':'down'}"
           style="color:var(--text-muted);margin-left:8px;flex-shrink:0;"></i>
      </div>`;

    if(isExp){
      html += `<div class="fin-ledger">`;
      if(payments.length){
        html += payments.map(p=>{
          const recorder = S.users.find(u=>u.id===p.recorded_by);
          return `<div class="fin-ledger-row">
            <i class="fas fa-receipt" style="color:var(--success);width:16px;flex-shrink:0;"></i>
            <span style="font-weight:600;color:var(--success);min-width:100px;">
              ₹${Number(p.amount).toLocaleString('en-IN')}
            </span>
            <span style="color:var(--text-muted);min-width:90px;">${fmtD(p.payment_date)}</span>
            <span class="badge badge-active" style="font-size:10px;">${p.method||'—'}</span>
            ${p.note?`<span style="color:var(--text-secondary);font-size:12px;flex:1;">${escHtml(p.note)}</span>`:'<span style="flex:1;"></span>'}
            <span style="font-size:11px;color:var(--text-muted);">
              by ${recorder?recorder.full_name:'—'}
            </span>
            ${canRecord?`<button class="btn btn-outline btn-xs btn-icon" style="margin-left:8px;"
              onclick="event.stopPropagation();finDeletePayment('${p.id}','${c.client_id}')"
              title="Delete"><i class="fas fa-trash"></i></button>`:''}
          </div>`;
        }).join('');
      } else {
        html += `<p class="text-muted text-sm" style="padding:6px 0;">No payments recorded yet.</p>`;
      }
      if(canRecord){
        // Use data attribute to avoid quote injection — handler reads it back
        html += `
          <div style="margin-top:10px;">
            <button class="btn btn-gold btn-sm"
              data-cid="${c.client_id}"
              onclick="event.stopPropagation();finOpenPayment(this)">
              <i class="fas fa-plus"></i> Record Payment
            </button>
          </div>`;
      }
      html += `</div>`;
    }
    return html;
  }).join('');
}

// ── Row toggle ───────────────────────────────────────────────────────────
function toggleFinRow(clientId){
  S.finExpanded[clientId] = !S.finExpanded[clientId];
  const search  = (document.getElementById('fin-search')?.value||'').toLowerCase();
  const statusF = document.getElementById('fin-filter-status')?.value||'';
  renderFinancesFromCache(search, statusF);
}

// ── Open payment modal — reads client ID from button's data attribute ────
// Using data attributes avoids any HTML entity / quote injection bugs.
function finOpenPayment(btn){
  const clientId = btn.dataset.cid;
  if(!clientId){ showToast('Could not identify client.','error'); return; }
  const client   = S.clients.find(c=>c.client_id===clientId);
  openPaymentModal(clientId);
  // Update the modal subtitle with the client name
  const sub = document.getElementById('pay-client-name');
  if(sub && client) sub.textContent = `${client.name} (${clientId})`;
}

// ── Delete a payment ────────────────────────────────────────────────────
async function finDeletePayment(paymentId, clientId){
  if(!confirm('Delete this payment entry? This cannot be undone.')) return;
  const {error} = await sb.from('payments').delete().eq('id',paymentId);
  if(error){ showToast('Delete failed: '+error.message,'error'); return; }
  S.finPayments = S.finPayments.filter(p=>p.id!==paymentId);
  showToast('Payment entry removed.','warning');
  const search  = (document.getElementById('fin-search')?.value||'').toLowerCase();
  const statusF = document.getElementById('fin-filter-status')?.value||'';
  renderFinancesFromCache(search, statusF);
}
