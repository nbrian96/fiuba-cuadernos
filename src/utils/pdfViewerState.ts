export function clampPdfPage(rawPage: number, pageCount: number): number {
  const safeMax = Number.isInteger(pageCount) && pageCount >= 1 ? pageCount : 1;
  if (!Number.isFinite(rawPage)) {
    return 1;
  }
  const intPage = Math.trunc(rawPage);
  if (intPage < 1) return 1;
  if (intPage > safeMax) return safeMax;
  return intPage;
}

export function parsePageFromSearch(search: string, pageCount: number): number {
  const params = new URLSearchParams(search);
  const raw = params.get("page");
  if (!raw || !/^\d+$/.test(raw.trim())) {
    return 1;
  }
  return clampPdfPage(Number.parseInt(raw.trim(), 10), pageCount);
}

export function buildUpdatedPageSearch(search: string, page: number, pageCount: number): string {
  const clamped = clampPdfPage(page, pageCount);
  const params = new URLSearchParams(search);
  params.set("page", String(clamped));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function buildPdfEmbedUrl(assetUrl: string, page: number, pageCount: number): string {
  const clamped = clampPdfPage(page, pageCount);
  const baseUrl = assetUrl.split("#")[0];
  return `${baseUrl}#page=${clamped}`;
}
