import { createClient } from '@supabase/supabase-js';

function getAuthClient() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function getAuthenticatedUser(request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return null;
  const client = getAuthClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export function workerAuthorized(request) {
  const configured = process.env.TIMEOE_WORKER_SECRET;
  if (!configured) return false;
  return request.headers.get('x-timeoe-worker-secret') === configured;
}
