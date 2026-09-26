import os
import json

paths = [
    r"d:\SIH\Request Format\railway-ai\database\data\block_requests.json",
    r"d:\SIH\database\data\block_requests.json"
]

for p in paths:
    if os.path.exists(p):
        print("Found:", p)
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
            print(f"Total records: {len(data)}")
            for item in data:
                print(f"ID: {item.get('id')}, status: {item.get('status')}, section: {item.get('blockSection')}, corridor: {item.get('corridor')}")
