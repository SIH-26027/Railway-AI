with open(r"d:\SIH\Request Format\railway-ai\frontend\lib\supabase.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if "updateExistingBlockStatus" in line:
            print(f"Found on line {i+1}")
            start = max(0, i - 10)
            end = min(len(lines), i + 60)
            for j in range(start, end):
                print(f"{j+1}: {lines[j]}", end="")
