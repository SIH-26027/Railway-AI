import json
import urllib.request

key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM'
headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Accept': 'application/json',
}

req = urllib.request.Request(
    'https://nbtwgbmqjjhvlryvatdn.supabase.co/rest/v1/corridors?select=id,corridor_name,block_section,line',
    headers=headers
)
with urllib.request.urlopen(req) as resp:
    cors = json.loads(resp.read().decode('utf-8'))

for c in cors:
    print(f"{c['id']} | {c['corridor_name']} | {c['block_section']} | {c['line']}")
