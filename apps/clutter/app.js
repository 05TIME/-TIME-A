// Clutter MVP — seller intake + staff workflow
const state = { role: 'agent', items: [], filter: 'all' };
const demoItems = [
 {id:'CL-1001',title:'Hisense Inverter AC 1HP',category:'Appliances',status:'under_review',buy:180000,resale:260000,agent:'Unassigned',seller:'Demo seller',location:'Benin City'},
 {id:'CL-1002',title:'Nexus Double Door Freezer',category:'Appliances',status:'approved',buy:420000,resale:560000,agent:'Agent 01',seller:'Demo seller',location:'Benin City'},
 {id:'CL-1003',title:'iPhone 15 Pro 256GB',category:'Phones',status:'listed',buy:650000,resale:790000,agent:'Agent 02',seller:'Demo seller',location:'Lagos'}
];
function margin(i){return Math.max(0,(+i.resale||0)-(+i.buy||0))}
function money(n){return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(n||0)}
function statusLabel(s){return ({under_review:'Under review',needs_media:'Needs media',approved:'Approved',purchased:'Purchased',listed:'Listed',reserved:'Reserved',sold:'Sold',rejected:'Rejected'}[s]||s)}
window.Clutter={
 load(items){state.items=items||demoItems;render()},
 setRole(role){state.role=role;render()},
 setFilter(filter){state.filter=filter;render()},
 addItem(item){state.items.unshift({...item,id:'CL-'+String(Date.now()).slice(-6),status:'under_review',buy:0,resale:0,agent:'Unassigned'});render()},
 approve(id){const i=state.items.find(x=>x.id===id);if(i){i.status='approved';render()}},
 reject(id){const i=state.items.find(x=>x.id===id);if(i){i.status='rejected';render()}},
 markPurchased(id){const i=state.items.find(x=>x.id===id);if(i){i.status='purchased';render()}},
 list(id){const i=state.items.find(x=>x.id===id);if(i){i.status='listed';render()}},
 markSold(id){const i=state.items.find(x=>x.id===id);if(i){i.status='sold';render()}},
 openIntake(){document.querySelector('#intake-modal').hidden=false},
 closeIntake(){document.querySelector('#intake-modal').hidden=true}
};
function render(){
 const root=document.querySelector('[data-clutter-app]');if(!root)return;
 const visible=state.filter==='all'?state.items:state.items.filter(i=>i.status===state.filter);
 const pending=state.items.filter(i=>i.status==='under_review').length;
 const inventory=state.items.filter(i=>['purchased','listed','reserved'].includes(i.status)).length;
 const listed=state.items.filter(i=>i.status==='listed').length;
 const expected=state.items.reduce((s,i)=>s+margin(i),0);
 root.innerHTML=`
 <div class="clutter-shell">
 <header class="clutter-header"><div><b>CLUTTER</b><span>Buy smart. Verify. Resell.</span></div><select onchange="Clutter.setRole(this.value)"><option value="agent">Agent</option><option value="manager">Manager</option><option value="admin">Admin</option></select></header>
 <section class="clutter-stats"><div><small>Pending review</small><strong>${pending}</strong></div><div><small>In inventory</small><strong>${inventory}</strong></div><div><small>Listed</small><strong>${listed}</strong></div><div><small>Expected margin</small><strong>${money(expected)}</strong></div></section>
 <nav class="clutter-tabs"><button onclick="Clutter.setFilter('all')">All</button><button onclick="Clutter.setFilter('under_review')">Review</button><button onclick="Clutter.setFilter('approved')">Approved</button><button onclick="Clutter.setFilter('listed')">Shop</button><button onclick="Clutter.setFilter('sold')">Sold</button></nav>
 <main><div class="clutter-toolbar"><h2>${state.role==='manager'?'Management approvals':state.role==='agent'?'Agent workspace':'Operations dashboard'}</h2><button class="primary" onclick="Clutter.openIntake()">+ New seller item</button></div>
 <div class="clutter-list">${visible.map(card).join('')||'<div class="empty">No items in this view.</div>'}</div></main></div>`;
}
function card(i){
 let action='';
 if(state.role==='manager'&&i.status==='under_review') action=`<button onclick="Clutter.approve('${i.id}')">Approve purchase</button><button class="danger" onclick="Clutter.reject('${i.id}')">Reject</button>`;
 else if(state.role==='agent'&&i.status==='approved') action=`<button onclick="Clutter.markPurchased('${i.id}')">Mark purchased</button>`;
 else if(state.role==='agent'&&i.status==='purchased') action=`<button onclick="Clutter.list('${i.id}')">List for resale</button>`;
 else if(state.role==='agent'&&i.status==='listed') action=`<button onclick="Clutter.markSold('${i.id}')">Mark sold</button>`;
 return `<article class="clutter-card"><div><small>${i.id} · ${i.category}</small><h3>${i.title}</h3><p>${i.location||''} · Seller: ${i.seller||'—'}</p><p>Status: <b>${statusLabel(i.status)}</b> · Agent: ${i.agent}</p></div><div class="prices"><span>Buy ${money(i.buy)}</span><span>Sell ${money(i.resale)}</span><strong>Margin ${money(margin(i))}</strong></div><div class="actions">${action}</div></article>`;
}
document.addEventListener('DOMContentLoaded',()=>Clutter.load());