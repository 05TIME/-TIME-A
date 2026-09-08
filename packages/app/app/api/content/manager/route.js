import { NextResponse } from 'next/server';
import { supabaseAdmin, emitBusinessEvent } from '../../../lib/business-actions';

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'x', 'facebook', 'linkedin'];

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { business_id, title, brief, creator_id = null, channel_id = null, platform = 'x' } = body;
    if (!business_id || !title) return NextResponse.json({ error: 'business_id and title are required' }, { status: 400 });
    if (!PLATFORMS.includes(String(platform).toLowerCase())) return NextResponse.json({ error: 'Unsupported social platform' }, { status: 400 });

    const attributionCode = `TIMEOE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { data: campaign, error } = await supabaseAdmin.from('timeoe_content_campaigns').insert({
      business_id, creator_id, channel_id, title, brief: brief || null,
      attribution_code: attributionCode, revenue_share_percent: 30.00, status: 'DRAFT'
    }).select().single();
    if (error) throw error;

    const { data: post, error: postError } = await supabaseAdmin.from('timeoe_content_posts').insert({
      campaign_id: campaign.id, platform: String(platform).toLowerCase(), route: 'TIMEOE', status: 'DRAFT'
    }).select().single();
    if (postError) throw postError;

    await emitBusinessEvent(null, null, 'CONTENT_CAMPAIGN_CREATED', 'QUEUED', {
      campaign_id: campaign.id, post_id: post.id, attribution_code: attributionCode,
      revenue_share_percent: 30
    });
    return NextResponse.json({ campaign, post, compensation: { creator_share_percent: 30, basis: 'verified_attributed_revenue' } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to create content campaign' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const businessId = new URL(request.url).searchParams.get('business_id');
    if (!businessId) return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    const { data, error } = await supabaseAdmin.from('timeoe_content_campaigns').select('*, timeoe_content_posts(*), timeoe_creators(*)').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ campaigns: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to load content campaigns' }, { status: 500 });
  }
}
