import { NextResponse } from 'next/server';
import { supabaseAdmin, createBusinessAction, emitBusinessEvent } from '../../../lib/business-actions';
import { getAuthenticatedUser } from '../../../lib/auth';

async function requireBusinessMember(request, businessId) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const { data: membership, error } = await supabaseAdmin
    .from('memberships').select('id,role').eq('business_id', businessId).eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!membership) return { error: NextResponse.json({ error: 'Business access denied' }, { status: 403 }) };
  return { user, membership };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { campaign_id, event_type = 'SALE', external_event_id = null, revenue_amount, currency = 'USD', metadata = {} } = body;
    const amount = Number(revenue_amount);
    if (!campaign_id || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'campaign_id and positive revenue_amount are required' }, { status: 400 });

    const { data: campaign, error: campaignError } = await supabaseAdmin.from('timeoe_content_campaigns').select('*').eq('id', campaign_id).single();
    if (campaignError) throw campaignError;
    const access = await requireBusinessMember(request, campaign.business_id);
    if (access.error) return access.error;

    if (external_event_id) {
      const { data: duplicate } = await supabaseAdmin.from('timeoe_content_attribution').select('*').eq('external_event_id', external_event_id).maybeSingle();
      if (duplicate) return NextResponse.json({ status: 'ALREADY_RECORDED', attribution: duplicate });
    }

    const creatorSharePercent = Number(campaign.revenue_share_percent || 30);
    if (!Number.isFinite(creatorSharePercent) || creatorSharePercent < 0 || creatorSharePercent > 100) {
      return NextResponse.json({ error: 'Campaign revenue share percent must be between 0 and 100' }, { status: 400 });
    }
    const creatorShare = Number((amount * creatorSharePercent / 100).toFixed(2));

    const { data: attribution, error } = await supabaseAdmin.from('timeoe_content_attribution').insert({
      campaign_id, event_type, external_event_id, revenue_amount: amount, currency, metadata,
      payout_status: creatorShare > 0 ? 'PAYOUT_PENDING_APPROVAL' : 'NOT_DUE'
    }).select().single();
    if (error) throw error;

    let payoutAction = null;
    if (creatorShare > 0 && campaign.creator_id) {
      payoutAction = await createBusinessAction({
        businessId: campaign.business_id,
        actionType: 'PAYOUT',
        provider: 'creator_payout',
        amount: creatorShare,
        currency,
        payload: {
          creator_id: campaign.creator_id,
          campaign_id,
          attribution_id: attribution.id,
          revenue_amount: amount,
          revenue_share_percent: creatorSharePercent,
          performance_based: true
        },
        requestedBy: `timeoe_content_manager:${access.user.id}`
      });
      const { error: payoutLinkError } = await supabaseAdmin.from('timeoe_content_attribution').update({
        payout_action_id: payoutAction.id,
        payout_status: payoutAction.status === 'PENDING_APPROVAL' ? 'PAYOUT_PENDING_APPROVAL' : 'PAYOUT_READY'
      }).eq('id', attribution.id);
      if (payoutLinkError) throw payoutLinkError;
    }

    await emitBusinessEvent(null, null, 'CREATOR_REVENUE_ATTRIBUTED', 'VERIFIED', {
      campaign_id, attribution_id: attribution.id, revenue_amount: amount,
      creator_share: creatorShare, creator_share_percent: creatorSharePercent, currency,
      payout_action_id: payoutAction?.id || null, payout_status: payoutAction?.status || 'NOT_DUE'
    });
    return NextResponse.json({ status: 'RECORDED', attribution: { ...attribution, payout_action_id: payoutAction?.id || null, payout_status: payoutAction?.status || attribution.payout_status }, revenue: amount, creator_share: creatorShare, platform_share: Number((amount - creatorShare).toFixed(2)), currency, payout_action: payoutAction });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to attribute revenue' }, { status: 500 });
  }
}
