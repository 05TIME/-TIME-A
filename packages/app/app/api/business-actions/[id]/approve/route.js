import { NextResponse } from 'next/server';
import { supabaseAdmin, emitBusinessEvent } from '../../../../lib/business-actions';

export async function POST(request, { params }) {
  try {
    const body = await request.json().catch(() => ({}));
    const approvedBy = body.approved_by || 'human';
    if (!approvedBy || approvedBy === 'system') return NextResponse.json({ error: 'A human approver is required' }, { status: 400 });

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
