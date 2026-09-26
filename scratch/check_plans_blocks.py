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

print("=== CHECKING BLOCK PLANS ===")
plans = get("block_plans?select=*")
print(f"Total plans: {len(plans) if isinstance(plans, list) else plans}")
if isinstance(plans, list):
    for p in plans:
        print(f"Plan: {p.get('plan_id')}, status: {p.get('status')}, corridor_id: {p.get('corridor_id')}")

print("\n=== CHECKING EXISTING BLOCKS ===")
ebs = get("existing_blocks?select=*")
if isinstance(ebs, list):
    for b in ebs:
        print(f"Block: {b.get('block_id')}, status: {b.get('status')}, corridor_id: {b.get('corridor_id')}, line: {b.get('line')}, purpose: {b.get('purpose')}")

print("\n=== CORRIDORS WITH NON-AVAILABLE STATUS ===")
corrs = get("corridors?availability_status=neq.Available&select=id,corridor_name,block_section,line,availability_status")
if isinstance(corrs, list):
    for c in corrs:
        print(c)
