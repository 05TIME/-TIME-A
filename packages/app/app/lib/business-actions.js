import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SENSITIVE_ACTIONS = new Set([
  'SPEND_MONEY', 'PAYOUT', 'SEND_EXTERNAL_MESSAGE', 'CHANGE_PRICE', 'CREATE_CONTRACT'
]);

export function actionRequiresApproval(actionType, control) {
  if (SENSITIVE_ACTIONS.has(actionType)) return true;
  if (actionType === 'SPEND_MONEY') return Boolean(control?.require_approval_for_spend ?? true);
  if (actionType === 'PAYOUT') return Boolean(control?.require_approval_for_payout ?? true);
  if (actionType === 'SEND_EXTERNAL_MESSAGE') return Boolean(control?.require_approval_for_external_message ?? true);
  return false;
}

export async function emitBusinessEvent(commandId, taskId, eventType, state, payload = {}) {
  const { error } = await supabaseAdmin.from('timeoe_events').insert({
    command_id: commandId || null, task_id: taskId || null, agent_id: null,
    event_type: eventType, state, payload
  });
  if (error) throw error;
}

export async function findExistingBusinessAction({ commandId, taskId }) {
  if (!commandId || !taskId) return null;
  const { data, error } = await supabaseAdmin.from('timeoe_business_actions')
    .select('*').eq('command_id', commandId).eq('task_id', taskId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function createBusinessAction({ businessId, commandId = null, taskId = null, actionType, provider = 'internal', payload = {}, amount = 0, currency = 'USD', requestedBy = 'timeoe' }) {
  if (!businessId || !actionType) throw new Error('businessId and actionType are required');
  const existing = await findExistingBusinessAction({ commandId, taskId });
  if (existing) return existing;

  const normalizedAmount = Number(amount || 0);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) throw new Error('Invalid action amount');
  const { data: control, error: controlError } = await supabaseAdmin
    .from('timeoe_cash_flow_controls').select('*').eq('business_id', businessId).maybeSingle();
  if (controlError) throw controlError;

  const approvalRequired = actionRequiresApproval(actionType, control);
  const limit = actionType === 'PAYOUT'
    ? Number(control?.payout_limit ?? Number.POSITIVE_INFINITY)
    : Number(control?.spend_limit ?? Number.POSITIVE_INFINITY);
  if (['PAYOUT', 'SPEND_MONEY'].includes(actionType) && normalizedAmount > limit) {
    throw new Error(`${actionType} exceeds configured cash-flow limit`);
  }

  const status = approvalRequired ? 'PENDING_APPROVAL' : 'READY';
  const { data: action, error } = await supabaseAdmin.from('timeoe_business_actions').insert({
    business_id: businessId, command_id: commandId, task_id: taskId,
    action_type: actionType, provider,
    payload: { ...payload, amount: normalizedAmount, currency, requested_by: requestedBy },
    status, requires_approval: approvalRequired, external_effect: true
  }).select().single();
  if (error) throw error;
  await emitBusinessEvent(commandId, taskId, approvalRequired ? 'ACTION_APPROVAL_REQUIRED' : 'ACTION_READY', status, {
    action_id: action.id, action_type: actionType, provider, amount: normalizedAmount, currency
  });
  return action;
}
