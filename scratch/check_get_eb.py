with open(r"d:\SIH\Request Format\railway-ai\frontend\lib\supabase.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if "getExistingBlocks" in line:
            start = max(0, i - 5)
            end = min(len(lines), i + 60)
            for j in range(start, end):
                print(f"{j+1}: {lines[j]}", end="")
            break
