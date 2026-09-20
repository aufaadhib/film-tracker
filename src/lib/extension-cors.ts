const extensionOriginPattern = /^chrome-extension:\/\/([a-p]{32})$/;

export function extensionCorsHeaders(origin: string | null, allowedIds: string | undefined) {
  const extensionId = origin?.match(extensionOriginPattern)?.[1];
  const allowed = (allowedIds ?? "")
    .split(",")
    .some((id) => id.trim().toLowerCase() === extensionId);
  if (!origin || !extensionId || !allowed) return null;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
