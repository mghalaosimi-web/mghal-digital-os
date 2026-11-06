export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    // Render terminates TLS and forwards requests to the Node process. Compare
    // both the public host and protocol, not the internal Node URL.
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();
    const requestHost = forwardedHost || request.headers.get("host");
    if (!requestHost) return false;

    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      ?.replace(/:$/, "")
      ?.toLowerCase();
    const requestProtocol = forwardedProto
      ? `${forwardedProto}:`
      : new URL(request.url).protocol;

    return (
      originUrl.host.toLowerCase() === requestHost.toLowerCase() &&
      originUrl.protocol.toLowerCase() === requestProtocol
    );
  } catch {
    return false;
  }
}
