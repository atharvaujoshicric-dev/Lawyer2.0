// ════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════
function escHtml(s){ if(s==null)return'';return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmtD(ds){ if(!ds)return'—';const d=new Date(ds);if(isNaN(d))return ds;return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function fmtDT(ds){ if(!ds)return'—';const d=new Date(ds);if(isNaN(d))return ds;return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}); }
function formatBytes(b){ if(!b)return'0 B';const u=['B','KB','MB','GB'];let i=0;let n=b;while(n>=1024&&i<u.length-1){n/=1024;i++;}return n.toFixed(i?1:0)+' '+u[i]; }
function getDocExt(name){ const ext=(name.split('.').pop()||'').toLowerCase();if(['jpg','jpeg','png','gif','webp'].includes(ext))return'img';if(['xls','xlsx'].includes(ext))return'xlsx';if(['doc','docx'].includes(ext))return'docx';if(ext==='pdf')return'pdf';return ext; }
function fileIcon(name){ const ext=getDocExt(name);return {pdf:'fas fa-file-pdf',docx:'fas fa-file-word',xlsx:'fas fa-file-excel',img:'fas fa-file-image'}[ext]||'fas fa-file-alt'; }
function catBadge(catId){ const cat=S.categories.find(c=>c.id===catId);if(!cat)return`<span class="badge badge-custom">${catId}</span>`;const cls={cyber:'badge-cyber',rental:'badge-rental',general:'badge-general'}[catId]||'badge-custom';return `<span class="badge ${cls}"><i class="${cat.icon}"></i> ${cat.label}</span>`; }
function statusBadge(status){ const map={active:'badge-active',pending:'badge-pending',closed:'badge-inactive'};return `<span class="badge ${map[status]||'badge-inactive'}">${capitalize(status)}</span>`; }
function initials(name){ if(!name)return'?';return name.split(' ').filter(Boolean).slice(0,2).map(n=>n[0].toUpperCase()).join(''); }
function capitalize(s){ if(!s)return'';return s.charAt(0).toUpperCase()+s.slice(1).replace(/_/g,' '); }

function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
function switchTab(tab){
  document.querySelectorAll('.tabs .tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  const idx={overview:0,'case-details':1,payments:2,documents:3,deadlines:4,history:5}[tab];
  const btns=document.querySelectorAll('.tabs .tab-btn');
  if(btns[idx])btns[idx].classList.add('active');
  document.getElementById('tab-'+tab).classList.add('active');
  // Lazy-load deadlines tab when opened
  if(tab==='deadlines'&&S.detailClientId) renderClientDeadlines(S.detailClientId);
}
function showToast(msg,type='info'){
  const cnt=document.getElementById('toast-container');
  const el=document.createElement('div');
  el.className='toast '+type;
  const icon={success:'fa-check-circle',error:'fa-exclamation-circle',warning:'fa-exclamation-triangle',info:'fa-info-circle'}[type]||'fa-info-circle';
  el.innerHTML=`<i class="fas ${icon}"></i><span>${escHtml(msg)}</span>`;
  cnt.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s';el.style.opacity='0';setTimeout(()=>el.remove(),300); },4500);
}

// Close modals when clicking backdrop
document.addEventListener('click',e=>{
  if(e.target.classList.contains('modal-backdrop')) e.target.classList.remove('open');
});

// ════════════════════════════════════════════
//  BOOT
// ════════════════════════════════════════════
// Apply theme immediately (before DOMContentLoaded) to prevent flash
if(typeof initTheme==='function') initTheme();

window.addEventListener('DOMContentLoaded',async ()=>{
  // Re-apply after DOM is ready so injected styles definitely win
  if(typeof initTheme==='function') initTheme();
  // Check for client portal mode first (before normal auth)
  const portalToken = checkPortalMode();
  if(portalToken){
    if(!initSupabase()) return;
    await tryPortalMode(portalToken);
    return;
  }
  captureOneDriveRedirectToken(); // must run before anything else touches the URL hash
  if(!initSupabase())return;
  const {data:{session}}=await sb.auth.getSession();
  if(session){ await afterAuth(); }
  else { document.getElementById('login-screen').style.display='flex'; }

  sb.auth.onAuthStateChange((event)=>{
    if(event==='SIGNED_OUT'){
      document.getElementById('app').style.display='none';
      document.getElementById('login-screen').style.display='flex';
    }
  });

  window.addEventListener('online',()=>updateSyncStatus('synced','Live'));
  window.addEventListener('offline',()=>updateSyncStatus('offline','Offline'));
});