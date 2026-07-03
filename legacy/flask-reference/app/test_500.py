from app import app

app.testing = True

with app.test_client() as client:
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['email'] = 'admin@robertsenterprise.com'
        sess['role'] = 'Admin'
        sess['company_id'] = 1
        sess['location_id'] = 0
        sess['name'] = 'Admin User'

    try:
        response = client.get('/customers/')
        print(f"Status Code: {response.status_code}")
        if response.status_code == 500:
            print("HEADERS:", response.headers)
            print("--- HTML OUTPUT (Generic 500 means error logged to stderr) ---")
    except Exception:
        import traceback
        print("EXCEPTION CAUGHT DIRECTLY:")
        traceback.print_exc()

