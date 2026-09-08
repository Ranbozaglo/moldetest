/**
 * AI Report Assistant — runs on Netlify so it does not depend on the stuck Render deploy.
 * Validates the Flask admin JWT via Render, checks inspection status, calls OpenAI.
 * Does NOT save, publish, email, or change status.
 */

const MAX_FINDINGS_CHARS = 8000;
const BLOCKED_STATUSES = new Set(['completed', 'report_ready']);

const FLASK_API_BASE =
  process.env.FLASK_API_BASE_URL || 'https://moldetest-ftxv.onrender.com';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://opjgytjlebfnhjzarvyy.supabase.co';

const SYSTEM_PROMPT = `You are a licensed mold assessment writing assistant for Total Testing DIY mold testing reports.

Write clear, professional language for homeowners.

Output requirements:
- Return ONLY valid JSON with exactly these keys: "conclusion" and "recommendations".
- "conclusion": 1-3 short paragraphs explaining what was identified in the submitted sample only.
- "recommendations": short, direct, finding-specific next-step bullets (plain text, one recommendation per line, optionally starting with "- ").

Hard rules:
- Explain only what was identified in the submitted findings text.
- Explicitly state that results apply only to the sampled location(s) described in the findings.
- Do not invent facts, locations, moisture conditions, mold types, counts, or conditions not present in the findings.
- Do not create a mold remediation protocol.
- Do not include containment specifications, demolition measurements, equipment requirements, or detailed remediation procedures.
- Do not provide medical advice.
- Do not call mold "toxic".
- Do not claim that the entire property is mold-free.
- Do not add recommendations unrelated to the entered findings.
- Recommendations may include only relevant items such as: correcting moisture sources, controlling humidity, cleaning or removing affected material as appropriate, avoiding disturbance of mold-affected materials, consulting a qualified mold professional, or obtaining a full inspection when justified by the findings.`;

function corsHeaders(event) {
  const origin = event.headers.origin || event.headers.Origin || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
}

function json(statusCode, body, event) {
  return {
    statusCode,
    headers: corsHeaders(event),
    body: JSON.stringify(body),
  };
}

function extractJsonObject(text) {
  if (!text || !String(text).trim()) {
    throw new Error('Empty model response');
  }
  let content = String(text).trim();
  if (content.startsWith('```')) {
    const lines = content.split('\n');
    if (lines[0].startsWith('```')) lines.shift();
    if (lines.length && lines[lines.length - 1].trim() === '```') lines.pop();
    content = lines.join('\n').trim();
  }
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // fall through
  }
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model response was not valid JSON');
  }
  const parsed = JSON.parse(content.slice(start, end + 1));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Model response JSON must be an object');
  }
  return parsed;
}

async function validateFlaskToken(authHeader) {
  const response = await fetch(`${FLASK_API_BASE}/api/auth/validate`, {
    method: 'GET',
    headers: { Authorization: authHeader },
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function requireAdmin(email) {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured on Netlify. Add it in Site settings → Environment variables.'
    );
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/user_profiles`);
  url.searchParams.set('email', `eq.${email}`);
  url.searchParams.set('select', 'email,role,is_admin');

  const response = await fetch(url.toString(), {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to verify admin access');
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    const err = new Error('User not found');
    err.statusCode = 401;
    throw err;
  }

  const user = rows[0];
  const isAdmin = user.role === 'admin' || Boolean(user.is_admin);
  if (!isAdmin) {
    const err = new Error('Admin access required');
    err.statusCode = 403;
    throw err;
  }
  return user;
}

async function getInspectionStatus(inspectionId) {
  const response = await fetch(`${FLASK_API_BASE}/api/inspection/${inspectionId}`, {
    method: 'GET',
  });
  if (response.status === 404) {
    const err = new Error(`Inspection with ID ${inspectionId} not found`);
    err.statusCode = 404;
    throw err;
  }
  if (!response.ok) {
    throw new Error('Unable to load inspection');
  }
  const inspection = await response.json();
  return (inspection.status || '').toString().trim().toLowerCase();
}

async function callOpenAI(findingsText) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error(
      'OPENAI_API_KEY is not configured on Netlify. Add it in Site settings → Environment variables (copy from Render).'
    );
    err.statusCode = 503;
    throw err;
  }

  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini';
  const userPrompt = `Laboratory findings entered by the admin (use ONLY this information):

${findingsText}

Return JSON only:
{
  "conclusion": "...",
  "recommendations": "..."
}`;

  const payload = {
    model,
    temperature: 0.2,
    max_tokens: 1500,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  };

  let response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Retry without response_format for older model compatibility
    delete payload.response_format;
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '';
  const parsed = extractJsonObject(raw);
  const conclusion = typeof parsed.conclusion === 'string' ? parsed.conclusion.trim() : '';
  const recommendations =
    typeof parsed.recommendations === 'string' ? parsed.recommendations.trim() : '';

  if (!conclusion || !recommendations) {
    throw new Error('Model response missing conclusion or recommendations');
  }

  return { conclusion, recommendations };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' }, event);
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json(401, { error: 'Authorization header required' }, event);
    }

    const validated = await validateFlaskToken(authHeader);
    if (!validated || !validated.email) {
      return json(401, { error: 'Invalid token' }, event);
    }

    await requireAdmin(validated.email);

    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'Invalid JSON body' }, event);
    }

    const findingsText = String(body.findings_text || '').trim();
    if (!findingsText) {
      return json(400, { error: 'Laboratory findings text is required' }, event);
    }
    if (findingsText.length > MAX_FINDINGS_CHARS) {
      return json(
        400,
        { error: `Laboratory findings must be ${MAX_FINDINGS_CHARS} characters or fewer` },
        event
      );
    }

    const inspectionId = body.inspection_id;
    if (inspectionId === undefined || inspectionId === null || inspectionId === '') {
      return json(400, { error: 'inspection_id is required' }, event);
    }
    const inspectionIdInt = Number.parseInt(inspectionId, 10);
    if (!Number.isFinite(inspectionIdInt)) {
      return json(400, { error: 'inspection_id must be a valid inspection id' }, event);
    }

    const status = await getInspectionStatus(inspectionIdInt);
    if (BLOCKED_STATUSES.has(status)) {
      return json(
        409,
        { error: 'AI generation is disabled for completed or report_ready inspections' },
        event
      );
    }

    const result = await callOpenAI(findingsText);
    return json(200, result, event);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      error.message || 'Failed to generate conclusion and recommendations';
    console.error('generate-report-assistant error:', message);
    return json(statusCode, { error: message }, event);
  }
};
