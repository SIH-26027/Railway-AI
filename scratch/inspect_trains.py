import json
import urllib.request

key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM'
headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Accept': 'application/json',
}

print("--- TRAINS SAMPLE ---")
req_t = urllib.request.Request('https://nbtwgbmqjjhvlryvatdn.supabase.co/rest/v1/trains?limit=5', headers=headers)
with urllib.request.urlopen(req_t) as resp:
    trains = json.loads(resp.read().decode('utf-8'))
print(f"Total trains fetched: {len(trains)}")
for r in trains:
    print(r)

print("\n--- TRAIN_MOVEMENTS SAMPLE ---")
req_m = urllib.request.Request('https://nbtwgbmqjjhvlryvatdn.supabase.co/rest/v1/train_movements?limit=5', headers=headers)
with urllib.request.urlopen(req_m) as resp:
    movements = json.loads(resp.read().decode('utf-8'))
print(f"Total train movements fetched: {len(movements)}")
for r in movements:
    print(r)
