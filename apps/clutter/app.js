// Clutter MVP — persistent staff workflow UI.
const state = { role: 'agent', items: [], filter: 'all', portal: null, loading: false };

function margin(i) { return Math.max(0, (+i.resale_price || 0) - (+i.approved_buy_price || 0)); }
function money(n) { return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(n || 0); }
function statusLabel(s) { return ({submitted:'Submitted',under_review:'Under review',needs_media:'Needs media',approved:'Approved',purchased:'Purchased',listed:'Listed',reserved:'Reserved',sold:'Sold',rejected:'Rejected'}[s] || s); }

window.Clutter = {
  async init(portal) {
    state.portal = portal;
    try { state.items = await portal.staffQueue(); render(); }
    catch (e) { renderError(e); }
  },
  async refresh() {
    if (!state.portal) return;
    state.items = await state.portal.staffQueue();
    render();
  },
  setRole(role) { state.role = role; render(); },
  setFilter(filter) { state.filter = filter; render(); },
  openIntake() { document.querySelector('#intake-modal').hidden = false; },
  closeIntake() { document.querySelector('#intake-modal').hidden = true; },
  async transition(id, patch) {
    if (!state.portal) return;
    state.loading = true; render();
    try { await state.portal.updateItem(id, patch); await this.refresh(); }
    catch (e) { renderError(e); }
    finally { state.loading = false; }
  },
  approve(id) { return this.transition(id, {status:'approved'}); },
  reject(id) { return this.transition(id, {status:'rejected'}); },
  markPurchased(id) { return this.transition(id, {status:'purchased'}); },
  list(id) { return this.transition(id, {status:'listed'}); },
  markSold(id) { return this.transition(id, {status:'sold'}); }
};

function renderError(e) {
  const root = document.querySelector('[data-clutter-app]');
  if (root) root.innerHTML = '<div class="clutter-shell"><div class="empty">Unable to load Clutter data: ' + (e.message || 'Unknown error') + '</div></div>';
}

function render() {
  const root = document.querySelector('[data-clutter-app]'); if (!root) return;
  const visible = state.filter === 'all' ? state.items : state.items.filter(i => i.status === state.filter);
  const pending = state.items.filter(i => i.status === 'under_review').length;
  const inventory = state.items.filter(i => ['purchased','listed','reserved'].includes(i.status)).length;
  const listed = state.items.filter(i => i.status === 'listed').length;
  const expected = state.items.reduce((s,i) => s + margin(i), 0);
  root.innerHTML = `
  <div class="clutter-shell">
   <header class="clutter-header"><div><b>CLUTTER</b><span>Buy smart. Verify. Resell.</span></div><select onchange="Clutter.setRole(this.value)"><option value="agent">Agent</option><option value="manager">Manager</option><option value="admin">Admin</option></select></header>
   <section class="clutter-stats"><div><small>Pending review</small><strong>${pending}</strong></div><div><small>In inventory</small><strong>${inventory}</strong></div><div><small>Listed</small><strong>${listed}</strong></div><div><small>Expected margin</small><strong>${money(expected)}</strong></div></section>
   <nav class="clutter-tabs"><button onclick="Clutter.setFilter('all')">All</button><button onclick="Clutter.setFilter('under_review')">Review</button><button onclick="Clutter.setFilter('approved')">Approved</button><button onclick="Clutter.setFilter('listed')">Shop</button><button onclick="Clutter.setFilter('sold')">Sold</button></nav>
   <main><div class="clutter-toolbar"><h2>${state.role==='manager'?'Management approvals':state.role==='agent'?'Agent workspace':'Operations dashboard'}</h2><button class="primary" onclick="Clutter.openIntake()">+ New seller item</button></div>
   ${state.loading ? '<p class="media-help">Saving…</p>' : ''}
   <div class="clutter-list">${visible.map(card).join('') || '<div class="empty">No items in this view.</div>'}</div></main>
  </div>`;
}

function card(i) {
  let action = '';
  if (state.role === 'manager' && i.status === 'under_review') action = `<button onclick="Clutter.approve('${i.id}')">Approve purchase</button><button class="danger" onclick="Clutter.reject('${i.id}')">Reject</button>`;
  else if (state.role === 'agent' && i.status === 'approved') action = `<button onclick="Clutter.markPurchased('${i.id}')">Mark purchased</button>`;
  else if (state.role === 'agent' && i.status === 'purchased') action = `<button onclick="Clutter.list('${i.id}')">List for resale</button>`;
  else if (state.role === 'agent' && i.status === 'listed') action = `<button onclick="Clutter.markSold('${i.id}')">Mark sold</button>`;
  const buy = i.approved_buy_price || i.proposed_buy_price || 0;
  return `<article class="clutter-card"><div><small>${i.id} · ${i.category}</small><h3>${i.title}</h3><p>${i.location || ''}</p><p>Status: <b>${statusLabel(i.status)}</b></p></div><div class="prices"><span>Buy ${money(buy)}</span><span>Sell ${money(i.resale_price)}</span><strong>Margin ${money(margin(i))}</strong></div><div class="actions">${action}</div></article>`;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.createSupabaseClient || !window.createPortal) {
    renderError(new Error('Clutter backend modules are not loaded.'));
    return;
  }
  const supabase = window.createSupabaseClient();
  Clutter.init(window.createPortal(supabase));
});