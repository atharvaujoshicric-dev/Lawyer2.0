// ══════════════════════════════════════════════════════
//  LEXDESK THEME SYSTEM  v2
//  Users pick: base mode + backdrop + glass tint + contrast
//  Persistence: localStorage (instant) + profiles.theme_config
//  initTheme() runs at boot before anything renders.
//  Re-applied after login from profile.
// ══════════════════════════════════════════════════════

// ── Backdrop options ─────────────────────────────────
// Orbs: warm, complementary tones — no harsh blue
const THEME_BACKDROPS = [
  { id:'midnight', label:'Midnight', icon:'🌑',
    dark:'#06091A', light:'#F0F4FF',
    orbs:['#1e3a6e','#0e6655','#7a3a0a','#142850'] },
  { id:'charcoal', label:'Charcoal', icon:'⚫',
    dark:'#0c0c0c', light:'#f4f4f4',
    orbs:['#2d2d2d','#1a1a2e','#2c1810','#1a2030'] },
  { id:'navy',     label:'Navy',     icon:'🌊',
    dark:'#02101e', light:'#EFF6FF',
    orbs:['#1a3460','#0a4f5e','#1a2e1a','#0e1e40'] },
  { id:'forest',   label:'Forest',   icon:'🌲',
    dark:'#010d06', light:'#F0FDF4',
    orbs:['#0f3d1c','#065040','#1a3010','#0a2818'] },
  { id:'plum',     label:'Plum',     icon:'🫐',
    dark:'#0c0318', light:'#FAF5FF',
    orbs:['#3d1060','#321070','#501040','#200840'] },
  { id:'rose',     label:'Rose',     icon:'🌹',
    dark:'#170408', light:'#FFF1F2',
    orbs:['#6b0f28','#7a0f3a','#4a0f20','#500818'] },
];

// ── Glass tint options ────────────────────────────────
const THEME_TINTS = [
  { id:'neutral', label:'Neutral Glass',
    dark:'rgba(255,255,255,0.08)', light:'rgba(255,255,255,0.58)' },
  { id:'warm',    label:'Warm Glass',
    dark:'rgba(255,235,200,0.09)', light:'rgba(255,248,235,0.62)' },
  { id:'cool',    label:'Cool Glass',
    dark:'rgba(210,225,255,0.08)', light:'rgba(230,240,255,0.60)' },
  { id:'frost',   label:'Frosted Glass',
    dark:'rgba(230,245,255,0.11)', light:'rgba(248,252,255,0.68)' },
  { id:'smoke',   label:'Smoked Glass',
    dark:'rgba(160,170,180,0.10)', light:'rgba(235,238,242,0.65)' },
];

// ── Contrast options ──────────────────────────────────
const THEME_CONTRASTS = [
  { id:'standard', label:'Standard',
    darkText:'#F0F4FF',  darkMuted:'rgba(255,255,255,.30)',
    lightText:'#0D1526', lightMuted:'rgba(0,0,0,.36)' },
  { id:'high',     label:'High',
    darkText:'#FFFFFF',  darkMuted:'rgba(255,255,255,.52)',
    lightText:'#000000', lightMuted:'rgba(0,0,0,.52)' },
  { id:'soft',     label:'Soft',
    darkText:'#C8D4E8',  darkMuted:'rgba(255,255,255,.22)',
    lightText:'#2D3A52', lightMuted:'rgba(0,0,0,.26)' },
];

// ── Storage ───────────────────────────────────────────
function getThemeConfig(){
  try{
    const s=localStorage.getItem('ld_theme_config');
    if(s){ const p=JSON.parse(s); if(p&&p.mode) return p; }
  }catch(e){}
  // NEW DEFAULTS: Dark Glass, Charcoal, Frosted Glass, High contrast
  return {mode:'dark', backdrop:'charcoal', tint:'frost', contrast:'high'};
}
function saveThemeConfig(cfg, toDB=false){
  localStorage.setItem('ld_theme_config', JSON.stringify(cfg));
  if(toDB && typeof S!=='undefined' && S?.user?.id && typeof sb!=='undefined'){
    return sb.from('profiles').update({theme_config:cfg}).eq('id',S.user.id);
  }
  return Promise.resolve();
}

