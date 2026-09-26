with open(r"d:\SIH\Request Format\railway-ai\frontend\app\approved-blocks\page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if "handleConfirmCompletion" in line:
            start = max(0, i - 10)
            end = min(len(lines), i + 80)
            for j in range(start, end):
                print(f"{j+1}: {lines[j]}", end="")
            break
