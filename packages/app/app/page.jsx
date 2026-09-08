'use client';
import {useEffect,useMemo,useState} from 'react';
import './style.css';
import {supabase} from './supabase-client';

const initial=[
  {id:'command',label:'COMMAND',x:8,y:42,state:'IDLE'},
  {id:'plan',label:'PLAN',x:25,y:42,state:'IDLE'},
  {id:'execute',label:'EXECUTE',x:45,y:28,state:'IDLE'},
  {id:'verify',label:'VERIFY',x:65,y:42,state:'IDLE'},
  {id:'adapt',label:'ADAPT',x:82,y:28,state:'IDLE'},
  {id:'scale',label:'SCALE',x:92,y:58,state:'STANDBY'}
];
const mapStatus=s=>({queued:'QUEUED',running:'RUNNING',waiting:'WAITING',verified:'VERIFIED',failed:'FAILED',retry:'RETRY',completed:'COMPLETED'}[String(s||'').toLowerCase()]||s||'UNKNOWN');

export default function Page(){
  const[nodes,setNodes]=useState(initial),[goal,setGoal]=useState(''),[events,setEvents]=useState([]),[actions,setActions]=useState([]),[metrics,setMetrics]=useState({pending_approvals:0,completed_actions:0,verified_revenue:0}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[user,setUser]=useState(null),[authBusy,setAuthBusy]=useState(false),[authMessage,setAuthMessage]=useState('');
  const[business,setBusiness]=useState(null),[businessBusy,setBusinessBusy]=useState(false);

  const authHeaders=async()=>{
    const {data}=await supabase.auth.getSession();
    if(!data?.session?.access_token) throw new Error('Sign in to TIMEŒ before executing commands');
    return {Authorization:`Bearer ${data.session.access_token}`};
  };

  const load=async()=>{
    const[{data:ev},{data:acts},{data:latestCommand}]=await Promise.all([
      supabase.from('timeoe_events').select('*').order('created_at',{ascending:false}).limit(20),
      supabase.from('timeoe_business_actions').select('*').order('created_at',{ascending:false}).limit(50),
      supabase.from('timeoe_commands').select('*').order('created_at',{ascending:false}).limit(1).maybeSingle()
    ]);
    if(ev)setEvents(ev.map(x=>({id:x.id,type:x.event_type,message:x.payload?.message||x.state||x.event_type,time:new Date(x.created_at).toLocaleTimeString()})));
    if(latestCommand){
      setBusiness({id:latestCommand.business_id});
      const {data:tasks}=await supabase.from('timeoe_execution_tasks').select('*').eq('command_id',latestCommand.id).order('created_at');
      setNodes(tasks?.length?initial.map((n,i)=>i<tasks.length?{...n,state:mapStatus(tasks[i].state)}:n):initial);
    } else setNodes(initial);
    if(acts){setActions(acts);setMetrics({pending_approvals:acts.filter(a=>a.status==='PENDING_APPROVAL').length,completed_actions:acts.filter(a=>a.status==='COMPLETED').length,verified_revenue:acts.reduce((s,a)=>s+Number(a.verification?.amount||0),0)});}
  };

  useEffect(()=>{
    let alive=true;
    supabase.auth.getSession().then(({data})=>{if(alive){setUser(data?.session?.user||null);if(data?.session?.user)load()}});
    const auth=supabase.auth.onAuthStateChange((_event,session)=>{if(alive){setUser(session?.user||null);if(session?.user)load();else{setBusiness(null);setEvents([]);setActions([]);setNodes(initial)}}});
    load();
    const channel=supabase.channel('timeoe-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'timeoe_events'},payload=>{const x=payload.new;if(!x||!alive)return;setEvents(e=>[{id:x.id,type:x.event_type,message:x.payload?.message||x.state||x.event_type,time:new Date(x.created_at||Date.now()).toLocaleTimeString()},...e].slice(0,20));})
      .on('postgres_changes',{event:'*',schema:'public',table:'timeoe_execution_tasks'},()=>load())
      .on('postgres_changes',{event:'*',schema:'public',table:'timeoe_business_actions'},()=>load())
      .subscribe();
    return()=>{alive=false;auth.data.subscription.unsubscribe();supabase.removeChannel(channel)}
  },[]);

  const authenticate=async(mode)=>{
    if(!email.trim()||!password)return setAuthMessage('Email and password are required');
    setAuthBusy(true);setAuthMessage('');setError('');
    try{
      const result=mode==='signup'?await supabase.auth.signUp({email:email.trim(),password}):await supabase.auth.signInWithPassword({email:email.trim(),password});
      if(result.error)throw result.error;
      if(mode==='signup'&&!result.data.session)setAuthMessage('Account created. Check your email if confirmation is required.');
      else setAuthMessage('Authenticated. Initialize the business context, then execute.');
    }catch(e){setAuthMessage(e.message||'Authentication failed')}finally{setAuthBusy(false)}
  };

  const signOut=async()=>{await supabase.auth.signOut();setAuthMessage('Signed out');};

  const initializeBusiness=async()=>{
    setBusinessBusy(true);setError('');
    try{
      const headers={...await authHeaders(),'content-type':'application/json'};
      const r=await fetch('/api/businesses/bootstrap',{method:'POST',headers});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'Business initialization failed');
      setBusiness(j.business);setAuthMessage(j.created?'TIMEŒ business initialized.':'Existing TIMEŒ business loaded.');await load();
    }catch(e){setError(e.message)}finally{setBusinessBusy(false)}
  };

  const submit=async()=>{
    if(!goal.trim()||busy)return;
    setBusy(true);setError('');
    try{
      const headers={...await authHeaders(),'content-type':'application/json'};
      const r=await fetch('/api/commands',{method:'POST',headers,body:JSON.stringify({objective:goal})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'Command rejected');
      setGoal('');await load();
    }catch(e){setError(e.message)}finally{setBusy(false)}
  };

  const actionCall=async(id,path,body={})=>{
    setError('');
    try{
      const headers={...await authHeaders(),'content-type':'application/json'};
      const r=await fetch(`/api/business-actions/${id}/${path}`,{method:'POST',headers,body:JSON.stringify(body)});
      const j=await r.json();if(!r.ok)throw new Error(j.error||`${path} failed`);await load();
    }catch(e){setError(e.message)}
  };

  const active=useMemo(()=>nodes.filter(n=>['RUNNING','QUEUED','RETRY','RECEIVED'].includes(n.state)).length,[nodes]);
  return <main>
    <header>
      <div><div className="eyebrow">TIMEŒ OS / COMMAND CENTER</div><h1>EXECUTION <span>ENGINE</span></h1><p>Persistent commands · realtime execution telemetry · verified business operations</p></div>
      <div className="status"><b>● LIVE</b><small>{active} active nodes</small></div>
    </header>

    <section className="panel" style={{marginTop:18}}>
      <h2>AUTHENTICATION</h2>
      {user?<div className="event"><b>AUTHENTICATED</b><span>{user.email}</span>{business&&<span>BUSINESS READY</span>}<button onClick={signOut}>SIGN OUT</button></div>:
        <div className="command" style={{margin:'0'}}><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email"/><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password"/><button disabled={authBusy} onClick={()=>authenticate('signin')}>{authBusy?'WORKING…':'SIGN IN'}</button><button disabled={authBusy} onClick={()=>authenticate('signup')}>CREATE ACCOUNT</button></div>}
      {user&&!business&&<div className="event" style={{marginTop:10}}><span>Business context is required before commands can run.</span><button disabled={businessBusy} onClick={initializeBusiness}>{businessBusy?'INITIALIZING…':'INITIALIZE BUSINESS'}</button></div>}
      {authMessage&&<div className="empty" style={{marginTop:10}}>{authMessage}</div>}
    </section>

    <section className="command"><input value={goal} onChange={e=>setGoal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Command TIMEŒ… e.g. Find 20 qualified leads and prepare outreach" disabled={!user||!business}/><button disabled={busy||!user||!business} onClick={submit}>{busy?'EXECUTING…':'EXECUTE →'}</button></section>
    {!user&&<div className="empty">Authenticate above to execute persisted TIMEŒ commands.</div>}
    {user&&!business&&<div className="empty">Initialize the business context to unlock command execution.</div>}
    {error&&<div className="error">{error}</div>}

    <section className="graph"><div className="grid"/>{nodes.map(n=><div key={n.id} className={`node ${String(n.state).toLowerCase()}`} style={{left:`${n.x}%`,top:`${n.y}%`}}><strong>{n.label}</strong><small>{n.state}</small></div>)}<div className="edges">COMMAND ─── PLAN ─── EXECUTE ─── VERIFY ─── ADAPT ─── SCALE</div></section>

    <section className="lower">
      <div className="panel"><h2>APPROVAL QUEUE</h2>{actions.filter(a=>a.status==='PENDING_APPROVAL').length?actions.filter(a=>a.status==='PENDING_APPROVAL').map(a=><div className="event" key={a.id}><b>{a.action_type}</b><span>{a.provider} · {a.amount||0} {a.currency||''}</span><button onClick={()=>actionCall(a.id,'approve')}>APPROVE</button></div>):<div className="empty">No actions awaiting approval.</div>}</div>
      <div className="panel"><h2>BUSINESS ACTIONS</h2>{actions.slice(0,8).map(a=><div className="event" key={a.id}><b>{a.action_type}</b><span>{a.status} · {a.provider}</span>{['READY','APPROVED'].includes(a.status)&&<button onClick={()=>actionCall(a.id,'execute')}>RUN</button>}</div>)}</div>
      <div className="panel"><h2>TELEMETRY</h2><div className="metrics"><div><b>{events.length}</b><small>live events</small></div><div><b>{metrics.pending_approvals}</b><small>approvals</small></div><div><b>{metrics.completed_actions}</b><small>completed</small></div><div><b>{metrics.verified_revenue.toFixed(2)}</b><small>verified revenue</small></div></div></div>
      <div className="panel"><h2>EVENT STREAM</h2>{events.length?events.map(e=><div className="event" key={e.id}><b>{e.type}</b><span>{e.message}</span><time>{e.time}</time></div>):<div className="empty">Awaiting live command packets…</div>}</div>
    </section>
  </main>
}
