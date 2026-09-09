from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import re
from datetime import datetime
import hashlib
import secrets
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_KEY, validate_config, validate_ocr_config, GOOGLE_APPLICATION_CREDENTIALS, OPENAI_API_KEY, OCR_SUPPORTED_LANGUAGES, OPENAI_MODEL
import uuid
from werkzeug.utils import secure_filename
import mimetypes
import logging
import tempfile
import requests
from urllib.parse import urlparse
import pathlib
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta

# OCR and AI imports
try:
    from google.cloud import vision
    import openai
    from PIL import Image
    GOOGLE_VISION_AVAILABLE = True
    print("✅ Google Cloud Vision and OpenAI libraries loaded")
except ImportError as e:
    GOOGLE_VISION_AVAILABLE = False
    print(f"⚠️  OCR libraries not available: {e}")
    print("   Install with: pip install google-cloud-vision openai pillow")

# Import email endpoints
from email_endpoints import register_email_endpoints


app = Flask(__name__)

def _normalize_origin(url: str) -> str:
    u = (url or '').strip().rstrip('/')
    if not u:
        return ''
    if not u.startswith('http://') and not u.startswith('https://'):
        u = f'https://{u}'
    return u.rstrip('/')

def _cors_origins():
    defaults = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://total-testing-diy.com',
        'https://www.total-testing-diy.com',
        'https://moldetest-f-frontend.onrender.com',
        'https://mold-testing-houston-frontend.onrender.com',
        'https://moldetest-1.onrender.com',
    ]
    origins = set(defaults)
    frontend = _normalize_origin(os.environ.get('FRONTEND_URL', ''))
    if frontend:
        origins.add(frontend)
    extra = os.environ.get('CORS_ORIGINS', '')
    for part in extra.split(','):
        o = _normalize_origin(part)
        if o:
            origins.add(o)
    return sorted(origins)

CORS(app, origins=_cors_origins(), supports_credentials=True)

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_jwt_token(user_id: int, email: str) -> str:
    """Create a JWT token for the user"""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


REPORT_ASSISTANT_MAX_FINDINGS_CHARS = 8000
REPORT_ASSISTANT_BLOCKED_STATUSES = {'completed', 'report_ready'}

REPORT_ASSISTANT_SYSTEM_PROMPT = """You are a licensed mold assessment writing assistant for Total Testing DIY mold testing reports.

Write clear, professional language that homeowners can understand.

You will receive labeled sections:
A) Customer-submitted information (description, sample locations, reported visible mold-like growth, leaks/water damage, indoor humidity, ventilation/HVAC notes, and other relevant inspection details)
B) Admin-entered laboratory findings
C) Uploaded evidence inventory (photo counts/URLs only — do NOT claim you visually analyzed photos unless a vision analysis is explicitly provided)

You MUST use all relevant information from A and B. Do not write a generic lab-only response.

=== CONCLUSION REQUIREMENTS ===
Write ONE concise, professional paragraph that:
1. Identifies what the laboratory found and where it was found.
2. Connects the laboratory findings with relevant visible conditions reported at the same locations.
3. Mentions relevant moisture conditions, leaks, elevated humidity, or ventilation concerns when present in the provided information.
4. Uses cautious language for possible causes, such as:
   - "may be contributing"
   - "may be associated with"
   - "represents an additional moisture concern"
5. Does not state that a suspected cause is confirmed unless the provided information confirms it.
6. Ends by stating that the laboratory results apply only to the specific locations sampled.
7. Does not claim that the entire property is mold-free or safe.
8. Does not provide medical advice or use the term "toxic mold."

=== RECOMMENDATION REQUIREMENTS ===
Write short, direct, situation-specific bullet points as a JSON array of strings.
Select ONLY recommendations supported by the provided information. Prioritize when relevant:
1. Immediately correcting active leaks or water intrusion.
2. Drying affected materials.
3. Reducing indoor humidity to below 60%.
4. Running bathroom or kitchen exhaust fans when relevant to those rooms.
5. Improving ventilation, adjusting the HVAC system, or using a dehumidifier when relevant.
6. Consulting a qualified mold remediation contractor when visible growth or confirmed mold is reported.
7. Advising the customer not to disturb, scrub, sand, or remove affected materials because doing so may spread mold spores.
8. Evaluating HVAC vents or components when mold is identified or reported around the HVAC system.
9. Recommending further inspection when the extent or moisture source is unknown.

=== IMPORTANT WRITING RULES ===
- Do not produce the same generic recommendation list for every report.
- Do not invent mold types, locations, leaks, humidity readings, visible conditions, or causes.
- Do not write a formal mold remediation protocol.
- Do not specify containment, demolition quantities, removal distances, equipment, or detailed remediation procedures.
- Do not say "clean and remediate" without recommending evaluation by a qualified mold remediation contractor.
- Do not use phrases such as "ensure a healthier living environment," "make the home safe," or similar health guarantees.
- Do not recommend ventilation for a particular room unless the submitted information supports it.
- Do not recommend a bathroom exhaust fan for bedrooms or living rooms.
- Do not claim photographs were analyzed unless section C includes an actual vision/OCR analysis result.
- Keep the conclusion factual and the recommendations action-oriented.

=== PREFERRED STYLE EXAMPLE ===
Conclusion:
"The laboratory identified Cladosporium in samples collected from the master bedroom and living room. These findings correspond with the reported visible mold-like growth on the master bedroom ceiling and living room HVAC vent. The indoor humidity level of 62% may support mold growth, while the leak under the kitchen sink represents an additional moisture concern. Laboratory results apply only to the specific locations sampled."

Recommendations:
- Repair the leak under the kitchen sink immediately and dry all affected materials.
- Reduce indoor humidity to below 60% by improving ventilation, adjusting the HVAC system, or using a dehumidifier.
- Consult a qualified mold remediation contractor to properly address the affected master bedroom ceiling and living room HVAC vent.
- Do not disturb, scrub, or remove the affected materials yourself, as this may spread mold spores.
- Have the HVAC vent and surrounding area evaluated to determine whether additional cleaning or HVAC-related work is necessary.

=== OUTPUT FORMAT ===
Return valid JSON only with exactly these keys:
{
  "conclusion": "One concise paragraph",
  "recommendations": [
    "First recommendation",
    "Second recommendation"
  ],
  "mold_findings": [
    {
      "name": "Cladosporium",
      "quantity": "1,200 spores/m³",
      "level": "Low"
    }
  ]
}

=== MOLD FINDINGS BREAKDOWN ===
Also extract every mold/spore type mentioned in the laboratory findings (section B) into "mold_findings".
- "name": mold/spore type exactly as identified by the lab (do not invent types)
- "quantity": the count, concentration, or qualitative amount from the lab text (for example "240", "1,200 spores/m³", "Rare", "Low")
- "level": one of exactly: "Not Detect", "Rare", "Low", "Medium", "High" (High is the highest). Map synonyms accordingly (e.g. not detected→Not Detect, moderate→Medium, very low/trace→Rare). If unknown, use "".
- Include only types actually present in section B
- If section B has no identifiable mold types, return "mold_findings": []
"""


