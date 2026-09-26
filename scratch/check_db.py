import urllib.request
import json

SUPABASE_URL = "https://nbtwgbmqjjhvlryvatdn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM"

def query(table, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    })
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error querying {table}: {e}")
        return []

print("=== CORRIDORS WHERE availability_status != 'Available' ===")
corridors = query("corridors", "availability_status=neq.Available&select=id,corridor_name,block_section,line,availability_status")
for c in corridors:
    print(c)

print("\n=== EXISTING BLOCKS ===")
blocks = query("existing_blocks", "select=id,block_id,corridor_id,line,status,purpose,block_date")
for b in blocks:
    print(b)

print("\n=== BLOCK REQUESTS WHERE status = 'Completed' OR status = 'Approved' ===")
reqs = query("block_requests", "status=in.(Approved,Completed,Planned)&select=id,request_id,corridor_id,status,line,block_section,corridors:corridors(corridor_name,block_section)")
for r in reqs:
    print(r)
