import urllib.request
import urllib.error
import json

url = 'http://127.0.0.1:8000/api/planning/generate-all'
req = urllib.request.Request(url, data=b'{}', headers={'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(req, timeout=10) as res:
        data = json.loads(res.read().decode())
        print(f"STATUS: {res.status}")
        print("RESPONSE:", json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"Error: {e}")