def _stringify_jsonish(value):
    """Normalize JSON/text fields from Supabase into readable prompt text."""
    if value is None:
        return ''
    if isinstance(value, (dict, list)):
        try:
            return json.dumps(value, ensure_ascii=False, indent=2)
        except Exception:
            return str(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return ''
        try:
            parsed = json.loads(text)
            if isinstance(parsed, (dict, list)):
                return json.dumps(parsed, ensure_ascii=False, indent=2)
        except Exception:
            pass
        return text
    return str(value)


def _as_location_list(value):
    """Normalize location fields into a clean list of strings."""
    if value is None:
        return []
    if isinstance(value, list):
        items = value
    elif isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
            items = parsed if isinstance(parsed, list) else [text]
        except Exception:
            items = [text]
    else:
        items = [str(value)]

    cleaned = []
    for item in items:
        if isinstance(item, dict):
            loc = item.get('location') or item.get('name') or ''
            loc = str(loc).strip()
            if loc:
                cleaned.append(loc)
        else:
            loc = str(item).strip()
            if loc:
                cleaned.append(loc)
    return cleaned


def _count_images(value):
    if value is None:
        return 0
    if isinstance(value, list):
        return len([x for x in value if x])
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return 0
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return len([x for x in parsed if x])
        except Exception:
            return 1 if text.startswith('http') else 0
    return 0


def _build_inspection_context(inspection: dict, samples: list, client_submitted: dict | None = None) -> str:
    """Build an explicit customer-submitted summary for the AI prompt."""
    src = dict(inspection or {})
    # Prefer the frontend snapshot for customer-facing fields. The admin UI already
    # loaded this inspection from the live API; local Supabase can be empty/stale.
    prefer_client_keys = {
        'background_info',
        'customer_description',
        'property_description',
        'has_visible_mold',
        'mold_locations',
        'mold_images',
        'visible_mold_details',
        'has_water_damage',
        'water_damage_locations',
        'water_damage_images',
        'water_damage_details',
        'temperature',
        'humidity',
        'environmental_data_method',
        'thermostat_image',
        'full_name',
        'client_type',
        'street_address',
        'unit_number',
        'city',
        'state',
        'zip_code',
        'property_type',
        'square_footage',
    }
    if isinstance(client_submitted, dict):
        for key, value in client_submitted.items():
            if value is None or value == '' or value == []:
                continue
            if key in prefer_client_keys or key not in src or src.get(key) in (None, '', [], 'null'):
                src[key] = value
        if client_submitted.get('background_info') or client_submitted.get('property_description'):
            src['background_info'] = (
                client_submitted.get('background_info')
                or client_submitted.get('property_description')
            )

    customer_description = (
        _stringify_jsonish(src.get('background_info'))
        or _stringify_jsonish(src.get('customer_description'))
        or 'None provided'
    )

    mold_locations = _as_location_list(src.get('mold_locations')) or _as_location_list(src.get('visible_mold_details'))
    water_locations = _as_location_list(src.get('water_damage_locations')) or _as_location_list(src.get('water_damage_details'))

    # Prefer samples embedded in the frontend snapshot when present
    if isinstance(client_submitted, dict) and isinstance(client_submitted.get('samples'), list):
        client_sample_rows = [s for s in client_submitted.get('samples') if isinstance(s, dict)]
        if client_sample_rows:
            samples = client_sample_rows

    lines = []
    lines.append('=== A. CUSTOMER-SUBMITTED INFORMATION ===')
    lines.append(f"Inspection ID: {src.get('id')}")
    lines.append(f"Client: {src.get('full_name') or 'N/A'}")
    lines.append(f"Client type: {src.get('client_type') or 'N/A'}")
    address_parts = [
        src.get('street_address') or '',
        src.get('unit_number') or '',
        src.get('city') or '',
        src.get('state') or '',
        src.get('zip_code') or '',
    ]
    address = ', '.join([p for p in address_parts if p])
    lines.append(f"Property address: {address or 'N/A'}")
    lines.append(f"Property type: {src.get('property_type') or 'N/A'}")
    lines.append(f"Square footage: {src.get('square_footage') or 'N/A'}")
    lines.append('')
    lines.append('Customer description of the concern:')
    lines.append(customer_description)
    lines.append('')
    lines.append(f"Visible mold reported: {src.get('has_visible_mold')}")
    if mold_locations:
        lines.append('Reported visible mold / affected areas:')
        for loc in mold_locations:
            lines.append(f"- {loc}")
    else:
        lines.append('Reported visible mold / affected areas: None provided')
    lines.append('')
    lines.append(f"Water damage / leak reported: {src.get('has_water_damage')}")
    if water_locations:
        lines.append('Reported water damage / leak locations:')
        for loc in water_locations:
            lines.append(f"- {loc}")
    else:
        lines.append('Reported water damage / leak locations: None provided')
    lines.append('')
    lines.append(
        f"Temperature: {src.get('temperature') if src.get('temperature') is not None else 'N/A'}"
    )
    lines.append(
        f"Humidity: {src.get('humidity') if src.get('humidity') is not None else 'N/A'}"
    )
    lines.append(f"Environmental data method: {src.get('environmental_data_method') or 'N/A'}")
    lines.append('')

    if samples:
        lines.append('Sample locations submitted by the customer:')
        for idx, sample in enumerate(samples, start=1):
            loc = sample.get('location') or sample.get('sample_location') or 'N/A'
            desc = sample.get('description') or sample.get('notes') or 'None'
            lines.append(f"- Sample #{idx}: location={loc}; description={desc}")
    else:
        lines.append('Sample locations submitted by the customer: None found')

    mold_photo_count = _count_images(src.get('mold_images'))
    water_photo_count = _count_images(src.get('water_damage_images'))
    sample_photo_count = sum(1 for s in (samples or []) if s.get('sample_image'))
    thermostat_photo = 1 if src.get('thermostat_image') else 0

    lines.append('')
    lines.append('=== C. UPLOADED EVIDENCE (inventory only; NOT vision-analyzed) ===')
    lines.append(f"- Mold photos uploaded: {mold_photo_count}")
    lines.append(f"- Water-damage photos uploaded: {water_photo_count}")
    lines.append(f"- Sample photos uploaded: {sample_photo_count}")
    lines.append(f"- Thermostat photo uploaded: {thermostat_photo}")
    lines.append('Do not claim these photographs were visually analyzed.')

    return "\n".join(lines)


def require_admin_from_request():
    """Require a valid Bearer JWT for an admin user. Returns (admin_user_dict, None) or (None, (response, status))."""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, (jsonify({"error": "Authorization header required"}), 401)

    token = auth_header.split(' ', 1)[1].strip()
    if not token:
        return None, (jsonify({"error": "Authorization header required"}), 401)

    email = None

    # 1) Prefer local JWT verification
    try:
        payload = verify_jwt_token(token)
        email = payload.get('email')
    except Exception:
        email = None

    # 2) Fallback: validate production-issued tokens (local AI + remote login)
    if not email:
        prod_validate_url = os.getenv(
            'PROD_AUTH_VALIDATE_URL',
            'https://moldetest-67e6.onrender.com/api/auth/validate',
        )
        try:
            prod_resp = requests.get(
                prod_validate_url,
                headers={'Authorization': f'Bearer {token}'},
                timeout=15,
            )
            if prod_resp.ok:
                email = (prod_resp.json() or {}).get('email')
        except Exception as e:
            logger.warning(f"Production token validate fallback failed: {e}")

    if not email:
        return None, (jsonify({"error": "Invalid token"}), 401)

    try:
        user_result = supabase.table('user_profiles').select('id, email, role').eq('email', email).execute()
    except Exception as e:
        logger.error(f"Admin auth lookup failed: {e}")
        return None, (jsonify({"error": "Unable to verify admin access"}), 500)

    if not user_result.data:
        return None, (jsonify({"error": "User not found"}), 401)

    user_data = user_result.data[0]
    is_admin = user_data.get('role') == 'admin' or bool(user_data.get('is_admin'))
    if not is_admin:
        return None, (jsonify({"error": "Admin access required"}), 403)

    return user_data, None


def _extract_json_object(text: str) -> dict:
    """Parse a JSON object from model output, tolerating surrounding markdown fences."""
    if not text or not str(text).strip():
        raise ValueError("Empty model response")

    content = str(text).strip()
    if content.startswith('```'):
        lines = content.split('\n')
        # Drop opening ```json / ``` and closing ```
        if lines and lines[0].startswith('```'):
            lines = lines[1:]
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        content = '\n'.join(lines).strip()

    try:
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start = content.find('{')
    end = content.rfind('}')
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Model response was not valid JSON")
    parsed = json.loads(content[start:end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("Model response JSON must be an object")
    return parsed


def _normalize_report_assistant_conclusion(value) -> str:
    """Normalize model conclusion to a single paragraph string."""
    if isinstance(value, list):
        parts = [str(x).strip() for x in value if str(x).strip()]
        return " ".join(parts).strip()
    if value is None:
        return ""
    return str(value).strip()


def _normalize_report_assistant_recommendations(value) -> str:
    """
    Normalize model recommendations to newline-separated bullets for the admin textarea.
    Accepts a JSON array (preferred) or a single string with bullets/newlines.
    """
    items = []
    if isinstance(value, list):
        items = [str(x).strip() for x in value if str(x).strip()]
    elif isinstance(value, str):
        text = value.strip()
        if not text:
            return ""
        # Prefer splitting multi-line / bullet text; fall back to whole string.
        raw_lines = re.split(r"[\r\n]+", text)
        for line in raw_lines:
            cleaned = line.strip()
            if not cleaned:
                continue
            cleaned = re.sub(r"^[-*•]\s*", "", cleaned).strip()
            if cleaned:
                items.append(cleaned)
        if not items and text:
            items = [re.sub(r"^[-*•]\s*", "", text).strip()]
    else:
        return ""

    bullet_lines = []
    for item in items:
        text = item.strip()
        if not text:
            continue
        if not text.startswith("-"):
            text = f"- {text}"
        bullet_lines.append(text)
    return "\n".join(bullet_lines).strip()


def _normalize_report_assistant_mold_findings(value) -> list:
    """Normalize mold_findings from the model into [{name, quantity, level}]."""
    if not isinstance(value, list):
        return []

    findings = []
    seen = set()
    for item in value:
        if not isinstance(item, dict):
            continue
        name = str(
            item.get('name')
            or item.get('mold')
            or item.get('type')
            or item.get('spore')
            or ''
        ).strip()
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        quantity = str(item.get('quantity') or item.get('count') or item.get('amount') or '').strip()
        level = str(item.get('level') or item.get('category') or item.get('severity') or '').strip()
        findings.append({
            'name': name,
            'quantity': quantity,
            'level': _canonicalize_mold_level(level or quantity),
        })
    return findings


def _canonicalize_mold_level(raw: str) -> str:
    """Map free-text ratings onto: Not Detect, Rare, Low, Medium, High."""
    q = str(raw or '').strip().lower()
    if not q:
        return ''
    if re.search(r'\bnot\s*detect(ed)?\b', q) or q in {'nd', 'none', '0', 'absent'}:
        return 'Not Detect'
    if re.search(r'\brare\b', q) or re.search(r'\btrace\b', q) or re.search(r'\bvery\s*low\b', q):
        return 'Rare'
    if re.search(r'\bmed(ium)?\b', q) or re.search(r'\bmoderate\b', q):
        return 'Medium'
    if re.search(r'\bhigh\b', q) or re.search(r'\babundant\b', q) or re.search(r'\bnumerous\b', q):
        return 'High'
    if re.search(r'\blow\b', q):
        return 'Low'
    return ''


def _call_report_assistant_openai(findings_text: str, inspection_context: str = '') -> dict:
    """Call OpenAI and return validated {conclusion, recommendations, mold_findings}."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured on the server")

    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("OpenAI library is not installed on the server")

    client = OpenAI(api_key=OPENAI_API_KEY)
    model = (OPENAI_MODEL or 'gpt-4o-mini').strip() or 'gpt-4o-mini'

    # Python 3.11: backslashes (e.g. \n) are illegal inside f-string {...} expressions
    context_block = inspection_context or (
        "=== A. CUSTOMER-SUBMITTED INFORMATION ===\nNone available."
    )

    user_prompt = f"""Using the information below, write the report conclusion and recommendations.

Use:
- The customer's submitted description
- Sample locations
- Laboratory findings entered by the admin
- Reported visible mold-like growth
- Reported leaks or water damage
- Indoor humidity readings
- Ventilation or HVAC concerns
- Other relevant inspection information

Do not invent facts. Select only recommendations supported by this information.
Do not produce a generic recommendation list.

Also extract mold_findings from section B only (spore/mold types with quantities). Do not invent types.

{context_block}

=== B. ADMIN LABORATORY FINDINGS ===
{findings_text}

Follow the system instructions exactly for conclusion structure, cautious wording, recommendation priorities, prohibited language, and mold_findings extraction.

Return valid JSON only:
{{
  "conclusion": "One concise paragraph",
  "recommendations": [
    "First recommendation",
    "Second recommendation"
  ],
  "mold_findings": [
    {{"name": "MoldType", "quantity": "count or level from lab text", "level": "Low"}}
  ]
}}"""

    logger.info(
        "Report assistant prompt sizes: context_chars=%s findings_chars=%s",
        len(inspection_context or ''),
        len(findings_text or ''),
    )

    messages = [
        {"role": "system", "content": REPORT_ASSISTANT_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    create_kwargs = {
        "model": model,
        "messages": messages,
        "temperature": 0.15,
        "max_tokens": 2000,
    }

    try:
        response = client.chat.completions.create(
            **create_kwargs,
            response_format={"type": "json_object"},
        )
    except Exception as json_mode_error:
        logger.warning(f"JSON response_format unsupported or failed ({json_mode_error}); retrying without it")
        response = client.chat.completions.create(**create_kwargs)

    raw = response.choices[0].message.content if response.choices else ""
    parsed = _extract_json_object(raw)

    conclusion = _normalize_report_assistant_conclusion(parsed.get("conclusion"))
    recommendations = _normalize_report_assistant_recommendations(parsed.get("recommendations"))
    mold_findings = _normalize_report_assistant_mold_findings(parsed.get("mold_findings"))

    if not conclusion:
        raise ValueError("Model response missing a non-empty conclusion")
    if not recommendations:
        raise ValueError("Model response missing non-empty recommendations")

    return {
        "conclusion": conclusion,
        "recommendations": recommendations,
        "mold_findings": mold_findings,
    }


class SimpleOCRIntegration:
    """Simplified OCR integration for lab analysis"""
    
    def __init__(self):
        self.vision_client = None
        self.openai_client = None
        self.is_available = False
        
        print("🔍 INIT: Starting OCR integration initialization...")
        print(f"🔍 INIT: GOOGLE_VISION_AVAILABLE = {GOOGLE_VISION_AVAILABLE}")
        print(f"🔍 INIT: GOOGLE_APPLICATION_CREDENTIALS = {GOOGLE_APPLICATION_CREDENTIALS}")
        print(f"🔍 INIT: OPENAI_API_KEY configured = {bool(OPENAI_API_KEY)}")
        
        # Check each condition individually for better debugging
        if not GOOGLE_VISION_AVAILABLE:
            print("❌ INIT: Google Vision libraries not available")
            print("   Install with: pip install google-cloud-vision")
            return
            
        if not GOOGLE_APPLICATION_CREDENTIALS:
            print("❌ INIT: GOOGLE_APPLICATION_CREDENTIALS environment variable not set")
            print("   Please set GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/credentials.json")
            return
            
        if not OPENAI_API_KEY:
            print("❌ INIT: OPENAI_API_KEY environment variable not set")
            print("   Please set OPENAI_API_KEY=your_openai_key")
            return
        
        print("✅ INIT: All prerequisites met, attempting initialization...")
        
        try:
            # Initialize Google Cloud Vision
            print(f"🔍 INIT: Initializing Google Cloud Vision with credentials: {GOOGLE_APPLICATION_CREDENTIALS}")
            
            # Ensure the credentials file exists
            if not os.path.exists(GOOGLE_APPLICATION_CREDENTIALS):
                raise Exception(f"Google Cloud credentials file not found: {GOOGLE_APPLICATION_CREDENTIALS}")
            
            print("✅ INIT: Credentials file exists, creating Vision client...")
            
            # Initialize the Vision client - it will automatically use the GOOGLE_APPLICATION_CREDENTIALS env var
            self.vision_client = vision.ImageAnnotatorClient()
            print("✅ INIT: Google Vision ImageAnnotatorClient created successfully")
            
            # Initialize OpenAI client with proper error handling
            print("🔍 INIT: Checking OpenAI API key...")
            if not OPENAI_API_KEY:
                print("❌ INIT: OPENAI_API_KEY environment variable not set")
                print("   Please set OPENAI_API_KEY=your_openai_key")
                return
            
            print("🔍 INIT: Initializing OpenAI client...")
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=OPENAI_API_KEY)
                print("✅ INIT: OpenAI client created successfully")
            except Exception as openai_error:
                print(f"❌ INIT: Failed to initialize OpenAI client: {openai_error}")
                print(f"❌ INIT: OpenAI error type: {type(openai_error).__name__}")
                print(f"❌ INIT: OpenAI error details: {str(openai_error)}")
                return
            
            self.is_available = True
            print("✅ INIT: OCR integration initialized successfully!")
            logger.info("✅ OCR integration initialized successfully")
        except Exception as e:
            print(f"❌ INIT: Failed to initialize OCR: {e}")
            print(f"❌ INIT: Error type: {type(e).__name__}")
            print(f"❌ INIT: Error details: {str(e)}")
            logger.error(f"❌ Failed to initialize OCR: {e}")
            self.is_available = False
    
    def extract_text_from_image_url(self, image_url: str):
        """Extract text from image URL using Google Cloud Vision"""
        try:
            logger.info(f"🔍 Extracting text from image: {image_url}")
            
            # Ensure Vision client is available
            if not self.vision_client:
                raise Exception("Google Vision API client not initialized. Please check your credentials and configuration.")
            
            # Download image from URL
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Create Vision API image object
            image = vision.Image(content=response.content)
            
            # Configure text detection with language hints
            image_context = vision.ImageContext(language_hints=OCR_SUPPORTED_LANGUAGES)
            
            # Perform text detection with Google Vision API
            logger.info(f"🔍 Making Google Vision API text_detection call for image: {image_url}")
            response = self.vision_client.text_detection(image=image, image_context=image_context)
            texts = response.text_annotations
            
            if response.error.message:
                logger.error(f"❌ Google Vision API returned error: {response.error.message}")
                raise Exception(f"Google Vision API error: {response.error.message}")
            
            # Extract full text
            extracted_text = texts[0].description if texts else ""
            
            logger.info(f"✅ Google Vision API successfully extracted {len(extracted_text)} characters from image")
            
            return {
                "extracted_text": extracted_text,
                "confidence": "high" if len(extracted_text) > 50 else "medium",
                "language_detected": "multi" if extracted_text else "none"
            }
            
        except Exception as e:
            logger.error(f"❌ Google Vision API call failed: {e}")
            return {"error": str(e), "extracted_text": ""}
    
    def analyze_lab_results_with_gpt(self, extracted_text: str, image_urls: list, inspection_findings: dict = None):
        """Analyze extracted lab text using GPT-4 with PRIMARY focus on lab results"""
        if not extracted_text.strip():
            raise Exception("No extracted text provided for analysis. Manual review required.")

        try:
            # CRITICAL DIAGNOSTIC LOGGING - START
            print("=" * 80)
            print("🚨 DIAGNOSTIC: analyze_lab_results_with_gpt() CALLED")
            print("=" * 80)
            print(f"🔍 DIAGNOSTIC: extracted_text length: {len(extracted_text)}")
            print(f"🔍 DIAGNOSTIC: extracted_text preview (first 500 chars):")
            print(extracted_text[:500])
            print(f"🔍 DIAGNOSTIC: extracted_text end (last 200 chars):")
            print(extracted_text[-200:])
            print(f"🔍 DIAGNOSTIC: inspection_findings: {inspection_findings}")
            print(f"🔍 DIAGNOSTIC: image_urls: {image_urls}")

            # Check if extracted_text contains "room1" or "room2" or "200" (humidity)
            if "room1" in extracted_text.lower() or "room2" in extracted_text.lower():
                print("🚨 WARNING: extracted_text contains 'room1' or 'room2' - THIS SHOULD NOT HAPPEN!")
            if "200%" in extracted_text or "200.0%" in extracted_text:
                print("🚨 WARNING: extracted_text contains '200%' humidity - THIS SHOULD NOT HAPPEN!")
            print("=" * 80)
            # CRITICAL DIAGNOSTIC LOGGING - END

            # Build simple prompt with ONLY lab results and the exact prompt requested
            full_prompt = f"""{extracted_text}

You are a licensed mold assessment expert writing conclusions for Total Testing

I am uploading lab analysis photos (air and/or surface samples).

Please do the following every time:

Carefully review all details in the lab report, including species, raw counts, debris levels, and sample locations.

Identify which areas show mold growth and which do not.

Clearly explain what the results mean, focusing on whether findings indicate:

Normal background conditions

Localized mold growth

Water-damage indicator molds

Distinguish between common environmental molds and problematic molds (e.g., Chaetomium, Stachybotrys, Fusarium).

Write a professional conclusion section that:

Matches the tone of a licensed mold inspector

Is clear, human, and client-friendly

Avoids sounding like AI

Is suitable for inclusion in a formal report or client email

If remediation or cleaning is recommended, explain why and keep it proportional to the findings.

End with a short statement about next steps (cleaning, remediation, or clearance testing if applicable).
"""

            # DIAGNOSTIC: Log the full prompt being sent to GPT
            print("=" * 80)
            print("🚨 DIAGNOSTIC: FULL PROMPT BEING SENT TO GPT-4:")
            print("=" * 80)
            print(full_prompt)
            print("=" * 80)

            # Pass the simple prompt to GPT
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "user", "content": full_prompt}
                ],
                max_tokens=2500,
                temperature=0.2
            )
            print(f"🔍 DEBUG: GPT-4 response: {response}")
            analysis_content = response.choices[0].message.content
            logger.info("✅ GPT-4 lab analysis completed with inspection findings")
            try:
                import json
                analysis_json = json.loads(analysis_content)
                conclusion = analysis_json.get("conclusion", "")
                recommendations = analysis_json.get("recommendations", "")
                formatted_analysis = f"""**CONCLUSION**\n\n{conclusion}\n\n**RECOMMENDATIONS**\n\n{recommendations}"""
            except json.JSONDecodeError:
                logger.warning("⚠️ GPT response was not valid JSON, using raw content")
                formatted_analysis = analysis_content
                conclusion = analysis_content
                recommendations = "Please review the analysis above and consult with a professional for specific recommendations."
            return {
                "conclusion": conclusion,
                "recommendations": recommendations,
                "extracted_text": extracted_text,
                "analysis": formatted_analysis,
                "model": "gpt-4o-mini",
                "images_processed": len(image_urls) if image_urls else 0
            }
        except Exception as e:
            logger.error(f"❌ GPT analysis failed: {e}")
            raise Exception(f"GPT analysis failed after successful OCR: {str(e)}. Manual review required.")
    


# Debug JSON credentials file before initializing OCR
print("\n🔍 DEBUG: Checking for gcloud-key.json in project root...")
project_root = os.path.dirname(os.path.dirname(__file__))
gcloud_key_path = os.path.join(project_root, 'gcloud-key.json')
print(f"🔍 DEBUG: Project root path: {project_root}")
print(f"🔍 DEBUG: Looking for gcloud-key.json at: {gcloud_key_path}")
print(f"🔍 DEBUG: File exists: {os.path.exists(gcloud_key_path)}")

if os.path.exists(gcloud_key_path):
    try:
        print(f"🔍 DEBUG: File size: {os.path.getsize(gcloud_key_path)} bytes")
        print(f"🔍 DEBUG: File permissions readable: {os.access(gcloud_key_path, os.R_OK)}")
        
        # Try to read and parse the JSON
        with open(gcloud_key_path, 'r') as f:
            import json
            creds = json.load(f)
            print(f"✅ DEBUG: JSON file parsed successfully")
            print(f"🔍 DEBUG: JSON keys: {list(creds.keys())}")
            print(f"🔍 DEBUG: Service account type: {creds.get('type', 'unknown')}")
            print(f"🔍 DEBUG: Project ID: {creds.get('project_id', 'unknown')}")
            print(f"🔍 DEBUG: Client email: {creds.get('client_email', 'unknown')}")
            
            # Check if this matches GOOGLE_APPLICATION_CREDENTIALS
            current_creds = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
            print(f"🔍 DEBUG: Current GOOGLE_APPLICATION_CREDENTIALS: {current_creds}")
            print(f"🔍 DEBUG: Paths match: {os.path.abspath(gcloud_key_path) == os.path.abspath(current_creds) if current_creds else False}")
            
    except json.JSONDecodeError as e:
        print(f"❌ DEBUG: JSON parsing error: {e}")
    except Exception as e:
        print(f"❌ DEBUG: Error reading file: {e}")
else:
    print("❌ DEBUG: gcloud-key.json not found in project root")
    print("🔍 DEBUG: Contents of project root:")
    try:
        files = os.listdir(project_root)
        for file in sorted(files):
            if file.endswith('.json') or 'key' in file.lower() or 'cred' in file.lower():
                print(f"   📄 {file}")
    except Exception as e:
        print(f"❌ DEBUG: Error listing directory: {e}")

print("🔍 DEBUG: Environment variables related to Google Cloud:")
for key, value in os.environ.items():
    if 'GOOGLE' in key or 'GCLOUD' in key:
        print(f"   {key} = {value}")

print("\n🔍 DEBUG: Now initializing OCR integration...")

# Initialize OCR integration
ocr_integration = SimpleOCRIntegration()

# Validate configuration (do NOT exit — gunicorn import must succeed on Render)
if not validate_config():
    print("\nConfiguration validation failed!")
    print("On Render → Environment, set SUPABASE_URL and SUPABASE_ANON_KEY")
    print("   (and preferably SUPABASE_SERVICE_ROLE_KEY)")
    print("App will still boot; DB routes will fail until credentials are set.")

# Validate OCR configuration (non-blocking)
print("\nChecking OCR Configuration...")
ocr_available = validate_ocr_config()
if ocr_available:
    print("Real Google Cloud Vision OCR will be used for lab analysis")
else:
    print("Using mock responses for OCR - Add credentials for real OCR")

# Initialize Supabase client (no network I/O at import time — probes hang/fail deploys)
# Never call exit()/sys.exit here: that kills gunicorn workers with status 1.
supabase = None
try:
    if not SUPABASE_URL or SUPABASE_URL.startswith('your_supabase'):
        raise ValueError('SUPABASE_URL is not configured')
    if not SUPABASE_DB_KEY or SUPABASE_DB_KEY.startswith('your_supabase'):
        raise ValueError('SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY is not configured')

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_DB_KEY)

    if SUPABASE_SERVICE_ROLE_KEY:
        print("Using service_role key for Supabase client (bypasses RLS)")
    else:
        print("SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key.")

    print("Supabase client created (connection will be verified on first request)")

except Exception as e:
    print(f"Failed to initialize Supabase client: {e}")
    print("Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY on Render Environment")
    supabase = None

# Register email routes for gunicorn (not only `python simple_main.py`)
try:
    register_email_endpoints(app, supabase)
except Exception as e:
    print(f"Warning: email endpoints not registered: {e}")

# Database setup
def init_db():
    """Initialize Supabase database tables in public schema"""
    try:
        # Test connection to public schema
        print("🔍 Testing connection to public schema...")
        supabase.table('inspection').select('*').limit(1).execute()
        print("✅ Successfully connected to public schema")
    except Exception as e:
        print(f"⚠️ Public schema connection test: {e}")
        print("📝 Make sure your tables are in the public schema")
    
    try:
        # Check inspection table (in public schema)
        print("🔍 Checking inspection table in public schema...")
        supabase.table('inspection').select('*').limit(1).execute()
        print("✅ Inspection table exists in public schema")
    except Exception as e:
        print(f"⚠️ Inspection table setup: {e}")
        print("📝 Please create the inspection table in the public schema")
    
    try:
        # Check samples table (in public schema)
        print("🔍 Checking samples table in public schema...")
        supabase.table('samples').select('*').limit(1).execute()
        print("✅ Samples table exists in public schema")
    except Exception as e:
        print(f"⚠️ Samples table setup: {e}")
        print("📝 Please create the samples table in the public schema")
    
    try:
        # Check user_profiles table (in public schema)
        print("🔍 Checking user_profiles table in public schema...")
        supabase.table('user_profiles').select('*').limit(1).execute()
        print("✅ User_profiles table exists in public schema")
    except Exception as e:
        print(f"⚠️ User_profiles table setup: {e}")
        print("📝 Please create the user_profiles table in the public schema")
    
    # Admin users are now managed only through Supabase database
    print("✅ Admin users are managed through Supabase database only")

def check_supabase_storage():
    """Check Supabase storage configuration and permissions for anon key"""
    try:
        print("🔍 Testing Supabase storage configuration with anon key...")
        
        # Test storage bucket access
        try:
            # Try to list files in mold-images bucket
            result = supabase.storage.from_("mold-images").list()
            print("✅ Successfully accessed mold-images bucket")
            print(f"📊 Bucket contains {len(result)} files/folders")
        except Exception as e:
            print(f"❌ Failed to access mold-images bucket: {e}")
            print("📝 Please check:")
            print("   1. Bucket 'mold-images' exists in Supabase")
            print("   2. Bucket is public or has proper RLS policies")
            print("   3. Your anon key has storage permissions")
            print("   4. Storage policies allow anon access")
        
        # Test storage permissions
        try:
            # Try to get bucket info
            bucket_info = supabase.storage.get_bucket("mold-images")
            print("✅ Successfully retrieved bucket information")
            print(f"📊 Bucket public: {bucket_info.public}")
        except Exception as e:
            print(f"❌ Failed to get bucket info: {e}")
        
        # Test upload permissions with a small test file
        try:
            test_content = b"test file content"
            test_path = f"test-upload-{uuid.uuid4()}.txt"
            
            print(f"🔍 Testing upload with path: {test_path}")
            
            upload_result = supabase.storage.from_("mold-images").upload(
                path=test_path,
                file=test_content,
                file_options={"content-type": "text/plain"}
            )
            
            if hasattr(upload_result, 'error') and upload_result.error:
                print(f"❌ Test upload failed: {upload_result.error}")
                print("📝 This indicates storage permission issues with anon key")
            else:
                print("✅ Test upload successful with anon key")
                
                # Clean up test file
                try:
                    supabase.storage.from_("mold-images").remove([test_path])
                    print("✅ Test file cleaned up")
                except Exception as cleanup_error:
                    print(f"⚠️ Failed to cleanup test file: {cleanup_error}")
                    
        except Exception as e:
            print(f"❌ Test upload failed: {e}")
            print("📝 This indicates storage permission issues with anon key")
            print("📝 Please check your Supabase storage policies")
            
    except Exception as e:
        print(f"❌ Storage configuration check failed: {e}")

def validate_supabase_credentials():
    """Validate Supabase credentials and configuration"""
    print("🔍 Validating Supabase credentials...")
    
    # Check environment variables
    print(f"📝 SUPABASE_URL: {'✅ Set' if SUPABASE_URL and SUPABASE_URL != 'your_supabase_url_here' else '❌ Not set'}")
    print(f"📝 SUPABASE_ANON_KEY: {'✅ Set' if SUPABASE_ANON_KEY and SUPABASE_ANON_KEY != 'your_supabase_anon_key_here' else '❌ Not set'}")
    
    # Check URL format
    if SUPABASE_URL and 'supabase.co' in SUPABASE_URL:
        print("✅ Supabase URL format looks correct")
    else:
        print("❌ Supabase URL format may be incorrect")
    
    # Check key format
    if SUPABASE_ANON_KEY and len(SUPABASE_ANON_KEY) > 50:
        print("✅ Supabase key format looks correct")
    else:
        print("❌ Supabase key format may be incorrect")
    
    # Test basic connection
    try:
        result = supabase.table('inspection').select('*').limit(1).execute()
        print("✅ Basic Supabase connection successful")
    except Exception as e:
        print(f"❌ Basic Supabase connection failed: {e}")
        print("📝 Please check your credentials and network connection")

# Skip heavy DB probes at import time (gunicorn / Render). Tables are used on first request.
print("Skipping init_db network probes at startup (Render-safe)")
# init_db()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint — always 200 so Render deploy/health checks succeed."""
    return jsonify({
        "status": "healthy",
        "supabase_configured": supabase is not None,
        "message": "Backend is running",
    })

@app.route('/api/ocr-status', methods=['GET'])
def ocr_status():
    """OCR integration status endpoint for debugging"""
    print("🔍 OCR STATUS: Checking OCR integration status...")
    
    status = {
        "vision_client_available": bool(ocr_integration.vision_client),
        "openai_client_available": bool(ocr_integration.openai_client), 
        "integration_available": ocr_integration.is_available,
        "google_credentials_env": bool(os.getenv('GOOGLE_APPLICATION_CREDENTIALS')),
        "google_credentials_path": os.getenv('GOOGLE_APPLICATION_CREDENTIALS'),
        "openai_api_key_configured": bool(OPENAI_API_KEY),
        "openai_api_key_length": len(OPENAI_API_KEY) if OPENAI_API_KEY else 0
    }
    
    # Check if credentials file exists
    creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    if creds_path:
        status["credentials_file_exists"] = os.path.exists(creds_path)
        if os.path.exists(creds_path):
            try:
                with open(creds_path, 'r') as f:
                    import json
                    creds = json.load(f)
                    status["credentials_valid_json"] = True
                    status["service_account_type"] = creds.get('type') == 'service_account'
                    status["project_id"] = creds.get('project_id', 'unknown')
            except Exception as e:
                status["credentials_valid_json"] = False
                status["credentials_error"] = str(e)
    
    # Add OpenAI client status details
    if ocr_integration.openai_client:
        status["openai_client_status"] = "✅ Initialized"
    else:
        status["openai_client_status"] = "❌ Not initialized - check OPENAI_API_KEY"
    
    print(f"🔍 OCR STATUS: Returning status: {status}")
    return jsonify(status)

@app.route("/")
def home():
    from datetime import datetime
    return {
        "status": "✅ OK",
        "time": datetime.utcnow().isoformat() + "Z",
        "version": "v1.0.0"
    }


@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login endpoint with secure password authentication"""
    print(f"🔍 DEBUG: Login request received")
    data = request.get_json()
    print(f"🔍 DEBUG: Request data: {data}")
    
    email = data.get('email')
    password = data.get('password')
    
    print(f"🔍 DEBUG: Email: {email}, Password provided: {bool(password)}")
    
    if not email or not password:
        print(f"🔍 DEBUG: Missing email or password")
        return jsonify({"error": "Email and password required"}), 400
    
    try:
        # Query user_profiles table for the given email using .single() to ensure only one result
        result = supabase.table('user_profiles').select('*').eq('email', email).execute()
        
        # Check if user exists - use consistent error message for security
        if not result.data:
            print(f"🔍 DEBUG: User not found for email: {email}")
            return jsonify({"error": "Invalid credentials"}), 401
        
        user_data = result.data[0]
        print(f"🔍 DEBUG: User found: {user_data.get('email')}")
        
        # Check if password_hash exists
        password_hash = user_data.get('password_hash')
        if not password_hash:
            print(f"🔍 DEBUG: No password hash found for user: {email}")
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Verify password using bcrypt
        if not check_password_hash(password_hash, password):
            print(f"🔍 DEBUG: Invalid password for user: {email}")
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Create JWT token
        access_token = create_jwt_token(user_data['id'], user_data['email'])
        
        # Return success response
        response_data = {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_data['id'],
                "email": user_data['email'],
                "full_name": user_data.get('full_name', ''),
                "is_admin": user_data.get('role') == 'admin',
                "role": user_data.get('role', 'user')
            }
        }
        
        print(f"🔍 DEBUG: Login successful for user: {email}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"🔍 DEBUG: Login error: {e}")
        return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/auth/validate', methods=['GET'])
def validate_token():
    """Token validation endpoint with proper JWT validation"""
    print(f"🔍 DEBUG: Token validation request received")
    
    # Get Authorization header
    auth_header = request.headers.get('Authorization')
    print(f"🔍 DEBUG: Auth header: {auth_header}")
    
    if not auth_header or not auth_header.startswith('Bearer '):
        print(f"🔍 DEBUG: Missing or invalid Authorization header")
        return jsonify({"error": "Authorization header required"}), 401
    
    token = auth_header.split(' ')[1]
    print(f"🔍 DEBUG: Extracted token: {token[:10]}...")
    
    try:
        # Verify and decode the JWT token
        payload = verify_jwt_token(token)
        print(f"🔍 DEBUG: Token validation successful for user: {payload.get('email')}")
        
        return jsonify({
            "valid": True,
            "message": "Token is valid",
            "user_id": payload.get('user_id'),
            "email": payload.get('email')
        }), 200
        
    except ValueError as e:
        print(f"🔍 DEBUG: Token validation failed: {e}")
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        print(f"🔍 DEBUG: Token validation error: {e}")
        return jsonify({"error": "Invalid token"}), 401

@app.route('/api/auth/register', methods=['POST'])
def register():
    """User registration endpoint - now stores password hash"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    try:
        # Check if user already exists in user_profiles table
        existing_user = supabase.table('user_profiles').select('*').eq('email', email).execute()
        if existing_user.data:
            return jsonify({"error": "Email already exists"}), 400
        
        # Hash the password
        password_hash = generate_password_hash(password)
        # Insert new user in user_profiles table
        result = supabase.table('user_profiles').insert({
            'id': str(uuid.uuid4()),
            'email': email,
            'full_name': email.split('@')[0],  # Use email prefix as name
            'role': 'user',
            'password_hash': password_hash
        }).execute()
        
        user_id = result.data[0]['id'] if result.data else None
        
        return jsonify({
            "message": "User registered successfully",
            "user_id": user_id
        })
    except Exception as e:
        print(f"🔍 DEBUG: Registration error: {e}")
        return jsonify({"error": "Registration failed"}), 500

# ============================================================================
# ASBESTOS INSPECTION ENDPOINTS
# ============================================================================

@app.route('/api/asbestosinspection', methods=['GET'])
def get_asbestos_inspections():
    """Get all asbestos inspections with filtering and pagination"""
    try:
        # Get query parameters
        sort_by = request.args.get('sort', '-created_at')
        limit = int(request.args.get('limit', 50))
        email = request.args.get('email')
        
        # Limit the maximum number of inspections to prevent performance issues
        if limit > 100:
            limit = 100
        
        # Check if user is admin from database
        is_admin = False
        if email:
            try:
                user_result = supabase.table('user_profiles').select('role, is_admin').eq('email', email).execute()
                if user_result.data:
                    user_data = user_result.data[0]
                    is_admin = user_data.get('role') == 'admin' or user_data.get('is_admin', False)
            except Exception as e:
                print(f"⚠️ Error checking user admin status: {e}")
                is_admin = False
        
        print(f"🔍 DEBUG: Fetching asbestos inspections with sort={sort_by}, limit={limit}, is_admin={is_admin}")
        
        # Build the query - select only essential fields for list view
        query = supabase.table('asbestosinspection').select(
            'id,created_at,updated_date,created_by_id,'
            'full_name,email,client_type,street_address,city,state,zip_code,'
            'property_type,square_footage,status,app_id,year_built'
        )
        
        # Apply sorting - handle different sort fields
        if sort_by:
            if sort_by == '-created_at':
                query = query.order('created_at', desc=True)
            elif sort_by.startswith('-'):
                # Handle other descending sorts
                field = sort_by[1:]
                query = query.order(field, desc=True)
            else:
                query = query.order(sort_by)
        
        # Apply limit
        query = query.limit(limit)

        print(f"🔍 DEBUG: Executing asbestos inspection query...")
        result = query.execute()
        inspections = result.data
        print(f"🔍 DEBUG: Found {len(inspections)} asbestos inspections")
        
        # Filter by email if provided (for non-admin users)
        if email and not is_admin:
            inspections = [i for i in inspections if i.get('email') == email]

        # Convert to expected format
        result_list = []
        for inspection in inspections:
            inspection_data = {
                # Basic identification
                "id": inspection['id'],
                "created_at": inspection['created_at'],
                "updated_date": inspection.get('updated_date'),
                "created_by_id": inspection.get('created_by_id'),
                "app_id": inspection.get('app_id', 'asbestos'),
                
                # Client information
                "full_name": inspection.get('full_name'),
                "email": inspection.get('email'),
                "client_type": inspection.get('client_type'),
                
                # Property information
                "street_address": inspection.get('street_address'),
                "city": inspection.get('city'),
                "state": inspection.get('state'),
                "zip_code": inspection.get('zip_code'),
                "property_type": inspection.get('property_type'),
                "square_footage": inspection.get('square_footage'),
                "year_built": inspection.get('year_built'),
                
                # Status and metadata
                "status": inspection.get('status', 'pending'),
            }
            
            result_list.append(inspection_data)
        
        print(f"🔍 DEBUG: Returning {len(result_list)} asbestos inspections")
        return jsonify(result_list)
            
    except Exception as e:
        print(f"🔍 DEBUG: Get asbestos inspections error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch asbestos inspections: {str(e)}"}), 500

@app.route('/api/asbestosinspection/<int:inspection_id>', methods=['GET'])
def get_asbestos_inspection_by_id(inspection_id):
    """Get a single asbestos inspection by ID"""
    try:
        print(f"🔍 DEBUG: Getting asbestos inspection with ID: {inspection_id}")
        
        result = supabase.table('asbestosinspection').select('*').eq('id', inspection_id).execute()
        inspections = result.data
        
        if inspections and len(inspections) > 0:
            inspection = inspections[0]
            print(f"🔍 DEBUG: Found asbestos inspection - ID: {inspection.get('id')}")
            return jsonify(inspection)
        else:
            print(f"🔍 DEBUG: No asbestos inspection found with ID: {inspection_id}")
            return jsonify({"error": "Asbestos inspection not found"}), 404
            
    except Exception as e:
        print(f"🔍 DEBUG: Get asbestos inspection by ID error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch asbestos inspection: {str(e)}"}), 500

@app.route('/api/asbestosinspection', methods=['POST'])
def create_asbestos_inspection():
    """Create new asbestos inspection"""
    try:
        data = request.get_json()
        print(f"🔍 DEBUG: Creating asbestos inspection with data:", data)
        
        # Prepare data for insertion
        inspection_data = {
            'full_name': data.get('full_name'),
            'street_address': data.get('street_address'),
            'city': data.get('city'),
            'state': data.get('state'),
            'zip_code': data.get('zip_code'),
            'property_type': data.get('property_type'),
            'client_type': data.get('client_type'),
            'square_footage': data.get('square_footage'),
            'year_built': data.get('year_built'),
            'status': data.get('status', 'pending'),
            'created_by_id': data.get('created_by'),
            'email': data.get('email'),
            'app_id': 'asbestos',
            'material_type': data.get('material_type'),
            'material_condition': data.get('material_condition'),
            'material_images': data.get('material_images', [])
        }
        
        # Insert new asbestos inspection
        result = supabase.table('asbestosinspection').insert(inspection_data).execute()
        
        if result.data:
            print(f"✅ DEBUG: Asbestos inspection created successfully with ID: {result.data[0]['id']}")
            return jsonify({
                "message": "Asbestos inspection created successfully",
                "id": result.data[0]['id']
            }), 201
        else:
            print(f"❌ DEBUG: Failed to create asbestos inspection")
            return jsonify({"error": "Failed to create asbestos inspection"}), 500
            
    except Exception as e:
        print(f"🔍 DEBUG: Create asbestos inspection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to create asbestos inspection: {str(e)}"}), 500

