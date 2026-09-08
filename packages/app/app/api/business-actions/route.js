import { NextResponse } from 'next/server';
import { createBusinessAction } from '../../lib/business-actions';

export async function POST(request) {
  try {
    const body = await request.json();
    const { business_id, command_id = null, task_id = null, action_type, provider = 'internal', payload = {}, amount = 0, currency = 'USD', requested_by = 'timeoe' } = body;
    if (!business_id || !action_type) return NextResponse.json({ error: 'business_id and action_type are required' }, { status: 400 });
    const action = await createBusinessAction({ businessId: business_id, commandId: command_id, taskId: task_id, actionType: action_type, provider, payload, amount, currency, requestedBy: requested_by });
    return NextResponse.json({ action, status: action.status, approval_required: action.requires_approval });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to create business action' }, { status: 500 });
  }
}
