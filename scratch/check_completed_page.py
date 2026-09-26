with open(r"d:\SIH\Request Format\railway-ai\frontend\app\completed-blocks\page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if "handleRevertToApproved" in line or "fetch('/api/approved-blocks'" in line:
            start = max(0, i - 10)
            end = min(len(lines), i + 40)
            for j in range(start, end):
                print(f"{j+1}: {lines[j]}", end="")
            break