@app.route('/api/asbestosinspection/<int:inspection_id>', methods=['PUT'])
def update_asbestos_inspection(inspection_id):
    """Update asbestos inspection"""
    try:
        data = request.get_json()
        print(f"🔍 DEBUG: Updating asbestos inspection {inspection_id} with data:", data)
        
        # Update the asbestos inspection
        result = supabase.table('asbestosinspection').update(data).eq('id', inspection_id).execute()
        
        if result.data:
            print(f"✅ DEBUG: Asbestos inspection {inspection_id} updated successfully")
            return jsonify({
                "message": "Asbestos inspection updated successfully",
                "id": inspection_id
            })
        else:
            print(f"❌ DEBUG: Failed to update asbestos inspection {inspection_id}")
            return jsonify({"error": "Failed to update asbestos inspection"}), 500
            
    except Exception as e:
        print(f"🔍 DEBUG: Update asbestos inspection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to update asbestos inspection: {str(e)}"}), 500

@app.route('/api/asbestosinspection/<int:inspection_id>', methods=['DELETE'])
def delete_asbestos_inspection(inspection_id):
    """Delete asbestos inspection"""
    try:
        print(f"🔍 DEBUG: Deleting asbestos inspection with ID: {inspection_id}")
        
        result = supabase.table('asbestosinspection').delete().eq('id', inspection_id).execute()
        
        print(f"🔍 DEBUG: Delete asbestos inspection result:", result)
        
        return jsonify({
            "message": "Asbestos inspection deleted successfully"
        })
    except Exception as e:
        print(f"🔍 DEBUG: Delete asbestos inspection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to delete asbestos inspection: {str(e)}"}), 500

