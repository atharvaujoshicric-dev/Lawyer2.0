// ════════════════════════════════════════════
//  NOTIFICATIONS + REAL-TIME UPDATES
// ════════════════════════════════════════════
// Architecture:
//   • Supabase Realtime WebSocket subscriptions for instant
//     updates to messages and tasks (< 1 second delivery).
//   • Background poll every 30s as a safety net for anything
//     Realtime misses (tab backgrounded, reconnect gap, etc.).
//   • Unread badge counts tracked via S.locallyReadIds (session-
//     local Set) to prevent badge re-appearing after the user
//     has already seen a conversation.
//   • Browser push notifications fire even when tab is hidden.

S.unreadCounts   = S.unreadCounts   || {};
S.locallyReadIds = S.locallyReadIds || new Set();
S.messageReadIds = S.messageReadIds || new Set();
S.lastSeenTaskTs = S.lastSeenTaskTs || localStorage.getItem('ld_last_task_ts') || '';
S.notifPermission= S.notifPermission|| Notification.permission;
S._pollTimer     = null;
S._realtimeChannel = null;  // single Supabase Realtime channel

// ── Browser push permission ───────────────────────────────────────────────
async function requestNotifPermission(){
  if(S.notifPermission==='granted') return true;
  if(S.notifPermission==='denied')  return false;
  const result = await Notification.requestPermission();
  S.notifPermission = result;
  return result === 'granted';
}
function sendBrowserNotif(title, body, onClick){
  if(S.notifPermission!=='granted') return;
  const n = new Notification(title,{body, icon:'/favicon.ico', tag:title});
  if(onClick) n.onclick=()=>{ window.focus(); onClick(); n.close(); };
}

// ── Last-seen persistence ─────────────────────────────────────────────────
function loadLastSeenState(){
  try{ S.lastSeenMsgId=JSON.parse(localStorage.getItem('ld_last_seen_msgs')||'{}'); }
  catch{ S.lastSeenMsgId={}; }
}
function saveLastSeenState(){
  try{ localStorage.setItem('ld_last_seen_msgs',JSON.stringify(S.lastSeenMsgId)); }catch{}
}

// ── Mark conversation as read ─────────────────────────────────────────────
async function markConversationRead(peerId){
  const key = peerId===null ? 'broadcast' : peerId;
  if(!S.messages.length) return;
  const inbound = S.messages.filter(m=>m.sender_id!==S.user?.id && !m.deleted);
  inbound.forEach(m=>S.locallyReadIds.add(m.id));
  const latest = S.messages[S.messages.length-1];
  if(latest){ S.lastSeenMsgId[key]=latest.id; saveLastSeenState(); }
  S.unreadCounts[key]=0;
  updateAllChatBadges();
  if(inbound.length){
    sb.from('message_reads').upsert(
      inbound.map(m=>({message_id:m.id, user_id:S.user?.id})),
      {onConflict:'message_id,user_id', ignoreDuplicates:true}
    ).then(({error})=>{ if(error) console.warn('message_reads:',error.message); });
  }
}

// ── Unread count computation ──────────────────────────────────────────────
async function refreshUnreadCounts(){
  if(!S.user) return null;
  const {data:readRows} = await sb.from('message_reads')
    .select('message_id').eq('user_id',S.user?.id);
  const dbReadSet = new Set((readRows||[]).map(r=>r.message_id));
  const allReadIds = new Set([...dbReadSet,...S.locallyReadIds]);
  const {data:allVisible} = await sb.from('messages')
    .select('id,sender_id,recipient_id,created_at')
    .neq('sender_id',S.user?.id)
    .eq('deleted',false)
    .order('created_at',{ascending:false})
    .limit(500);
  const newCounts={};
  (allVisible||[]).forEach(m=>{
    if(allReadIds.has(m.id)) return;
    const key = m.recipient_id===null ? 'broadcast' : m.sender_id;
    newCounts[key]=(newCounts[key]||0)+1;
  });
  const prevCounts={...S.unreadCounts};
  S.unreadCounts=newCounts;
  updateAllChatBadges();
  return {newCounts,prevCounts};
}

// ── Update sidebar + contact badges ──────────────────────────────────────
function updateAllChatBadges(){
  const total=Object.values(S.unreadCounts).reduce((a,b)=>a+(b||0),0);
  const chatNavBadge=document.getElementById('chat-nav-badge');
  if(chatNavBadge){
    chatNavBadge.textContent=total||'';
    chatNavBadge.style.display=total?'inline-block':'none';
  }
  (S.users||[]).filter(u=>u.id!==S.user?.id).forEach(u=>{
    const badge=document.getElementById(`chat-badge-${u.id}`);
    const count=S.unreadCounts[u.id]||0;
    if(badge){ badge.textContent=count||''; badge.style.display=count?'inline-flex':'none'; }
  });
  const bbc=document.getElementById('chat-badge-broadcast');
  const bc=S.unreadCounts['broadcast']||0;
  if(bbc){ bbc.textContent=bc||''; bbc.style.display=bc?'inline-flex':'none'; }
}

