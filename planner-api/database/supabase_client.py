"""
database/supabase_client.py

Initializes a single Supabase client instance for the planner API.
Uses the SERVICE ROLE key — this is server-side only, never expose to frontend.

The .env file is loaded from:
  1. The current working directory (default dotenv behaviour)
  2. The planner-api/ directory (fallback if run from parent)
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

# Try loading from CWD first, then from the directory containing this file
_here = Path(__file__).resolve().parent.parent   # planner-api/
load_dotenv()                                    # CWD .env
load_dotenv(dotenv_path=_here / ".env")          # fallback: planner-api/.env

_SUPABASE_URL: str  = os.environ.get("SUPABASE_URL", "")
_SUPABASE_KEY: str  = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not _SUPABASE_URL:
    raise EnvironmentError(
        "SUPABASE_URL is not set.\n"
        "Add it to planner-api/.env:\n"
        "  SUPABASE_URL=https://your-project.supabase.co"
    )

if not _SUPABASE_KEY or _SUPABASE_KEY == "YOUR_SERVICE_ROLE_KEY_HERE":
    raise EnvironmentError(
        "SUPABASE_SERVICE_KEY is not set or is still the placeholder value.\n"
        "Get your service_role key from:\n"
        "  Supabase Dashboard → Settings → API → service_role\n"
        "Then add it to planner-api/.env:\n"
        "  SUPABASE_SERVICE_KEY=eyJhbGci..."
    )

# Singleton client — reused across all requests
supabase: Client = create_client(_SUPABASE_URL, _SUPABASE_KEY)
