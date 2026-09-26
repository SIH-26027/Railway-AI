import os

paths = [
    r"d:\SIH\Request Format\railway-ai\frontend\app\api\approved-blocks\route.ts",
    r"d:\SIH\Request Format\railway-ai\frontend\lib\db.ts",
    r"d:\SIH\Request Format\railway-ai\frontend\app\approved-blocks\page.tsx",
]

for p in paths:
    print(f"\n==================== {p} ====================")
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            print(f.read())
    else:
        print("DOES NOT EXIST")
