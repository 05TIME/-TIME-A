import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/business-actions';
import { recordVerifiedRevenue } from '../../../lib/revenue';

export async function POST(request) {
  try {
    const body = await request.json();
    const actionId = body.action_id;
    const verifiedSale = body.verified_sale === true;
    const amount = Number(body.amount);
    if (!actionId || !verifiedSale || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'action_id, verified_sale=true and a positive amount are required' }, { status: 400 });
    const { data: action, error } = await supabaseAdmin.from('timeoe_business_actions').select('*').eq('id', actionId).single();
    if (error) throw error;
    const result = await recordVerifiedRevenue({ action, amount, currency: body.currency || 'USD', occurredAt: body.occurred_at });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to record verified revenue' }, { status: 500 });
  }
}
