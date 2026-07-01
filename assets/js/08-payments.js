// ════════════════════════════════════════════
//  FEE LEDGER (Payments) — multiple dated entries per case,
//  with a running balance against the quoted Total Fee.
// ════════════════════════════════════════════
S.paymentsCache=S.paymentsCache||{}; // client_id -> array of payment rows, loaded on demand

async function renderPaymentsTab(clientId){
  const cnt=document.getElementById('tab-payments');
  if(!cnt)return;
  cnt.innerHTML='<p class="text-muted text-sm"><i class="fas fa-spinner fa-spin"></i> Loading payment history…</p>';

  const {data,error}=await sb.from('payments').select('*').eq('client_id',clientId).order('payment_date',{ascending:false});
  if(error){ cnt.innerHTML=`<p class="text-muted text-sm">Could not load payments: ${escHtml(error.message)}</p>`; return; }
  S.paymentsCache[clientId]=data||[];
  renderPaymentsTabFromCache(clientId);
}

function renderPaymentsTabFromCache(clientId){
  const cnt=document.getElementById('tab-payments');
  if(!cnt)return;
  const c=S.clients.find(x=>x.client_id===clientId);
  const payments=S.paymentsCache[clientId]||[];
  const totalFee=Number(c?.fee||0);
  const totalPaid=payments.reduce((sum,p)=>sum+Number(p.amount||0),0);
  const balance=totalFee-totalPaid;
  const canRecord=isAdmin()||c?.assigned_to===S.user?.id;

  let html=`<div class="fee-summary-grid">
    <div class="fee-summary-box"><div class="label">Total Fee</div><div class="value">${totalFee?'₹'+totalFee.toLocaleString('en-IN'):'—'}</div></div>
    <div class="fee-summary-box paid"><div class="label">Paid So Far</div><div class="value">₹${totalPaid.toLocaleString('en-IN')}</div></div>
    <div class="fee-summary-box ${balance>0?'balance-due':''}"><div class="label">Balance Due</div><div class="value">${totalFee?'₹'+Math.max(balance,0).toLocaleString('en-IN'):'—'}</div></div>
  </div>`;

  if(canRecord){
    html+=`<button class="btn btn-gold btn-sm mb-3" onclick="openPaymentModal('${clientId}')"><i class="fas fa-plus"></i> Record Payment</button>`;
  }

  if(!payments.length){
    html+=`<p class="text-muted text-sm">No payments recorded yet.</p>`;
  } else {
    html+='<div>'+payments.map(p=>{
      const recorder=S.users.find(u=>u.id===p.recorded_by);
      const canDelete=isAdmin()||p.recorded_by===S.user?.id;
      return `<div class="payment-row">
        <div class="payment-row-info">
          <span class="payment-row-amount">+ ₹${Number(p.amount).toLocaleString('en-IN')}</span>
          <span class="payment-row-meta">${fmtD(p.payment_date)} · ${p.method||'Unspecified'}${p.note?' · '+escHtml(p.note):''} · recorded by ${recorder?recorder.full_name:'—'}</span>
        </div>
        ${canDelete?`<button class="btn btn-outline btn-xs btn-icon" onclick="deletePayment('${p.id}','${clientId}')" title="Delete"><i class="fas fa-trash"></i></button>`:''}
      </div>`;
    }).join('')+'</div>';
  }
  cnt.innerHTML=html;
}

function openPaymentModal(clientId){
  const c=S.clients.find(x=>x.client_id===clientId);
  S.payingClientId=clientId;
  document.getElementById('pay-client-name').textContent=c?`${c.name} (${c.client_id})`:clientId;
  document.getElementById('pay-amount').value='';
  document.getElementById('pay-date').value=new Date().toISOString().slice(0,10);
  document.getElementById('pay-method').value='Cash';
  document.getElementById('pay-note').value='';
  openModal('modal-payment');
}

async function savePayment(){
  const clientId=S.payingClientId;
  if(!clientId)return;
  const amount=Number(document.getElementById('pay-amount').value||0);
  const date=document.getElementById('pay-date').value;
  if(!amount||amount<=0){showToast('Enter a valid amount greater than zero.','error');return;}
  if(!date){showToast('Payment date is required.','error');return;}
  const payload={
    client_id:clientId,amount,payment_date:date,
    method:document.getElementById('pay-method').value,
    note:document.getElementById('pay-note').value||null,
    recorded_by:S.user.id
  };
  const {data:inserted, error}=await sb.from('payments').insert(payload).select().single();
  if(error){showToast('Could not record payment: '+error.message,'error');return;}
  closeModal('modal-payment');
  showToast('Payment recorded.','success');
  // Add to local cache immediately so both views update without another DB call
  if(inserted){
    S.finPayments = [inserted, ...(S.finPayments||[])];
    S.paymentsCache[clientId] = [inserted, ...(S.paymentsCache[clientId]||[])];
  }
  await renderPaymentsTab(clientId);
  // If the Finances page is open, refresh from cache (instant, no extra DB call)
  if(document.getElementById('view-finances')?.classList.contains('active')){
    const search  = (document.getElementById('fin-search')?.value||'').toLowerCase();
    const statusF = document.getElementById('fin-filter-status')?.value||'';
    renderFinancesFromCache(search, statusF);
  }
}

async function deletePayment(paymentId,clientId){
  if(!confirm('Delete this payment entry? This cannot be undone.'))return;
  const {error}=await sb.from('payments').delete().eq('id',paymentId);
  if(error){showToast('Delete failed: '+error.message,'error');return;}
  showToast('Payment entry removed.','warning');
  await renderPaymentsTab(clientId);
}
