
// ════════════════════════════════════════════
//  DAILY PLANNER — monthly grid + day detail panel
//  BUG FIX: all dates use local time (no toISOString/UTC)
// ════════════════════════════════════════════
function localDateStr(d){
  const dt=d||new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
function parsePlannerDate(str){
  const [y,m,d]=str.split('-').map(Number);
  return new Date(y,m-1,d);
}
function localMonthStr(d){
  const dt=d||new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
}

S.plannerDate  = S.plannerDate  || localDateStr();
S.plannerMonth = S.plannerMonth || localMonthStr();
S.plannerNotes = S.plannerNotes || [];

async function renderPlanner(){
  await renderPlannerGrid();
  await renderPlannerDayPanel(S.plannerDate);
}
async function shiftPlannerMonth(delta){
  const [y,m]=S.plannerMonth.split('-').map(Number);
  const d=new Date(y,m-1+delta,1);
  S.plannerMonth=localMonthStr(d);
  await renderPlannerGrid();
}
async function goToToday(){
  S.plannerDate=localDateStr();
  S.plannerMonth=localMonthStr();
  await renderPlanner();
}

// ── Build calendar event map ──────────────────────────────────────────────
function buildCalEventMap(){
  const map={}; // date-str → [{type,label,color}]
  const add=(ds,type,label,color)=>{
    if(!map[ds]) map[ds]=[];
    map[ds].push({type,label,color});
  };
  // Tasks due
  S.tasks.filter(t=>t.due_date&&(isAdmin()||t.assigned_to===S.user?.id||t.assigned_by===S.user?.id))
    .forEach(t=>add(t.due_date,'task',t.title,'#805ad5'));
  // Case date fields (deadlines, hearings)
  myClients().forEach(c=>{
    const schema=S.formSchemas[c.case_type]||[];
    const data=c.case_data||{};
    schema.filter(f=>f.type==='date'&&data[f.id]).forEach(f=>{
      const isHearing=/hearing|court|appearance/i.test(f.label);
      add(data[f.id],isHearing?'hearing':'deadline',`${c.name}: ${f.label}`,isHearing?'#4299e1':'#f56565');
    });
  });
  return map;
}

// ── Monthly grid render ───────────────────────────────────────────────────
async function renderPlannerGrid(){
  const [y,m]=S.plannerMonth.split('-').map(Number);
  const label=document.getElementById('planner-month-label');
  if(label) label.textContent=new Date(y,m-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});

  // Fetch planner notes for this month
  const monthStart=`${S.plannerMonth}-01`;
  const nextM=new Date(y,m,1); // first of next month
  const monthEnd=`${localMonthStr(nextM)}-01`;
  const {data:monthNotes}=await sb.from('planner_notes')
    .select('*').eq('owner_id',S.user.id)
    .gte('note_date',monthStart).lt('note_date',monthEnd);
  const notesByDate={};
  (monthNotes||[]).forEach(n=>{
    if(!notesByDate[n.note_date]) notesByDate[n.note_date]=[];
    notesByDate[n.note_date].push(n);
  });

  const eventMap=buildCalEventMap();
  const todayStr=localDateStr();
  const firstDay=new Date(y,m-1,1).getDay(); // 0=Sun
  const daysInMonth=new Date(y,m,0).getDate();
  const prevDays=new Date(y,m-1,0).getDate();

  let html='<div class="cal-grid">';
  // Leading cells from prev month
  for(let i=firstDay-1;i>=0;i--){
    const d=prevDays-i;
    const ds=`${y}-${String(m-1||12).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    html+=`<div class="cal-cell other-month" onclick="calSelectDay('${ds}')">
      <div class="cal-date">${d}</div></div>`;
  }
  // This month's cells
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=ds===todayStr;
    const isSelected=ds===S.plannerDate;
    const events=eventMap[ds]||[];
    const notes=notesByDate[ds]||[];
    const hasOverdue=events.some(e=>e.type==='deadline'&&daysUntil&&daysUntil(ds)<0);
    const cls=`cal-cell${isToday?' today':''}${isSelected?' selected':''}`;
    // Show up to 2 pill labels on desktop, dots for all
    const pills=events.slice(0,2).map(e=>{
      const pillCls=e.type==='hearing'?'hearing-pill':e.type==='deadline'?'deadline-pill':'task-pill';
      return `<span class="cal-event-pill ${pillCls}">${escHtml(e.label.slice(0,22))}</span>`;
    }).join('');
    const notePills=notes.slice(0,1).map(n=>
      `<span class="cal-event-pill event-pill">${escHtml(n.content.slice(0,22))}</span>`
    ).join('');
    // Dots (always shown including mobile)
    const dots=[
      ...events.map(e=>`<span class="cal-dot ${e.type}" style="background:${e.color}"></span>`),
      ...notes.map(()=>`<span class="cal-dot event"></span>`)
    ].slice(0,5).join('');
    html+=`<div class="${cls}" onclick="calSelectDay('${ds}')">
      <div class="cal-date">${d}</div>
      <div class="cal-dots">${dots}</div>
      ${pills}${notePills}
    </div>`;
  }
  // Trailing cells
  const total=firstDay+daysInMonth;
  const trail=(7-total%7)%7;
  for(let d=1;d<=trail;d++){
    const ds=`${y}-${String(m%12+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    html+=`<div class="cal-cell other-month" onclick="calSelectDay('${ds}')">
      <div class="cal-date">${d}</div></div>`;
  }
  html+='</div>';
  const grid=document.getElementById('planner-cal-grid');
  if(grid) grid.innerHTML=html;
}

// ── Day detail panel ──────────────────────────────────────────────────────
async function calSelectDay(ds){
  // If clicking a day in a different month, navigate there too
  const dayMonth=ds.slice(0,7);
  if(dayMonth!==S.plannerMonth){
    S.plannerMonth=dayMonth;
    await renderPlannerGrid();
  }
  S.plannerDate=ds;
  // Re-highlight selected cell without full re-render
  document.querySelectorAll('.cal-cell').forEach(el=>el.classList.remove('selected'));
  const cells=document.querySelectorAll('#planner-cal-grid .cal-cell:not(.other-month)');
  const dayNum=parseInt(ds.split('-')[2]);
  if(cells[dayNum-1]) cells[dayNum-1].classList.add('selected');
  await renderPlannerDayPanel(ds);
}

async function renderPlannerDayPanel(ds){
  const panel=document.getElementById('planner-day-panel');
  const labelEl=document.getElementById('planner-day-label');
  const addWrap=document.getElementById('cal-add-wrap');
  if(!panel) return;
  const todayStr=localDateStr();
  const dt=parsePlannerDate(ds);
  const dayName=dt.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  if(labelEl) labelEl.textContent=dayName;
  if(addWrap) addWrap.style.display='block';

  const eventMap=buildCalEventMap();
  const events=eventMap[ds]||[];

  // Fetch manual notes for this day
  const {data:notes}=await sb.from('planner_notes')
    .select('*').eq('owner_id',S.user.id).eq('note_date',ds).order('created_at',{ascending:true});
  S.plannerNotes=notes||[];

  let html='';
  if(events.length){
    html+=`<div class="cal-detail-section">Agenda</div>`;
    html+=events.map(e=>`
      <div class="cal-detail-item" onclick="event.stopPropagation()">
        <span class="cal-detail-dot" style="background:${e.color}"></span>
        <span>${escHtml(e.label)}</span>
      </div>`).join('');
  }

  html+=`<div class="cal-detail-section">Notes & Events</div>`;
  if(S.plannerNotes.length){
    html+=S.plannerNotes.map(n=>`
      <div class="planner-note-item ${n.done?'done':''}" style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;">
        <i class="fa-solid ${n.done?'fa-square-check':'fa-square'}" style="color:${n.done?'var(--success)':'var(--text-muted)'};cursor:pointer;margin-top:2px;" onclick="togglePlannerNote('${n.id}',${!n.done})"></i>
        <div style="flex:1;font-size:13px;">
          ${n.time?`<span style="color:var(--navy-mid);font-weight:500;font-size:11.5px;">${escHtml(n.time)} </span>`:''}${escHtml(n.content)}
        </div>
        <button class="file-item-remove" onclick="deletePlannerNote('${n.id}')"><i class="fas fa-times"></i></button>
      </div>`).join('');
  } else {
    html+=`<p class="text-muted text-sm" style="margin-top:6px;">No notes for this day.</p>`;
  }

  panel.innerHTML=html;
}

// ── Add note from the detail panel ───────────────────────────────────────
async function calAddNote(){
  const input=document.getElementById('cal-note-input');
  const timeInput=document.getElementById('cal-note-time');
  const content=(input.value||'').trim();
  if(!content)return;
  const {error}=await sb.from('planner_notes').insert({
    firm_id:S.profile.firm_id, owner_id:S.user.id, note_date:S.plannerDate,
    time:timeInput.value||null, content
  });
  if(error){showToast('Could not add: '+error.message,'error');return;}
  input.value=''; timeInput.value='';
  await renderPlannerDayPanel(S.plannerDate);
  // Re-render grid to show new dot
  await renderPlannerGrid();
}

// ── Planner note helpers (also called from old IDs if any) ────────────────
async function togglePlannerNote(id,done){
  await sb.from('planner_notes').update({done}).eq('id',id);
  await renderPlannerDayPanel(S.plannerDate);
}
async function deletePlannerNote(id){
  await sb.from('planner_notes').delete().eq('id',id);
  await renderPlannerDayPanel(S.plannerDate);
  await renderPlannerGrid();
}
// Legacy compat stubs (old HTML may call these)
async function addPlannerNote(){ await calAddNote(); }
async function loadPlannerNotes(){ await renderPlannerDayPanel(S.plannerDate); }