// ── Core apply ────────────────────────────────────────
function applyThemeConfig(cfg){
  const c = cfg || getThemeConfig();
  const {mode='dark', backdrop='midnight', tint='neutral', contrast='standard'} = c;
  const bd  = THEME_BACKDROPS.find(b=>b.id===backdrop) || THEME_BACKDROPS[0];
  const tn  = THEME_TINTS.find(t=>t.id===tint)         || THEME_TINTS[0];
  const con = THEME_CONTRASTS.find(x=>x.id===contrast) || THEME_CONTRASTS[0];
  const isLight = mode==='light';

  // 1. Mode attribute
  document.documentElement.setAttribute('data-theme', isLight?'light':'');

  // 2. Dynamic CSS vars — injected AFTER the static CSS so they override correctly
  let el = document.getElementById('ld-theme-vars');
  if(!el){
    el = document.createElement('style');
    el.id = 'ld-theme-vars';
    // Append to end of head so it wins specificity
    document.head.appendChild(el);
  }

  const bgBase  = isLight ? bd.light : bd.dark;
  const glassBg = isLight ? tn.light : tn.dark;
  const textMain= isLight ? con.lightText  : con.darkText;
  const textMute= isLight ? con.lightMuted : con.darkMuted;

  el.textContent = `
    :root {
      --text-primary: ${textMain} !important;
      --text-muted:   ${textMute} !important;
    }
    body { background-color: ${bgBase} !important; }
    .lexdesk-orbs { background: ${bgBase} !important; }
    html[data-theme="light"] .lexdesk-orbs { background: ${bgBase} !important; }

    /* Orb colours */
    .lexdesk-orbs span:nth-child(1){ background: ${bd.orbs[0]} !important; }
    .lexdesk-orbs span:nth-child(2){ background: ${bd.orbs[1]} !important; }
    .lexdesk-orbs span:nth-child(3){ background: ${bd.orbs[2]} !important; }
    .lexdesk-orbs span:nth-child(4){ background: ${bd.orbs[3]} !important; opacity:.4; }

    /* Light mode orb softening */
    html[data-theme="light"] .lexdesk-orbs span:nth-child(1){ background: ${bd.orbs[0]}99 !important; }
    html[data-theme="light"] .lexdesk-orbs span:nth-child(2){ background: ${bd.orbs[1]}99 !important; }
    html[data-theme="light"] .lexdesk-orbs span:nth-child(3){ background: ${bd.orbs[2]}99 !important; }
    html[data-theme="light"] .lexdesk-orbs span:nth-child(4){ background: ${bd.orbs[3]}66 !important; }

    /* Glass tint */
    .card, .glass { background: ${glassBg} !important; }
    .chat-sidebar,
    #chatbot-panel { background: ${isLight?'rgba(255,255,255,0.96)':'rgba(4,8,22,0.96)'} !important; }
  `;
}

// ── Boot: apply before anything renders ──────────────
function initTheme(){
  applyThemeConfig(getThemeConfig());
}

// ── After login: use profile preference ──────────────
function applyProfileTheme(profile){
  if(profile?.theme_config && profile.theme_config.mode){
    const cfg = profile.theme_config;
    // Write to localStorage so it persists on next refresh
    localStorage.setItem('ld_theme_config', JSON.stringify(cfg));
    // Mark as "saved" so the unsaved-changes warning doesn't appear after login
    localStorage.setItem('ld_theme_saved', JSON.stringify(cfg));
    applyThemeConfig(cfg);
  } else {
    // No profile theme — apply stored local config
    const cfg = getThemeConfig();
    localStorage.setItem('ld_theme_saved', JSON.stringify(cfg));
    applyThemeConfig(cfg);
  }
}

// ── Compat stubs ──────────────────────────────────────
function getTheme(){ return getThemeConfig().mode; }
function applyTheme(mode, save=false){
  const cfg=getThemeConfig(); cfg.mode=mode;
  if(save) saveThemeConfig(cfg,true);
  applyThemeConfig(cfg);
}
function toggleTheme(btn){
  const cfg=getThemeConfig();
  const nowDark=!btn.classList.contains('on');
  btn.classList.toggle('on',nowDark);
  cfg.mode=nowDark?'dark':'light';
  saveThemeConfig(cfg,true); applyThemeConfig(cfg);
  showToast(nowDark?'🌑 Dark mode':'☀ Light mode','info');
  renderThemeCustomiser();
}

