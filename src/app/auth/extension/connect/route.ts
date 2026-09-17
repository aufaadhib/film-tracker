import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({
  redirect_uri: z.string().url().max(2048),
  state: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
  install_id: z.string().uuid(),
  device_name: z.string().trim().min(1).max(80),
}).strict();

const noStoreHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function extensionRedirectUrl(value: string) {
  const redirect = new URL(value);
  const match = redirect.hostname.match(/^([a-p]{32})\.chromiumapp\.org$/);

  return match
    && redirect.protocol === "https:"
    && redirect.pathname === "/reelmark"
    && !redirect.search
    && !redirect.hash
    ? { redirect, extensionId: match[1] }
    : null;
}

function extensionIsAllowed(extensionId: string) {
  return (process.env.REELMARK_EXTENSION_IDS ?? "")
    .split(",")
    .some((id) => id.trim().toLowerCase() === extensionId);
}

function extensionRedirect(redirect: URL, state: string, params: { code?: string; error?: string }) {
  redirect.searchParams.set("state", state);
  if (params.code) redirect.searchParams.set("code", params.code);
  if (params.error) redirect.searchParams.set("error", params.error);
  return NextResponse.redirect(redirect, { headers: noStoreHeaders });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success) {
    return Response.json({ error: "Permintaan login extension tidak valid." }, {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const callback = extensionRedirectUrl(query.data.redirect_uri);
  if (!callback) {
    return Response.json({ error: "Callback extension tidak valid." }, {
      status: 400,
      headers: noStoreHeaders,
    });
  }
  const { redirect, extensionId } = callback;
  if (!extensionIsAllowed(extensionId)) {
    return extensionRedirect(redirect, query.data.state, { error: "extension_not_allowed" });
  }

  const supabase = await createClient();
  if (!supabase) {
    return extensionRedirect(redirect, query.data.state, { error: "server_not_configured" });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Extension auth lookup failed", JSON.stringify({ name: authError.name, message: authError.message }));
    return extensionRedirect(redirect, query.data.state, { error: "session_unavailable" });
  }

  if (!authData.user) {
    const loginUrl = new URL("/auth/login", url.origin);
    loginUrl.searchParams.set("extension", "1");
    loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(loginUrl, { headers: noStoreHeaders });
  }

  const code = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { error: cleanupError } = await supabase
    .from("extension_pairing_codes")
    .delete()
    .eq("user_id", authData.user.id)
    .is("consumed_at", null);

  if (cleanupError) {
    console.error("Extension auth cleanup failed", JSON.stringify({ code: cleanupError.code, message: cleanupError.message }));
    return extensionRedirect(redirect, query.data.state, { error: "connect_failed" });
  }

  const { error } = await supabase.from("extension_pairing_codes").insert({
    user_id: authData.user.id,
    code_hash: hash(code),
    expires_at: expiresAt,
  });
  if (error) {
    console.error("Extension auth code failed", JSON.stringify({ code: error.code, message: error.message }));
    return extensionRedirect(redirect, query.data.state, { error: "connect_failed" });
  }

  return extensionRedirect(redirect, query.data.state, { code });
}