@app.route('/api/inspection', methods=['GET'])
def get_inspections():
    """Get lightweight inspection list - optimized for performance"""
    try:
        # Get query parameters
        sort_by = request.args.get('sort', '-created_at')
        limit = int(request.args.get('limit', 10))  # Default to 10, max 50
        email = request.args.get('email')
        detailed = request.args.get('detailed', 'false').lower() == 'true'
        
        # Limit the maximum number of inspections to prevent performance issues
        if limit > 50:
            limit = 50
        
        # Check if user is admin from database
        is_admin = False
        if email:
            try:
                user_result = supabase.table('user_profiles').select('role, is_admin').eq('email', email).execute()
                if user_result.data:
                    user_data = user_result.data[0]
                    is_admin = user_data.get('role') == 'admin' or user_data.get('is_admin', False)
            except Exception as e:
                print(f"⚠️ Error checking user admin status: {e}")
                is_admin = False
        
        print(f"🔍 DEBUG: Fetching inspections with sort={sort_by}, limit={limit}, is_admin={is_admin}, detailed={detailed}")
        
        # Build the query - select only lightweight fields by default
        if detailed:
            # For detailed view, include all fields (used for individual inspection views)
            query = supabase.table('inspection').select('*')
        else:
            # For list view, select only essential lightweight fields
            query = supabase.table('inspection').select(
                'id,created_at,updated_date,created_by_id,'
                'full_name,email,client_type,street_address,city,state,zip_code,'
                'property_type,square_footage,has_visible_mold,has_water_damage,'
                'status,is_sample,inspection_number,app_id'
            )
        
        # Apply sorting - handle different sort fields
        if sort_by:
            if sort_by == '-created_at':
                query = query.order('created_at', desc=True)
            elif sort_by.startswith('-'):
                # Handle other descending sorts
                field = sort_by[1:]
                query = query.order(field, desc=True)
            else:
                query = query.order(sort_by)
        
        # Apply limit
        query = query.limit(limit)

        print(f"🔍 DEBUG: Executing query...")
        result = query.execute()
        inspections = result.data
        print(f"🔍 DEBUG: Found {len(inspections)} inspections")
        
        # Filter by email if provided (for non-admin users)
        if email and not is_admin:
            inspections = [i for i in inspections if i.get('email') == email]

        # Convert to expected format
        result_list = []
        for inspection in inspections:
            inspection_data = {
                # Basic identification
                "id": inspection['id'],
                "inspection_number": inspection.get('inspection_number') or inspection.get('id'),
                "created_at": inspection['created_at'],
                "updated_date": inspection.get('updated_date'),
                "created_by_id": inspection.get('created_by_id'),
                "app_id": inspection.get('app_id', 'mold'),
                
                # Client information
                "full_name": inspection.get('full_name'),
                "email": inspection.get('email'),
                "client_type": inspection.get('client_type'),
                
                # Property information
                "street_address": inspection.get('street_address'),
                "city": inspection.get('city'),
                "state": inspection.get('state'),
                "zip_code": inspection.get('zip_code'),
                "property_type": inspection.get('property_type'),
                "square_footage": inspection.get('square_footage'),
                
                # Status and metadata
                "status": inspection.get('status', 'pending'),
                "is_sample": inspection.get('is_sample'),
                
                # Legacy fields for compatibility
                "user_id": inspection.get('created_by_id'),
                "property_address": inspection.get('street_address', ''),
                "inspection_date": inspection.get('created_at'),
                "summary": f"Inspection for {inspection.get('full_name', 'Unknown')}",
                "user_email": inspection.get('email'),
            }
            
            # Only include heavy fields if detailed view is requested
            if detailed:
                inspection_data.update({
                    # Mold assessment
                    "mold_locations": inspection.get('mold_locations'),
                    "mold_images": inspection.get('mold_images'),
                    
                    # Water damage assessment
                    "water_damage_locations": inspection.get('water_damage_locations'),
                    "water_damage_images": inspection.get('water_damage_images'),
                    
                    # Environmental data
                    "thermostat_image": inspection.get('thermostat_image'),
                    
                    # Lab analysis data
                    "lab_analysis_images": inspection.get('lab_analysis_images') or inspection.get('mold_images'),
                    "lab_conclusion": inspection.get('lab_conclusion'),
                    "lab_recommendations": inspection.get('lab_recommendations'),
                })
            
            result_list.append(inspection_data)
        
        print(f"🔍 DEBUG: Returning {len(result_list)} inspections (detailed={detailed})")
        return jsonify(result_list)
            
    except Exception as e:
        print(f"🔍 DEBUG: Get inspections error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch inspections: {str(e)}"}), 500

