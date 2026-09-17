(function exposeAuth(root) {
  function randomState() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  function buildAuthUrl(apiBase, params) {
    const url = new URL("/auth/extension/connect", apiBase);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("state", params.state);
    url.searchParams.set("install_id", params.installId);
    url.searchParams.set("device_name", params.deviceName);
    return url.toString();
  }

  function parseAuthCallback(value, expectedState) {
    const url = new URL(value);
    const state = url.searchParams.get("state");
    if (!state || state !== expectedState) {
      throw new Error("Respons login tidak valid. Silakan coba lagi.");
    }
    const errorCode = url.searchParams.get("error");
    if (errorCode) {
      const messages = {
        extension_not_allowed: "Extension belum diizinkan oleh server Reelmark.",
        server_not_configured: "Backend Reelmark belum dikonfigurasi.",
        session_unavailable: "Sesi Reelmark sedang tidak dapat diverifikasi.",
        connect_failed: "Reelmark belum berhasil menghubungkan extension.",
      };
      throw new Error(messages[errorCode] || "Login belum berhasil. Silakan coba lagi.");
    }
    const code = url.searchParams.get("code");
    if (!code || !/^[A-Za-z0-9_-]{32,64}$/.test(code)) {
      throw new Error("Kode login tidak valid. Silakan coba lagi.");
    }
    return code;
  }

  const api = { randomState, buildAuthUrl, parseAuthCallback };
  root.ReelAuth = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
