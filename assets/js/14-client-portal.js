
// ════════════════════════════════════════════
//  CLIENT PORTAL  (magic link + PIN)
//  The portal is a separate mode that renders on top of everything
//  when ?portal=TOKEN is in the URL hash. The client sees their own
//  case info, upcoming hearings/deadlines, payments, and documents.
//  No Supabase auth needed — token + PIN gate access.
// ════════════════════════════════════════════
S.portalData = null;   // set when portal is active

// ── Check URL hash for portal token on load ─────────────────────────────
function checkPortalMode(){
  const hash = window.location.hash;
  const m = hash.match(/[#&]portal=([a-f0-9-]+)/i);
  return m ? m[1] : null;
}

// ── Portal entry point (called from boot before normal auth) ─────────────
async function tryPortalMode(token){
  // Show portal login screen
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  const ps = document.getElementById('portal-screen');
  if(ps) ps.style.display = 'flex';
  // Store token for use after PIN entry
  S._portalToken = token;
}

async function portalLogin(){
  const pin = (document.getElementById('portal-pin').value||'').trim();
  const errEl = document.getElementById('portal-err');
  errEl.style.display = 'none';
  if(!pin || pin.length !== 4){ errEl.textContent='Enter your 4-digit PIN.'; errEl.style.display='block'; return; }

  // Hash the PIN client-side (SHA-256 hex) to compare against DB
  const pinHash = await sha256hex(pin);

  // Look up token — public read policy allows this without auth
  const {data:row, error} = await sb.from('portal_tokens')
    .select('*, clients(*)')
    .eq('token', S._portalToken)
    .eq('pin_hash', pinHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if(error || !row){
    errEl.textContent = 'Invalid PIN or link has expired. Please contact your lawyer.';
    errEl.style.display = 'block';
    return;
  }

  S.portalData = { token: row, client: row.clients };
  renderPortal(row.clients);
}

async function sha256hex(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

// ── Render the portal view ────────────────────────────────────────────────
async function renderPortal(client){
  document.getElementById('portal-screen').style.display = 'none';
  const pv = document.getElementById('portal-view');
  if(!pv) return;
  pv.style.display = 'flex';

  // Fetch payments for this client (public read ok since token verified)
  const {data:payments} = await sb.from('payments')
    .select('*').eq('client_id', client.client_id).order('payment_date',{ascending:false});

  // Fetch documents (only names + sizes, not signed URLs yet)
  const {data:docs} = await sb.from('documents')
    .select('id,name,size,uploaded_at,mime_type').eq('client_id', client.client_id)
    .order('uploaded_at',{ascending:false});

  const paid = (payments||[]).reduce((s,p)=>s+Number(p.amount||0),0);
  const fee  = Number(client.fee||0);
  const bal  = Math.max(0,fee-paid);

  pv.innerHTML = `
    <div style="max-width:700px;width:100%;margin:auto;padding:24px 16px;">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--navy);">
          Lex<span style="color:var(--gold);">Desk</span>
        </div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">Client Portal</div>
      </div>

      <div class="card mb-4">
        <div class="card-header"><span class="card-title">Your Matter</span></div>
        <div class="card-body">
          <div class="detail-meta-grid">
            <div class="detail-meta-item"><div class="detail-meta-label">Client ID</div><div class="detail-meta-value">${client.client_id}</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Name</div><div class="detail-meta-value">${escHtml(client.name)}</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Status</div><div class="detail-meta-value">${statusBadge(client.status)}</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Case Type</div><div class="detail-meta-value">${client.case_type||'—'}</div></div>
          </div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header"><span class="card-title">Fee Summary</span></div>
        <div class="card-body">
          <div class="fin-summary-grid" style="margin-bottom:0;">
            <div class="stat-card gold" style="min-height:80px;">
              <div class="stat-label">Total Fee</div>
              <div class="stat-value" style="font-size:20px;">${fee?'₹'+fee.toLocaleString('en-IN'):'Not set'}</div>
            </div>
            <div class="stat-card green" style="min-height:80px;">
              <div class="stat-label">Paid</div>
              <div class="stat-value" style="font-size:20px;">₹${paid.toLocaleString('en-IN')}</div>
            </div>
            <div class="stat-card ${bal>0?'red':'green'}" style="min-height:80px;">
              <div class="stat-label">Balance Due</div>
              <div class="stat-value" style="font-size:20px;">${fee?'₹'+bal.toLocaleString('en-IN'):'—'}</div>
            </div>
          </div>
          ${(payments||[]).length ? `
            <div style="margin-top:16px;">
              <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:8px;">Payment History</div>
              ${(payments||[]).map(p=>`
                <div class="fin-ledger-row">
                  <i class="fas fa-receipt" style="color:var(--success);width:16px;"></i>
                  <span style="font-weight:600;color:var(--success);">₹${Number(p.amount).toLocaleString('en-IN')}</span>
                  <span style="color:var(--text-muted);">${fmtD(p.payment_date)}</span>
                  <span class="badge badge-active" style="font-size:10px;">${p.method||'—'}</span>
                  ${p.note?`<span style="font-size:12px;color:var(--text-secondary);">${escHtml(p.note)}</span>`:''}
                </div>`).join('')}
            </div>` : ''}
        </div>
      </div>

      ${(docs||[]).length ? `
        <div class="card mb-4">
          <div class="card-header"><span class="card-title">Your Documents</span></div>
          <div class="card-body">
            <div class="file-list">
              ${(docs||[]).map(d=>`
                <div class="file-item" style="cursor:default;">
                  <i class="${fileIcon(d.name)}" style="font-size:18px;color:var(--navy-mid);"></i>
                  <span class="file-item-name">${escHtml(d.name)}</span>
                  <span class="file-item-size">${formatBytes(d.size)}</span>
                  <span style="font-size:11px;color:var(--text-muted);">${fmtD(d.uploaded_at)}</span>
                </div>`).join('')}
            </div>
          </div>
        </div>` : ''}

      <p style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:24px;">
        This portal is provided by your lawyer. For queries, please contact your legal team directly.
        <br>This link expires ${fmtD(S.portalData?.token?.expires_at)}.
      </p>
    </div>`;
}

// ── Admin: generate portal link for a client ─────────────────────────────
async function generatePortalLink(clientId){
  // Generate random 4-digit PIN
  const pin = String(Math.floor(1000+Math.random()*9000));
  const pinHash = await sha256hex(pin);

  // Deactivate old token if exists
  await sb.from('portal_tokens').delete().eq('client_id',clientId);

  // Insert new token
  const {data:row, error} = await sb.from('portal_tokens')
    .insert({client_id:clientId, pin_hash:pinHash, created_by:S.user.id})
    .select().single();
  if(error){ showToast('Failed to generate portal link: '+error.message,'error'); return; }

  const baseUrl = window.location.href.split('#')[0];
  const link = `${baseUrl}#portal=${row.token}`;

  // Show in a modal
  document.getElementById('portal-link-url').value = link;
  document.getElementById('portal-link-pin').textContent = pin;
  openModal('modal-portal-link');
}

function copyPortalLink(){
  const url = document.getElementById('portal-link-url').value;
  const pin = document.getElementById('portal-link-pin').textContent;
  navigator.clipboard.writeText(`Portal Link: ${url}\nPIN: ${pin}`).then(()=>showToast('Link and PIN copied!','success'));
}
