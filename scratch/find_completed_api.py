with open(r"d:\SIH\Request Format\railway-ai\frontend\app\completed-blocks\page.tsx", "r", encoding="utf-8") as f:
    text = f.read()
    import re
    matches = [m.start() for m in re.finditer(r'/api/approved-blocks', text)]
    lines = text.splitlines()
    for m in matches:
        line_num = text[:m].count('\n') + 1
        print(f"Match around line {line_num}:")
        for l in range(max(0, line_num - 5), min(len(lines), line_num + 25)):
            print(f"{l+1}: {lines[l]}")
        print("---")
