import { NextResponse } from 'next/server';

/**
 * Deterministic test adapter only. It never performs an external side effect
 * and never creates revenue. Production providers must use their own adapter.
 */
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const actionType = body.action_type || 'UNKNOWN';
  const payload = body.payload || {};
  const simulateSale = payload.simulate_sale === true;
  const amount = Number(payload.simulated_amount || 0);

  return NextResponse.json({
    simulation: true,
    delivered: actionType === 'SEND_EXTERNAL_MESSAGE',
    action_type: actionType,
    verified_sale: simulateSale && Number.isFinite(amount) && amount > 0,
    ...(simulateSale && Number.isFinite(amount) && amount > 0 ? { amount, currency: payload.currency || 'USD' } : {})
  });
}
