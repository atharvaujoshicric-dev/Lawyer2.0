// ════════════════════════════════════════════
//  CHATBOT — Floating Draggable Assistant
//  Preset Q&A, 2-day history clear, enable/disable
// ════════════════════════════════════════════

const CHATBOT_HISTORY_KEY = 'ld_chatbot_history';
const CHATBOT_ENABLED_KEY = 'ld_chatbot_enabled';
const CHATBOT_HISTORY_TTL = 2 * 24 * 60 * 60 * 1000; // 2 days in ms

const CHATBOT_QA = [
  // Deadlines & Dates
  {
    patterns: ['deadline','filing','court date','next date','hearing'],
    response: () => {
      const upcoming = getUpcomingDeadlines(30).slice(0, 3);
      if (!upcoming.length) return "I don't see any deadlines in the next 30 days. You're in good shape! 🎉";
      const lines = upcoming.map(d => `• ${d.client.name} — ${d.field}: ${fmtD(d.deadline)} (${d.daysLeft < 0 ? Math.abs(d.daysLeft)+'d overdue' : d.daysLeft+'d left'})`);
      return `Here are your upcoming deadlines:\n${lines.join('\n')}`;
    }
  },
  // Clients
  {
    patterns: ['how many clients', 'total clients', 'client count'],
    response: () => {
      const cl = myClients();
      const active = cl.filter(c => c.status === 'active').length;
      return `You have ${cl.length} total client${cl.length !== 1 ? 's' : ''}, of which ${active} are active.`;
    }
  },
  {
    patterns: ['find client', 'search client', 'look up client', 'client named'],
    response: (msg) => {
      const term = msg.replace(/find|search|look up|client|named/gi, '').trim().toLowerCase();
      if (term.length < 2) return 'Please type a client name or ID to search for.';
      const found = S.clients.filter(c => c.name.toLowerCase().includes(term) || c.client_id.toLowerCase().includes(term));
      if (!found.length) return `No clients found matching "${term}".`;
      return `Found ${found.length} match${found.length !== 1 ? 'es' : ''} for "${term}":\n` +
        found.slice(0, 5).map(c => `• ${c.name} (${c.client_id}) — ${c.status}`).join('\n');
    }
  },
  // Tasks
  {
    patterns: ['my tasks', 'open tasks', 'pending tasks', 'what tasks'],
    response: () => {
      const mine = S.tasks.filter(t => t.assigned_to === S.user?.id && !['done','cancelled'].includes(t.status));
      if (!mine.length) return "You have no open tasks right now. ✅";
      return `You have ${mine.length} open task${mine.length !== 1 ? 's' : ''}:\n` +
        mine.slice(0, 5).map(t => `• [${t.status}] ${t.title}${t.due_date ? ' — due ' + fmtD(t.due_date) : ''}`).join('\n');
    }
  },
  // Payments / Finances
  {
    patterns: ['outstanding', 'unpaid', 'balance', 'money owed', 'pending payment'],
    response: () => {
      if (!canSeeFinances()) return "Finance details are only visible to the Senior Advocate.";
      const totalFee  = S.clients.reduce((s, c) => s + Number(c.fee || 0), 0);
      const totalPaid = (S.finPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      const out = Math.max(0, totalFee - totalPaid);
      return `Outstanding balance across all clients: ₹${out.toLocaleString('en-IN')}\nTotal fees: ₹${totalFee.toLocaleString('en-IN')} | Collected: ₹${totalPaid.toLocaleString('en-IN')}`;
    }
  },
  // Documents
  {
    patterns: ['document', 'file', 'uploaded', 'attachment'],
    response: () => {
      const count = S.documents.length;
      return `There ${count === 1 ? 'is' : 'are'} ${count} document${count !== 1 ? 's' : ''} stored in the system. Navigate to Documents to view or search them.`;
    }
  },
  // Team
  {
    patterns: ['team', 'staff', 'members', 'who is', 'lawyers'],
    response: () => {
      const active = S.users.filter(u => u.approved && !u.archived);
      const lines  = active.map(u => `• ${u.full_name} — ${getRoleInfo(u.role).label}`);
      return `Your firm has ${active.length} active team member${active.length !== 1 ? 's' : ''}:\n${lines.join('\n')}`;
    }
  },
  // Today
  {
    patterns: ['today', 'agenda', 'schedule', 'plan'],
    response: () => {
      const today = localDateStr ? localDateStr() : new Date().toISOString().slice(0, 10);
      const dls   = getUpcomingDeadlines ? getUpcomingDeadlines(0).filter(d => d.daysLeft === 0) : [];
      const tasks = S.tasks.filter(t => t.due_date === today && t.assigned_to === S.user?.id && t.status !== 'done');
      let resp = `Today is ${fmtD(today)}.\n`;
      if (dls.length)   resp += `\n⚖️ ${dls.length} deadline(s) due today!`;
      if (tasks.length) resp += `\n📋 ${tasks.length} task(s) due today.`;
      if (!dls.length && !tasks.length) resp += '\nNo deadlines or tasks due today. Have a productive day! 💼';
      return resp;
    }
  },
  // Help
  {
    patterns: ['help', 'what can you', 'what do you', 'commands', 'options'],
    response: () => `I can help you with:\n• Upcoming deadlines\n• Client search & counts\n• Your tasks & to-dos\n• Team members\n• Payment summaries\n• Today's agenda\n\nJust ask naturally! E.g. "Show my tasks" or "Find client Sharma".`
  },
  // Greetings
  {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste'],
    response: () => {
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const name = S.profile?.full_name?.split(' ')[0] || 'there';
      return `${greet}, ${name}! 👋 How can I assist you today? Type "help" to see what I can do.`;
    }
  },
  // Conflict
  {
    patterns: ['conflict', 'opposite party', 'conflict check'],
    response: (msg) => {
      const term = msg.replace(/conflict|check|opposite|party/gi, '').trim();
      if (!term) return 'To check for conflicts, type: "conflict check [party name]"';
      const found = checkConflictOfInterest ? checkConflictOfInterest(term) : [];
      if (!found.length) return `✅ No conflicts found for "${term}".`;
      return `⚠️ Potential conflict for "${term}" — ${found.length} matching record${found.length !== 1 ? 's' : ''}:\n` +
        found.map(c => `• ${c.name} (${c.client_id})`).join('\n');
    }
  },
];

// Match user message to a Q&A entry
function chatbotMatch(msg) {
  const lower = msg.toLowerCase();
  for (const qa of CHATBOT_QA) {
    if (qa.patterns.some(p => lower.includes(p))) {
      try {
        return typeof qa.response === 'function' ? qa.response(lower) : qa.response;
      } catch (e) { return "I had trouble fetching that. Please try again."; }
    }
  }
  return "I'm not sure about that. Try asking about deadlines, clients, tasks, team, or type \"help\" for options.";
}

// ── History management ─────────────────────────────────────────────────────
function loadChatbotHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(CHATBOT_HISTORY_KEY) || '{"ts":0,"msgs":[]}');
    if (Date.now() - raw.ts > CHATBOT_HISTORY_TTL) return [];
    return raw.msgs || [];
  } catch { return []; }
}
function saveChatbotHistory(msgs) {
  localStorage.setItem(CHATBOT_HISTORY_KEY, JSON.stringify({ ts: Date.now(), msgs: msgs.slice(-40) }));
}
function clearChatbotHistory() {
  localStorage.removeItem(CHATBOT_HISTORY_KEY);
  S._chatbotMsgs = [];
  renderChatbotMessages();
}

