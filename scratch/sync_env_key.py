import os

frontend_env = r"d:\SIH\Request Format\railway-ai\frontend\.env.local"
dashboard_env = r"d:\SIH\AI Dashboard\.env.local"

service_key = None
with open(frontend_env, "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("SUPABASE_SERVICE_ROLE_KEY"):
            service_key = line.strip()
            break

print("Found service key:", service_key[:40] if service_key else "None")

if service_key:
    dash_content = ""
    if os.path.exists(dashboard_env):
        with open(dashboard_env, "r", encoding="utf-8") as f:
            dash_content = f.read()
    
    if "SUPABASE_SERVICE_ROLE_KEY" not in dash_content:
        with open(dashboard_env, "a", encoding="utf-8") as f:
            f.write(f"\n{service_key}\n")
        print("Appended SUPABASE_SERVICE_ROLE_KEY to AI Dashboard/.env.local")
    else:
        print("SUPABASE_SERVICE_ROLE_KEY already in AI Dashboard/.env.local")
