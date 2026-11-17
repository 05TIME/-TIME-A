import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({ connected: false }, { status: 404 });
  }

  const url = process.env.YOUTUBE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ connected: false, configured: false }, { status: 503 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc('get_youtube_oauth_connection');
  if (error) {
    return NextResponse.json({ connected: false, configured: true }, { status: 503 });
  }

  const connection = Array.isArray(data) ? data[0] : null;
  return NextResponse.json({
    connected: Boolean(connection?.channel_id),
    channelTitle: connection?.channel_title || null,
    accountEmail: connection?.google_account_email || null,
  }, {
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}
