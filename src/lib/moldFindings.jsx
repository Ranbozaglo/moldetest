/**
 * Mold findings breakdown helpers — parse, persist, render.
 * Findings are persisted as a hidden marker inside lab_conclusion so no DB migration is required.
 * Ratings are shown per area/location when available (e.g. Living Room, Kitchen).
 */

export const MOLD_FINDINGS_START = '<!--TT_MOLD_FINDINGS:';
export const MOLD_FINDINGS_END = ':TT_MOLD_FINDINGS-->';

const COMMON_MOLDS = [
  'Cladosporium',
  'Aspergillus',
  'Penicillium',
  'Alternaria',
  'Stachybotrys',
  'Chaetomium',
  'Aureobasidium',
  'Mucor',
  'Rhizopus',
  'Trichoderma',
  'Ulocladium',
  'Epicoccum',
  'Fusarium',
  'Curvularia',
  'Basidiospores',
  'Ascospores',
  'Rusts',
  'Smuts',
  'Myxomycetes',
  'Pithomyces',
  'Nigrospora',
  'Bipolaris',
  'Drechslera',
];

const COMMON_AREAS = [
  'living room',
  'family room',
  'dining room',
  'kitchen',
  'master bedroom',
  'primary bedroom',
  'bedroom',
  'primary bathroom',
  'master bathroom',
  'bathroom',
  'basement',
  'attic',
  'garage',
  'laundry room',
  'utility room',
  'hallway',
  'closet',
  'hvac',
  'hvac vent',
  'air return',
  'crawlspace',
  'crawl space',
  'office',
  'nursery',
  'guest room',
];

/** Canonical lab rating scale (lowest → highest). High is always the fullest bar. */
export const MOLD_LEVEL_SCALE = ['Not Detect', 'Rare', 'Low', 'Medium', 'High'];

const LEVEL_PERCENT = {
  'not detect': 6,
  'not detected': 6,
  none: 6,
  nd: 6,
  rare: 28,
  low: 50,
  medium: 74,
  moderate: 74, // alias → Medium
  high: 100,
};

/** Map free-text / aliases onto the 5-level scale. */
export function canonicalizeLevel(raw) {
  const q = String(raw || '').toLowerCase().trim();
  if (!q) return '';

  if (
    /\bnot\s*detect(ed)?\b/.test(q) ||
    q === 'nd' ||
    q === 'none' ||
    q === '0' ||
    q === 'absent'
  ) {
    return 'Not Detect';
  }
  if (/\brare\b/.test(q) || /\btrace\b/.test(q) || /\bvery\s*low\b/.test(q)) {
    return 'Rare';
  }
  if (/\blow\b/.test(q) && !/\bvery\s*low\b/.test(q) && !/\bmed(ium)?\b/.test(q)) {
    return 'Low';
  }
  if (/\bmed(ium)?\b/.test(q) || /\bmoderate\b/.test(q) || /\bcommon\b/.test(q)) {
    return 'Medium';
  }
  if (/\bhigh\b/.test(q) || /\babundant\b/.test(q) || /\bnumerous\b/.test(q)) {
    return 'High';
  }
  return '';
}