@app.route('/api/inspection/<int:inspection_id>', methods=['GET'])
def get_inspection_by_id(inspection_id):
    """Get a single inspection by ID"""
    try:
        print(f"🔍 DEBUG: Getting inspection with ID: {inspection_id}")
        
        result = supabase.table('inspection').select('*').eq('id', inspection_id).execute()
        inspections = result.data
        
        if inspections and len(inspections) > 0:
            inspection = inspections[0]
            print(f"🔍 DEBUG: Found inspection - ID: {inspection.get('id')}")
            print(f"🔍 DEBUG: lab_analysis_images field: {inspection.get('lab_analysis_images')}")
            print(f"🔍 DEBUG: mold_images field: {inspection.get('mold_images')}")
            print(f"🔍 DEBUG: lab_conclusion field: {inspection.get('lab_conclusion')}")
            print(f"🔍 DEBUG: lab_recommendations field: {inspection.get('lab_recommendations')}")
            print(f"🔍 DEBUG: All available fields: {list(inspection.keys())}")
            return jsonify(inspection)
        else:
            print(f"🔍 DEBUG: No inspection found with ID: {inspection_id}")
            return jsonify({"error": "Inspection not found"}), 404
            
    except Exception as e:
        print(f"🔍 DEBUG: Get inspection by ID error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch inspection: {str(e)}"}), 500

@app.route('/api/inspection', methods=['POST'])
def create_inspection():
    """Create new inspection"""
    data = request.get_json()
    
    print(f"🔍 DEBUG: Creating inspection with data:", data)
    
    try:
        # Prepare data for insertion using actual database column names
        inspection_data = {
            'full_name': data.get('full_name'),
            'street_address': data.get('street_address'),
            'city': data.get('city'),
            'state': data.get('state'),
            'zip_code': data.get('zip_code'),
            'property_type': data.get('property_type'),
            'client_type': data.get('client_type'),
            'square_footage': data.get('square_footage'),
            'background_info': data.get('background_info'),
            'has_visible_mold': data.get('has_visible_mold'),
            'has_water_damage': data.get('has_water_damage'),
            'status': data.get('status', 'pending'),
            'created_by_id': data.get('created_by'),
            'email': data.get('email'),
            'is_sample': data.get('is_sample', False),
            'app_id': 'mold'  # Default app_id for all inspections
        }
        
        # Handle image fields using correct database column names
        if 'visible_mold_details' in data and data['visible_mold_details']:
            # Extract only images and locations from visible_mold_details
            mold_images = []
            mold_locations = []
            for entry in data['visible_mold_details']:
                # Each entry is expected to be a dict with 'images' and 'location'
                if 'images' in entry and isinstance(entry['images'], list):
                    mold_images.extend(entry['images'])
                if 'location' in entry:
                    mold_locations.append(entry['location'])
            inspection_data['mold_images'] = mold_images
            inspection_data['mold_locations'] = json.dumps(mold_locations)
            print(f"🔍 DEBUG: Serializing mold_images: {len(mold_images)} images, mold_locations: {len(mold_locations)} locations")
        
        if 'water_damage_details' in data and data['water_damage_details']:
            # Extract only images and locations from water_damage_details
            water_damage_images = []
            water_damage_locations = []
            for entry in data['water_damage_details']:
                # Each entry is expected to be a dict with 'images' and 'location'
                if 'images' in entry and isinstance(entry['images'], list):
                    water_damage_images.extend(entry['images'])
                if 'location' in entry:
                    water_damage_locations.append(entry['location'])
            inspection_data['water_damage_images'] = water_damage_images
            inspection_data['water_damage_locations'] = json.dumps(water_damage_locations)
            print(f"🔍 DEBUG: Serializing water_damage_images: {len(water_damage_images)} images, water_damage_locations: {len(water_damage_locations)} locations")
        
        # Handle individual image fields
        if 'thermostat_image' in data and data['thermostat_image']:
            inspection_data['thermostat_image'] = data['thermostat_image']
            
        # Handle environmental data fields
        if 'temperature' in data and data['temperature'] is not None and data['temperature'] != '':
            try:
                inspection_data['temperature'] = float(data['temperature'])
            except (ValueError, TypeError):
                print(f"⚠️ WARNING: Invalid temperature value: {data['temperature']}, skipping")
        if 'humidity' in data and data['humidity'] is not None and data['humidity'] != '':
            try:
                inspection_data['humidity'] = float(data['humidity'])
            except (ValueError, TypeError):
                print(f"⚠️ WARNING: Invalid humidity value: {data['humidity']}, skipping")
        if 'environmental_data_method' in data:
            inspection_data['environmental_data_method'] = data['environmental_data_method']
            
        # Note: lab_analysis_images will be handled by the separate upload endpoint
        
        print(f"🔍 DEBUG: Final inspection data for insert:", inspection_data)
        
        result = supabase.table('inspection').insert(inspection_data).execute()
        
        print(f"🔍 DEBUG: Supabase result:", result)
        print(f"🔍 DEBUG: Result data:", result.data)
        
        inspection = result.data[0] if result.data else None
        print(f"🔍 DEBUG: Extracted inspection:", inspection)
        
        response_data = {
            "message": "Inspection created successfully",
            "inspection": inspection
        }
        print(f"🔍 DEBUG: Returning response:", response_data)
        
        return jsonify(response_data)
    except Exception as e:
        print(f"🔍 DEBUG: Create inspection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to create inspection: {str(e)}"}), 500

