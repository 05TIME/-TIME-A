import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components may not be able to mutate cookies; callers can still read the session.
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

export function workerAuthorized(request) {
  const secret = process.env.TIMEOE_WORKER_SECRET;
  return Boolean(secret) && request.headers.get('x-timeoe-worker-secret') === secret;
}
