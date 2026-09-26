import urllib.request
try:
    with urllib.request.urlopen('http://127.0.0.1:8000/docs', timeout=3) as res:
        print('FASTAPI STATUS:', res.status)
except Exception as e:
    print('FASTAPI ERROR:', e)
