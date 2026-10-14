export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

export const TOKEN_RE = /^[A-Za-z0-9]{12}$/;

export function isLocked(deadline: string, now = Date.now()): boolean {
  const t = Date.parse(deadline);
  return Number.isFinite(t) && now > t;
}

/** Only allow same-site relative redirects after login. */
export function safeNext(next: string | null, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}
