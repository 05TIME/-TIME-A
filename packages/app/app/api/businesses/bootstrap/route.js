import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/business-actions';
import { getAuthenticatedUser } from '../../../lib/auth';

async function findExisting(userId) {
  const { data, error } = await supabaseAdmin
    .from('memberships')
    .select('business_id,role,businesses(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const existingMembership = await findExisting(user.id);
    if (existingMembership?.business_id) {
      return NextResponse.json({ business: existingMembership.businesses, membership: existingMembership, created: false });
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({ owner_id: user.id, name: 'TIMEŒ COMMAND', template: 'TIMEOE_AUTONOMOUS_BUSINESS', mode: 'real', cash: 0, monthly_revenue: 0, monthly_expenses: 0, customers: 0, leads: 0, team_size: 1, morale: 100, operating_score: 100, current_day: 1 })
      .select().single();
    if (businessError) {
      if (businessError.code === '23505') {
        const winner = await findExisting(user.id);
        if (winner?.business_id) return NextResponse.json({ business: winner.businesses, membership: winner, created: false });
      }
      throw businessError;
    }

    const { data: membership, error: newMembershipError } = await supabaseAdmin
      .from('memberships')
      .insert({ business_id: business.id, user_id: user.id, role: 'owner' })
      .select().single();
    if (newMembershipError) {
      if (newMembershipError.code === '23505') {
        const winner = await findExisting(user.id);
        if (winner?.business_id) {
          await supabaseAdmin.from('businesses').delete().eq('id', business.id);
          return NextResponse.json({ business: winner.businesses, membership: winner, created: false });
        }
      }
      throw newMembershipError;
    }

    const { error: controlError } = await supabaseAdmin.from('timeoe_cash_flow_controls').insert({ business_id: business.id, spend_limit: 0, payout_limit: 0, require_approval_for_spend: true, require_approval_for_payout: true, require_approval_for_external_message: true });
    if (controlError) throw controlError;
    return NextResponse.json({ business, membership, created: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to bootstrap business' }, { status: 500 });
  }
}