@app.route('/api/inspection/<int:inspection_id>', methods=['PUT'])
def update_inspection(inspection_id):
    """Update inspection"""
    data = request.get_json()
    
    print(f"🔍 DEBUG: Updating inspection {inspection_id} with data:", data)
    
    # Debug lab_analysis_images specifically to track the array issue
    if 'lab_analysis_images' in data:
        print(f"🔍 DEBUG: lab_analysis_images field details:")
        print(f"  - Type: {type(data['lab_analysis_images'])}")
        print(f"  - Value: {repr(data['lab_analysis_images'])}")
        if isinstance(data['lab_analysis_images'], str):
            print(f"  - String length: {len(data['lab_analysis_images'])}")
            print(f"  - First 100 chars: {data['lab_analysis_images'][:100]}")
        elif isinstance(data['lab_analysis_images'], list):
            print(f"  - Array length: {len(data['lab_analysis_images'])}")
            print(f"  - Array items: {data['lab_analysis_images']}")
    
    try:
        # Build update data dynamically based on what's provided
        update_data = {}
        if 'status' in data:
            update_data['status'] = data['status']
        if 'property_address' in data:
            update_data['property_address'] = data['property_address']
        if 'inspection_date' in data:
            update_data['inspection_date'] = data['inspection_date']
        if 'summary' in data:
            update_data['summary'] = data['summary']
        if 'has_visible_mold' in data:
            update_data['has_visible_mold'] = data['has_visible_mold']
        if 'has_water_damage' in data:
            update_data['has_water_damage'] = data['has_water_damage']
        if 'is_sample' in data:
            update_data['is_sample'] = data['is_sample']
        if 'background_info' in data:
            update_data['background_info'] = data['background_info']
        
        # Handle image fields using correct database column names
        if 'lab_analysis_images' in data:
            if isinstance(data['lab_analysis_images'], list):
                # Already a list, store directly as PostgreSQL array
                update_data['lab_analysis_images'] = data['lab_analysis_images']
                print(f"🔍 DEBUG: Storing lab_analysis_images as PostgreSQL array: {len(data['lab_analysis_images'])} images")
            elif isinstance(data['lab_analysis_images'], str):
                try:
                    # Parse JSON string back to array (from frontend JSON.stringify)
                    parsed_images = json.loads(data['lab_analysis_images'])
                    if isinstance(parsed_images, list):
                        update_data['lab_analysis_images'] = parsed_images
                        print(f"🔍 DEBUG: Parsed lab_analysis_images JSON string to PostgreSQL array: {len(parsed_images)} images")
                    else:
                        print(f"⚠️ WARNING: lab_analysis_images parsed but not a list: {type(parsed_images)}")
                        update_data['lab_analysis_images'] = []
                except json.JSONDecodeError as e:
                    print(f"❌ ERROR: Failed to parse lab_analysis_images JSON: {e}")
                    print(f"🔍 DEBUG: Raw data['lab_analysis_images']: {repr(data['lab_analysis_images'])}")
                    update_data['lab_analysis_images'] = []
            else:
                # Handle null/None case
                update_data['lab_analysis_images'] = data['lab_analysis_images']
                print(f"🔍 DEBUG: Setting lab_analysis_images to: {data['lab_analysis_images']}")
        
        if 'visible_mold_details' in data:
            # Map visible_mold_details to mold_locations database column
            if isinstance(data['visible_mold_details'], list):
                update_data['mold_locations'] = json.dumps(data['visible_mold_details'])
                print(f"🔍 DEBUG: Serializing visible_mold_details to mold_locations: {len(data['visible_mold_details'])} entries")
            else:
                update_data['mold_locations'] = data['visible_mold_details']
        
        if 'water_damage_details' in data:
            # Map water_damage_details to water_damage_locations database column
            if isinstance(data['water_damage_details'], list):
                update_data['water_damage_locations'] = json.dumps(data['water_damage_details'])
                print(f"🔍 DEBUG: Serializing water_damage_details to water_damage_locations: {len(data['water_damage_details'])} entries")
            else:
                update_data['water_damage_locations'] = data['water_damage_details']
        
        if 'thermostat_image' in data:
            update_data['thermostat_image'] = data['thermostat_image']
            print(f"🔍 DEBUG: Updating thermostat_image: {data['thermostat_image']}")
        
        # Handle environmental data fields
        if 'temperature' in data and data['temperature'] is not None and data['temperature'] != '':
            try:
                update_data['temperature'] = float(data['temperature'])
                print(f"🔍 DEBUG: Updating temperature: {data['temperature']}")
            except (ValueError, TypeError):
                print(f"⚠️ WARNING: Invalid temperature value: {data['temperature']}, skipping")
        if 'humidity' in data and data['humidity'] is not None and data['humidity'] != '':
            try:
                update_data['humidity'] = float(data['humidity'])
                print(f"🔍 DEBUG: Updating humidity: {data['humidity']}")
            except (ValueError, TypeError):
                print(f"⚠️ WARNING: Invalid humidity value: {data['humidity']}, skipping")
        if 'environmental_data_method' in data:
            update_data['environmental_data_method'] = data['environmental_data_method']
            print(f"🔍 DEBUG: Updating environmental_data_method: {data['environmental_data_method']}")
        
        # Handle text fields (only if they exist in database schema)
        # NOTE: conclusion and recommendations columns don't exist in current database schema
        # Remove these to prevent PGRST204 "column not found" errors
        # if 'conclusion' in data:
        #     update_data['conclusion'] = data['conclusion']
        # if 'recommendations' in data:
        #     update_data['recommendations'] = data['recommendations']
        
        # Handle lab analysis fields
        if 'lab_conclusion' in data:
            update_data['lab_conclusion'] = data['lab_conclusion']
            print(f"🔍 DEBUG: Updating lab_conclusion: {data['lab_conclusion'][:100]}...")
        
        if 'lab_recommendations' in data:
            update_data['lab_recommendations'] = data['lab_recommendations']
            print(f"🔍 DEBUG: Updating lab_recommendations: {data['lab_recommendations'][:100]}...")
        
        print(f"🔍 DEBUG: Update data to apply:", update_data)
        
        result = supabase.table('inspection').update(update_data).eq('id', inspection_id).execute()
        
        updated_inspection = result.data[0] if result.data else None
        print(f"🔍 DEBUG: Updated inspection:", updated_inspection)
        
        return jsonify({
            "message": "Inspection updated successfully",
            "inspection": updated_inspection
        })
    except Exception as e:
        print(f"🔍 DEBUG: Update inspection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to update inspection: {str(e)}"}), 500

@app.route('/api/inspection/<int:inspection_id>', methods=['DELETE'])
def delete_inspection(inspection_id):
    """Delete inspection"""
    try:
        print(f"🔍 DEBUG: Deleting inspection with ID: {inspection_id}")
        
        result = supabase.table('inspection').delete().eq('id', inspection_id).execute()
        
        print(f"🔍 DEBUG: Delete result:", result)
        
        return jsonify({
            "message": "Inspection deleted successfully"
        })
    except Exception as e:
        print(f"🔍 DEBUG: Delete inspection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to delete inspection: {str(e)}"}), 500

@app.route('/api/samples', methods=['GET'])
def get_samples():
    """Get all samples"""
    inspection_id = request.args.get('inspection_id')
    
    try:
        if inspection_id:
            result = supabase.table('samples').select('*').eq('inspection_id', inspection_id).execute()
        else:
            result = supabase.table('samples').select('*').execute()
        
        samples = result.data
        
        # Convert to expected format
        result_list = []
        for sample in samples:
            result_list.append({
                "id": sample['id'],
                "inspection_id": sample['inspection_id'],
                "sample_type": sample.get('description', ''),  # Use description as sample_type
                "location": sample.get('location'),
                "notes": sample.get('description'),
                "sample_image": sample.get('sample_image'),
                "created_at": sample['created_at']
            })
        
        return jsonify(result_list)
    except Exception as e:
        print(f"🔍 DEBUG: Get samples error: {e}")
        return jsonify({"error": "Failed to fetch samples"}), 500

@app.route('/api/samples', methods=['POST'])
def create_sample():
    """Create new sample"""
    data = request.get_json()
    
    try:
        result = supabase.table('samples').insert({
            'inspection_id': data.get('inspection_id'),
            'location': data.get('location'),
            'description': data.get('sample_type') or data.get('notes'),
            'sample_image': data.get('sample_image')
        }).execute()
        
        sample = result.data[0] if result.data else None
        
        return jsonify({
            "message": "Sample created successfully",
            "sample": sample
        })
    except Exception as e:
        print(f"🔍 DEBUG: Create sample error: {e}")
        return jsonify({"error": "Failed to create sample"}), 500

@app.route('/api/llm/summarize', methods=['POST'])
def llm_summarize():
    """LLM summarization endpoint (mock)"""
    data = request.get_json()
    text = data.get('text', '') if data else ''
    
    # Mock LLM response
    summary = f"Summary of inspection: {text[:100]}... (Mock LLM response)"
    
    return jsonify({
        "summary": summary,
        "model": "gpt-4-mock"
    })

@app.route('/api/validate-lab-image-file', methods=['POST'])
def validate_lab_image_file():
    """Validate a lab analysis image file using OCR before uploading to storage"""
    print("🔍 VALIDATE FILE: Starting lab image file validation...")
    
    # Debug: Print GOOGLE_APPLICATION_CREDENTIALS env and file existence
    creds_env = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    print(f"🔍 VALIDATE FILE: GOOGLE_APPLICATION_CREDENTIALS={creds_env}")
    if creds_env:
        print(f"🔍 VALIDATE FILE: Credentials file exists: {os.path.exists(creds_env)}")
    else:
        print(f"❌ VALIDATE FILE: GOOGLE_APPLICATION_CREDENTIALS not set!")

    try:
        # Check if file is present in request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided", "valid": False}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected", "valid": False}), 400
        
        print(f"🔍 VALIDATE FILE: Validating file: {file.filename}")
        
        # Read file content
        file_content = file.read()
        if not file_content:
            return jsonify({"error": "Empty file", "valid": False}), 400
        
        # Reset file pointer for potential reuse
        file.seek(0)
        
        print(f"🔍 VALIDATE FILE: File size: {len(file_content)} bytes")
        
        # Debug: Print ocr_integration.vision_client value/type
        print(f"🔍 VALIDATE FILE: ocr_integration.vision_client type: {type(ocr_integration.vision_client)} value: {ocr_integration.vision_client}")
        # Debug: Print OCR_SUPPORTED_LANGUAGES value/type
        print(f"🔍 VALIDATE FILE: OCR_SUPPORTED_LANGUAGES type: {type(OCR_SUPPORTED_LANGUAGES)} value: {OCR_SUPPORTED_LANGUAGES}")
        
        # Always attempt Google Vision API call - no fallback logic
        try:
            # Ensure Vision client is available
            if not ocr_integration.vision_client:
                logger.error("❌ Google Vision API client is None - check credentials configuration")
                raise Exception("Google Vision API client not initialized. Please verify GOOGLE_APPLICATION_CREDENTIALS environment variable and credentials file exist.")
            
            from google.cloud import vision
            image = vision.Image(content=file_content)
            
            # Configure text detection with language hints
            image_context = vision.ImageContext(language_hints=OCR_SUPPORTED_LANGUAGES)
            
            # Always perform real Google Vision API text detection call
            print(f"🔍 VALIDATE FILE: Making Google Vision API text_detection call for file: {file.filename}")
            response = ocr_integration.vision_client.text_detection(image=image, image_context=image_context)
            texts = response.text_annotations
            
            # Debug: Print full Vision API response, error, and texts
            print(f"🔍 VALIDATE FILE: Vision API response: {response}")
            print(f"🔍 VALIDATE FILE: Vision API response.error: {getattr(response, 'error', None)}")
            print(f"🔍 VALIDATE FILE: Vision API texts: {texts}")
            
            if response.error.message:
                logger.error(f"❌ Google Vision API returned error: {response.error.message}")
                raise Exception(f"Google Vision API error: {response.error.message}")
            
            # Extract full text
            extracted_text = texts[0].description if texts else ""
            
            # Debug: Print actual extracted_text
            print(f"🔍 VALIDATE FILE: Extracted text: {repr(extracted_text)} (length: {len(extracted_text)})")
            
            print(f"✅ VALIDATE FILE: Google Vision API successfully extracted {len(extracted_text)} characters from file")
            
            # Consider image valid if we extracted any text
            is_valid = len(extracted_text.strip()) > 0
            
            print(f"✅ VALIDATE FILE: Processing complete - Valid: {is_valid}, Text length: {len(extracted_text)}")
            
            return jsonify({
                "valid": is_valid,
                "extracted_text": extracted_text,
                "confidence": "high" if len(extracted_text) > 50 else "medium",
                "message": "Image processed successfully" if is_valid else "No text detected in image"
            }), 200
            
        except Exception as ocr_error:
            logger.error(f"❌ VALIDATE FILE: Google Vision API call failed: {ocr_error}")
            print(f"❌ VALIDATE FILE: Google Vision API processing failed: {ocr_error}")
            return jsonify({
                "valid": False,
                "error": f"Google Vision API call failed: {str(ocr_error)}",
                "extracted_text": "",
                "message": "Manual review required - Google Vision API call failed"
            }), 200
        
    except Exception as e:
        print(f"❌ VALIDATE FILE: Error: {str(e)}")
        return jsonify({
            "valid": False,
            "error": str(e),
            "extracted_text": ""
        }), 500

@app.route('/api/validate-lab-image', methods=['POST'])
def validate_lab_image():
    """Validate a lab analysis image using OCR before saving to database (legacy URL method)"""
    print("🔍 VALIDATE IMAGE: Starting lab image validation...")
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided", "valid": False}), 400
        
        image_url = data.get('image_url')
        if not image_url:
            return jsonify({"error": "No image URL provided", "valid": False}), 400
        
        print(f"🔍 VALIDATE IMAGE: Validating image at URL: {image_url}")
        
        # Use OCR to validate the image can be processed
        ocr_result = ocr_integration.extract_text_from_image_url(image_url)
        
        if 'error' in ocr_result:
            print(f"❌ VALIDATE IMAGE: OCR validation failed: {ocr_result['error']}")
            return jsonify({
                "valid": False,
                "error": ocr_result['error'],
                "extracted_text": ""
            }), 200
        
        extracted_text = ocr_result.get('extracted_text', '')
        
        # Consider image valid if we extracted any text
        is_valid = len(extracted_text.strip()) > 0
        
        print(f"✅ VALIDATE IMAGE: Validation complete - Valid: {is_valid}, Text length: {len(extracted_text)}")
        
        return jsonify({
            "valid": is_valid,
            "extracted_text": extracted_text,
            "confidence": ocr_result.get('confidence', 'unknown'),
            "message": "Image processed successfully" if is_valid else "No text detected in image"
        }), 200
        
    except Exception as e:
        print(f"❌ VALIDATE IMAGE: Error: {str(e)}")
        return jsonify({
            "valid": False,
            "error": str(e),
            "extracted_text": ""
        }), 500

