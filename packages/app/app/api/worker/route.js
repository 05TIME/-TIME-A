import { NextResponse } from 'next/server';
import { supabaseAdmin, emitBusinessEvent } from '../../lib/business-actions';

function classify(objective = '') {
  const text = objective.toLowerCase();
  if (/\b(outreach|prospect|lead|customer|email|message|sales|sell|acquire)\b/.test(text)) return 'SEND_EXTERNAL_MESSAGE';
  return null;
}

async function runCommand(command, requestUrl) {
  const url = new URL(`/api/commands/${command.id}/execute`, requestUrl);
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' } });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

export async function POST(request) {
  try {
    const secret = process.env.TIMEOE_WORKER_SECRET;
    if (secret && request.headers.get('x-timeoe-worker-secret') !== secret) return NextResponse.json({ error: 'Unauthorized worker' }, { status: 401 });

    const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit') || 5), 1), 20);
    const { data: commands, error } = await supabaseAdmin.from('timeoe_commands').select('*').in('status', ['QUEUED', 'RUNNING', 'WAITING']).order('created_at', { ascending: true }).limit(limit);
    if (error) throw error;

    await emitBusinessEvent(null, null, 'WORKER_TICK', 'RUNNING', { selected: commands?.length || 0, limit });
    const results = [];
    for (const command of commands || []) {
      try {
        const actionType = classify(command.objective);
        if (actionType && !command.business_id) {
          await emitBusinessEvent(command.id, null, 'COMMAND_WAITING_BUSINESS_CONTEXT', 'WAITING', { reason: 'business_id_required_for_external_action' });
          results.push({ command_id: command.id, status: 'WAITING', reason: 'business_id_required' });
          continue;
        }
        results.push({ command_id: command.id, ...(await runCommand(command, request.url)) });
      } catch (error) {
        await emitBusinessEvent(command.id, null, 'WORKER_COMMAND_ERROR', 'FAILED', { error: error.message });
        results.push({ command_id: command.id, status: 500, error: error.message });
      }
    }
    await emitBusinessEvent(null, null, 'WORKER_TICK_COMPLETED', 'VERIFIED', { processed: results.length });
    return NextResponse.json({ worker: 'TIMEOE', processed: results.length, results });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Worker failed' }, { status: 500 });
  }
}
