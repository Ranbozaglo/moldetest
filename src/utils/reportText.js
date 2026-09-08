/**
 * Normalize report-facing text to clean English ASCII-friendly copy.
 * Strips hidden markers, mojibake, emoji, and non-Latin scripts.
 */
export function sanitizeReportText(text) {
  if (text == null) return '';
  let s = String(text);

  // Hidden mold-findings marker sometimes stored inside lab_conclusion
  s = s.replace(/<!--\s*TT_MOLD_FINDINGS:[\s\S]*?:TT_MOLD_FINDINGS\s*-->/gi, '');

  // Common UTF-8 mojibake sequences
  s = s
    .replace(/â€™|â€˜/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/â€“|â€”/g, '-')
    .replace(/â€¦/g, '...')
    .replace(/Â(?=\s)/g, '')
    .replace(/Â/g, '');

  // Smart punctuation → ASCII
  s = s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u2022/g, '-');

  // Emoji / dingbats / variation selectors / zero-width
  s = s
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{200B}-\u{200D}\u{FEFF}]/gu, '');

  // Non-Latin scripts (Hebrew, Arabic, Cyrillic, CJK, etc.)
  s = s.replace(
    /[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g,
    ''
  );

  // Tidy whitespace left by removals
  s = s
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return s;
}