// ── Settings UI renderer ──────────────────────────────
function renderThemeCustomiser(){
  const cnt=document.getElementById('theme-customiser');
  if(!cnt) return;
  const cfg=getThemeConfig();
  const {mode,backdrop,tint,contrast}=cfg;

  // Check if there are unsaved changes (localStorage vs what's in DB / last saved)
  const savedStr = localStorage.getItem('ld_theme_saved');
  const currentStr = JSON.stringify(cfg);
  const hasUnsaved = savedStr && savedStr !== currentStr;

  const sel=(active)=>active
    ? 'border:2px solid var(--gold);background:var(--gold-dim);color:var(--gold);'
    : 'border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:var(--text-secondary);';

  cnt.innerHTML=`
  <div style="display:flex;flex-direction:column;gap:20px;">

    <!-- Mode -->
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
           color:var(--text-muted);margin-bottom:10px;">Base Mode</div>
      <div style="display:flex;gap:10px;">
        <button onclick="themeSet('mode','dark')"
          style="${sel(mode==='dark')}flex:1;padding:11px;border-radius:12px;cursor:pointer;font-size:13.5px;font-weight:500;transition:all .18s;">
          🌑 Dark Glass
        </button>
        <button onclick="themeSet('mode','light')"
          style="${sel(mode==='light')}flex:1;padding:11px;border-radius:12px;cursor:pointer;font-size:13.5px;font-weight:500;transition:all .18s;">
          ☀ Light Glass
        </button>
      </div>
    </div>

    <!-- Backdrop -->
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
           color:var(--text-muted);margin-bottom:10px;">Backdrop Colour</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        ${THEME_BACKDROPS.map(b=>`
          <button onclick="themeSet('backdrop','${b.id}')"
            style="${sel(backdrop===b.id)}border-radius:12px;padding:10px 8px;cursor:pointer;
              font-size:12.5px;font-weight:500;transition:all .18s;display:flex;align-items:center;gap:7px;">
            <span style="width:13px;height:13px;border-radius:50%;flex-shrink:0;
              background:${mode==='light'?b.light:b.dark};
              border:1px solid rgba(255,255,255,.25);"></span>
            ${b.icon} ${b.label}
          </button>`).join('')}
      </div>
    </div>

    <!-- Glass Tint -->
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
           color:var(--text-muted);margin-bottom:10px;">Glass Tint</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${THEME_TINTS.map(t=>`
          <button onclick="themeSet('tint','${t.id}')"
            style="${sel(tint===t.id)}border-radius:10px;padding:9px 14px;cursor:pointer;
              font-size:12.5px;font-weight:500;transition:all .18s;display:flex;align-items:center;
              justify-content:space-between;gap:8px;">
            <span>${t.label}</span>
            <span style="width:60px;height:16px;border-radius:6px;
              background:${mode==='light'?t.light:t.dark};
              border:1px solid rgba(255,255,255,.18);display:inline-block;"></span>
          </button>`).join('')}
      </div>
    </div>

    <!-- Contrast -->
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
           color:var(--text-muted);margin-bottom:10px;">Text Contrast</div>
      <div style="display:flex;gap:8px;">
        ${THEME_CONTRASTS.map(c=>`
          <button onclick="themeSet('contrast','${c.id}')"
            style="${sel(contrast===c.id)}flex:1;padding:9px;border-radius:10px;cursor:pointer;
              font-size:12.5px;font-weight:500;transition:all .18s;">
            ${c.label}
          </button>`).join('')}
      </div>
    </div>

    <!-- Save + Reset row -->
    <div style="display:flex;gap:10px;align-items:center;">
      <button id="theme-save-btn" onclick="themeSave()"
        style="flex:1;padding:11px;border-radius:12px;cursor:pointer;font-size:13.5px;
          font-weight:600;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:8px;
          background:linear-gradient(135deg,var(--gold),#b8872a);border:none;color:#0d0d0d;
          box-shadow:0 4px 16px rgba(212,168,67,.30);">
        <i class="fas fa-save"></i> Save Theme
      </button>
      <button onclick="themeReset()"
        style="padding:10px 16px;border-radius:12px;background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.10);color:var(--text-muted);font-size:12.5px;
          cursor:pointer;transition:all .15s;white-space:nowrap;"
        onmouseover="this.style.color='var(--danger)';this.style.borderColor='rgba(248,113,113,.28)'"
        onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='rgba(255,255,255,.10)'">
        <i class="fas fa-undo"></i> Reset
      </button>
    </div>

    ${hasUnsaved ? `
    <div style="font-size:11.5px;color:var(--warning);display:flex;align-items:center;gap:6px;margin-top:-10px;">
      <i class="fas fa-exclamation-circle"></i>
      You have unsaved changes. Click <strong>Save Theme</strong> to apply on next login.
    </div>` : `
    <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:-10px;">
      Theme applied instantly · Click Save to persist across logins
    </div>`}

  </div>`;
}

// ── Single-call setter (applies instantly, marks as unsaved) ─────────────
function themeSet(key, val){
  const cfg=getThemeConfig();
  cfg[key]=val;
  // Save to localStorage immediately (instant apply)
  localStorage.setItem('ld_theme_config', JSON.stringify(cfg));
  applyThemeConfig(cfg);
  if(key==='mode'){
    const btn=document.getElementById('theme-toggle');
    if(btn) btn.classList.toggle('on', val==='dark');
  }
  renderThemeCustomiser();
}

// ── Explicit save to DB + mark as saved ─────────────────────────────────
async function themeSave(){
  const cfg=getThemeConfig();
  const btn=document.getElementById('theme-save-btn');
  if(btn){ btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Saving…'; btn.disabled=true; }
  try{
    await saveThemeConfig(cfg, true);  // writes to DB
    // Mark as saved so unsaved-changes warning clears
    localStorage.setItem('ld_theme_saved', JSON.stringify(cfg));
    showToast('Theme saved! It will apply on every login.','success');
    renderThemeCustomiser();
  } catch(e){
    showToast('Save failed — theme is applied locally only.','error');
    if(btn){ btn.innerHTML='<i class="fas fa-save"></i> Save Theme'; btn.disabled=false; }
  }
}

function themeReset(){
  const def={mode:'dark', backdrop:'charcoal', tint:'frost', contrast:'high'};
  localStorage.setItem('ld_theme_config', JSON.stringify(def));
  localStorage.setItem('ld_theme_saved',  JSON.stringify(def));
  saveThemeConfig(def, true);
  applyThemeConfig(def);
  const btn=document.getElementById('theme-toggle');
  if(btn) btn.classList.toggle('on', true);
  renderThemeCustomiser();
  showToast('Theme reset to default.','info');
}
