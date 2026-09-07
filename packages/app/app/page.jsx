'use client';
import {useEffect,useMemo,useState} from 'react';
import './style.css';

const initial=[
 {id:'command',label:'COMMAND',x:8,y:42,state:'ACTIVE'},
 {id:'plan',label:'PLAN',x:25,y:42,state:'READY'},
 {id:'execute',label:'EXECUTE',x:45,y:28,state:'RUNNING'},
 {id:'verify',label:'VERIFY',x:65,y:42,state:'WAITING'},
 {id:'adapt',label:'ADAPT',x:82,y:28,state:'READY'},
 {id:'scale',label:'SCALE',x:92,y:58,state:'STANDBY'}
];
export default function Page(){
 const [nodes,setNodes]=useState(initial); const [goal,setGoal]=useState(''); const [events,setEvents]=useState([]);
 useEffect(()=>{const t=setInterval(()=>setNodes(n=>n.map(x=>x.state==='RUNNING'?{...x,state:'VERIFYING'}:x.state==='VERIFYING'?{...x,state:'VERIFIED'}:x)));return()=>clearInterval(t)},[]);
 const submit=()=>{if(!goal.trim())return;const id=crypto.randomUUID();setEvents(e=>[{id,type:'COMMAND_RECEIVED',message:goal,time:new Date().toLocaleTimeString()},...e].slice(0,12));setNodes(n=>n.map(x=>x.id==='command'?{...x,state:'RECEIVED'}:x.id==='plan'?{...x,state:'RUNNING'}:x));setGoal('');};
 const active=useMemo(()=>nodes.filter(n=>['RUNNING','RECEIVED','VERIFYING'].includes(n.state)).length,[nodes]);
 return <main><header><div><div className="eyebrow">TIMEŒ OS / COMMAND CENTER</div><h1>EXECUTION <span>ENGINE</span></h1><p>Real-time business orchestration · verified execution · adaptive recovery</p></div><div className="status"><b>● LIVE</b><small>{active} active nodes</small></div></header>
 <section className="command"><input value={goal} onChange={e=>setGoal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Command TIMEŒ… e.g. Find 20 qualified leads and prepare outreach"/><button onClick={submit}>EXECUTE →</button></section>
 <section className="graph"><div className="grid"/>{nodes.map((n,i)=><div key={n.id} className={`node ${n.state.toLowerCase()}`} style={{left:`${n.x}%`,top:`${n.y}%`}}><strong>{n.label}</strong><small>{n.state}</small></div>)}<div className="edges">COMMAND ─── PLAN ─── EXECUTE ─── VERIFY ─── ADAPT ─── SCALE</div></section>
 <section className="lower"><div className="panel"><h2>EVENT STREAM</h2>{events.length?events.map(e=><div className="event" key={e.id}><b>{e.type}</b><span>{e.message}</span><time>{e.time}</time></div>):<div className="empty">Awaiting command packets…</div>}</div><div className="panel"><h2>TELEMETRY</h2><div className="metrics"><div><b>100%</b><small>verification</small></div><div><b>{nodes.length}</b><small>graph nodes</small></div><div><b>0</b><small>unverified</small></div></div></div></section>
 </main>;
}
