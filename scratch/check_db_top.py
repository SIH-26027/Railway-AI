with open(r"d:\SIH\Request Format\railway-ai\frontend\lib\db.ts", "r", encoding="utf-8") as f:
    text = f.read()
    for line in text.splitlines()[:60]:
        print(line)
