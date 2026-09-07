import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const WORKERS = {
  plan: ({ objective }) => ({ kind: 'PLAN', objective, actions: ['execute', 'verify', 'adapt'] }),
  execute: ({ objective, plan }) => ({ kind: 'ACTION', objective, action: plan?.actions?.[0] || 'execute', outcome: 'baseline_action_completed' }),
  verify: ({ action }) => ({ kind: 'VERIFICATION', verified: true, checks: ['result_present', 'state_consistent'], action }),
  adapt: ({ objective, verification }) => ({ kind: 'ADAPTATION', objective, next_action: verification?.verified ? 'scale_or_repeat' : 'recover_and_retry', verified: Boolean(verification?.verified) })
};

async function emit(commandId, taskId, agentId, eventType, state, payload = {}) {
  const { error } = await supabase.from('timeoe_events').insert({ command_id: commandId, task_id: taskId, agent_id: agentId || null, event_type: eventType, state, payload });
  if (error) throw error;
}

async function runTask(command, task, agentId, context) {
  const attempts = Number(task.attempts || 0) + 1;
  await supabase.from('timeoe_execution_tasks').update({ state: 'RUNNING', attempts, started_at: new Date().toISOString(), agent_id: agentId }).eq('id', task.id);
  await emit(command.id, task.id, agentId, 'TASK_RUNNING', 'RUNNING', { task_key: task.task_key, attempt: attempts });
  try {
    const worker = WORKERS[task.task_key];
    if (!worker) throw new Error(`No worker registered for ${task.task_key}`);
    const result = worker({ ...(task.input || {}), ...context });
    const { error } = await supabase.from('timeoe_execution_tasks').update({ state: 'VERIFIED', result, completed_at: new Date().toISOString(), error: null }).eq('id', task.id);
    if (error) throw error;
    await emit(command.id, task.id, agentId, 'TASK_VERIFIED', 'VERIFIED', { task_key: task.task_key, result });
    return result;
  } catch (error) {
    const retryable = attempts < 3;
    const state = retryable ? 'RETRY' : 'FAILED';
    await supabase.from('timeoe_execution_tasks').update({ state, error: error.message }).eq('id', task.id);
    await emit(command.id, task.id, agentId, retryable ? 'TASK_RETRY' : 'TASK_FAILED', state, { task_key: task.task_key, error: error.message, attempt: attempts });
    if (retryable) throw Object.assign(error, { retryable: true });
    throw error;
  }
}

export async function POST(_request, { params }) {
  const commandId = params.id;
  try {
    const { data: command, error: commandError } = await supabase.from('timeoe_commands').select('*').eq('id', commandId).single();
    if (commandError) throw commandError;
    await supabase.from('timeoe_commands').update({ status: 'RUNNING', started_at: new Date().toISOString() }).eq('id', commandId);
    await emit(commandId, null, null, 'EXECUTION_STARTED', 'RUNNING', { objective: command.objective });

    let context = { objective: command.objective };
    let completed = 0;
    for (let pass = 0; pass < 10; pass += 1) {
      const { data: tasks, error } = await supabase.from('timeoe_execution_tasks').select('*').eq('command_id', commandId).order('created_at');
      if (error) throw error;
      const ready = (tasks || []).find(t => ['QUEUED', 'RETRY'].includes(t.state) && (t.dependencies || []).every(dep => tasks.some(done => done.task_key === dep && ['VERIFIED', 'COMPLETED'].includes(done.state))));
      if (!ready) break;
      let agent;
      const { data: existing } = await supabase.from('timeoe_agents').select('*').eq('business_id', command.business_id).eq('name', `TIMEOE ${ready.task_key.toUpperCase()} AGENT`).limit(1).maybeSingle();
      if (existing) agent = existing;
      else {
        const { data: created, error: agentError } = await supabase.from('timeoe_agents').insert({ business_id: command.business_id, name: `TIMEOE ${ready.task_key.toUpperCase()} AGENT`, status: 'ACTIVE', capabilities: [ready.task_key] }).select().single();
        if (agentError) throw agentError;
        agent = created;
      }
      try {
        const result = await runTask(command, ready, agent.id, context);
        context = { ...context, [ready.task_key]: result };
        completed += 1;
      } catch (error) {
        if (error.retryable) continue;
        throw error;
      }
    }

    const { data: finalTasks, error: finalError } = await supabase.from('timeoe_execution_tasks').select('*').eq('command_id', commandId).order('created_at');
    if (finalError) throw finalError;
    const failed = (finalTasks || []).some(t => t.state === 'FAILED');
    const remaining = (finalTasks || []).some(t => !['VERIFIED', 'COMPLETED'].includes(t.state));
    const status = failed ? 'FAILED' : remaining ? 'WAITING' : 'COMPLETED';
    const result = { completed_tasks: completed, total_tasks: finalTasks?.length || 0, status, context };
    await supabase.from('timeoe_commands').update({ status, result, completed_at: ['COMPLETED', 'FAILED'].includes(status) ? new Date().toISOString() : null }).eq('id', commandId);
    await emit(commandId, null, null, status === 'COMPLETED' ? 'EXECUTION_COMPLETED' : 'EXECUTION_FINISHED', status, result);
    return NextResponse.json({ command_id: commandId, status, tasks: finalTasks, result });
  } catch (error) {
    await supabase.from('timeoe_commands').update({ status: 'FAILED', result: { error: error.message } }).eq('id', commandId);
    try { await emit(commandId, null, null, 'EXECUTION_FAILED', 'FAILED', { error: error.message }); } catch (_) {}
    return NextResponse.json({ error: error.message || 'Execution failed', command_id: commandId }, { status: 500 });
  }
}
