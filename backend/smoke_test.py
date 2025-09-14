"""Run a quick smoke test against a running local server.
Usage: python smoke_test.py
Make sure backend uvicorn is running at http://localhost:8000
"""
import httpx, asyncio, os, json

BASE = os.getenv('BASE','http://localhost:8000/api')

async def main():
    async with httpx.AsyncClient() as c:
        # register
        email = 'demo_user@example.com'
        pwd = 'DemoPass123!'
        try:
            r = await c.post(f'{BASE}/auth/register', json={'email':email,'password':pwd}, timeout=10.0)
            print('register', r.status_code, r.text)
        except Exception as e:
            print('register error', e)
        # login
        r = await c.post(f'{BASE}/auth/login', json={'email':email,'password':pwd}, timeout=10.0)
        print('login', r.status_code, r.text)
        token = r.json().get('access_token')
        headers = {'Authorization': f'Bearer {token}'}
        # create transaction
        r = await c.post(f'{BASE}/transactions', json={'type':'expense','amount':123.45,'category':'test','note':'smoke'}, headers=headers)
        print('create tx', r.status_code, r.text)
        # list transactions
        r = await c.get(f'{BASE}/transactions', headers=headers)
        print('list tx', r.status_code, r.text)
        # root
        r = await c.get('http://localhost:8000/')
        print('root', r.status_code, r.text)

if __name__ == '__main__':
    asyncio.run(main())
