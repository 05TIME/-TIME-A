'use client';
import {useEffect,useMemo,useState} from 'react';
import './style.css';
import {supabase} from './supabase';

const initial=[{id:'command',label:'COMMAND',x:8,y:42,state:'ACTIVE'},{id:'plan',label:'PLAN',x:25,y:42,state:'READY'},{id:'execute',label:'EXECUTE',x:45,y:28,state:'READY'},{id:'verify',label:'VERIFY',x:65,y:42,state:'WAITING'},{id:'adapt',label:'ADAPT',x:82,y:28,state:'READY'},{id:'scale',label:'SCALE',x:92,y:58,state:'STANDBY'}];
const mapStatus=s=>({queued:'QUEUED',running:'RUNNING',waiting:'WAITING',verified:'VERIFIED',failed:'FAILED',retry:'RETRY',completed:'COMPLETED'}[String(s||'').toLowerCase()]||s||'UNKNOWN');
export default function Page(){
 const [nodes,setNodes]=useState(initial),[goal,setGoal]=useState(''),[events,setEvents]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  const load=async()=>{const [{data:ev},{data:tasks}]=await Promise.all([supabase.from('timeoe_events').select('*').order('created_at',{ascending:false}).limit(12),supabase.from('timeoe_execution_tasks').select('*').order('created_at',{ascending:false}).limit(20)]);if(!alive)return;if(ev)setEvents(ev.map(x=>({id:x.id,type:x.event_type,message:x.payload?.message||x.state||x.event_type,time:new Date(x.created_at).toLocaleTimeString()})));if(tasks?.length){setNodes(initial.map((n,i)=>i<tasks.length?{...n,state:mapStatus(tasks[i].state)}:n));}};
  load();
  const channel=supabase.channel('timeoe-live').on('postgres_changes',{event:'*',schema:'public',table:'timeoe_events'},payload=>{const x=payload.new;if(!x)return;setEvents(e=>[{id:x.id,type:x.event_type,message:x.payload?.message||x.state||x.event_type,time:new Date(x.created_at||Date.now()).toLocaleTimeString()},...e].slice(0,12));}).on('postgres_changes',{event:'*',schema:'public',table:'timeoe_execution_tasks'},payload=>{const x=payload.new;if(!x)return;setNodes(n=>n.map((node,i)=>i===0?node:{...node,state:mapStatus(x.state)}));}).subscribe();
  return()=>{alive=false;supabase.removeChannel(channel)};
 },[]);
 const submit=async()=>{if(!goal.trim()||busy)return;setBusy(true);setError('');const id=crypto.randomUUID();const now=new Date().toISOString();const {data,error}=await supabase.from('timeoe_commands').insert({id,objective:goal,status:'QUEUED',plan:{source:'command_center'}}).select().single();if(error){setError(error.message);setBusy(false);return;}await supabase.from('timeoe_events').insert({command_id:data.id,event_type:'COMMAND_RECEIVED',state:'QUEUED',payload:{message:goal}});setGoal('');setBusy(false);};
 const active=useMemo(()=>nodes.filter(n=>['RUNNING','QUEUED','RETRY','RECEIVED'].includes(n.state)).length,[nodes]);
 return <main><header><div><div className="eyebrow">TIMEŒ OS / COMMAND CENTER</div><h1>EXECUTION <span>ENGINE</span></h1><p>Persistent commands · realtime execution telemetry · verification</p></div><div className="status"><b>● LIVE</b><small>{active} active nodes</small></div></header>
 <section className="command"><input value={goal} onChange={e=>setGoal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Command TIMEŒ… e.g. Find 20 qualified leads and prepare outreach"/><button disabled={busy} onClick={submit}>{busy?'SENDING…':'EXECUTE →'}</button></section>{error&&<div className="error">{error}</div>}
 <section className="graph"><div className="grid"/>{nodes.map(n=><div key={n.id} className={`node ${String(n.state).toLowerCase()}`} style={{left:`${n.x}%`,top:`${n.y}%`}}><strong>{n.label}</strong><small>{n.state}</small></div>)}<div className="edges">COMMAND ─── PLAN ─── EXECUTE ─── VERIFY ─── ADAPT ─── SCALE</div></section>
 <section className="lower"><div className="panel"><h2>EVENT STREAM</h2>{events.length?events.map(e=><div className="event" key={e.id}><b>{e.type}</b><span>{e.message}</span><time>{e.time}</time></div>):<div className="empty">Awaiting live command packets…</div>}</div><div className="panel"><h2>TELEMETRY</h2><div className="metrics"><div><b>{events.length}</b><small>live events</small></div><div><b>{nodes.length}</b><small>graph nodes</small></div><div><b>{nodes.filter(n=>n.state==='VERIFIED').length}</b><small>verified</small></div></div></div></section></main>;
}
