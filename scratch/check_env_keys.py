import os

env_files = [
    r"d:\SIH\AI Dashboard\.env",
    r"d:\SIH\AI Dashboard\.env.local",
    r"d:\SIH\Request Format\railway-ai\frontend\.env",
    r"d:\SIH\Request Format\railway-ai\frontend\.env.local",
    r"d:\SIH\.env"
]

for p in env_files:
    if os.path.exists(p):
        print(f"=== {p} ===")
        with open(p, "r", encoding="utf-8") as f:
            for line in f:
                if "KEY" in line or "SECRET" in line or "ROLE" in line or "URL" in line:
                    parts = line.strip().split("=")
                    print(parts[0], "=", parts[1][:15] if len(parts) > 1 else "")
