// ════════════════════════════════════════════
//  ONEDRIVE SYNC (Microsoft Graph, personal OneDrive)
//  Uses the OAuth 2.0 implicit flow against Microsoft's "consumers"
//  endpoint (works for personal Microsoft accounts, no Azure tenant
//  needed) — same shape as the existing Google Drive integration.
//  Until a Client ID is saved, all of this stays inert and the app
//  keeps using Supabase Storage as the file backend.
// ════════════════════════════════════════════
const ONEDRIVE_SCOPES='Files.ReadWrite.All offline_access User.Read';
const ONEDRIVE_TOKEN_KEY='ld_onedrive_token'; // {access_token, expires_at}

function getOneDriveClientId(){ return localStorage.getItem('ld_onedrive_client_id')||''; }
function getOneDriveToken(){
  try{
    const raw=JSON.parse(localStorage.getItem(ONEDRIVE_TOKEN_KEY)||'null');
    if(!raw||!raw.access_token)return null;
    if(raw.expires_at&&Date.now()>raw.expires_at)return null; // expired
    return raw;
  }catch{ return null; }
}
function isOneDriveConnected(){ return !!getOneDriveToken(); }

function connectOneDrive(){
  const clientId=getOneDriveClientId();
  if(!clientId){ showToast('Save your Azure Client ID first.','error'); return; }
  const redirectUri=window.location.origin+window.location.pathname;
  const params=new URLSearchParams({
    client_id:clientId,
    response_type:'token',
    redirect_uri:redirectUri,
    scope:ONEDRIVE_SCOPES,
    response_mode:'fragment',
    state:'lexdesk_onedrive_connect'
  });
  window.location.href=`https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params.toString()}`;
}

function disconnectOneDrive(){
  if(!confirm('Disconnect OneDrive? Files already uploaded there will stay in your OneDrive, but LexDesk will stop syncing new ones until you reconnect.'))return;
  localStorage.removeItem(ONEDRIVE_TOKEN_KEY);
  updateOneDriveStatusUI();
  showToast('OneDrive disconnected.','warning');
}

// Captures the access_token from the URL fragment after Microsoft redirects
// back, then cleans the URL so the token isn't left sitting in the address bar.
function captureOneDriveRedirectToken(){
  if(!window.location.hash||!window.location.hash.includes('access_token'))return;
  const params=new URLSearchParams(window.location.hash.substring(1));
  if(params.get('state')!=='lexdesk_onedrive_connect')return;
  const accessToken=params.get('access_token');
  const expiresIn=Number(params.get('expires_in')||3600);
  if(accessToken){
    localStorage.setItem(ONEDRIVE_TOKEN_KEY,JSON.stringify({access_token:accessToken,expires_at:Date.now()+expiresIn*1000}));
    showToast('OneDrive connected!','success');
  }
  history.replaceState(null,'',window.location.pathname+window.location.search);
}

function updateOneDriveStatusUI(){
  const titleEl=document.getElementById('onedrive-status-title');
  const subEl=document.getElementById('onedrive-status-sub');
  const connectBtn=document.getElementById('onedrive-connect-btn');
  const disconnectBtn=document.getElementById('onedrive-disconnect-btn');
  if(!titleEl)return;
  if(isOneDriveConnected()){
    titleEl.textContent='Connected';
    subEl.textContent='Files can now sync to your personal OneDrive.';
    if(connectBtn) connectBtn.style.display='none';
    if(disconnectBtn) disconnectBtn.style.display='block';
  } else if(getOneDriveClientId()){
    titleEl.textContent='Client ID saved — not yet connected';
    subEl.textContent='Click Connect OneDrive to finish setup.';
    if(connectBtn) connectBtn.style.display='inline-flex';
    if(disconnectBtn) disconnectBtn.style.display='none';
  } else {
    titleEl.textContent='Not connected';
    subEl.textContent='Files are stored securely in the app for now.';
    if(connectBtn) connectBtn.style.display='inline-flex';
    if(disconnectBtn) disconnectBtn.style.display='none';
  }
}

// ── Microsoft Graph helpers (ready for use once connected) ──
async function oneDriveUploadFile(path,file){
  const token=getOneDriveToken();
  if(!token)throw new Error('OneDrive not connected.');
  const url=`https://graph.microsoft.com/v1.0/me/drive/root:/LexDesk_Data/${encodeURIComponent(path)}:/content`;
  const res=await fetch(url,{method:'PUT',headers:{'Authorization':'Bearer '+token.access_token,'Content-Type':file.type||'application/octet-stream'},body:file});
  if(!res.ok)throw new Error('OneDrive upload failed: '+res.status);
  return res.json();
}
async function oneDriveGetFileLink(path){
  const token=getOneDriveToken();
  if(!token)throw new Error('OneDrive not connected.');
  const url=`https://graph.microsoft.com/v1.0/me/drive/root:/LexDesk_Data/${encodeURIComponent(path)}`;
  const res=await fetch(url,{headers:{'Authorization':'Bearer '+token.access_token}});
  if(!res.ok)throw new Error('OneDrive lookup failed: '+res.status);
  const data=await res.json();
  return data.webUrl||null;
}
