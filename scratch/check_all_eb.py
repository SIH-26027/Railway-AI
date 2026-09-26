import urllib.request
import json

SUPABASE_URL = "https://nbtwgbmqjjhvlryvatdn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM"

def get(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return f"Error: {e}"

print("=== ALL EXISTING BLOCKS ===")
ebs = get("existing_blocks?select=*")
print(json.dumps(ebs, indent=2))

print("\n=== ALL CORRIDORS ===")
corrs_raw = get("corridors?select=id,corridor_name,block_section,line,availability_status")
corrs: list = corrs_raw if isinstance(corrs_raw, list) else []
print(f"Total corridors: {len(corrs)}")
for c in corrs:
    if c.get('availability_status') != 'Available':
        print("Non-available:", c)
