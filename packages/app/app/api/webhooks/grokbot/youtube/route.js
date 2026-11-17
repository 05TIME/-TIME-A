import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function validSignature(rawBody, timestamp, supplied, secret) {
  if (!timestamp || !supplied || !/^\d{10,13}$/.test(timestamp)) return false;
  const seconds = timestamp.length === 13 ? Math.floor(Number(timestamp) / 1000) : Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(timestamp + '.' + rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  const secret = process.env.GROKBOT_WEBHOOK_SECRET;
  const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !dbUrl || !serviceKey) {
    return NextResponse.json({ error: 'Grokbot integration is not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get('x-timeoe-timestamp') || '';
  const signature = request.headers.get('x-timeoe-signature') || '';
  if (!validSignature(rawBody, timestamp, signature, secret)) {
    return NextResponse.json({ error: 'Invalid or expired signature' }, { status: 401 });
  }

  let event;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!event?.event_id || !event?.event_type || !event?.payload || typeof event.payload !== 'object') {
    return NextResponse.json({ error: 'event_id, event_type and object payload are required' }, { status: 400 });
  }
  if (!['content.idea.created','content.research.completed','content.script.proposed','content.asset.ready'].includes(event.event_type)) {
    return NextResponse.json({ error: 'Unsupported event_type' }, { status: 422 });
  }

  const supabase = createClient(dbUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await supabase.from('youtube_agent_events').insert({
    source: 'grokbot',
    external_event_id: String(event.event_id),
    event_type: String(event.event_type),
    occurred_at: event.occurred_at || null,
    payload: event.payload
  });

  if (error?.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
  if (error) {
    console.error('Grokbot event persistence failed', error.message);
    return NextResponse.json({ error: 'Event persistence failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}
