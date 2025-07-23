import os
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL")  # e.g., https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")  # service_role key

INSPECTION_ENDPOINT = f"{SUPABASE_URL}/rest/v1/inspection"


def insert_inspection(data):
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    response = requests.post(INSPECTION_ENDPOINT, headers=headers, json=data)
    if response.status_code not in (200, 201):
        raise Exception(f"Supabase insert failed: {response.status_code} {response.text}")
    return response.json() 