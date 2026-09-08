import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function emit(action, eventType, state, payload = {}) {
  const { error } = await supabase.from('timeoe_events').insert({ command_id: action.command_id, task_id: action.task_id, event_type: eventType, state, payload });
  if (error) throw error;
}

async function completeLinkedTask(action, result) {
  if (!action.task_id) return;
  const { error } = await supabase.from('timeoe_execution_tasks').update({ state: 'VERIFIED', result: { business_action_id: action.id, ...result }, completed_at: new Date().toISOString(), error: null }).eq('id', action.task_id);
  if (error) throw error;
  await emit(action, 'TASK_VERIFIED', 'VERIFIED', { task_id: action.task_id, business_action_id: action.id, result });
}

export async function POST(_request, { params }) {
  let action;
  try {
    const { data, error: actionError } = await supabase.from('timeoe_business_actions').select('*').eq('id', params.id).single();
    if (actionError) throw actionError;
    action = data;
    if (!['READY', 'APPROVED'].includes(action.status)) return NextResponse.json({ error: `Action is ${action.status} and cannot execute` }, { status: 409 });

    await supabase.from('timeoe_business_actions').update({ status: 'EXECUTING', started_at: new Date().toISOString(), error: null }).eq('id', action.id);
    await emit(action, 'ACTION_EXECUTING', 'RUNNING', { action_id: action.id, provider: action.provider });

    const adapterKey = `TIMEOE_${String(action.provider).toUpperCase()}_ADAPTER_URL`;
    const adapterUrl = process.env[adapterKey];
    if (!adapterUrl) {
      await supabase.from('timeoe_business_actions').update({ status: 'WAITING', error: `No adapter configured for provider ${action.provider}` }).eq('id', action.id);
      await emit(action, 'ACTION_WAITING_FOR_ADAPTER', 'WAITING', { action_id: action.id, provider: action.provider });
      return NextResponse.json({ action_id: action.id, status: 'WAITING', reason: 'provider_adapter_not_configured' });
    }

    const response = await fetch(adapterUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-timeoe-action-id': action.id },
      body: JSON.stringify({ action_id: action.id, action_type: action.action_type, business_id: action.business_id, payload: action.payload })
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Provider adapter returned ${response.status}: ${text.slice(0, 500)}`);

    const result = { provider: action.provider, response: text.slice(0, 4000) };
    await supabase.from('timeoe_business_actions').update({ status: 'COMPLETED', result, completed_at: new Date().toISOString(), error: null }).eq('id', action.id);
    await emit(action, 'ACTION_COMPLETED', 'COMPLETED', { action_id: action.id, provider: action.provider, result });
    await completeLinkedTask(action, result);
    return NextResponse.json({ action_id: action.id, status: 'COMPLETED', result });
  } catch (error) {
    try {
      if (!action) {
        const { data } = await supabase.from('timeoe_business_actions').select('*').eq('id', params.id).maybeSingle();
        action = data;
      }
      if (action) {
        await supabase.from('timeoe_business_actions').update({ status: 'FAILED', error: error.message }).eq('id', action.id);
        await emit(action, 'ACTION_FAILED', 'FAILED', { action_id: action.id, error: error.message });
        if (action.task_id) await supabase.from('timeoe_execution_tasks').update({ state: 'FAILED', error: error.message }).eq('id', action.task_id);
      }
    } catch (_) {}
    return NextResponse.json({ error: error.message || 'Business action failed' }, { status: 500 });
  }
}