@app.route('/api/ocr-gpt', methods=['POST'])
def ocr_gpt():
    """OCR-GPT endpoint for lab analysis with Google Cloud Vision integration"""
    print("🚀 BACKEND OCR: OCR-GPT endpoint called!")

    try:
        print("📦 BACKEND OCR: Getting request data...")
        data = request.get_json()

        if not data:
            print("❌ BACKEND OCR: No data provided in request")
            return jsonify({'error': 'No data provided'}), 400

        extracted_text = data.get('extracted_text', '')
        inspection_id = data.get('inspection_id', None)

        # CRITICAL DIAGNOSTIC LOGGING
        print("=" * 80)
        print("🚨 DIAGNOSTIC: /api/ocr-gpt ENDPOINT RECEIVED REQUEST")
        print("=" * 80)
        print(f"🔍 DIAGNOSTIC: Request data keys: {list(data.keys())}")
        print(f"🔍 DIAGNOSTIC: inspection_id: {inspection_id}")
        print(f"🔍 DIAGNOSTIC: extracted_text length: {len(extracted_text) if extracted_text else 0}")
        print(f"🔍 DIAGNOSTIC: extracted_text preview (first 500 chars):")
        print(extracted_text[:500] if extracted_text else "EMPTY")
        print(f"🔍 DIAGNOSTIC: extracted_text end (last 200 chars):")
        print(extracted_text[-200:] if extracted_text and len(extracted_text) > 200 else extracted_text)

        # Check if extracted_text contains inspection data
        if "room1" in extracted_text.lower() or "room2" in extracted_text.lower():
            print("🚨 WARNING: extracted_text contains 'room1' or 'room2' - FRONTEND IS SENDING WRONG DATA!")
        if "200%" in extracted_text or "200.0%" in extracted_text:
            print("🚨 WARNING: extracted_text contains '200%' humidity - FRONTEND IS SENDING WRONG DATA!")
        print("=" * 80)

        print("✅ BACKEND OCR: Request data parsed successfully")
        print(f"🔍 DEBUG: Extracted text length: {len(extracted_text) if extracted_text else 0}")
        print(f"🔍 DEBUG: OCR service available: {ocr_integration.is_available}")
        print(f"🔍 DEBUG: OCR integration type: {type(ocr_integration)}")


        # Only use extracted_text for the GPT call. Ignore prompt and image_urls.
        if extracted_text and extracted_text.strip():
            try:
                # Lab Analysis should be independent - don't fetch inspection findings
                # The GPT prompt should analyze ONLY the lab report data
                inspection_findings = None
                print(f"🔍 DEBUG: Lab Analysis mode - inspection_findings set to None for independent analysis")

                gpt_result = ocr_integration.analyze_lab_results_with_gpt(extracted_text, image_urls=None, inspection_findings=None)
            except Exception as e:
                print(f"❌ Error in analyze_lab_results_with_gpt: {str(e)}")
                return jsonify({
                    "error": f"Error in analyze_lab_results_with_gpt: {str(e)}",
                    "content": "Error processing request. Please try again or contact support.",
                    "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                    "ocr_available": ocr_integration.is_available
                }), 500
            
        analysis_text = gpt_result.get("analysis") or ""
        conclusion_text = gpt_result.get("conclusion") or ""
        recommendations_text = gpt_result.get("recommendations") or ""

        response = {
            "content": analysis_text,
            "analysis": analysis_text,
            "conclusion": conclusion_text,
            "recommendations": recommendations_text,
            "extracted_text": extracted_text,
            "ocr_results": [],
            "usage": {
                "prompt_tokens": len(extracted_text.split()),
                "completion_tokens": len(analysis_text.split()),
                "total_tokens": len(extracted_text.split()) + len(analysis_text.split())
            },
            "model": "gpt-4-vision-ocr-text-only",
            "images_processed": 0,
            "timestamp": datetime.now().isoformat()
        }
        return jsonify(response)

    except Exception as e:
        print(f"❌ Error in OCR-GPT endpoint: {str(e)}")
        logger.error(f"OCR-GPT endpoint error: {str(e)}", exc_info=True)
        return jsonify({
            "error": f"OCR-GPT processing failed: {str(e)}",
            "content": "Error processing request. Please try again or contact support.",
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "ocr_available": ocr_integration.is_available
        }), 500


@app.route('/api/generate-report-assistant', methods=['POST'])
def generate_report_assistant():
    """
    Admin-only AI helper: generate editable lab_conclusion / lab_recommendations
    from temporary Laboratory Findings text. Does NOT persist, publish, email, or change status.
    """
    admin_user, auth_error = require_admin_from_request()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    findings_text = data.get('findings_text', '')
    if not isinstance(findings_text, str):
        findings_text = str(findings_text or '')
    findings_text = findings_text.strip()

    if not findings_text:
        return jsonify({"error": "Laboratory findings text is required"}), 400

    if len(findings_text) > REPORT_ASSISTANT_MAX_FINDINGS_CHARS:
        return jsonify({
            "error": f"Laboratory findings must be {REPORT_ASSISTANT_MAX_FINDINGS_CHARS} characters or fewer"
        }), 400

    inspection_id = data.get('inspection_id')
    if inspection_id is None or inspection_id == '':
        return jsonify({"error": "inspection_id is required"}), 400

    try:
        inspection_id_int = int(inspection_id)
    except (TypeError, ValueError):
        return jsonify({"error": "inspection_id must be a valid inspection id"}), 400

    try:
        inspection_result = (
            supabase.table('inspection')
            .select('*')
            .eq('id', inspection_id_int)
            .execute()
        )
    except Exception as e:
        logger.error(f"Report assistant inspection lookup failed: {e}")
        return jsonify({"error": "Unable to load inspection"}), 500

    if not inspection_result.data:
        return jsonify({"error": f"Inspection with ID {inspection_id_int} not found"}), 404

    inspection_row = inspection_result.data[0]
    status = (inspection_row.get('status') or '').strip().lower()
    if status in REPORT_ASSISTANT_BLOCKED_STATUSES:
        return jsonify({
            "error": "AI generation is disabled for completed or report_ready inspections"
        }), 409

    samples = []
    try:
        samples_result = (
            supabase.table('samples')
            .select('*')
            .eq('inspection_id', inspection_id_int)
            .execute()
        )
        samples = samples_result.data or []
    except Exception as e:
        logger.warning(f"Report assistant samples lookup failed: {e}")
        samples = []

    # Optional client-side snapshot of the loaded inspection (helps if DB field shapes differ)
    client_submitted = data.get('customer_submitted')
    if not isinstance(client_submitted, dict):
        client_submitted = None

    # Prefer samples from the admin UI snapshot (same data the admin is viewing)
    client_samples = []
    if client_submitted and isinstance(client_submitted.get('samples'), list):
        client_samples = [s for s in (client_submitted.get('samples') or []) if isinstance(s, dict)]
    samples_for_context = client_samples if client_samples else samples

    inspection_context = _build_inspection_context(
        inspection_row,
        samples_for_context,
        client_submitted=client_submitted,
    )
    logger.info(
        "Report assistant context built for inspection %s (%s chars, %s samples)",
        inspection_id_int,
        len(inspection_context),
        len(samples_for_context),
    )

    try:
        result = _call_report_assistant_openai(findings_text, inspection_context)
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503
    except ValueError as e:
        return jsonify({"error": str(e)}), 502
    except Exception as e:
        logger.error(f"Report assistant OpenAI error: {e}", exc_info=True)
        return jsonify({"error": "Failed to generate conclusion and recommendations"}), 500

    # Return draft content only — never write inspection fields or change status here.
    return jsonify({
        "conclusion": result["conclusion"],
        "recommendations": result["recommendations"],
        "mold_findings": result.get("mold_findings") or [],
    }), 200


@app.route('/api/email/send', methods=['POST'])
def send_email():
    """Email sending endpoint (mock)"""
    data = request.get_json()
    
    # Mock email sending
    return jsonify({
        "message": "Email sent successfully (mock)",
        "to": data.get('to'),
        "subject": data.get('subject')
    })

