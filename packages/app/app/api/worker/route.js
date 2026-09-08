import { NextResponse } from 'next/server';
import { supabaseAdmin, createBusinessAction, emitBusinessEvent } from '../../lib/business-actions';

function classify(objective = '') {
  const text = objective.toLowerCase();
  if (/\b(outreach|prospect|lead|customer|email|message|sales|sell|acquire)\b/.test(text)) return 'SEND_EXTERNAL_MESSAGE';
  return null;
}

async function runCommand(command) {
  const url = new URL(`/api/commands/${command.id}/execute`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' } });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

export async function POST(request) {
  try {
    const secret = process.env.TIMEOE_WORKER_SECRET;
    if (secret && request.headers.get('x-timeoe-worker-secret') !== secret) return NextResponse.json({ error: 'Unauthorized worker' }, { status: 401 });

    const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') || 5), 20);
    const { data: commands, error } = await supabaseAdmin.from('timeoe_commands').select('*').in('status', ['QUEUED', 'RUNNING', 'WAITING']).order('created_at', { ascending: true }).limit(limit);
    if (error) throw error;

    const results = [];
    for (const command of commands || []) {
      try {
        const actionType = classify(command.objective);
        if (actionType && !command.business_id) {
          await emitBusinessEvent(command.id, null, 'COMMAND_WAITING_BUSINESS_CONTEXT', 'WAITING', { reason: 'business_id_required_for_external_action' });
          results.push({ command_id: command.id, status: 'WAITING', reason: 'business_id_required' });
          continue;
        }
        results.push({ command_id: command.id, ...(await runCommand(command)) });
      } catch (error) {
        await emitBusinessEvent(command.id, null, 'WORKER_COMMAND_ERROR', 'FAILED', { error: error.message });
        results.push({ command_id: command.id, status: 500, error: error.message });
      }
    }
    return NextResponse.json({ worker: 'TIMEOE', processed: results.length, results });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Worker failed' }, { status: 500 });
  }
}
