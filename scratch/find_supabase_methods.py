with open(r"d:\SIH\Request Format\railway-ai\frontend\lib\supabase.ts", "r", encoding="utf-8") as f:
    text = f.read()

import re
matches = re.findall(r"(async\s+\w+\s*\(.*?\)|^\s*\w+\(.*?\)\s*\{)", text, re.MULTILINE)
for m in matches[:30]:
    print(m.strip())
