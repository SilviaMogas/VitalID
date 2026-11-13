// Edge-safe: imported by middleware, so keep this module dependency-free.

const LOOPBACK_HOST_RE = /^(127\.0\.0\.1|\[::1\])(?::\d+)?$/;

function expectedOrigin(req: Request): string {
  const target = new URL(req.url);
  const host = req.headers.get("host");
  // NextURL rewrites loopback IPs to localhost; preserve the browser's actual host.
  return target.hostname === "localhost" && host && LOOPBACK_HOST_RE.test(host)
    ? new URL(`${target.protocol}//${host}`).origin
    : target.origin;
}

/** Lenient: a missing Origin passes (same-origin GETs and native bearer clients omit it). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === expectedOrigin(req);
  } catch {
    return false;
  }
}

/** Strict CSRF guard for cookie-authenticated mutations: Origin is required. */
export function isStrictSameOrigin(req: Request): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite.toLowerCase() !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === expectedOrigin(req);
  } catch {
    return false;
  }
}

export function isJsonContentType(req: Request): boolean {
  const type = req.headers.get("content-type");
  return type !== null && type.split(";")[0].trim().toLowerCase() === "application/json";
}
