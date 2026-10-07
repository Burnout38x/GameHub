/** Next may normalize request.url to its internal listener; Host is the browser-facing authority. */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    const host = request.headers.get('host') ?? target.host;
    const forwardedProtocol = request.headers.get('x-forwarded-proto');
    const protocol = forwardedProtocol === 'https' || forwardedProtocol === 'http' ? `${forwardedProtocol}:` : target.protocol;
    return source.origin === origin && source.host === host && source.protocol === protocol;
  } catch { return false; }
}