// ── Notify about genuinely new items ─────────────────────────────────────
async function checkForNewItems(){
  if(!S.user) return;
  const result = await refreshUnreadCounts();
  if(!result) return;
  const {newCounts, prevCounts} = result;
  for(const [key,count] of Object.entries(newCounts)){
    const prev = prevCounts[key]||0;
    if(count<=prev) continue;
    const delta = count-prev;
    const label = key==='broadcast' ? 'Team Channel'
      : (S.users.find(u=>u.id===key)?.full_name||'Someone');
    const granted = await requestNotifPermission();
    if(granted) sendBrowserNotif(
      `${delta} new message${delta>1?'s':''} — ${label}`,
      'LexDesk · tap to open',
      ()=>{ navigate('chat'); selectChatPeer(key==='broadcast'?null:key); }
    );
    if(!document.getElementById('view-chat')?.classList.contains('active'))
      showToast(`💬 ${delta} new message${delta>1?'s':''} from ${label}`,'info');
  }
  S.lastSeenTaskTs=new Date().toISOString();
  localStorage.setItem('ld_last_task_ts',S.lastSeenTaskTs);
}

// ── Supabase Realtime subscriptions ──────────────────────────────────────
// One channel for both messages and tasks. Delivers updates in < 1 second.
// NOTE: Supabase Realtime requires the table to have RLS enabled and
// "Realtime" turned ON in the Supabase dashboard:
//   Database → Replication → select "messages" and "tasks" tables.
function startPolling(){
  // ── Clean up any old timers/channels ──
  if(S._pollTimer)     clearInterval(S._pollTimer);
  if(S._realtimeChannel){ try{ sb.removeChannel(S._realtimeChannel); }catch{} }

  // ── Supabase Realtime channel ──────────────────────────────────────────
  S._realtimeChannel = sb
    .channel('lexdesk-live')

    // ── New message received ──────────────────────────────────────────────
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},
      async (payload)=>{
        const msg = payload.new;
        if(!msg||!S.user) return;
        const isForMe = msg.sender_id===S.user?.id
          || msg.recipient_id===S.user?.id
          || msg.recipient_id===null
          || (msg.group_id && S.chatGroups?.some(g=>g.id===msg.group_id));
        if(!isForMe) return;

        // If I'm currently viewing this conversation — reload and render instantly
        const chatActive = document.getElementById('view-chat')?.classList.contains('active');
        const correctConvo = chatActive && (
          (S.activeChatPeer===null && msg.recipient_id===null && !msg.group_id) ||
          (S.activeChatPeer===msg.sender_id) ||
          (S.activeChatPeer===msg.recipient_id && msg.sender_id===S.user?.id) ||
          (S.activeGroupId && S.activeGroupId===msg.group_id)
        );
        if(correctConvo){
          await loadMessages();
          renderChatMessages();
          if(msg.sender_id!==S.user?.id) await markConversationRead(S.activeChatPeer);
        } else {
          // Update badge — add to unread
          if(msg.sender_id!==S.user?.id && !S.locallyReadIds.has(msg.id)){
            const key = msg.group_id
              ? msg.group_id
              : msg.recipient_id===null ? 'broadcast' : msg.sender_id;
            S.unreadCounts[key] = (S.unreadCounts[key]||0)+1;
            updateAllChatBadges();
          }
          // Browser notification for non-active conversations
          if(msg.sender_id!==S.user?.id){
            const sender = S.users.find(u=>u.id===msg.sender_id);
            const from   = sender?.full_name || 'Someone';
            const granted= await requestNotifPermission();
            if(granted) sendBrowserNotif(`💬 ${from}`,
              msg.body?.slice(0,80)||'Sent an attachment',
              ()=>{ navigate('chat'); selectChatPeer(msg.sender_id); }
            );
            if(!chatActive) showToast(`💬 ${from}: ${(msg.body||'').slice(0,50)}`,'info');
          }
        }
      })

    // ── Message edited or deleted ─────────────────────────────────────────
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},
      async ()=>{
        const chatActive = document.getElementById('view-chat')?.classList.contains('active');
        if(!chatActive) return;
        await loadMessages();
        renderChatMessages();
      })

    // ── New task created ──────────────────────────────────────────────────
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'tasks'},
      async (payload)=>{
        const t = payload.new;
        if(!t||!S.user) return;
        const involvesMe = isAdmin()||t.assigned_to===S.user?.id||t.assigned_by===S.user?.id;
        if(!involvesMe) return;
        // Reload tasks data
        const {data} = await sb.from('tasks').select('*').order('created_at',{ascending:false});
        if(data) S.tasks=data;
        // Re-render if tasks view is open
        if(document.getElementById('view-tasks')?.classList.contains('active')) renderTasks();
        updateStats();
        // Notify non-admin who was assigned
        if(t.assigned_to===S.user?.id && t.assigned_by!==S.user?.id){
          const by = S.users.find(u=>u.id===t.assigned_by)?.full_name||'Senior Advocate';
          const granted = await requestNotifPermission();
          if(granted) sendBrowserNotif(`📋 New task from ${by}`,t.title,
            ()=>{ navigate('tasks'); openTaskModal(t.id); });
          showToast(`📋 New task from ${by}: "${escHtml(t.title)}"`,'info');
        }
      })

    // ── Task updated (status change) ──────────────────────────────────────
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'tasks'},
      async (payload)=>{
        const t = payload.new;
        if(!t||!S.user) return;
        const involvesMe = isAdmin()||t.assigned_to===S.user?.id||t.assigned_by===S.user?.id;
        if(!involvesMe) return;
        // Update the task in local cache without full reload
        const idx = S.tasks.findIndex(x=>x.id===t.id);
        if(idx>=0) S.tasks[idx]=t; else S.tasks.unshift(t);
        if(document.getElementById('view-tasks')?.classList.contains('active')) renderTasks();
        updateStats();
        // Notify assignee of status changes
        if(t.assigned_to===S.user?.id){
          const lbl={in_progress:'started',in_review:'sent for review',
            done:'approved & closed',cancelled:'cancelled',open:'reopened'}[t.status];
          if(lbl&&t.status!=='in_progress'){  // skip trivial "started" notification
            const granted = await requestNotifPermission();
            if(granted) sendBrowserNotif(`Task ${lbl}`,t.title,
              ()=>{ navigate('tasks'); openTaskModal(t.id); });
            if(!document.getElementById('view-tasks')?.classList.contains('active'))
              showToast(`Task "${escHtml(t.title)}" — ${lbl}`,'info');
          }
        }
        // Notify Senior Advocate when task sent for review
        if(isAdmin() && t.status==='in_review'){
          const doer = S.users.find(u=>u.id===t.assigned_to);
          const granted = await requestNotifPermission();
          if(granted) sendBrowserNotif(`🔍 Review requested`,
            `${doer?.full_name||'Someone'} sent "${t.title}" for review`,
            ()=>{ navigate('tasks'); openTaskModal(t.id); });
          if(!document.getElementById('view-tasks')?.classList.contains('active'))
            showToast(`🔍 ${doer?.full_name||'Someone'} sent "${escHtml(t.title)}" for review`,'warning');
        }
      })

    .subscribe((status)=>{
      if(status==='SUBSCRIBED'){
        console.log('LexDesk Realtime: connected ✓');
      } else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
        console.warn('LexDesk Realtime: connection issue, falling back to polling');
        // If Realtime fails, fall back to aggressive polling
        startFallbackPolling();
      }
    });

  // ── Background safety-net poll (30s) ─────────────────────────────────────
  S._pollTimer = setInterval(async ()=>{
    if(!S.user) return;
    await checkForNewItems();
    const {data} = await sb.from('tasks').select('*').order('created_at',{ascending:false});
    if(data){ S.tasks=data; updateStats(); }
  }, 30000);

  // ── Active-view fast poll (5s) — ALWAYS runs, unconditionally ─────────────
  // Ensures messages and tasks update instantly without a page refresh,
  // even if Supabase Realtime is disabled or the WebSocket connection drops.
  if(S._fastPollTimer) clearInterval(S._fastPollTimer);
  S._fastPollTimer = setInterval(async ()=>{
    if(!S.user) return;
    const chatActive  = document.getElementById('view-chat')?.classList.contains('active');
    const tasksActive = document.getElementById('view-tasks')?.classList.contains('active');
    if(chatActive){
      await loadMessages();
      renderChatMessages();
      await refreshUnreadCounts();
      updateAllChatBadges();
    }
    if(tasksActive){
      const {data} = await sb.from('tasks').select('*').order('created_at',{ascending:false});
      if(data){ S.tasks=data; renderTasks(); updateStats(); }
    }
  }, 5000);
}