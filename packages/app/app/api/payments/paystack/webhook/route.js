import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin, emitBusinessEvent } from '../../../../lib/business-actions';

export async function POST(request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: 'Payment provider is not configured' }, { status: 503 });
    const raw = await request.text();
    const signature = request.headers.get('x-paystack-signature') || '';
    const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
    const supplied = Buffer.from(signature, 'utf8');
    const calculated = Buffer.from(expected, 'utf8');
    if (!signature || supplied.length !== calculated.length || !crypto.timingSafeEqual(supplied, calculated)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    const event = JSON.parse(raw);
    if (event.event !== 'charge.success') return NextResponse.json({ received: true });
    const data = event.data || {};
    const reference = data.reference;
    if (!reference) return NextResponse.json({ received: true });

    const { data: order, error: orderError } = await supabaseAdmin.from('timeoe_payment_orders').select('*').eq('reference', reference).single();
    if (orderError) throw orderError;
    if (order.status === 'PAID') return NextResponse.json({ received: true, status: 'already_processed' });

    const paidAmount = Number(data.amount || 0) / 100;
    if (paidAmount !== Number(order.amount) || String(data.currency || '') !== String(order.currency)) return NextResponse.json({ error: 'Payment amount or currency mismatch' }, { status: 400 });

    const { data: updated, error: updateError } = await supabaseAdmin.from('timeoe_payment_orders').update({
      status: 'PAID', paystack_transaction_id: String(data.id || ''), paid_at: new Date().toISOString(),
      metadata: { ...(order.metadata || {}), paystack: { id: data.id, channel: data.channel, customer_code: data.customer?.customer_code || null } }
    }).eq('id', order.id).eq('status', 'INITIALIZED').select().single();
    if (updateError) {
      const { data: current } = await supabaseAdmin.from('timeoe_payment_orders').select('status').eq('id', order.id).maybeSingle();
      if (current?.status === 'PAID') return NextResponse.json({ received: true, status: 'already_processed' });
      throw updateError;
    }

    if (order.business_id) {
      const description = `TIMEOE payment | reference:${reference}`;
      const { data: existing } = await supabaseAdmin.from('transactions').select('id').eq('business_id', order.business_id).eq('category', 'TIMEOE_REVENUE').eq('description', description).maybeSingle();
      if (!existing) {
        const { error: transactionError } = await supabaseAdmin.from('transactions').insert({ business_id: order.business_id, type: 'income', amount: paidAmount, category: 'TIMEOE_REVENUE', description, occurred_at: new Date().toISOString() });
        if (transactionError) throw transactionError;
        const { data: business } = await supabaseAdmin.from('businesses').select('current_day').eq('id', order.business_id).single();
        const day = Number(business?.current_day || 1);
        const { data: previous } = await supabaseAdmin.from('kpi_snapshots').select('*').eq('business_id', order.business_id).eq('day', day).maybeSingle();
        const revenue = Number(previous?.revenue || 0) + paidAmount;
        const snapshot = { business_id: order.business_id, day, cash: Number(previous?.cash || 0) + paidAmount, revenue, expenses: Number(previous?.expenses || 0), customers: Number(previous?.customers || 0), leads: Number(previous?.leads || 0), operating_score: Number(previous?.operating_score || 0), created_at: new Date().toISOString() };
        const snapshotResult = previous
          ? await supabaseAdmin.from('kpi_snapshots').update(snapshot).eq('id', previous.id).select().single()
          : await supabaseAdmin.from('kpi_snapshots').insert(snapshot).select().single();
        if (snapshotResult.error) throw snapshotResult.error;
        await emitBusinessEvent(null, null, 'REVENUE_VERIFIED', 'VERIFIED', { reference, payment_order_id: order.id, amount: paidAmount, currency: order.currency, product_code: order.product_code });
      }
    }
    return NextResponse.json({ received: true, status: updated.status });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
