// Safe browser-side Supabase client.
// Only the publishable key belongs here; never use service_role/secret keys.
const CLUTTER_SUPABASE_URL = 'https://epqcopbhjrcgfejvdynd.supabase.co';
const CLUTTER_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_v-EppQG54GgpxBD63hOdMg_4NbIHLyD';

export function createSupabaseClient() {
  if (!window.supabase) throw new Error('Supabase browser library is not loaded.');
  return window.supabase.createClient(CLUTTER_SUPABASE_URL, CLUTTER_SUPABASE_PUBLISHABLE_KEY);
}
