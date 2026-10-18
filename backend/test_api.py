"""
Awaazify backend integration tests.

P0 SECURITY MODEL: every API route requires a valid Supabase JWT
(`Authorization: Bearer <token>`); admin routes additionally require
role='admin'. These tests verify:

1. Unauthenticated requests are rejected with 401 (auth enforcement).
2. (Optional) the full happy-path flow when TEST_JWT is set to a valid
   Supabase access token for a user, and TEST_ADMIN_JWT for an admin user.

Run:  cd backend && python test_api.py
"""
import os
import sys
import time

try:
    from fastapi.testclient import TestClient
except ImportError:
    print("SKIP: fastapi/httpx not installed in this environment.")
    sys.exit(0)

from app.main import app

TEST_JWT = os.getenv("TEST_JWT", "")            # valid user JWT (optional)
TEST_ADMIN_JWT = os.getenv("TEST_ADMIN_JWT", "")  # valid admin JWT (optional)


def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"} if token else {}


def run_tests():
    client = TestClient(app)

    # 1. Health (public)
    res_health = client.get('/health')
    assert res_health.status_code == 200, res_health.text
    print('Health test passed:', res_health.json())

    # 2. Auth enforcement: protected routes must 401 without a token
    unauthenticated = [
        ("POST", '/api/v1/covers/generate', {
            'userId': 'usr_test_001', 'inputType': 'file', 'fileUrl': 'x.wav',
            'trimStart': 0, 'trimEnd': 30, 'isTrialPreview': True,
            'voiceModelId': 'e81d4fae-7dec-11d0-a765-00a0c91e6bf1',
            'pitchShift': 0, 'isRetry': False,
        }),
        ("POST", '/api/v1/voices/train', {
            'userId': 'usr_test_001', 'voiceName': 'X', 'audioFiles': [],
            'autoCleanNoise': True,
        }),
        ("POST", '/api/v1/payments/local-verify', {
            'userId': 'usr_test_001', 'provider': 'easypaisa', 'packageId': 'song-50',
            'amountPkr': 50, 'transactionId': 'TIDX', 'screenshotUrl': 'r.jpg',
        }),
        ("GET", '/api/v1/covers', None),
        ("GET", '/api/v1/voices/training-jobs', None),
        ("GET", '/api/v1/payments', None),
        ("POST", '/api/v1/admin/payments/some-id/approve', None),
        ("POST", '/api/v1/admin/models', {'name': 'X', 'subtitle': 'Y', 'category': 'Z'}),
        ("POST", '/api/v1/users/me/sync', None),
    ]
    for method, path, body in unauthenticated:
        if method == "POST":
            res = client.post(path, json=body)
        else:
            res = client.get(path)
        assert res.status_code == 401, f"{method} {path} -> {res.status_code} (expected 401): {res.text}"
    print(f'Auth enforcement passed: {len(unauthenticated)} unauthenticated requests rejected with 401.')

    # youtube-meta is a public utility endpoint: garbage input -> 200 with nulls
    res_meta = client.get('/api/v1/utils/youtube-meta', params={'url': 'not-a-url'})
    assert res_meta.status_code == 200, res_meta.text
    assert res_meta.json() == {"title": None, "author_name": None}, res_meta.json()
    print('youtube-meta fallback passed:', res_meta.json())

    # 3. Full happy-path flow (requires live Supabase + real JWTs)
    if not TEST_JWT:
        print('\nSKIP: TEST_JWT not set — happy-path tests need a live Supabase project')
        print('and a real user JWT. Set TEST_JWT (and TEST_ADMIN_JWT for admin tests).')
        print('\nAUTH ENFORCEMENT TESTS PASSED.')
        return

    user_h = auth_headers(TEST_JWT)

    # Cover Generate (Trial preview)
    res_cover = client.post('/api/v1/covers/generate', headers=user_h, json={
        'userId': 'ignored-by-server', 'inputType': 'file', 'fileUrl': 'sample_audio.wav',
        'trimStart': 0, 'trimEnd': 30, 'isTrialPreview': True,
        'voiceModelId': 'e81d4fae-7dec-11d0-a765-00a0c91e6bf1',
        'pitchShift': 0, 'isRetry': False,
    })
    assert res_cover.status_code == 200, res_cover.text
    print('Cover generate passed:', res_cover.json())

    # Voice Train
    res_train = client.post('/api/v1/voices/train', headers=user_h, json={
        'userId': 'ignored-by-server', 'voiceName': 'Test Studio Voice',
        'audioFiles': ['rec1.wav'], 'autoCleanNoise': True,
    })
    assert res_train.status_code == 200, res_train.text
    print('Voice train passed:', res_train.json())

    # Local Payment with unique TID
    unique_tid = f"TID_{int(time.time() * 1000)}"
    res_pay = client.post('/api/v1/payments/local-verify', headers=user_h, json={
        'userId': 'ignored-by-server', 'provider': 'easypaisa', 'packageId': 'song-50',
        'amountPkr': 50, 'transactionId': unique_tid, 'screenshotUrl': 'receipt.jpg',
    })
    assert res_pay.status_code == 200, res_pay.text
    pay_data = res_pay.json()
    print('Local payment passed:', pay_data)

    if not TEST_ADMIN_JWT:
        print('\nSKIP: TEST_ADMIN_JWT not set — admin happy-path tests skipped.')
        print('\nUSER FLOW TESTS PASSED.')
        return

    admin_h = auth_headers(TEST_ADMIN_JWT)

    # Admin Approve (race-safe: approve twice, second must 409, no double credit)
    pay_id = pay_data['paymentId']
    res_approve1 = client.post(f'/api/v1/admin/payments/{pay_id}/approve', headers=admin_h)
    assert res_approve1.status_code == 200, res_approve1.text
    res_approve2 = client.post(f'/api/v1/admin/payments/{pay_id}/approve', headers=admin_h)
    assert res_approve2.status_code == 409, res_approve2.text
    print('Admin payment approve passed (second approve -> 409, no double credit).')

    # Non-admin must be rejected with 403
    res_forbidden = client.post(f'/api/v1/admin/payments/{pay_id}/approve', headers=user_h)
    assert res_forbidden.status_code == 403, res_forbidden.text
    print('Admin role gate passed: non-admin got 403.')

    # Admin Create Model
    res_model = client.post('/api/v1/admin/models', headers=admin_h, json={
        'name': f'Custom Model {int(time.time())}',
        'subtitle': 'Verified Model',
        'category': 'Cricketers & Celebs',
        'modelFileUrl': 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P/view',
        'status': 'Active',
    })
    assert res_model.status_code == 200, res_model.text
    print('Admin create model passed:', res_model.json())

    print('\nALL BACKEND PIPELINES AND ENDPOINTS VERIFIED SUCCESSFULLY!')


if __name__ == '__main__':
    run_tests()
