from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def test_business_action_creation_reuses_existing_command_task_action():
    source = read('packages/app/app/lib/business-actions.js')
    assert 'findExistingBusinessAction' in source
    assert "eq('command_id', commandId)" in source
    assert "eq('task_id', taskId)" in source
    assert 'idempotency_key: idempotencyKey' in source
    assert "error.code === '23505'" in source
    assert 'if (existing) return existing' in source


def test_revenue_path_is_explicitly_verified():
    source = read('packages/app/app/api/business-actions/[id]/execute/route.js')
    assert 'adapterResult.verified_sale === true' in source
    assert 'recordVerifiedRevenue' in source


def test_revenue_ledger_uses_schema_types_and_integer_business_day():
    source = read('packages/app/app/lib/revenue.js')
    assert "type: 'income'" in source
    assert "select('current_day')" in source
    assert 'const day = Number(business.current_day || 1)' in source


def test_paystack_webhook_uses_schema_income_type():
    source = read('packages/app/app/api/payments/paystack/webhook/route.js')
    assert "type: 'income'" in source
    assert "type: 'INCOME'" not in source