// ── UI ─────────────────────────────────────────────────────────────────────
function isChatbotEnabled() {
  return localStorage.getItem(CHATBOT_ENABLED_KEY) !== 'false';
}
function setChatbotEnabled(val) {
  localStorage.setItem(CHATBOT_ENABLED_KEY, val ? 'true' : 'false');
  const fab = document.getElementById('chatbot-fab');
  if (fab) fab.style.display = val ? 'flex' : 'none';
}

function toggleChatbotPanel() {
  const panel = document.getElementById('chatbot-panel');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (isOpen) {
    if (!S._chatbotMsgs) {
      S._chatbotMsgs = loadChatbotHistory();
      if (!S._chatbotMsgs.length) {
        S._chatbotMsgs = [{ role: 'bot', text: `Hello ${S.profile?.full_name?.split(' ')[0] || ''}! I'm LexBot, your practice assistant. Type "help" to see what I can do.` }];
      }
    }
    renderChatbotMessages();
    document.getElementById('chatbot-input')?.focus();
    // Clear unread badge
    const badge = document.getElementById('chatbot-fab-badge');
    if (badge) { badge.classList.remove('show'); badge.textContent = ''; }
  }
}

function renderChatbotMessages() {
  const cnt = document.getElementById('chatbot-msgs');
  if (!cnt) return;
  cnt.innerHTML = (S._chatbotMsgs || []).map(m =>
    `<div class="chatbot-msg ${m.role}" style="white-space:pre-wrap;">${escHtml(m.text)}</div>`
  ).join('');
  cnt.scrollTop = cnt.scrollHeight;
}

