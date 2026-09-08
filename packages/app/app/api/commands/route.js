import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '../../../lib/auth';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const objective = String(body.objective || '').trim();
    const businessId = body.business_id || null;
    if (!objective) return NextResponse.json({ error: 'objective is required' }, { status: 400 });

    const { data: command, error: commandError } = await supabase.from('timeoe_commands').insert({ objective, business_id: businessId, status: 'QUEUED', plan: { source: 'timeoe-command-center', requested_by: user.id } }).select().single();
    if (commandError) throw commandError;

    const steps = [
      { task_key: 'plan', title: 'Decompose objective', dependencies: [], input: { objective } },
      { task_key: 'execute', title: 'Execute first action', dependencies: ['plan'], input: { objective } },
      { task_key: 'verify', title: 'Verify result', dependencies: ['execute'], input: { objective } },
      { task_key: 'adapt', title: 'Adapt next action', dependencies: ['verify'], input: { objective } }
    ];
    const tasks = [];
    for (const step of steps) {
      const { data: task, error } = await supabase.from('timeoe_execution_tasks').insert({ command_id: command.id, business_id: businessId, task_key: step.task_key, title: step.title, dependencies: step.dependencies, state: 'QUEUED', attempts: 0, input: step.input }).select().single();
      if (error) throw error;
      tasks.push(task);
    }
    await supabase.from('timeoe_events').insert({ command_id: command.id, event_type: 'COMMAND_RECEIVED', state: 'QUEUED', payload: { objective, requested_by: user.id } });
    await supabase.from('timeoe_events').insert({ command_id: command.id, event_type: 'GRAPH_CREATED', state: 'QUEUED', payload: { task_count: tasks.length } });

    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const workerSecret = process.env.TIMEOE_WORKER_SECRET;
    if (!workerSecret) throw new Error('TIMEOE_WORKER_SECRET is not configured');
    fetch(`${origin}/api/commands/${command.id}/execute`, { method: 'POST', headers: { 'x-timeoe-worker-secret': workerSecret } }).catch(() => {});
    return NextResponse.json({ command, tasks, execution: 'STARTED' });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Command creation failed' }, { status: 500 });
  }
}
