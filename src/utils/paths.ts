const SLUG_REGEX = /^[a-z0-9-]+$/;
const EXTERNAL_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function splitPathAndSuffix(rawPath: string): { pathname: string; suffix: string } {
  const queryIdx = rawPath.indexOf("?");
  const hashIdx = rawPath.indexOf("#");

  let splitIdx = -1;
  if (queryIdx !== -1 && hashIdx !== -1) {
    splitIdx = Math.min(queryIdx, hashIdx);
  } else if (queryIdx !== -1) {
    splitIdx = queryIdx;
  } else if (hashIdx !== -1) {
    splitIdx = hashIdx;
  }

  if (splitIdx === -1) {
    return { pathname: rawPath, suffix: "" };
  }
  return {
    pathname: rawPath.slice(0, splitIdx),
    suffix: rawPath.slice(splitIdx),
  };
}

function getEnvBaseUrl(): string | undefined {
  try {
    return import.meta.env?.BASE_URL;
  } catch {
    return undefined;
  }
}

/**
 * Normaliza un prefijo `base` de Astro para que sea exactamente `'/'`
 * o tenga formato `'/segmentos/'` con barra inicial y final.
 */
export function normalizeBase(rawBase?: string): string {
  const candidate = (rawBase ?? getEnvBaseUrl() ?? "/").trim();
  if (!candidate || candidate === "/") {
    return "/";
  }
  const cleanSegments = candidate.replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
  if (!cleanSegments) {
    return "/";
  }
  return `/${cleanSegments}/`;
}

/**
 * Antepone el prefijo `base` configurado a rutas internas de forma idempotente,
 * preservando URLs externas, protocol-relative (`//`), hashes (`#...`) y queries (`?...`).
 */
export function withBase(path: string, baseOverride?: string): string {
  const base = normalizeBase(baseOverride);
  const trimmed = path.trim();

  if (!trimmed) {
    return base;
  }

  if (
    EXTERNAL_SCHEME_REGEX.test(trimmed) ||
    (trimmed.startsWith("//") && !trimmed.startsWith("///")) ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("?")
  ) {
    return trimmed;
  }

  const { pathname: rawPathname, suffix } = splitPathAndSuffix(trimmed);
  const normalizedPathname = rawPathname
    ? `/${rawPathname.replace(/\/+/g, "/").replace(/^\/+/, "")}`
    : "/";

  if (base === "/") {
    return `${normalizedPathname}${suffix}`;
  }

  const baseNoSlash = base.slice(0, -1);
  if (normalizedPathname === baseNoSlash || normalizedPathname.startsWith(base)) {
    return `${normalizedPathname}${suffix}`;
  }

  return `${baseNoSlash}${normalizedPathname}${suffix}`;
}

/**
 * Remueve de manera segura el prefijo `base` de una ruta interna.
 */
export function stripBase(pathname: string, baseOverride?: string): string {
  const base = normalizeBase(baseOverride);
  const trimmed = pathname.trim();
  if (!trimmed) {
    return "/";
  }

  const { pathname: rawPathname, suffix } = splitPathAndSuffix(trimmed);
  const normalizedPathname = rawPathname
    ? `/${rawPathname.replace(/\/+/g, "/").replace(/^\/+/, "")}`
    : "/";

  if (base === "/") {
    return `${normalizedPathname}${suffix}`;
  }

  const baseNoSlash = base.slice(0, -1);
  if (normalizedPathname === baseNoSlash || normalizedPathname === base) {
    return `/${suffix}`;
  }

  if (normalizedPathname.startsWith(base)) {
    return `/${normalizedPathname.slice(base.length)}${suffix}`;
  }

  return `${normalizedPathname}${suffix}`;
}

/**
 * Construye la URL canónica del visor dual de materiales definida en ADR-004:
 * `{BASE_URL}/{course}/materiales/{resourceId}?page={N}`.
 */
export function buildMaterialViewerUrl(
  courseId: string,
  resourceId: string,
  page?: number,
  baseOverride?: string,
): string {
  if (!SLUG_REGEX.test(courseId)) {
    throw new Error(`Identificador de curso inválido '${courseId}': debe cumplir ^[a-z0-9-]+$.`);
  }
  if (!SLUG_REGEX.test(resourceId)) {
    throw new Error(`Identificador de recurso inválido '${resourceId}': debe cumplir ^[a-z0-9-]+$.`);
  }
  if (page !== undefined) {
    if (!Number.isInteger(page) || page < 1) {
      throw new RangeError(`El número de página debe ser un entero positivo >= 1; recibido: ${String(page)}.`);
    }
  }

  const route = `/${courseId}/materiales/${resourceId}${page !== undefined ? `?page=${page}` : ""}`;
  return withBase(route, baseOverride);
}

/**
 * Normaliza la ruta relativa publicada bajo `dist/materials/` evitando
 * duplicar el prefijo `{courseId}/` cuando los archivos del repositorio ya
 * residen dentro de la carpeta del curso.
 */
export function toPublishedMaterialRelPath(
  courseId: string,
  filePath: string,
): string {
  const cleanPath = String(filePath ?? "")
    .replace(/^\/+/, "")
    .replace(/^materias\//, "");
  if (cleanPath.startsWith(`${courseId}/`)) {
    return cleanPath;
  }
  return `${courseId}/${cleanPath}`;
}
