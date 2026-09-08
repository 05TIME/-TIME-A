import { NextResponse } from 'next/server';
import { supabaseAdmin, emitBusinessEvent } from '../../../../lib/business-actions';
import { getAuthenticatedUser } from '../../../../lib/auth';

export async function POST(request, { params }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const approvedBy = user.id;
    if (body.approved_by && body.approved_by !== user.id && body.approved_by !== 'human') {
      return NextResponse.json({ error: 'approved_by must match the authenticated user' }, { status: 403 });
    }

    const { data: action, error: actionError } = await supabaseAdmin.from('timeoe_business_actions').select('*').eq('id', params.id).single();
    if (actionError) throw actionError;
    if (action.status !== 'PENDING_APPROVAL') return NextResponse.json({ error: `Action is ${action.status}, not pending approval` }, { status: 409 });

    const { data: approved, error } = await supabaseAdmin.from('timeoe_business_actions').update({
      status: 'APPROVED', approved_by: approvedBy, approved_at: new Date().toISOString()
    }).eq('id', action.id).eq('status', 'PENDING_APPROVAL').select().single();
    if (error) throw error;
    await emitBusinessEvent(action.command_id, action.task_id, 'ACTION_APPROVED', 'APPROVED', { action_id: action.id, approved_by: approvedBy });
    return NextResponse.json({ action_id: action.id, status: approved.status, command_id: action.command_id });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to approve action' }, { status: 500 });
  }
}
