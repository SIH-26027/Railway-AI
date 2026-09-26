import urllib.request
import json

SUPABASE_URL = "https://nbtwgbmqjjhvlryvatdn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM"

def patch(path, body):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='PATCH', headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return f"Error: {e}"

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

print("1. Updating existing_blocks BLK-2026-001 to Completed...")
res_block = patch("existing_blocks?block_id=eq.BLK-2026-001", {
    "status": "Completed",
    "remarks": "Block completed at site. Staff, machines and equipment clear of track. Track certified safe for traffic."
})
print("Result:", res_block)

print("\n2. Updating stale corridors to Available...")
stale_ids = [
    ("19c62a0e-6379-471f-9fa1-fde2a7aa5e8f", "Totiyapalaiyam – Perundurai"),
    ("7146a727-90f2-48a7-838e-3072d8258a0d", "Perundurai – Uttukuli"),
    ("ffbdba83-1569-4023-b6ba-084ded8acd7f", "Erode – Sankari Durg")
]

for cid, name in stale_ids:
    res = patch(f"corridors?id=eq.{cid}", {
        "availability_status": "Available"
    })
    print(f"Updated {name} ({cid}):", res)

print("\n=== VERIFICATION: All Non-Available Corridors ===")
non_avail = get("corridors?availability_status=neq.Available&select=id,corridor_name,block_section,line,availability_status")
print(json.dumps(non_avail, indent=2))

print("\n=== VERIFICATION: All Existing Blocks ===")
ebs = get("existing_blocks?select=block_id,status,purpose,line,corridor_id")
print(json.dumps(ebs, indent=2))
