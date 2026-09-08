import { supabaseAdmin } from './business-actions';

export async function recordVerifiedRevenue({ action, amount, currency = 'USD', occurredAt = new Date().toISOString() }) {
  if (!action?.id || action.status !== 'COMPLETED') throw new Error('Revenue requires a completed business action');
  if (!['SEND_EXTERNAL_MESSAGE', 'CREATE_SALE', 'SALE'].includes(action.action_type)) throw new Error(`Action type ${action.action_type} is not a revenue action`);
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Revenue amount must be positive');
  const description = `TIMEOE revenue | action:${action.id} | provider:${action.provider}`;
  const { data: existing, error: existingError } = await supabaseAdmin.from('transactions').select('*').eq('business_id', action.business_id).eq('category', 'TIMEOE_REVENUE').eq('description', description).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { status: 'ALREADY_RECORDED', transaction: existing };

  const { data: transaction, error: transactionError } = await supabaseAdmin.from('transactions').insert({
    business_id: action.business_id, type: 'INCOME', amount: value, category: 'TIMEOE_REVENUE', description, occurred_at: occurredAt
  }).select().single();
  if (transactionError) throw transactionError;

  const day = new Date(occurredAt).getUTCDate();
  const { data: previous, error: previousError } = await supabaseAdmin.from('kpi_snapshots').select('*').eq('business_id', action.business_id).eq('day', day).maybeSingle();
  if (previousError) throw previousError;
  const revenue = Number(previous?.revenue || 0) + value;
  const snapshot = {
    business_id: action.business_id, day, cash: Number(previous?.cash || 0) + value,
    revenue, expenses: Number(previous?.expenses || 0), customers: Number(previous?.customers || 0),
    leads: Number(previous?.leads || 0), operating_score: Number(previous?.operating_score || 0), created_at: new Date().toISOString()
  };
  const snapshotResult = previous
    ? await supabaseAdmin.from('kpi_snapshots').update(snapshot).eq('id', previous.id).select().single()
    : await supabaseAdmin.from('kpi_snapshots').insert(snapshot).select().single();
  if (snapshotResult.error) throw snapshotResult.error;

  const { error: activityError } = await supabaseAdmin.from('activity_log').insert({
    business_id: action.business_id, actor_id: null, event_type: 'TIMEOE_REVENUE_VERIFIED',
    message: `Verified revenue recorded from business action ${action.id}`,
    metadata: { action_id: action.id, transaction_id: transaction.id, amount: value, currency, provider: action.provider }
  });
  if (activityError) throw activityError;
  await supabaseAdmin.from('timeoe_business_actions').update({ verified_at: new Date().toISOString(), verification: { verified_sale: true, transaction_id: transaction.id, amount: value, currency } }).eq('id', action.id);
  await emitBusinessEvent(action.command_id, action.task_id, 'REVENUE_VERIFIED', 'VERIFIED', { action_id: action.id, transaction_id: transaction.id, amount: value, currency, revenue_total: revenue });
  return { status: 'RECORDED', transaction, kpi_snapshot: snapshotResult.data };
}
