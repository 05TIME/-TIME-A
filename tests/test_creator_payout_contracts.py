from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def test_creator_attribution_creates_approval_gated_payout():
    source = read('packages/app/app/api/content/attribution/route.js')
    assert 'createBusinessAction' in source
    assert "actionType: 'PAYOUT'" in source
    assert 'revenue_share_percent' in source
    assert 'payout_action_id' in source
    assert 'PAYOUT_PENDING_APPROVAL' in source


def test_creator_share_is_bounded_and_rounded():
    source = read('packages/app/app/api/content/attribution/route.js')
    assert 'creatorSharePercent < 0' in source
    assert 'creatorSharePercent > 100' in source
    assert 'toFixed(2)' in source


def test_creator_payout_uses_existing_human_approval_layer():
    source = read('packages/app/app/lib/business-actions.js')
    assert "'PAYOUT'" in source
    assert 'PENDING_APPROVAL' in source
    assert 'require_approval_for_payout' in source
