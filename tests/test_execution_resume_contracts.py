from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def test_command_resume_endpoint_exists_and_blocks_pending_actions():
    source = read('packages/app/app/api/commands/[id]/resume/route.js')
    assert 'PENDING_APPROVAL' in source
    assert "status: 'WAITING'" in source
    assert 'COMMAND_RESUMED' in source
    assert '/execute' in source


def test_provider_execution_requires_configured_adapter():
    source = read('packages/app/app/api/business-actions/[id]/execute/route.js')
    assert 'adapterUrl' in source
    assert 'ACTION_WAITING_FOR_ADAPTER' in source
    assert 'No adapter configured' in source


def test_verified_sale_is_the_only_revenue_trigger():
    source = read('packages/app/app/api/business-actions/[id]/execute/route.js')
    assert 'adapterResult.verified_sale === true' in source
    assert 'recordVerifiedRevenue' in source
