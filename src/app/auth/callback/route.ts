import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const noStoreHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedPath = url.searchParams.get("next") ?? "/";
  const nextPath = requestedPath.startsWith("/")
    && !requestedPath.startsWith("//")
    && !requestedPath.includes("\\")
    ? requestedPath
    : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = supabase
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Supabase belum dikonfigurasi") };

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, url.origin), { headers: noStoreHeaders });
    }
  }

  const loginUrl = new URL("/auth/login", url.origin);
  if (nextPath !== "/") loginUrl.searchParams.set("next", nextPath);
  if (nextPath.startsWith("/auth/extension/connect")) loginUrl.searchParams.set("extension", "1");
  loginUrl.hash = "oauth-error";
  return NextResponse.redirect(loginUrl, { headers: noStoreHeaders });
}
