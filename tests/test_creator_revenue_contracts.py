from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def test_creator_attribution_requires_authenticated_business_access():
    source = read('packages/app/app/api/content/attribution/route.js')
    assert 'getAuthenticatedUser' in source
    assert "from('memberships')" in source
    assert 'Business access denied' in source


def test_creator_attribution_creates_approval_gated_payout():
    source = read('packages/app/app/api/content/attribution/route.js')
    assert "actionType: 'PAYOUT'" in source
    assert "provider: 'creator_payout'" in source
    assert 'creatorSharePercent' in source
    assert 'payout_action_id' in source
    assert 'PAYOUT_PENDING_APPROVAL' in source


def test_creator_share_defaults_to_thirty_percent():
    source = read('packages/app/app/api/content/attribution/route.js')
    assert "Number(campaign.revenue_share_percent || 30)" in source
    assert 'amount * creatorSharePercent / 100' in source
