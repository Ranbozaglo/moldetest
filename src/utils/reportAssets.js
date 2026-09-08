/**
 * Resolve public report assets for HTML/PDF reports.
 * Blob/file viewers cannot load root-relative paths like /logos.png,
 * so we prefer data URLs (with absolute-URL fallback).
 */
export const resolveReportAsset = async (path) => {
  const absolute =
    typeof window !== 'undefined'
      ? new URL(path, window.location.origin).href
      : path;

  // Bust browser cache so updated public assets (e.g. cover photo) embed correctly
  const fetchUrl = absolute.includes('?')
    ? `${absolute}&v=${Date.now()}`
    : `${absolute}?v=${Date.now()}`;

  try {
    const response = await fetch(fetchUrl, { cache: 'no-store' });
    if (!response.ok) return absolute;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || absolute));
      reader.onerror = () => resolve(absolute);
      reader.readAsDataURL(blob);
    });
  } catch {
    return absolute;
  }
};

export const resolveCoverAssets = async () => {
  const [logoSrc, coverKitSrc] = await Promise.all([
    resolveReportAsset('/logos.png'),
    resolveReportAsset('/cover-kit.jpg'),
  ]);
  return { logoSrc, coverKitSrc };
};
