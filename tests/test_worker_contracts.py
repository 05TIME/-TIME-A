from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def test_worker_has_queue_and_auth_gate():
    source = read('packages/app/app/api/worker/route.js')
    assert "in('status', ['QUEUED', 'RUNNING', 'WAITING'])" in source
    assert 'TIMEOE_WORKER_SECRET' in source
    assert 'x-timeoe-worker-secret' in source


def test_worker_never_executes_external_action_without_business_context():
    source = read('packages/app/app/api/worker/route.js')
    assert 'business_id_required_for_external_action' in source
    assert 'business_id_required' in source


def test_worker_is_scheduled_and_manually invokable():
    source = read('.github/workflows/timeoe_worker.yml')
    assert "cron: '*/5 * * * *'" in source
    assert 'workflow_dispatch:' in source
