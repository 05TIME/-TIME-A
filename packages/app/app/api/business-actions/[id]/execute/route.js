import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function emit(action, eventType, state, payload = {}) {
  const { error } = await supabase.from('timeoe_events').insert({ command_id: action.command_id, task_id: action.task_id, event_type: eventType, state, payload });
  if (error) throw error;
}

export async function POST(_request, { params }) {
  try {
    const { data: action, error: actionError } = await supabase.from('timeoe_business_actions').select('*').eq('id', params.id).single();
    if (actionError) throw actionError;
    if (!['READY', 'APPROVED'].includes(action.status)) return NextResponse.json({ error: `Action is ${action.status} and cannot execute` }, { status: 409 });

    await supabase.from('timeoe_business_actions').update({ status: 'EXECUTING', started_at: new Date().toISOString() }).eq('id', action.id);
    await emit(action, 'ACTION_EXECUTING', 'RUNNING', { action_id: action.id, provider: action.provider });

    // Provider adapters are intentionally explicit. No external side effect is performed until an adapter exists.
    const adapterKey = `TIMEOE_${String(action.provider).toUpperCase()}_ADAPTER_URL`;
    const adapterUrl = process.env[adapterKey];
    if (!adapterUrl) {
      await supabase.from('timeoe_business_actions').update({ status: 'WAITING', error: `No adapter configured for provider ${action.provider}` }).eq('id', action.id);
      await emit(action, 'ACTION_WAITING_FOR_ADAPTER', 'WAITING', { action_id: action.id, provider: action.provider });
      return NextResponse.json({ action_id: action.id, status: 'WAITING', reason: 'provider_adapter_not_configured' });
    }

    const response = await fetch(adapterUrl, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-timeoe-action-id': action.id },
      body: JSON.stringify({ action_id: action.id, action_type: action.action_type, business_id: action.business_id, payload: action.payload })
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Provider adapter returned ${response.status}: ${text.slice(0, 500)}`);

    const result = { provider: action.provider, response: text.slice(0, 4000) };
    await supabase.from('timeoe_business_actions').update({ status: 'COMPLETED', result, completed_at: new Date().toISOString(), error: null }).eq('id', action.id);
    await emit(action, 'ACTION_COMPLETED', 'COMPLETED', { action_id: action.id, provider: action.provider, result });
    return NextResponse.json({ action_id: action.id, status: 'COMPLETED', result });
  } catch (error) {
    try {
      const { data: action } = await supabase.from('timeoe_business_actions').select('*').eq('id', params.id).maybeSingle();
      if (action) {
        await supabase.from('timeoe_business_actions').update({ status: 'FAILED', error: error.message }).eq('id', action.id);
        await emit(action, 'ACTION_FAILED', 'FAILED', { action_id: action.id, error: error.message });
      }
    } catch (_) {}
    return NextResponse.json({ error: error.message || 'Business action failed' }, { status: 500 });
  }
}
