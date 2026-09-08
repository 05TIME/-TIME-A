import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function emit(action, eventType, state, payload = {}) {
  const { error } = await supabase.from('timeoe_events').insert({ command_id: action.command_id, task_id: action.task_id, event_type: eventType, state, payload });
  if (error) throw error;
}

export async function POST(request, { params }) {
  try {
    const body = await request.json().catch(() => ({}));
    const approvedBy = body.approved_by || 'human';
    const { data: action, error: actionError } = await supabase.from('timeoe_business_actions').select('*').eq('id', params.id).single();
    if (actionError) throw actionError;
    if (action.status !== 'PENDING_APPROVAL') return NextResponse.json({ error: `Action is ${action.status}, not pending approval` }, { status: 409 });

    const { error } = await supabase.from('timeoe_business_actions').update({ status: 'APPROVED', approved_by: approvedBy, approved_at: new Date().toISOString() }).eq('id', action.id);
    if (error) throw error;
    await emit(action, 'ACTION_APPROVED', 'APPROVED', { action_id: action.id, approved_by: approvedBy });
    return NextResponse.json({ action_id: action.id, status: 'APPROVED' });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to approve action' }, { status: 500 });
  }
}
