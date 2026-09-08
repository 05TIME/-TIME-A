from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def test_dispatch_workflow_exists_and_has_required_triggers():
    workflow = read('.github/workflows/gpt_dispatch_tests.yml')
    assert 'repository_dispatch:' in workflow
    assert 'run_telemetry_test' in workflow
    assert 'run_all_tests' in workflow
    assert 'pytest -v --tb=short' in workflow


def test_business_action_layer_has_approval_gate_and_idempotency():
    source = read('packages/app/app/lib/business-actions.js')
    assert 'PENDING_APPROVAL' in source
    assert 'SEND_EXTERNAL_MESSAGE' in source
    assert 'actionRequiresApproval' in source
    assert 'findExistingBusinessAction' in source


def test_provider_execution_never_fakes_missing_adapter():
    source = read('packages/app/app/api/business-actions/[id]/execute/route.js')
    assert 'ACTION_WAITING_FOR_ADAPTER' in source
    assert 'No adapter configured' in source
    assert "status: 'WAITING'" in source


def test_revenue_requires_explicit_verified_sale_and_rejects_simulation():
    source = read('packages/app/app/lib/revenue.js')
    assert 'verified_sale' in source
    assert 'Revenue amount must be positive' in source
    assert 'Simulation/test actions cannot create live revenue' in source
    assert 'TIMEOE_REVENUE' in source
    assert 'REVENUE_VERIFIED' in source


def test_command_executor_is_approval_aware():
    source = read('packages/app/app/api/commands/[id]/execute/route.js')
    assert 'PENDING_APPROVAL' in source
    assert 'TASK_WAITING_APPROVAL' in source
    assert 'business_id: command.business_id' in source