function chatbotSend() {
  const input = document.getElementById('chatbot-input');
  const text  = (input?.value || '').trim();
  if (!text) return;
  if (!S._chatbotMsgs) S._chatbotMsgs = [];
  input.value = '';

  S._chatbotMsgs.push({ role: 'user', text });
  renderChatbotMessages();

  // Typing indicator
  S._chatbotMsgs.push({ role: 'bot', text: '…' });
  renderChatbotMessages();

  setTimeout(() => {
    S._chatbotMsgs.pop(); // remove typing indicator
    const reply = chatbotMatch(text);
    S._chatbotMsgs.push({ role: 'bot', text: reply });
    saveChatbotHistory(S._chatbotMsgs);
    renderChatbotMessages();
  }, 400);
}

function chatbotQuickReply(text) {
  const input = document.getElementById('chatbot-input');
  if (input) input.value = text;
  chatbotSend();
}

// ── Draggable FAB ──────────────────────────────────────────────────────────
function initChatbotDrag() {
  const fab = document.getElementById('chatbot-fab');
  if (!fab) return;
  let dragging = false, ox = 0, oy = 0, startX = 0, startY = 0;

  fab.addEventListener('mousedown', e => {
    dragging = true; startX = e.clientX; startY = e.clientY;
    const rect = fab.getBoundingClientRect();
    ox = e.clientX - rect.left; oy = e.clientY - rect.top;
    fab.style.cursor = 'grabbing';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const x = e.clientX - ox, y = e.clientY - oy;
    fab.style.left  = Math.max(0, Math.min(window.innerWidth  - 60, x)) + 'px';
    fab.style.top   = Math.max(0, Math.min(window.innerHeight - 60, y)) + 'px';
    fab.style.right = 'auto'; fab.style.bottom = 'auto';
    // Also move panel
    const panel = document.getElementById('chatbot-panel');
    if (panel) {
      panel.style.left   = Math.max(0, Math.min(window.innerWidth  - 360, x - 280)) + 'px';
      panel.style.bottom = 'auto';
      panel.style.top    = Math.max(0, y - 530) + 'px';
      panel.style.right  = 'auto';
    }
  });
  document.addEventListener('mouseup', e => {
    if (!dragging) return;
    dragging = false;
    fab.style.cursor = 'grab';
    // If barely moved, treat as click → toggle panel
    if (Math.abs(e.clientX - startX) < 5 && Math.abs(e.clientY - startY) < 5) {
      toggleChatbotPanel();
    }
  });

  // Touch support
  fab.addEventListener('touchstart', e => {
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    const rect = fab.getBoundingClientRect();
    ox = t.clientX - rect.left; oy = t.clientY - rect.top;
  }, { passive: true });
  fab.addEventListener('touchmove', e => {
    const t = e.touches[0];
    const x = t.clientX - ox, y = t.clientY - oy;
    fab.style.left = Math.max(0, Math.min(window.innerWidth  - 60, x)) + 'px';
    fab.style.top  = Math.max(0, Math.min(window.innerHeight - 60, y)) + 'px';
    fab.style.right = 'auto'; fab.style.bottom = 'auto';
    e.preventDefault();
  }, { passive: false });
  fab.addEventListener('touchend', e => {
    const t = e.changedTouches[0];
    if (Math.abs(t.clientX - startX) < 8 && Math.abs(t.clientY - startY) < 8) {
      toggleChatbotPanel();
    }
  });
}

function initChatbot() {
  if (!isChatbotEnabled()) {
    const fab = document.getElementById('chatbot-fab');
    if (fab) fab.style.display = 'none';
    return;
  }
  initChatbotDrag();
}
