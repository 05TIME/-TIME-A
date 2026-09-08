import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/business-actions';
import { recordVerifiedRevenue } from '../../../../lib/revenue';

async function emit(action, eventType, state, payload = {}) {
  const { error } = await supabaseAdmin.from('timeoe_events').insert({ command_id: action.command_id, task_id: action.task_id, event_type: eventType, state, payload });
  if (error) throw error;
}

async function completeLinkedTask(action, result) {
  if (!action.task_id) return;
  const { error } = await supabaseAdmin.from('timeoe_execution_tasks').update({ state: 'VERIFIED', result: { business_action_id: action.id, ...result }, completed_at: new Date().toISOString(), error: null }).eq('id', action.task_id);
  if (error) throw error;
  await emit(action, 'TASK_VERIFIED', 'VERIFIED', { task_id: action.task_id, business_action_id: action.id, result });
}

function parseAdapterResponse(text) { try { return JSON.parse(text); } catch (_) { return { raw_response: text.slice(0, 4000) }; } }

export async function POST(_request, { params }) {
  let action;
  try {
    const { data, error: actionError } = await supabaseAdmin.from('timeoe_business_actions').select('*').eq('id', params.id).single();
    if (actionError) throw actionError;
    action = data;
    if (!['READY', 'APPROVED'].includes(action.status)) return NextResponse.json({ error: `Action is ${action.status} and cannot execute` }, { status: 409 });
    await supabaseAdmin.from('timeoe_business_actions').update({ status: 'EXECUTING', started_at: new Date().toISOString(), error: null }).eq('id', action.id);
    await emit(action, 'ACTION_EXECUTING', 'RUNNING', { action_id: action.id, provider: action.provider });

    const adapterKey = `TIMEOE_${String(action.provider).toUpperCase()}_ADAPTER_URL`;
    const adapterUrl = process.env[adapterKey];
    if (!adapterUrl) {
      await supabaseAdmin.from('timeoe_business_actions').update({ status: 'WAITING', error: `No adapter configured for provider ${action.provider}` }).eq('id', action.id);
      await emit(action, 'ACTION_WAITING_FOR_ADAPTER', 'WAITING', { action_id: action.id, provider: action.provider });
      return NextResponse.json({ action_id: action.id, status: 'WAITING', reason: 'provider_adapter_not_configured' });
    }

    const response = await fetch(adapterUrl, { method: 'POST', headers: { 'content-type': 'application/json', 'x-timeoe-action-id': action.id }, body: JSON.stringify({ action_id: action.id, action_type: action.action_type, business_id: action.business_id, payload: action.payload }) });
    const text = await response.text();
    if (!response.ok) throw new Error(`Provider adapter returned ${response.status}: ${text.slice(0, 500)}`);
    const adapterResult = parseAdapterResponse(text);
    const result = { provider: action.provider, adapter: adapterResult };
    await supabaseAdmin.from('timeoe_business_actions').update({ status: 'COMPLETED', result, completed_at: new Date().toISOString(), error: null }).eq('id', action.id);
    await emit(action, 'ACTION_COMPLETED', 'COMPLETED', { action_id: action.id, provider: action.provider, result });
    await completeLinkedTask(action, result);

    const verifiedSale = adapterResult.verified_sale === true && Number.isFinite(Number(adapterResult.amount)) && Number(adapterResult.amount) > 0;
    let revenue = null;
    if (verifiedSale) {
      revenue = await recordVerifiedRevenue({ action: { ...action, status: 'COMPLETED' }, amount: Number(adapterResult.amount), currency: adapterResult.currency || action.currency });
      await emit(action, 'SALE_VERIFIED', 'VERIFIED', { action_id: action.id, amount: Number(adapterResult.amount), currency: adapterResult.currency || action.currency, revenue_status: revenue.status, transaction_id: revenue.transaction?.id || null });
    }
    return NextResponse.json({ action_id: action.id, status: 'COMPLETED', result, revenue_eligible: verifiedSale, revenue });
  } catch (error) {
    try {
      if (!action) { const { data } = await supabaseAdmin.from('timeoe_business_actions').select('*').eq('id', params.id).maybeSingle(); action = data; }
      if (action) {
        await supabaseAdmin.from('timeoe_business_actions').update({ status: 'FAILED', error: error.message }).eq('id', action.id);
        await emit(action, 'ACTION_FAILED', 'FAILED', { action_id: action.id, error: error.message });
        if (action.task_id) await supabaseAdmin.from('timeoe_execution_tasks').update({ state: 'FAILED', error: error.message }).eq('id', action.task_id);
      }
    } catch (_) {}
    return NextResponse.json({ error: error.message || 'Business action failed' }, { status: 500 });
  }
}
