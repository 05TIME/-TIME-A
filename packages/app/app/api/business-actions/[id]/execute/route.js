import { NextResponse } from 'next/server';
import { supabaseAdmin, emitBusinessEvent } from '../../../../lib/business-actions';
import { recordVerifiedRevenue } from '../../../../lib/revenue';
import { getAuthenticatedUser } from '../../../../lib/auth';

export async function POST(request, { params }) {
  let action;
  let actionLocked = false;
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data, error } = await supabaseAdmin.from('timeoe_business_actions').select('*').eq('id', params.id).single();
    if (error) throw error;
    action = data;
    if (!['READY', 'APPROVED'].includes(action.status)) return NextResponse.json({ error: `Action is ${action.status} and cannot execute` }, { status: 409 });

    const { data: lockedAction, error: lockError } = await supabaseAdmin
      .from('timeoe_business_actions')
      .update({ status: 'EXECUTING', started_at: new Date().toISOString(), executed_at: new Date().toISOString(), error: null })
      .eq('id', action.id)
      .in('status', ['READY', 'APPROVED'])
      .select()
      .maybeSingle();
    if (lockError) throw lockError;
    if (!lockedAction) return NextResponse.json({ error: 'Action was claimed by another worker' }, { status: 409 });
    actionLocked = true;
    action = lockedAction;

    await emitBusinessEvent(action.command_id, action.task_id, 'ACTION_EXECUTING', 'RUNNING', { action_id: action.id, provider: action.provider, executed_by: user.id });

    const adapterKey = `TIMEOE_${String(action.provider).toUpperCase()}_ADAPTER_URL`;
    const adapterUrl = process.env[adapterKey];
    if (!adapterUrl) {
      await supabaseAdmin.from('timeoe_business_actions').update({ status: 'WAITING', error: `No adapter configured for provider ${action.provider}` }).eq('id', action.id).eq('status', 'EXECUTING');
      await emitBusinessEvent(action.command_id, action.task_id, 'ACTION_WAITING_FOR_ADAPTER', 'WAITING', { action_id: action.id, provider: action.provider });
      return NextResponse.json({ action_id: action.id, status: 'WAITING', reason: 'provider_adapter_not_configured' });
    }

    const response = await fetch(adapterUrl, { method: 'POST', headers: { 'content-type': 'application/json', 'x-timeoe-action-id': action.id }, body: JSON.stringify({ action_id: action.id, action_type: action.action_type, business_id: action.business_id, payload: action.payload }) });
    const text = await response.text();
    if (!response.ok) throw new Error(`Provider adapter returned ${response.status}: ${text.slice(0, 500)}`);
    let adapterResult;
    try { adapterResult = JSON.parse(text); } catch (_) { adapterResult = { raw_response: text.slice(0, 4000) }; }
    const result = { provider: action.provider, adapter: adapterResult };

    const { data: completedAction, error: completionError } = await supabaseAdmin.from('timeoe_business_actions').update({ status: 'COMPLETED', result, completed_at: new Date().toISOString(), error: null }).eq('id', action.id).eq('status', 'EXECUTING').select().single();
    if (completionError) throw completionError;
    action = completedAction;
    await emitBusinessEvent(action.command_id, action.task_id, 'ACTION_COMPLETED', 'COMPLETED', { action_id: action.id, provider: action.provider, result, completed_by: user.id });
    if (action.task_id) {
      await supabaseAdmin.from('timeoe_execution_tasks').update({ state: 'VERIFIED', result: { business_action_id: action.id, ...result }, completed_at: new Date().toISOString(), error: null }).eq('id', action.task_id);
      await emitBusinessEvent(action.command_id, action.task_id, 'TASK_VERIFIED', 'VERIFIED', { task_id: action.task_id, business_action_id: action.id, result });
    }

    const verifiedSale = adapterResult.simulation !== true && adapterResult.verified_sale === true && Number.isFinite(Number(adapterResult.amount)) && Number(adapterResult.amount) > 0;
    let revenue = null;
    if (verifiedSale) {
      revenue = await recordVerifiedRevenue({ action, amount: Number(adapterResult.amount), currency: adapterResult.currency || action.currency });
      await emitBusinessEvent(action.command_id, action.task_id, 'SALE_VERIFIED', 'VERIFIED', { action_id: action.id, amount: Number(adapterResult.amount), currency: adapterResult.currency || action.currency, revenue_status: revenue.status, transaction_id: revenue.transaction?.id || null });
    }
    return NextResponse.json({ action_id: action.id, status: 'COMPLETED', result, revenue_eligible: verifiedSale, revenue });
  } catch (error) {
    if (action && actionLocked) {
      await supabaseAdmin.from('timeoe_business_actions').update({ status: 'FAILED', error: error.message }).eq('id', action.id).eq('status', 'EXECUTING');
      await emitBusinessEvent(action.command_id, action.task_id, 'ACTION_FAILED', 'FAILED', { action_id: action.id, error: error.message });
      if (action.task_id) await supabaseAdmin.from('timeoe_execution_tasks').update({ state: 'FAILED', error: error.message }).eq('id', action.task_id);
    }
    return NextResponse.json({ error: error.message || 'Business action failed', actor: 'authenticated-user' }, { status: 500 });
  }
}
