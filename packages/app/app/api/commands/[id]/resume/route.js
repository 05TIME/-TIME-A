import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/business-actions';

async function emit(command, eventType, state, payload = {}) {
  const { error } = await supabaseAdmin.from('timeoe_events').insert({ command_id: command.id, event_type: eventType, state, payload });
  if (error) throw error;
}

export async function POST(_request, { params }) {
  try {
    const { data: command, error: commandError } = await supabaseAdmin.from('timeoe_commands').select('*').eq('id', params.id).single();
    if (commandError) throw commandError;

    const { data: actions, error: actionError } = await supabaseAdmin
      .from('timeoe_business_actions')
      .select('*')
      .eq('command_id', command.id)
      .order('created_at', { ascending: true });
    if (actionError) throw actionError;

    const waiting = (actions || []).filter((a) => ['PENDING_APPROVAL', 'WAITING', 'EXECUTING'].includes(a.status));
    if (waiting.length) {
      return NextResponse.json({ command_id: command.id, status: 'WAITING', blocking_actions: waiting.map((a) => ({ id: a.id, status: a.status, action_type: a.action_type })) }, { status: 409 });
    }

    const failed = (actions || []).filter((a) => a.status === 'FAILED');
    if (failed.length) return NextResponse.json({ command_id: command.id, status: 'FAILED', failed_actions: failed.map((a) => a.id) }, { status: 409 });

    await supabaseAdmin.from('timeoe_commands').update({ status: 'RUNNING' }).eq('id', command.id);
    await emit(command, 'COMMAND_RESUMED', 'RUNNING', { command_id: command.id });

    const origin = new URL(_request.url);
    const executeUrl = `${origin.origin}/api/commands/${command.id}/execute`;
    const response = await fetch(executeUrl, { method: 'POST', headers: { 'content-type': 'application/json' } });
    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Command resume failed' }, { status: 500 });
  }
}
