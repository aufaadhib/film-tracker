import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const deviceSchema = {
  installId: z.string().uuid(),
  deviceName: z.string().trim().min(1).max(80),
};
const pairSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("manual"),
    code: z.string().trim().min(8).max(12),
    ...deviceSchema,
  }).strict(),
  z.object({
    method: z.literal("web"),
    code: z.string().regex(/^[A-Za-z0-9_-]{32,64}$/),
    ...deviceSchema,
  }).strict(),
]);

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  const body = pairSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Kode atau identitas extension tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "Backend Reelmark belum dikonfigurasi." }, { status: 503 });
  }

  const token = randomBytes(32).toString("base64url");
  const code = body.data.method === "manual"
    ? body.data.code.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "")
    : body.data.code;
  const { data, error } = await supabase.rpc("claim_extension_device", {
    p_code_hash: hash(code),
    p_install_id: body.data.installId,
    p_device_name: body.data.deviceName,
    p_token_hash: hash(token),
  });

  if (error) {
    console.error("Claim extension failed", JSON.stringify({ code: error.code, message: error.message }));
    return Response.json({ error: "Pairing belum berhasil. Pastikan migration terbaru sudah dijalankan." }, { status: 503 });
  }

  const result = data as { paired?: boolean; device_id?: string } | null;
  if (!result?.paired || !result.device_id) {
    return Response.json({ error: "Kode pairing salah, kedaluwarsa, atau sudah digunakan." }, { status: 400 });
  }

  return Response.json({ token, deviceId: result.device_id }, {
    headers: { "Cache-Control": "no-store" },
  });
}
