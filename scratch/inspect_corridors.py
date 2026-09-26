import json
import urllib.request
import urllib.parse

url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co/rest/v1/corridors'
params = urllib.parse.urlencode({
    'select': 'id,corridor_name,block_section,line,distance_km,availability_status,from_station:stations!corridors_from_station_id_fkey(station_code,station_name),to_station:stations!corridors_to_station_id_fkey(station_code,station_name)'
})
full_url = f"{url}?{params}"

key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM'

req = urllib.request.Request(
    full_url,
    headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Accept': 'application/json',
    }
)

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

print(f"Total Corridors: {len(data)}", flush=True)
for r in data:
    fs = r.get('from_station') or {}
    ts = r.get('to_station') or {}
    print(
        f"{r['id']} | {r['corridor_name']} | {r['block_section']} | {r['line']} | "
        f"{fs.get('station_code')}({fs.get('station_name')}) -> {ts.get('station_code')}({ts.get('station_name')}) | "
        f"{r['availability_status']}",
        flush=True
    )
