import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request) {
  try {
    const businessId = new URL(request.url).searchParams.get('business_id') || process.env.TIMEOE_DEFAULT_BUSINESS_ID;
    if (!businessId) return NextResponse.json({ error: 'business_id is required' }, { status: 400 });

    const [{ data: actions, error: actionsError }, { data: revenue, error: revenueError }] = await Promise.all([
      supabase.from('timeoe_business_actions').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(50),
      supabase.from('transactions').select('*').eq('business_id', businessId).eq('category', 'TIMEOE_REVENUE').order('occurred_at', { ascending: false }).limit(25)
    ]);
    if (actionsError) throw actionsError;
    if (revenueError) throw revenueError;

    const verifiedRevenue = (revenue || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const pendingApprovals = (actions || []).filter(row => row.status === 'PENDING_APPROVAL').length;
    const completed = (actions || []).filter(row => row.status === 'COMPLETED').length;

    return NextResponse.json({ actions: actions || [], revenue: revenue || [], metrics: { pending_approvals: pendingApprovals, completed_actions: completed, verified_revenue: verifiedRevenue } });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Command Center feed failed' }, { status: 500 });
  }
}
