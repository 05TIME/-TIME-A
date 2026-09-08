import { NextResponse } from 'next/server';
import { createBusinessAction } from '../../lib/business-actions';
import { getAuthenticatedUser } from '../../lib/auth';

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { business_id, command_id = null, task_id = null, action_type, provider = 'internal', payload = {}, amount = 0, currency = 'USD' } = body;
    if (!business_id || !action_type) return NextResponse.json({ error: 'business_id and action_type are required' }, { status: 400 });
    const action = await createBusinessAction({
      businessId: business_id,
      commandId: command_id,
      taskId: task_id,
      actionType: action_type,
      provider,
      payload,
      amount,
      currency,
      requestedBy: user.id
    });
    return NextResponse.json({ action, status: action.status, approval_required: action.requires_approval });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to create business action' }, { status: 500 });
  }
}
