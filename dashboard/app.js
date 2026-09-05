const state = {
  agent: 'Standby',
  signal: null,
  activity: [],
  safety: 'Configuration required',
  lastSync: 'just now',
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const status = (text, tone = 'mint') => {
  const node = $('.status-chip b');
  node.textContent = text;
  node.dataset.tone = tone;
};

function renderSignal(signal) {
  const room = $('.signal');
  if (!room) return;
  room.innerHTML = `<div class="signal-mark">${signal.action === 'HOLD' ? 'H' : 'N'}</div><div><div class="signal-title">${escapeHtml(signal.title)}</div><p>${escapeHtml(signal.detail)}</p><div class="tags"><span>${escapeHtml(signal.action)}</span><span>confidence ${escapeHtml(signal.confidence)}%</span><span class="${signal.approved ? 'approved' : 'blocked'}">risk gate ${signal.approved ? 'approved' : 'blocked'}</span></div></div><time>now</time>`;
  $('.signal-room .live')?.replaceChildren(document.createTextNode(signal.approved ? 'APPROVED' : 'BLOCKED'));
}

function renderActivity() {
  const panel = $('.activity-list');
  if (!panel) return;
  panel.innerHTML = state.activity.length ? state.activity.slice(0, 4).map((item) => `<div class="activity-row"><span class="activity-dot ${item.tone}"></span><div><strong>${item.title}</strong><small>${item.detail}</small></div><time>${item.time}</time></div>`).join('') : '<div class="empty"><div class="hex">↯</div><p>No DreamDEX events yet</p><small>Use the demo controls to preview the reactive feed.</small></div>';
}

function pushActivity(title, detail, tone = 'cyan') {
  state.activity.unshift({ title, detail, tone, time: 'now' });
  renderActivity();
  $('.last-sync').textContent = 'Last sync — just now';
}

function injectHeadline() {
  state.agent = 'Observing';
  status('DRY RUN', 'mint');
  const signal = { title: 'Somnia announces faster event finality for builders', detail: 'Demo headline passed to deterministic reasoning. No live provider or API key required.', action: 'BUY_YES', confidence: 88, approved: true };
  renderSignal(signal);
  $('.agent-state strong').textContent = state.agent;
  $('.agent-state span').textContent = '● Demo signal received';
  pushActivity('Signal evaluated', 'BUY_YES · 88% confidence · approved', 'mint');
}

function tripBreaker() {
  status('CIRCUIT BREAKER', 'amber');
  $('.pulse-card strong').textContent = 'BLOCKED';
  $('.pulse-card small').textContent = 'Manual breaker is active';
  const signal = { title: 'Risk circuit breaker simulation', detail: 'All new execution is blocked until the breaker is reset.', action: 'HOLD', confidence: 0, approved: false };
  renderSignal(signal);
  pushActivity('Risk gate blocked', 'Circuit breaker active · no trade', 'amber');
}

function resolveMarket() {
  $('.pulse-card strong').textContent = 'RESOLVED';
  $('.pulse-card small').textContent = 'Safety-net cancellation simulated';
  state.safety = 'Triggered';
  $('.safety-status dd').textContent = 'Demo trigger';
  pushActivity('Market finalized', 'Safety net cancelled open orders', 'cyan');
}

function resetDemo() {
  status('DRY RUN', 'mint');
  $('.pulse-card strong').textContent = 'CONFIGURATION REQUIRED';
  $('.pulse-card small').textContent = 'Live monitoring starts after setup';
  $('.agent-state strong').textContent = 'Standby';
  $('.agent-state span').textContent = '● Awaiting configuration';
  renderSignal({ title: 'Awaiting configured news provider', detail: 'Add NEWS_API_KEY later to stream current headlines into the reasoning core.', action: 'HOLD', confidence: 0, approved: false });
  state.activity = [];
  renderActivity();
}

document.querySelectorAll('[data-demo]').forEach((button) => {
  button.addEventListener('click', () => ({ headline: injectHeadline, breaker: tripBreaker, resolve: resolveMarket, reset: resetDemo }[button.dataset.demo])());
});
renderActivity();

function applyBackendSnapshot(records) {
  if (!Array.isArray(records) || records.length === 0) return;
  state.activity = records.slice(0, 4).map((record) => ({
    title: record.title || record.type || 'Sentinel event',
    detail: record.detail || record.reason || record.status || 'Backend event received',
    tone: record.tone || (record.status === 'blocked' ? 'amber' : 'cyan'),
    time: record.timestamp ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now',
  }));
  renderActivity();
  $('.last-sync').textContent = 'Last sync — live backend';
}

async function connectBackend() {
  try {
    const response = await fetch('/api/status', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const snapshot = await response.json();
    applyBackendSnapshot(snapshot.records);
    if (snapshot.marketConfigured) $('.pulse-card small').textContent = snapshot.dryRun ? 'Backend connected · dry run' : 'Backend connected · live execution gated';
    status(snapshot.dryRun ? 'DRY RUN' : 'LIVE GATED', snapshot.dryRun ? 'mint' : 'amber');
    if (window.EventSource) {
      const stream = new EventSource('/api/events');
      stream.addEventListener('snapshot', (event) => {
        try { applyBackendSnapshot(JSON.parse(event.data)); } catch { stream.close(); }
      });
      stream.onerror = () => stream.close();
    }
  } catch {
    $('.last-sync').textContent = 'Last sync — demo mode';
  }
}

connectBackend();
