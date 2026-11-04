export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    // Render terminates TLS and forwards requests to the Node process. In that
    // setup request.url may contain an internal host, so compare Origin with
    // the externally-facing forwarded host rather than the internal URL host.
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();
    const requestHost = forwardedHost || request.headers.get("host");
    if (!requestHost) return false;

    return originUrl.host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
}
