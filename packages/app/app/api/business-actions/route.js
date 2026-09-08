import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const SENSITIVE_ACTIONS = new Set(['SPEND_MONEY', 'PAYOUT', 'SEND_EXTERNAL_MESSAGE', 'CHANGE_PRICE', 'CREATE_CONTRACT']);

async function emit(commandId, taskId, agentId, eventType, state, payload = {}) {
  const { error } = await supabase.from('timeoe_events').insert({ command_id: commandId || null, task_id: taskId || null, agent_id: agentId || null, event_type: eventType, state, payload });
  if (error) throw error;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { business_id, command_id = null, task_id = null, action_type, provider = 'internal', payload = {}, amount = 0, currency = 'USD', requested_by = 'timeoe' } = body;
    if (!business_id || !action_type) return NextResponse.json({ error: 'business_id and action_type are required' }, { status: 400 });

    const normalizedAmount = Number(amount || 0);
    const { data: control } = await supabase.from('timeoe_cash_flow_controls').select('*').eq('business_id', business_id).maybeSingle();
    const approvalRequired = SENSITIVE_ACTIONS.has(action_type) || Boolean(control?.require_approval);
    const limit = action_type === 'PAYOUT' ? Number(control?.max_payout || 0) : Number(control?.max_spend || 0);
    const exceedsLimit = ['PAYOUT', 'SPEND_MONEY'].includes(action_type) && normalizedAmount > limit;
    const status = approvalRequired || exceedsLimit ? 'PENDING_APPROVAL' : 'READY';

    const { data: action, error } = await supabase.from('timeoe_business_actions').insert({
      business_id, command_id, task_id, action_type, provider,
      payload: { ...payload, amount: normalizedAmount, currency, requested_by },
      status, requires_approval: approvalRequired || exceedsLimit,
      external_effect: true
    }).select().single();
    if (error) throw error;

    await emit(command_id, task_id, null, approvalRequired || exceedsLimit ? 'ACTION_APPROVAL_REQUIRED' : 'ACTION_READY', status, {
      action_id: action.id, action_type, provider, amount: normalizedAmount, currency, exceeds_limit: exceedsLimit
    });

    return NextResponse.json({ action, status, approval_required: approvalRequired || exceedsLimit });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to create business action' }, { status: 500 });
  }
}
