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

function displayLabel(finding) {
  const level =
    canonicalizeLevel(finding?.level) ||
    canonicalizeLevel(finding?.quantity) ||
    '';
  // Prefer the standard rating label on the right (High is the top of the scale)
  if (level) return level;

  const quantity = String(finding?.quantity || '').trim();
  if (quantity) return quantity;
  return 'Detected';
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
    const level =
      canonicalizeLevel(f.level) ||
      canonicalizeLevel(f.quantity) ||
      levelFromQuantityText(f.quantity) ||
      '';
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

/** Group findings by location for per-area display. */
export function groupMoldFindingsByLocation(findings) {
  const rows = normalizeMoldFindings(findings);
  const groups = new Map();

  for (const row of rows) {
    const key = row.location || 'General';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  // Keep named areas first; put "General" last
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === 'General' && b !== 'General') return 1;
      if (b === 'General' && a !== 'General') return -1;
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

/** Lightweight parse of free-text laboratory findings for preview / fallback. */
export function parseMoldFindingsFromLabText(findingsText) {
  const text = String(findingsText || '').trim();
  if (!text) return [];

  const findings = [];
  const seen = new Set();
  const lines = text.split(/\n+/);
  let currentLocation = '';

  const moldAlt = COMMON_MOLDS.map((m) => m.replace('/', '\\/')).join('|');
  const linePattern = new RegExp(
    `\\b(${moldAlt}|Aspergillus\\s*\\/?\\s*Penicillium)\\b(?:\\s*(?:sp\\.?|spp\\.?))?\\s*[:\\-–]?\\s*([^\\n;|]{0,80})`,
    'gi'
  );

  for (const line of lines) {
    const locationOnly = extractLocationFromText(line);
    // If the line is mainly a section header for an area, remember it
    if (locationOnly && !linePattern.test(line)) {
      currentLocation = locationOnly;
      linePattern.lastIndex = 0;
      continue;
    }
    linePattern.lastIndex = 0;

    let match;
    while ((match = linePattern.exec(line)) !== null) {
      let name = match[1].replace(/\s+/g, ' ').trim();
      if (/aspergillus\s*\/?\s*penicillium/i.test(name)) name = 'Aspergillus/Penicillium';
      name = titleCaseMold(name);

      let quantity = String(match[2] || '').trim();
      quantity = quantity
        .replace(/^[:\-–,\s]+/, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/[.;]+$/, '')
        .trim();

      for (const mold of COMMON_MOLDS) {
        const idx = quantity.toLowerCase().indexOf(mold.toLowerCase());
        if (idx > 0) quantity = quantity.slice(0, idx).trim();
      }

      const location =
        extractLocationFromText(line) ||
        extractLocationFromText(quantity) ||
        currentLocation ||
        '';

      // Allow same mold in different rooms
      const key = `${location.toLowerCase()}::${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const level = levelFromQuantityText(quantity);
      findings.push({
        name,
        quantity: quantity || (level ? level : 'Detected'),
        level,
        location,
      });
    }
  }

  // Fallback: whole-text scan if line parsing found nothing
  if (!findings.length) {
    let match;
    const whole = new RegExp(linePattern.source, 'gi');
    while ((match = whole.exec(text)) !== null) {
      let name = match[1].replace(/\s+/g, ' ').trim();
      if (/aspergillus\s*\/?\s*penicillium/i.test(name)) name = 'Aspergillus/Penicillium';
      name = titleCaseMold(name);
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      let quantity = String(match[2] || '').trim()
        .replace(/^[:\-–,\s]+/, '')
        .replace(/[.;]+$/, '')
        .trim();
      const level = levelFromQuantityText(quantity);
      const start = Math.max(0, match.index - 80);
      const context = text.slice(start, match.index + match[0].length + 40);
      findings.push({
        name,
        quantity: quantity || (level ? level : 'Detected'),
        level,
        location: extractLocationFromText(context),
      });
    }
  }

  return normalizeMoldFindings(findings);
}

export function MoldFindingsBreakdown({ findings, className = '' }) {
  const groups = groupMoldFindingsByLocation(findings);
  if (!groups.length) return null;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
        Mold Findings Breakdown
      </div>
      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <div key={group.location}>
            <div className="text-sm font-semibold text-slate-800 mb-3">
              {group.location}
            </div>
            <div className="space-y-3">
              {group.items.map((row) => (
                <div
                  key={`${group.location}-${row.name}`}
                  className="grid grid-cols-[minmax(7rem,9.5rem)_1fr_auto] items-center gap-3"
                >
                  <div className="text-sm font-medium text-slate-700 truncate" title={row.name}>
                    {row.name}
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
        ))}
      </div>
    </div>
  );
}

export function buildMoldFindingsBreakdownHtml(findings) {
  const groups = groupMoldFindingsByLocation(findings);
  if (!groups.length) return '';

  const sections = groups
    .map((group) => {
      const items = group.items
        .map(
          (row) => `
      <div class="mold-finding-row">
        <div class="mold-finding-name">${escapeHtml(row.name)}</div>
        <div class="mold-finding-bar-track">
          <div class="mold-finding-bar-fill" style="width:${row.percent}%;"></div>
        </div>
        <div class="mold-finding-qty">${escapeHtml(row.label)}</div>
      </div>`
        )
        .join('');

      return `
      <div class="mold-finding-area">
        <div class="mold-finding-area-title">${escapeHtml(group.location)}</div>
        <div class="mold-findings-list">
          ${items}
        </div>
      </div>`;
    })
    .join('');

  return `
    <div class="section keep-together mold-findings-breakdown">
      <div class="mold-findings-label">MOLD FINDINGS BREAKDOWN</div>
      ${sections}
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
.mold-finding-area {
  margin-bottom: 18px;
}
.mold-finding-area:last-child {
  margin-bottom: 0;
}
.mold-finding-area-title {
  font-size: 15px;
  font-weight: 700;
  color: #0B2E59;
  margin: 0 0 10px 0;
}
.mold-findings-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mold-finding-row {
  display: grid;
  grid-template-columns: 150px 1fr auto;
  align-items: center;
  gap: 14px;
}
.mold-finding-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
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