@app.route('/api/inspection/<int:inspection_id>/upload-lab-image', methods=['POST'])
def upload_lab_analysis_image(inspection_id):
    """
    Upload lab analysis image for an inspection with anon key authentication
    
    This endpoint:
    1. Validates authentication and file
    2. Uploads the image to Supabase lab-analysis bucket with anon key
    3. Gets the public URL of the uploaded image
    4. Adds the URL to the lab_analysis_images array in the inspection record
    5. Returns the uploaded image URL and inspection_id
    """
    try:
        # Check if inspection exists
        inspection_result = supabase.table('inspection').select('*').eq('id', inspection_id).execute()
        if not inspection_result.data:
            return jsonify({"error": f"Inspection with ID {inspection_id} not found"}), 404
        
        inspection = inspection_result.data[0]
        
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            return jsonify({"error": "Only image files are allowed"}), 400
        
        # Validate file size (max 10MB for anon key)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        max_size = 10 * 1024 * 1024  # 10MB
        if file_size > max_size:
            return jsonify({"error": "File size exceeds 10MB limit"}), 400
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create folder path: lab-analysis-images/inspection_{id}/
        folder_path = f"lab-analysis-images/inspection_{inspection_id}"
        file_path = f"{folder_path}/{unique_filename}"
        
        print(f"🔍 DEBUG: Uploading file to Supabase: {file_path}")
        print(f"🔍 DEBUG: File size: {file_size} bytes")
        print(f"🔍 DEBUG: Content type: {file.content_type}")
        
        # Read file content
        file_content = file.read()
        
        # Optimized upload for anon key authentication
        try:
            # Method 1: Standard upload with proper content-type
            upload_result = supabase.storage.from_("lab-analysis").upload(
                path=file_path,
                file=file_content,
                file_options={
                    "content-type": file.content_type,
                    "upsert": False  # Don't overwrite existing files
                }
            )
            
            if hasattr(upload_result, 'error') and upload_result.error:
                print(f"❌ Supabase upload error: {upload_result.error}")
                raise Exception(f"Upload failed: {upload_result.error}")
                
        except Exception as upload_error:
            print(f"❌ Primary upload method failed: {upload_error}")
            
            # Method 2: Try with corrected content-type detection
            try:
                # Determine correct content type
                content_type = file.content_type
                if not content_type or content_type == 'application/octet-stream':
                    # Try to detect content type from file extension
                    import mimetypes
                    content_type = mimetypes.guess_type(file.filename)[0] or 'image/jpeg'
                
                print(f"🔍 DEBUG: Retrying with content-type: {content_type}")
                
                upload_result = supabase.storage.from_("lab-analysis").upload(
                    path=file_path,
                    file=file_content,
                    file_options={
                        "content-type": content_type,
                        "upsert": True  # Allow overwrite for retry
                    }
                )
                
                if hasattr(upload_result, 'error') and upload_result.error:
                    raise Exception(f"Retry upload failed: {upload_result.error}")
                    
            except Exception as retry_error:
                print(f"❌ Retry upload method failed: {retry_error}")
                
                # Method 3: Try with different file path (avoid nested folders)
                try:
                    simple_path = f"inspection_{inspection_id}_{unique_filename}"
                    print(f"🔍 DEBUG: Trying simple path: {simple_path}")
                    
                    upload_result = supabase.storage.from_("lab-analysis").upload(
                        path=simple_path,
                        file=file_content,
                        file_options={
                            "content-type": file.content_type,
                            "upsert": True
                        }
                    )
                    
                    if hasattr(upload_result, 'error') and upload_result.error:
                        raise Exception(f"Simple path upload failed: {upload_result.error}")
                    
                    # Update file_path for URL generation
                    file_path = simple_path
                    
                except Exception as simple_error:
                    print(f"❌ Simple path upload failed: {simple_error}")
                    raise Exception(f"All upload methods failed. Last error: {str(simple_error)}")
        
        # Get public URL
        try:
            public_url = supabase.storage.from_("lab-analysis").get_public_url(file_path)
            print(f"✅ File uploaded successfully: {public_url}")
        except Exception as url_error:
            print(f"❌ Failed to get public URL: {url_error}")
            # Construct URL manually if get_public_url fails
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/lab-analysis/{file_path}"
            print(f"🔍 DEBUG: Using constructed URL: {public_url}")
        
        # Get current lab_analysis_images array - try lab_analysis_images first, then mold_images as fallback
        current_images = []
        lab_images_field = inspection.get('lab_analysis_images') or inspection.get('mold_images')
        if lab_images_field:
            # Handle both PostgreSQL array and JSON string formats
            if isinstance(lab_images_field, list):
                current_images = lab_images_field
            elif isinstance(lab_images_field, str):
                try:
                    current_images = json.loads(lab_images_field)
                except json.JSONDecodeError:
                    current_images = []
        
        # Check for duplicates before adding (prevent same image upload)
        if public_url in current_images:
            print(f"⚠️ Image already exists in array, skipping duplicate: {public_url}")
            return jsonify({
                "message": "Image already exists",
                "image_url": public_url,
                "inspection_id": inspection_id,
                "total_images": len(current_images),
                "duplicate": True
            })
        
        # Append new image URL to array
        current_images.append(public_url)
        print(f"🔍 DEBUG: Added new image to array. Total images: {len(current_images)}")
        
        # Update inspection record with PostgreSQL array format
        # Try updating with lab_analysis_images column, if it fails try with mold_images as fallback
        try:
            print(f"🔍 DEBUG: Attempting to update inspection {inspection_id} with lab_analysis_images array of {len(current_images)} items")
            
            # First try with lab_analysis_images column
            try:
                update_result = supabase.table('inspection').update({
                    'lab_analysis_images': current_images  # Store as PostgreSQL array, not JSON string
                }).eq('id', inspection_id).execute()
                print(f"🔍 DEBUG: Successfully updated lab_analysis_images column")
            except Exception as lab_error:
                print(f"⚠️ lab_analysis_images column not found, trying mold_images as fallback: {lab_error}")
                # Fallback to mold_images column if lab_analysis_images doesn't exist
                update_result = supabase.table('inspection').update({
                    'mold_images': current_images  # Store as PostgreSQL array in mold_images column
                }).eq('id', inspection_id).execute()
                print(f"🔍 DEBUG: Successfully updated mold_images column as fallback")
            
            print(f"🔍 DEBUG: Update result: {update_result}")
            
            if hasattr(update_result, 'error') and update_result.error:
                print(f"❌ Database update error: {update_result.error}")
                return jsonify({"error": f"Failed to update inspection: {update_result.error}"}), 500
                
        except Exception as db_error:
            print(f"❌ Database update exception: {db_error}")
            return jsonify({"error": f"Failed to update inspection: {str(db_error)}"}), 500
        
        print(f"✅ Inspection updated successfully with {len(current_images)} images")
        
        return jsonify({
            "message": "Lab analysis image uploaded successfully",
            "inspection_id": inspection_id,
            "image_url": public_url,
            "total_images": len(current_images),
            "file_path": file_path,
            "file_size": file_size,
            "content_type": file.content_type
        })
        
    except Exception as e:
        print(f"❌ Error in upload_lab_analysis_image: {e}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@app.route('/api/inspection/<int:inspection_id>/lab-image/<int:image_index>', methods=['DELETE'])
def delete_lab_analysis_image(inspection_id, image_index):
    """
    Delete a specific lab analysis image from an inspection
    """
    try:
        # Check if inspection exists
        inspection_result = supabase.table('inspection').select('*').eq('id', inspection_id).execute()
        if not inspection_result.data:
            return jsonify({"error": f"Inspection with ID {inspection_id} not found"}), 404
        
        inspection = inspection_result.data[0]
        
        # Get current lab_analysis_images array - try lab_analysis_images first, then mold_images as fallback
        current_images = []
        lab_images_field = inspection.get('lab_analysis_images') or inspection.get('mold_images')
        if lab_images_field:
            # Handle both PostgreSQL array and JSON string formats
            if isinstance(lab_images_field, list):
                current_images = lab_images_field
            elif isinstance(lab_images_field, str):
                try:
                    current_images = json.loads(lab_images_field)
                except json.JSONDecodeError:
                    current_images = []
        
        # Validate image index
        if image_index < 0 or image_index >= len(current_images):
            return jsonify({"error": f"Image index {image_index} is out of range"}), 400
        
        # Get image URL to delete from storage
        image_url = current_images[image_index]
        
        # Extract file path from URL
        # URL format: https://xxx.supabase.co/storage/v1/object/public/lab-analysis/path/to/file
        url_parts = image_url.split("/lab-analysis/")
        if len(url_parts) != 2:
            return jsonify({"error": "Invalid file URL format"}), 400
        
        file_path = url_parts[1]
        
        print(f"🔍 DEBUG: Deleting file from Supabase: {file_path}")
        
        # Delete from Supabase Storage
        delete_result = supabase.storage.from_("lab-analysis").remove([file_path])
        
        if delete_result.error:
            print(f"❌ Supabase delete error: {delete_result.error}")
            return jsonify({"error": f"Delete failed: {delete_result.error}"}), 500
        
        # Remove from array
        current_images.pop(image_index)
        
        # Update inspection record - try lab_analysis_images first, fallback to mold_images
        try:
            update_result = supabase.table('inspection').update({
                'lab_analysis_images': current_images  # Store as PostgreSQL array, not JSON string
            }).eq('id', inspection_id).execute()
            print(f"🔍 DEBUG: Successfully updated lab_analysis_images column for deletion")
        except Exception as lab_error:
            print(f"⚠️ lab_analysis_images column not found for deletion, trying mold_images as fallback: {lab_error}")
            update_result = supabase.table('inspection').update({
                'mold_images': current_images  # Store as PostgreSQL array in mold_images column
            }).eq('id', inspection_id).execute()
            print(f"🔍 DEBUG: Successfully updated mold_images column as fallback for deletion")
        
        if hasattr(update_result, 'error') and update_result.error:
            print(f"❌ Database update error: {update_result.error}")
            return jsonify({"error": f"Failed to update inspection: {update_result.error}"}), 500
        
        print(f"✅ Image deleted successfully, {len(current_images)} images remaining")
        
        return jsonify({
            "message": "Lab analysis image deleted successfully",
            "inspection_id": inspection_id,
            "remaining_images": len(current_images)
        })
        
    except Exception as e:
        print(f"❌ Error in delete_lab_analysis_image: {e}")
        return jsonify({"error": f"Delete failed: {str(e)}"}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """General file upload endpoint for report files and other documents."""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Secure the filename
        filename = secure_filename(file.filename)
        
        # Generate unique filename to prevent conflicts
        unique_filename = f"{uuid.uuid4()}_{filename}"
        
        # Create uploads directory if it doesn't exist
        upload_dir = 'uploads'
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save uploaded file
        filepath = os.path.join(upload_dir, unique_filename)
        file.save(filepath)
        
        print(f"🔍 DEBUG: File uploaded: {filepath}")
        
        # Upload to Supabase storage for public access
        try:
            # Determine bucket based on file type
            bucket_name = "mold-images"  # Default bucket
            
            # Upload to Supabase
            upload_result = supabase.storage.from_(bucket_name).upload(
                f"reports/{unique_filename}",
                open(filepath, 'rb').read(),
                {"content-type": file.content_type}
            )
            
            if hasattr(upload_result, 'error') and upload_result.error:
                raise Exception(f"Supabase upload error: {upload_result.error}")
            
            # Get public URL
            public_url = supabase.storage.from_(bucket_name).get_public_url(f"reports/{unique_filename}")
            
            # Clean up local file
            os.remove(filepath)
            
            print(f"✅ File uploaded successfully to Supabase: {public_url}")
            
            return jsonify({
                "message": "File uploaded successfully",
                "url": public_url,
                "filename": unique_filename
            })
            
        except Exception as upload_error:
            print(f"❌ Error uploading to Supabase: {upload_error}")
            # Clean up local file if it exists
            if os.path.exists(filepath):
                os.remove(filepath)
            raise upload_error
            
    except Exception as e:
        print(f"❌ Error in file upload: {e}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

# === PASSWORD RESET ENDPOINTS ===
@app.route('/api/auth/request-password-reset', methods=['POST'])
def request_password_reset():
    """Request password reset - sends reset email to user"""
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({'error': 'Email is required'}), 400
            
        email = data['email'].strip().lower()
        if not email:
            return jsonify({'error': 'Email is required'}), 400
            
        # Find user in user_profiles table
        user_query = supabase.table('user_profiles').select('*').eq('email', email).execute()
        
        if not user_query.data:
            # Return success even if user doesn't exist (security best practice)
            return jsonify({
                'success': True,
                'message': 'If an account with that email exists, you will receive a password reset link.'
            }), 200
            
        user_data = user_query.data[0]
        user_id = str(user_data['id'])  # Ensure UUID is handled as string
        
        # Generate secure token
        import uuid
        import secrets
        reset_token = str(uuid.uuid4())
        
        # Insert token into password_reset_tokens table
        token_data = {
            'user_id': user_id,
            'token': reset_token,
            'used': False
        }
        
        token_result = supabase.table('password_reset_tokens').insert(token_data).execute()
        
        if not token_result.data:
            return jsonify({'error': 'Failed to create reset token'}), 500
            
        # Send reset email
        frontend_base = _normalize_origin(
            os.environ.get('FRONTEND_URL', 'https://total-testing-diy.com')
        ) or 'https://total-testing-diy.com'
        reset_link = f"{frontend_base}/ResetPassword?token={reset_token}"
        
        reset_data = {
            'email': email,
            'full_name': user_data.get('full_name', 'User'),
            'reset_link': reset_link,
            'token': reset_token
        }
        
        # Import and use email service
        from app.services.email_service import email_service
        email_sent = email_service.send_password_reset_email(reset_data)
        
        if not email_sent:
            return jsonify({'error': 'Failed to send reset email'}), 500
            
        return jsonify({
            'success': True,
            'message': 'If an account with that email exists, you will receive a password reset link.'
        }), 200
        
    except Exception as e:
        print(f"❌ Password reset request error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/confirm-password-reset', methods=['POST'])
def confirm_password_reset():
    """Confirm password reset - validates token and updates password"""
    try:
        print(f"🔧 DEBUG: Password reset confirmation request received")
        data = request.get_json()
        print(f"🔧 DEBUG: Request data keys: {list(data.keys()) if data else 'None'}")
        
        if not data or 'token' not in data or 'password' not in data:
            print(f"❌ DEBUG: Missing required fields - data: {data}")
            return jsonify({'error': 'Token and password are required'}), 400
            
        token = data['token']
        new_password = data['password']
        
        if not token or not new_password:
            return jsonify({'error': 'Token and password are required'}), 400
            
        if len(new_password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters long'}), 400
            
        # Find and validate token
        print(f"🔧 DEBUG: Looking for token: {token}")
        token_query = supabase.table('password_reset_tokens').select('*').eq('token', token).eq('used', False).execute()
        
        print(f"🔧 DEBUG: Token query result: {len(token_query.data) if token_query.data else 0} tokens found")
        
        if not token_query.data:
            print(f"❌ DEBUG: Token not found or already used")
            return jsonify({'error': 'Invalid or expired reset token'}), 400
            
        token_data = token_query.data[0]
        user_id = token_data['user_id']
        print(f"🔧 DEBUG: Found valid token for user: {user_id}")
        
        # Check if token is expired (24 hours)
        from datetime import datetime, timedelta
        import dateutil.parser
        
        created_at = dateutil.parser.parse(token_data['created_at'])
        if datetime.now(created_at.tzinfo) > created_at + timedelta(hours=24):
            return jsonify({'error': 'Reset token has expired'}), 400
            
        # Hash new password using the same method as the rest of the app
        password_hash = generate_password_hash(new_password)
        
        # Update user password
        print(f"🔧 DEBUG: Updating password for user ID: {user_id}")
        user_update = supabase.table('user_profiles').update({
            'password_hash': password_hash
        }).eq('id', user_id).execute()
        
        print(f"🔧 DEBUG: Update result: {user_update.data}")
        print(f"✅ DEBUG: Password updated successfully for user: {user_id}")
        
        # Note: Supabase update operations may return empty data even on success
        # If no exception was thrown, we assume the update succeeded
            
        # Mark token as used
        print(f"🔧 DEBUG: Marking token as used: {token_data['id']}")
        token_update = supabase.table('password_reset_tokens').update({
            'used': True
        }).eq('id', token_data['id']).execute()
        print(f"🔧 DEBUG: Token marked as used: {token_update.data}")
        
        print(f"✅ DEBUG: Password reset completed successfully for user: {user_id}")
        return jsonify({
            'success': True,
            'message': 'Password has been reset successfully. You can now sign in with your new password.'
        }), 200
        
    except Exception as e:
        print(f"❌ Password reset confirmation error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

# --- PATCH: Dynamic Google Vision credentials from env ---
CRED_FILENAME = 'gcloud-key.json'
cred_path = os.path.join(os.path.dirname(__file__), CRED_FILENAME)
if not os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
    # Only fallback to creating a file if the env var is not set
    if os.getenv('GOOGLE_CREDENTIALS_JSON') and not os.path.exists(cred_path):
        with open(cred_path, 'w') as f:
            f.write(os.getenv('GOOGLE_CREDENTIALS_JSON'))
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = cred_path
    elif os.path.exists(cred_path):
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = cred_path
# --- END PATCH ---

if __name__ == '__main__':
    # Local/dev only. Gunicorn imports `simple_main:app` and must not hit app.run().
    print("Starting Mold Testing Houston Backend...")
    print("Database client ready (Supabase)")

    print(f"\nOCR INTEGRATION FINAL STATUS:")
    print(f"   Vision Client: {'Available' if ocr_integration.vision_client else 'Not initialized'}")
    print(f"   OpenAI Client: {'Available' if ocr_integration.openai_client else 'Not initialized - check OPENAI_API_KEY'}")
    print(f"   Integration Available: {'Ready' if ocr_integration.is_available else 'Not ready'}")

    validate_supabase_credentials()
    check_supabase_storage()

    print("API available at: http://localhost:5000")
    print("Health check: http://localhost:5000/health")
    print(f"OCR Final Status: {'READY' if ocr_integration.is_available else 'NOT AVAILABLE'}")

    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)