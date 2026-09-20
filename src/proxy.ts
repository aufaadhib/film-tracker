import type { NextRequest } from "next/server";
import { extensionCorsHeaders } from "@/lib/extension-cors";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  const extensionApi = request.nextUrl.pathname.startsWith("/api/extension/");
  const corsHeaders = extensionApi
    ? extensionCorsHeaders(request.headers.get("origin"), process.env.REELMARK_EXTENSION_IDS)
    : null;

  if (extensionApi && request.method === "OPTIONS") {
    return new Response(null, {
      status: corsHeaders ? 204 : 403,
      headers: corsHeaders ?? undefined,
    });
  }

  const response = await updateSession(request);
  if (corsHeaders) {
    Object.entries(corsHeaders).forEach(([name, value]) => response.headers.set(name, value));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
