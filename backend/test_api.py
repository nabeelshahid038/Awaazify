import sys
import time
from fastapi.testclient import TestClient
from app.main import app

def run_tests():
    client = TestClient(app)

    # 1. Health
    res_health = client.get('/health')
    assert res_health.status_code == 200, res_health.text
    print('Health test passed:', res_health.json())

    # 2. Cover Generate (Trial preview)
    res_cover = client.post('/api/v1/covers/generate', json={
        'userId': 'usr_test_001',
        'inputType': 'file',
        'fileUrl': 'sample_audio.wav',
        'trimStart': 0,
        'trimEnd': 30,
        'isTrialPreview': True,
        'voiceModelId': 'e81d4fae-7dec-11d0-a765-00a0c91e6bf1',
        'pitchShift': 0,
        'isRetry': False
    })
    assert res_cover.status_code == 200, res_cover.text
    print('Cover generate passed:', res_cover.json())

    # 3. Voice Train
    res_train = client.post('/api/v1/voices/train', json={
        'userId': 'usr_test_001',
        'voiceName': 'Test Studio Voice',
        'audioFiles': ['rec1.wav'],
        'autoCleanNoise': True
    })
    assert res_train.status_code == 200, res_train.text
    print('Voice train passed:', res_train.json())

    # 4. Local Payment with unique TID
    unique_tid = f"TID_{int(time.time() * 1000)}"
    res_pay = client.post('/api/v1/payments/local-verify', json={
        'userId': 'usr_test_001',
        'provider': 'easypaisa',
        'packageId': 'song-50',
        'amountPkr': 50,
        'transactionId': unique_tid,
        'screenshotUrl': 'receipt.jpg'
    })
    assert res_pay.status_code == 200, res_pay.text
    pay_data = res_pay.json()
    print('Local payment passed:', pay_data)

    # 5. Admin Approve
    pay_id = pay_data['paymentId']
    res_approve = client.post(f'/api/v1/admin/payments/{pay_id}/approve')
    assert res_approve.status_code == 200, res_approve.text
    print('Admin payment approve passed:', res_approve.json())

    # 6. Admin Create Model
    res_model = client.post('/api/v1/admin/models', json={
        'name': f'Custom Model {int(time.time())}',
        'subtitle': 'Verified Model',
        'category': 'Cricketers & Celebs',
        'modelFileUrl': 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P/view',
        'status': 'Active'
    })
    assert res_model.status_code == 200, res_model.text
    print('Admin create model passed:', res_model.json())

    print('\nALL BACKEND PIPELINES AND ENDPOINTS VERIFIED SUCCESSFULLY!')

if __name__ == '__main__':
    run_tests()
