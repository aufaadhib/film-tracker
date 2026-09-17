import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const noStoreHeaders = { "Cache-Control": "no-store" };

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token.length < 32 || token.length > 200) {
    return Response.json({ error: "Token extension tidak valid." }, {
      status: 401,
      headers: noStoreHeaders,
    });
  }

  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "Backend Reelmark belum dikonfigurasi." }, {
      status: 503,
      headers: noStoreHeaders,
    });
  }

  const { data, error } = await supabase.rpc("revoke_extension_device", {
    p_token_hash: hash(token),
  });
  if (error) {
    console.error("Disconnect extension failed", JSON.stringify({ code: error.code, message: error.message }));
    return Response.json({ error: "Extension belum berhasil diputuskan." }, {
      status: 503,
      headers: noStoreHeaders,
    });
  }
  if (!data) {
    return Response.json({ error: "Token extension tidak lagi valid." }, {
      status: 401,
      headers: noStoreHeaders,
    });
  }

  return Response.json({ disconnected: true }, { headers: noStoreHeaders });
}
