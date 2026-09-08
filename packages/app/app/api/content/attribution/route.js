import { NextResponse } from 'next/server';
import { supabaseAdmin, emitBusinessEvent } from '../../../lib/business-actions';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { campaign_id, event_type = 'SALE', external_event_id = null, revenue_amount, currency = 'USD', metadata = {} } = body;
    const amount = Number(revenue_amount);
    if (!campaign_id || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'campaign_id and positive revenue_amount are required' }, { status: 400 });

    const { data: campaign, error: campaignError } = await supabaseAdmin.from('timeoe_content_campaigns').select('*').eq('id', campaign_id).single();
    if (campaignError) throw campaignError;
    if (external_event_id) {
      const { data: duplicate } = await supabaseAdmin.from('timeoe_content_attribution').select('*').eq('external_event_id', external_event_id).maybeSingle();
      if (duplicate) return NextResponse.json({ status: 'ALREADY_RECORDED', attribution: duplicate });
    }

    const { data: attribution, error } = await supabaseAdmin.from('timeoe_content_attribution').insert({
      campaign_id, event_type, external_event_id, revenue_amount: amount, currency, metadata
    }).select().single();
    if (error) throw error;

    const creatorShare = amount * Number(campaign.revenue_share_percent || 30) / 100;
    await emitBusinessEvent(null, null, 'CREATOR_REVENUE_ATTRIBUTED', 'VERIFIED', {
      campaign_id, attribution_id: attribution.id, revenue_amount: amount,
      creator_share: creatorShare, creator_share_percent: Number(campaign.revenue_share_percent || 30), currency
    });
    return NextResponse.json({ status: 'RECORDED', attribution, revenue: amount, creator_share: creatorShare, platform_share: amount - creatorShare, currency });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to attribute revenue' }, { status: 500 });
  }
}
