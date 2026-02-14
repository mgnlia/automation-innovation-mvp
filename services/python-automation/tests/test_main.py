from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_ok() -> None:
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_inventory_returns_items() -> None:
    response = client.get('/inventory')
    assert response.status_code == 200
    body = response.json()
    assert 'items' in body
    assert len(body['items']) >= 1


def test_plan_contains_steps() -> None:
    payload = {
        'objective': 'Reduce stockouts',
        'trigger': 'Webhook event',
        'action': 'Create restock task',
        'guardrail': 'Human approval for high risk items',
    }
    response = client.post('/plan', json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body['objective'] == payload['objective']
    assert len(body['steps']) >= 5


def test_restock_predictor_schema() -> None:
    response = client.post('/predict/restock')
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body.get('predictions'), list)
    assert {'sku', 'recommended_reorder', 'confidence', 'risk'} <= set(body['predictions'][0].keys())


def test_webhook_simulate_sale() -> None:
    response = client.post(
        '/webhook/simulate',
        json={
            'sku': 'SKU-1002',
            'event_type': 'sale',
            'delta': 2,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body['event']['event_type'] == 'sale'
    assert 'item' in body
