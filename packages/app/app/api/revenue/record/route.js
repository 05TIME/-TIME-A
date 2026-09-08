import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function emit(action, eventType, state, payload = {}) {
  const { error } = await supabase.from('timeoe_events').insert({
    command_id: action.command_id,
    task_id: action.task_id,
    event_type: eventType,
    state,
    payload
  });
  if (error) throw error;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const actionId = body.action_id;
    const verifiedSale = body.verified_sale === true;
    const amount = Number(body.amount);
    const currency = body.currency || 'USD';
    if (!actionId || !verifiedSale || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'action_id, verified_sale=true and a positive amount are required' }, { status: 400 });
    }

    const { data: action, error: actionError } = await supabase.from('timeoe_business_actions').select('*').eq('id', actionId).single();
    if (actionError) throw actionError;
    if (action.status !== 'COMPLETED') return NextResponse.json({ error: `Revenue requires a COMPLETED business action; action is ${action.status}` }, { status: 409 });
    if (!['SEND_EXTERNAL_MESSAGE', 'CREATE_SALE', 'SALE'].includes(action.action_type)) {
      return NextResponse.json({ error: `Action type ${action.action_type} is not a revenue action` }, { status: 409 });
    }

    const description = `TIMEOE revenue | action:${action.id} | provider:${action.provider}`;
    const { data: existing } = await supabase.from('transactions').select('*').eq('business_id', action.business_id).eq('category', 'TIMEOE_REVENUE').eq('description', description).maybeSingle();
    if (existing) return NextResponse.json({ transaction_id: existing.id, status: 'ALREADY_RECORDED', amount: existing.amount });

    const occurredAt = body.occurred_at || new Date().toISOString();
    const { data: transaction, error: transactionError } = await supabase.from('transactions').insert({
      business_id: action.business_id,
      type: 'INCOME',
      amount,
      category: 'TIMEOE_REVENUE',
      description,
      occurred_at: occurredAt
    }).select().single();
    if (transactionError) throw transactionError;

    const day = new Date(occurredAt).getUTCDate();
    const { data: previous } = await supabase.from('kpi_snapshots').select('*').eq('business_id', action.business_id).eq('day', day).maybeSingle();
    const revenue = Number(previous?.revenue || 0) + amount;
    const customers = Number(previous?.customers || 0);
    const leads = Number(previous?.leads || 0);
    const snapshot = {
      business_id: action.business_id,
      day,
      cash: Number(previous?.cash || 0) + amount,
      revenue,
      expenses: Number(previous?.expenses || 0),
      customers,
      leads,
      operating_score: Number(previous?.operating_score || 0),
      created_at: new Date().toISOString()
    };
    let snapshotResult;
    if (previous) {
      snapshotResult = await supabase.from('kpi_snapshots').update(snapshot).eq('id', previous.id).select().single();
    } else {
      snapshotResult = await supabase.from('kpi_snapshots').insert(snapshot).select().single();
    }
    if (snapshotResult.error) throw snapshotResult.error;

    await supabase.from('activity_log').insert({
      business_id: action.business_id,
      actor_id: null,
      event_type: 'TIMEOE_REVENUE_VERIFIED',
      message: `Verified revenue recorded from business action ${action.id}`,
      metadata: { action_id: action.id, transaction_id: transaction.id, amount, currency, provider: action.provider }
    });
    await supabase.from('timeoe_business_actions').update({ verified_at: new Date().toISOString(), verification: { verified_sale: true, transaction_id: transaction.id, amount, currency } }).eq('id', action.id);
    await emit(action, 'REVENUE_VERIFIED', 'VERIFIED', { action_id: action.id, transaction_id: transaction.id, amount, currency, revenue_total: revenue });

    return NextResponse.json({ status: 'RECORDED', transaction, kpi_snapshot: snapshotResult.data });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to record verified revenue' }, { status: 500 });
  }
}
