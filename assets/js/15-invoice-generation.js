// ════════════════════════════════════════════
//  INVOICE GENERATION  (jsPDF, browser-only)
//  Generates a professional PDF invoice from
//  the client's fee ledger + firm settings.
// ════════════════════════════════════════════
S.invoiceSettings = null;

async function loadInvoiceSettings(){
  const {data} = await sb.from('invoice_settings').select('*').limit(1).maybeSingle();
  S.invoiceSettings = data;
}

async function generateInvoice(clientId){
  if(!S.invoiceSettings) await loadInvoiceSettings();
  const client = S.clients.find(c=>c.client_id===clientId);
  if(!client){ showToast('Client not found.','error'); return; }

  // Fetch payments
  const {data:payments} = await sb.from('payments')
    .select('*').eq('client_id',clientId).order('payment_date',{ascending:true});

  const firm = S.invoiceSettings || {};
  const paid  = (payments||[]).reduce((s,p)=>s+Number(p.amount||0),0);
  const fee   = Number(client.fee||0);
  const bal   = Math.max(0,fee-paid);
  const invNum= `${firm.invoice_prefix||'INV'}-${String(firm.next_number||1).padStart(4,'0')}`;

  // Build invoice HTML and use print dialog as PDF
  const cat   = S.categories.find(c=>c.id===client.case_type);
  const au    = S.users.find(u=>u.id===client.assigned_to);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#1a1a2e;padding:40px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #0f1e3c;}
    .firm-name{font-size:24px;font-weight:700;color:#0f1e3c;}
    .firm-details{font-size:11px;color:#666;margin-top:4px;line-height:1.6;}
    .inv-meta{text-align:right;}
    .inv-title{font-size:20px;font-weight:700;color:#c9a84c;letter-spacing:2px;}
    .inv-number{font-size:13px;color:#0f1e3c;font-weight:600;margin-top:4px;}
    .inv-date{font-size:11px;color:#666;margin-top:2px;}
    .client-box{background:#f7f8fc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px;}
    .client-box-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a0aec0;font-weight:600;margin-bottom:8px;}
    .client-name{font-size:16px;font-weight:700;}
    .client-meta{font-size:11.5px;color:#4a5568;margin-top:4px;line-height:1.7;}
    table{width:100%;border-collapse:collapse;margin-bottom:20px;}
    thead th{background:#0f1e3c;color:#fff;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.7px;}
    tbody tr:nth-child(even){background:#f7f8fc;}
    tbody td{padding:10px 14px;border-bottom:1px solid #edf2f7;font-size:12.5px;}
    .total-block{display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-bottom:24px;}
    .total-row{display:flex;gap:48px;font-size:13px;}
    .total-row .label{color:#4a5568;min-width:120px;text-align:right;}
    .total-row .value{font-weight:600;min-width:100px;text-align:right;}
    .total-row.outstanding .value{color:#c53030;font-size:15px;}
    .footer{border-top:1px solid #e2e8f0;padding-top:16px;font-size:11px;color:#718096;text-align:center;margin-top:32px;}
    @media print{body{padding:20px;}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="firm-name">${escHtml(firm.firm_name||'Law Firm')}</div>
      <div class="firm-details">
        ${firm.firm_address?escHtml(firm.firm_address)+'<br/>':''}
        ${firm.firm_phone?'Tel: '+escHtml(firm.firm_phone)+'<br/>':''}
        ${firm.firm_email?escHtml(firm.firm_email)+'<br/>':''}
        ${firm.bar_number?'Bar No: '+escHtml(firm.bar_number):''}
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-title">INVOICE</div>
      <div class="inv-number">${escHtml(invNum)}</div>
      <div class="inv-date">Date: ${fmtD(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="client-box">
    <div class="client-box-title">Bill To</div>
    <div class="client-name">${escHtml(client.name)}</div>
    <div class="client-meta">
      Client ID: ${client.client_id}<br/>
      Matter: ${cat?escHtml(cat.label):client.case_type}<br/>
      ${client.email?'Email: '+escHtml(client.email)+'<br/>':''}
      ${client.phone?'Phone: '+escHtml(client.phone):''}
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th>Amount (₹)</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Legal Services — ${cat?escHtml(cat.label):client.case_type}<br/>
          <span style="font-size:11px;color:#718096;">Assigned to: ${au?escHtml(au.full_name):'—'}</span>
        </td>
        <td style="font-weight:600;">${fee>0?'₹'+fee.toLocaleString('en-IN'):'—'}</td>
      </tr>
    </tbody>
  </table>

  ${(payments||[]).length ? `
  <table>
    <thead>
      <tr><th>Payment Date</th><th>Method</th><th>Reference</th><th>Amount (₹)</th></tr>
    </thead>
    <tbody>
      ${(payments||[]).map(p=>`
        <tr>
          <td>${fmtD(p.payment_date)}</td>
          <td>${escHtml(p.method||'—')}</td>
          <td>${p.note?escHtml(p.note):'—'}</td>
          <td style="font-weight:600;color:#276749;">₹${Number(p.amount).toLocaleString('en-IN')}</td>
        </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <div class="total-block">
    <div class="total-row"><span class="label">Total Fee:</span><span class="value">₹${fee.toLocaleString('en-IN')}</span></div>
    <div class="total-row"><span class="label">Total Paid:</span><span class="value" style="color:#276749;">₹${paid.toLocaleString('en-IN')}</span></div>
    <div class="total-row outstanding"><span class="label" style="font-weight:700;">Balance Due:</span><span class="value">₹${bal.toLocaleString('en-IN')}</span></div>
  </div>

  <div class="footer">${escHtml(firm.footer_text||'Thank you for your trust.')}</div>
  </body></html>`;

  // Open in new window and trigger print-to-PDF
  const win = window.open('','_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(), 600);

  // Increment invoice number in DB (fire and forget)
  if(S.invoiceSettings?.id){
    sb.from('invoice_settings').update({next_number:(firm.next_number||1)+1}).eq('id',S.invoiceSettings.id);
    if(S.invoiceSettings) S.invoiceSettings.next_number = (firm.next_number||1)+1;
  }
}

// ── Invoice settings save (in Settings page) ─────────────────────────────
async function saveInvoiceSettings(){
  const payload = {
    firm_name:      document.getElementById('inv-firm-name')?.value||'Law Firm',
    firm_address:   document.getElementById('inv-firm-address')?.value||null,
    firm_phone:     document.getElementById('inv-firm-phone')?.value||null,
    firm_email:     document.getElementById('inv-firm-email')?.value||null,
    bar_number:     document.getElementById('inv-bar-number')?.value||null,
    footer_text:    document.getElementById('inv-footer')?.value||null,
    invoice_prefix: document.getElementById('inv-prefix')?.value||'INV',
    updated_at:     new Date().toISOString()
  };
  if(S.invoiceSettings?.id){
    const {error}=await sb.from('invoice_settings').update(payload).eq('id',S.invoiceSettings.id);
    if(error){showToast('Save failed: '+error.message,'error');return;}
  } else {
    const {data,error}=await sb.from('invoice_settings').insert(payload).select().single();
    if(error){showToast('Save failed: '+error.message,'error');return;}
    S.invoiceSettings=data;
  }
  showToast('Invoice settings saved.','success');
}

function loadInvoiceSettingsUI(){
  if(!S.invoiceSettings) return;
  const f=S.invoiceSettings;
  ['firm-name','firm-address','firm-phone','firm-email','bar-number','footer','prefix'].forEach(k=>{
    const el=document.getElementById(`inv-${k}`);
    const fk=k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    if(el) el.value=f[fk]||'';
  });
}