function levelPercent(levelLabel) {
  const key = String(levelLabel || '').toLowerCase().trim();
  if (LEVEL_PERCENT[key] != null) return LEVEL_PERCENT[key];
  const canonical = canonicalizeLevel(levelLabel);
  if (!canonical) return null;
  return LEVEL_PERCENT[canonical.toLowerCase()] ?? null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleCaseMold(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  if (raw.toLowerCase() === 'aspergillus/penicillium' || raw.toLowerCase() === 'aspergillus / penicillium') {
    return 'Aspergillus/Penicillium';
  }
  return raw
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function titleCaseLocation(location) {
  const raw = String(location || '').trim().replace(/\s+/g, ' ');
  if (!raw) return '';
  if (/^hvac(\s+vent)?$/i.test(raw)) return 'HVAC Vent';
  return raw
    .split(/\s+/)
    .map((part) => {
      if (/^(hvac|ac|hvac\/ac)$/i.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function extractLocationFromText(text) {
  const q = String(text || '').toLowerCase();
  if (!q) return '';

  // "Location: Kitchen", "Sample location: Living room", "Area - Master bedroom"
  const labeled = q.match(
    /(?:sample\s*(?:#?\d+\s*)?(?:location|area)?|location|area|room|zone)\s*[:\-–]\s*([a-z0-9 /&-]{2,60})/i
  );
  if (labeled?.[1]) {
    return titleCaseLocation(labeled[1].replace(/[.,;].*$/, '').trim());
  }

  // Prefer longer/more specific area names first
  const sortedAreas = [...COMMON_AREAS].sort((a, b) => b.length - a.length);
  for (const area of sortedAreas) {
    const re = new RegExp(`\\b${area.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (re.test(q)) return titleCaseLocation(area);
  }

  return '';
}

function levelFromQuantityText(quantity) {
  const fromText = canonicalizeLevel(quantity);
  if (fromText) return fromText;

  const numMatch = String(quantity || '').replace(/,/g, '').match(/(\d+(\.\d+)?)/);
  if (!numMatch) return '';
  const n = Number(numMatch[1]);
  if (!Number.isFinite(n)) return '';
  // Numeric counts mapped onto the same 5-level scale (High = top of scale)
  if (n <= 0) return 'Not Detect';
  if (n < 100) return 'Rare';
  if (n < 500) return 'Low';
  if (n < 2000) return 'Medium';
  return 'High';
}

function percentForFinding(finding, maxNumeric = 0) {
  const quantity = String(finding?.quantity || '');
  const level =
    canonicalizeLevel(finding?.level) ||
    canonicalizeLevel(quantity) ||
    levelFromQuantityText(quantity);

  const fromLevel = levelPercent(level);
  if (fromLevel != null) {
    return fromLevel;
  }

  // Relative numeric bars when no rating word is present — scale so the max count = High (100%)
  const numMatch = quantity.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
  if (numMatch && maxNumeric > 0) {
    const n = Number(numMatch[1]);
    if (Number.isFinite(n) && n >= 0) {
      if (n <= 0) return LEVEL_PERCENT['not detect'];
      const ratio = n / maxNumeric;
      if (ratio <= 0.15) return LEVEL_PERCENT.rare;
      if (ratio <= 0.4) return LEVEL_PERCENT.low;
      if (ratio <= 0.7) return LEVEL_PERCENT.medium;
      return LEVEL_PERCENT.high;
    }
  }

  return LEVEL_PERCENT.low;
}

function ratingFromPercent(percent) {
  const p = Number(percent);
  if (!Number.isFinite(p) || p <= 10) return 'Not Detect';
  if (p <= 35) return 'Rare';
  if (p <= 55) return 'Low';
  if (p <= 80) return 'Medium';
  return 'High';
}

function resolveLevel(finding) {
  return (
    canonicalizeLevel(finding?.level) ||
    canonicalizeLevel(finding?.quantity) ||
    levelFromQuantityText(finding?.quantity) ||
    ratingFromPercent(finding?.percent) ||
    'Low'
  );
}

function displayLabel(finding) {
  // Always show the standard rating word (Rare / Low / Medium / High), never raw counts.
  const level = resolveLevel(finding);
  if (level === 'Not Detect') return 'Not Detect';
  if (level === 'Rare') return 'Rare';
  if (level === 'Low') return 'Low';
  if (level === 'Medium') return 'Medium';
  if (level === 'High') return 'High';
  return 'Low';
}

export function normalizeMoldFindings(rawFindings) {
  if (!Array.isArray(rawFindings)) return [];

  const cleaned = [];
  for (const item of rawFindings) {
    if (!item || typeof item !== 'object') continue;
    const name = titleCaseMold(item.name || item.mold || item.type || item.spore || '');
    if (!name) continue;
    const quantity = String(item.quantity ?? item.count ?? item.amount ?? '').trim();
    const level = String(item.level ?? item.category ?? item.severity ?? '').trim();
    const location = titleCaseLocation(
      item.location || item.area || item.room || item.sample_location || item.sampleLocation || ''
    );
    cleaned.push({
      name,
      quantity,
      level,
      location,
      percent: item.percent,
    });
  }

  const maxNumeric = cleaned.reduce((max, f) => {
    const m = String(f.quantity || '').replace(/,/g, '').match(/(\d+(\.\d+)?)/);
    const n = m ? Number(m[1]) : 0;
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  return cleaned.map((f) => {
    const level = resolveLevel(f);
    const normalized = { ...f, level };
    return {
      name: normalized.name,
      quantity: normalized.quantity,
      level,
      location: normalized.location || '',
      percent: percentForFinding(normalized, maxNumeric),
      label: displayLabel(normalized),
    };
  });
}

/** Group findings by location for per-area display (kept for callers that need it). */
export function groupMoldFindingsByLocation(findings) {
  const rows = normalizeMoldFindings(findings);
  const groups = new Map();

  for (const row of rows) {
    const key = row.location || 'Unspecified Area';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === 'Unspecified Area' && b !== 'Unspecified Area') return 1;
      if (b === 'Unspecified Area' && a !== 'Unspecified Area') return -1;
      return a.localeCompare(b);
    })
    .map(([location, items]) => ({ location, items }));
}

/** Extract persisted mold findings marker from lab_conclusion (or any stored text). */
export function extractMoldFindingsFromText(text) {
  if (!text || typeof text !== 'string') {
    return { findings: [], cleanText: text || '' };
  }

  const start = text.indexOf(MOLD_FINDINGS_START);
  const end = text.indexOf(MOLD_FINDINGS_END);
  if (start === -1 || end === -1 || end <= start) {
    return { findings: [], cleanText: text };
  }

  const jsonPart = text.slice(start + MOLD_FINDINGS_START.length, end).trim();
  const before = text.slice(0, start).trimEnd();
  const after = text.slice(end + MOLD_FINDINGS_END.length).trimStart();
  const cleanText = [before, after].filter(Boolean).join('\n\n').trim();

  try {
    const parsed = JSON.parse(jsonPart);
    return { findings: normalizeMoldFindings(parsed), cleanText };
  } catch {
    return { findings: [], cleanText };
  }
}

export function stripMoldFindingsMarker(text) {
  return extractMoldFindingsFromText(text).cleanText;
}

export function attachMoldFindingsMarker(cleanText, findings) {
  const normalized = normalizeMoldFindings(findings);
  const base = stripMoldFindingsMarker(cleanText || '').trim();
  if (!normalized.length) return base;
  const payload = normalized.map(({ name, quantity, level, percent, location }) => ({
    name,
    quantity,
    level,
    location: location || '',
    percent,
  }));
  const marker = `${MOLD_FINDINGS_START}${JSON.stringify(payload)}${MOLD_FINDINGS_END}`;
  return base ? `${base}\n\n${marker}` : marker;
}

/** Find Rare/Low/Medium/High (or synonyms) anywhere in nearby text. */
function findRatingInText(text) {
  return canonicalizeLevel(text) || levelFromQuantityText(text) || '';
}

/** Lightweight parse of free-text laboratory findings for preview / fallback. */
export function parseMoldFindingsFromLabText(findingsText) {
  const text = String(findingsText || '').trim();
  if (!text) return [];

  const findings = [];
  const seen = new Set();
  const lines = text.split(/\n+/);
  let currentLocation = '';

  const moldAlt = COMMON_MOLDS.map((m) => m.replace('/', '\\/')).join('|');
  const moldOnlyPattern = new RegExp(
    `\\b(${moldAlt}|Aspergillus\\s*\\/?\\s*Penicillium)\\b(?:\\s*(?:sp\\.?|spp\\.?))?`,
    'gi'
  );

  for (const rawLine of lines) {
    const line = String(rawLine || '').trim();
    if (!line) continue;

    moldOnlyPattern.lastIndex = 0;
    const hasMold = moldOnlyPattern.test(line);
    moldOnlyPattern.lastIndex = 0;

    const locationOnly = extractLocationFromText(line);
    // Section header for an area (no mold name on this line)
    if (locationOnly && !hasMold) {
      currentLocation = locationOnly;
      continue;
    }

    let match;
    while ((match = moldOnlyPattern.exec(line)) !== null) {
      let name = match[1].replace(/\s+/g, ' ').trim();
      if (/aspergillus\s*\/?\s*penicillium/i.test(name)) name = 'Aspergillus/Penicillium';
      name = titleCaseMold(name);

      // Prefer rating/quantity from the same line (before or after the mold name)
      const before = line.slice(0, match.index);
      const after = line.slice(match.index + match[0].length);
      const level =
        findRatingInText(after) ||
        findRatingInText(before) ||
        findRatingInText(line) ||
        '';

      // Keep a short quantity snippet for display/debug, but rating comes from level
      let quantity = after
        .replace(/^[:\-–,\s]+/, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/[.;]+$/, '')
        .trim()
        .slice(0, 80);
      if (!quantity && level) quantity = level;

      const location =
        extractLocationFromText(line) ||
        currentLocation ||
        '';

      const key = `${location.toLowerCase()}::${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      findings.push({
        name,
        quantity: quantity || level || 'Detected',
        level,
        location,
      });
    }
  }

  // Fallback: whole-text scan if line parsing found nothing
  if (!findings.length) {
    const whole = new RegExp(moldOnlyPattern.source, 'gi');
    let match;
    while ((match = whole.exec(text)) !== null) {
      let name = match[1].replace(/\s+/g, ' ').trim();
      if (/aspergillus\s*\/?\s*penicillium/i.test(name)) name = 'Aspergillus/Penicillium';
      name = titleCaseMold(name);
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const start = Math.max(0, match.index - 60);
      const end = Math.min(text.length, match.index + match[0].length + 60);
      const context = text.slice(start, end);
      const level = findRatingInText(context);
      findings.push({
        name,
        quantity: level || 'Detected',
        level,
        location: extractLocationFromText(context),
      });
    }
  }

  return normalizeMoldFindings(findings);
}

/**
 * Prefer admin-submitted laboratory findings text for ratings/locations.
 * AI mold_findings only fill gaps the admin text did not cover.
 */
export function mergeAdminAndAiMoldFindings(adminText, aiFindings = []) {
  const fromAdmin = parseMoldFindingsFromLabText(adminText);
  const fromAi = normalizeMoldFindings(aiFindings);

  if (!fromAdmin.length) return fromAi;
  if (!fromAi.length) return fromAdmin;

  const merged = [...fromAdmin];
  const seen = new Set(
    fromAdmin.map((f) => `${(f.location || '').toLowerCase()}::${f.name.toLowerCase()}`)
  );

  for (const ai of fromAi) {
    const key = `${(ai.location || '').toLowerCase()}::${ai.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    // Also skip if admin already listed this mold with no location
    const adminHasName = fromAdmin.some(
      (f) => f.name.toLowerCase() === ai.name.toLowerCase() && !f.location && !ai.location
    );
    if (adminHasName) continue;
    seen.add(key);
    merged.push(ai);
  }

  return normalizeMoldFindings(merged);
}

export function MoldFindingsBreakdown({ findings, className = '' }) {
  const rows = normalizeMoldFindings(findings);
  if (!rows.length) return null;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
        Mold Findings Breakdown
      </div>
      <div className="mt-4 space-y-4">
        {rows.map((row, index) => (
          <div
            key={`${row.location || 'na'}-${row.name}-${index}`}
            className="grid grid-cols-[minmax(7rem,11rem)_1fr_auto] items-center gap-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-700 truncate" title={row.name}>
                {row.name}
              </div>
              {row.location ? (
                <div className="text-xs text-slate-500 truncate" title={row.location}>
                  {row.location}
                </div>
              ) : null}
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${row.percent}%` }}
              />
            </div>
            <div className="text-sm font-medium text-teal-600 whitespace-nowrap min-w-[4.5rem] text-right">
              {row.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function buildMoldFindingsBreakdownHtml(findings) {
  const rows = normalizeMoldFindings(findings);
  if (!rows.length) return '';

  const items = rows
    .map(
      (row) => `
      <div class="mold-finding-row">
        <div class="mold-finding-name-wrap">
          <div class="mold-finding-name">${escapeHtml(row.name)}</div>
          ${row.location ? `<div class="mold-finding-location">${escapeHtml(row.location)}</div>` : ''}
        </div>
        <div class="mold-finding-bar-track">
          <div class="mold-finding-bar-fill" style="width:${row.percent}%;"></div>
        </div>
        <div class="mold-finding-qty">${escapeHtml(row.label)}</div>
      </div>`
    )
    .join('');

  return `
    <div class="section keep-together mold-findings-breakdown">
      <div class="mold-findings-label">MOLD FINDINGS BREAKDOWN</div>
      <div class="mold-findings-list">
        ${items}
      </div>
    </div>`;
}

export const MOLD_FINDINGS_REPORT_CSS = `
.mold-findings-breakdown {
  margin: 18px 0 24px 0;
  padding: 18px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
}
.mold-findings-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 16px;
}
.mold-findings-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mold-finding-row {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  align-items: center;
  gap: 14px;
}
.mold-finding-name-wrap {
  min-width: 0;
}
.mold-finding-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}
.mold-finding-location {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
.mold-finding-bar-track {
  height: 8px;
  border-radius: 999px;
  background: #f3f4f6;
  overflow: hidden;
}
.mold-finding-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: #0ea5e9;
}
.mold-finding-qty {
  font-size: 14px;
  font-weight: 600;
  color: #0d9488;
  white-space: nowrap;
  min-width: 72px;
  text-align: right;
}
@media print {
  .mold-findings-breakdown { break-inside: avoid; }
}
`;
