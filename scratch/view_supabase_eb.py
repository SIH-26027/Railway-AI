with open(r"d:\SIH\Request Format\railway-ai\frontend\lib\supabase.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()
    for i in range(570, min(625, len(lines))):
        print(f"{i+1}: {lines[i]}", end="")
