// Clutter MVP — standalone client workflow
const state = { role: 'agent', items: [], filter: 'all' };
const demoItems = [
  {id:'CL-1001',title:'Hisense Inverter AC 1HP',category:'Appliances',status:'under_review',buy:180000,resale:260000,agent:'Unassigned'},
  {id:'CL-1002',title:'Nexus Double Door Freezer',category:'Appliances',status:'approved',buy:420000,resale:560000,agent:'Agent 01'},
  {id:'CL-1003',title:'iPhone 15 Pro 256GB',category:'Phones',status:'listed',buy:650000,resale:790000,agent:'Agent 02'}
];
function margin(item){ return Math.max(0,(Number(item.resale)||0)-(Number(item.buy)||0)); }
function money(n){ return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(n||0); }
function statusLabel(s){ return ({under_review:'Under review',needs_media:'Needs media',approved:'Approved',purchased:'Purchased',listed:'Listed',reserved:'Reserved',sold:'Sold',rejected:'Rejected'}[s]||s); }
window.Clutter = {
 load(items){state.items=items||demoItems;render();},
 setRole(role){state.role=role;render();},
 setFilter(filter){state.filter=filter;render();},
 approve(id){const i=state.items.find(x=>x.id===id);if(i){i.status='approved';render();}},
 reject(id){const i=state.items.find(x=>x.id===id);if(i){i.status='rejected';render();}},
 markPurchased(id){const i=state.items.find(x=>x.id===id);if(i){i.status='purchased';render();}},
 list(id){const i=state.items.find(x=>x.id===id);if(i){i.status='listed';render();}},
 markSold(id){const i=state.items.find(x=>x.id===id);if(i){i.status='sold';render();}}
};
function render(){
 const root=document.querySelector('[data-clutter-app]');if(!root)return;
 const visible=state.filter==='all'?state.items:state.items.filter(i=>i.status===state.filter);
 const pending=state.items.filter(i=>i.status==='under_review').length;
 const inventory=state.items.filter(i=>['purchased','listed','reserved'].includes(i.status)).length;
 const listed=state.items.filter(i=>i.status==='listed').length;
 const expected=state.items.reduce((s,i)=>s+margin(i),0);
 root.innerHTML=\`
 <div class="clutter-shell">
  <header class="clutter-header"><div><b>CLUTTER</b><span>Buy smart. Verify. Resell.</span></div>
  <select onchange="Clutter.setRole(this.value)"><option value="agent" \${state.role==='agent'?'selected':''}>Agent</option><option value="manager" \${state.role==='manager'?'selected':''}>Manager</option><option value="admin" \${state.role==='admin'?'selected':''}>Admin</option></select></header>
  <section class="clutter-stats"><div><small>Pending review</small><strong>\${pending}</strong></div><div><small>In inventory</small><strong>\${inventory}</strong></div><div><small>Listed</small><strong>\${listed}</strong></div><div><small>Expected margin</small><strong>\${money(expected)}</strong></div></section>
  <nav class="clutter-tabs"><button onclick="Clutter.setFilter('all')">All</button><button onclick="Clutter.setFilter('under_review')">Review</button><button onclick="Clutter.setFilter('approved')">Approved</button><button onclick="Clutter.setFilter('listed')">Shop</button><button onclick="Clutter.setFilter('sold')">Sold</button></nav>
  <main><div class="clutter-toolbar"><h2>\${state.role==='manager'?'Management approvals':state.role==='agent'?'Agent workspace':'Operations dashboard'}</h2><button class="primary" onclick="document.dispatchEvent(new CustomEvent('clutter:new-item'))">+ New seller item</button></div>
  <div class="clutter-list">\${visible.map(item=>card(item)).join('')||'<div class="empty">No items in this view.</div>'}</div></main>
 </div>\`;
}
function card(i){
 const action=state.role==='manager'&&i.status==='under_review'?\`<button onclick="Clutter.approve('\${i.id}')">Approve purchase</button><button class="danger" onclick="Clutter.reject('\${i.id}')">Reject</button>\`:state.role==='agent'&&i.status==='approved'?\`<button onclick="Clutter.markPurchased('\${i.id}')">Mark purchased</button>\`:state.role==='agent'&&i.status==='purchased'?\`<button onclick="Clutter.list('\${i.id}')">List for resale</button>\`:state.role==='agent'&&i.status==='listed'?\`<button onclick="Clutter.markSold('\${i.id}')">Mark sold</button>\`:'';
 return \`<article class="clutter-card"><div><small>\${i.id} · \${i.category}</small><h3>\${i.title}</h3><p>Status: <b>\${statusLabel(i.status)}</b> · Agent: \${i.agent}</p></div><div class="prices"><span>Buy \${money(i.buy)}</span><span>Sell \${money(i.resale)}</span><strong>Margin \${money(margin(i))}</strong></div><div class="actions">\${action}</div></article>\`;
}
document.addEventListener('DOMContentLoaded',()=>Clutter.load());