import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../lib/business-actions';

const PRODUCTS = {
  timeoe_launch: { name: 'TIMEŒ AI Business Automation Launch', amount: 5000000, currency: 'NGN' },
  timeoe_pro: { name: 'TIMEŒ AI Operations Pro', amount: 15000000, currency: 'NGN' }
};

export async function POST(request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    if (!secret) return NextResponse.json({ error: 'Payment provider is not configured' }, { status: 503 });

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const productCode = String(body.product_code || 'timeoe_launch');
    const product = PRODUCTS[productCode];
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Valid customer email is required' }, { status: 400 });
    if (!product) return NextResponse.json({ error: 'Unknown product' }, { status: 400 });

    const reference = `TIMEOE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const businessId = process.env.TIMEOE_REVENUE_BUSINESS_ID || null;
    const { error: orderError } = await supabaseAdmin.from('timeoe_payment_orders').insert({
      business_id: businessId,
      email,
      product_code: productCode,
      product_name: product.name,
      amount: product.amount / 100,
      currency: product.currency,
      reference,
      metadata: { source: 'timeoe_checkout' }
    });
    if (orderError) throw orderError;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        amount: String(product.amount),
        currency: product.currency,
        reference,
        callback_url: `${appUrl}/payment/success?reference=${encodeURIComponent(reference)}`,
        metadata: { reference, product_code: productCode, product_name: product.name }
      })
    });
    const result = await response.json();
    if (!response.ok || !result.status) throw new Error(result.message || 'Paystack initialization failed');
    return NextResponse.json({ authorization_url: result.data.authorization_url, reference });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to initialize payment' }, { status: 500 });
  }
}
