"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type PairingActionState = {
  status: "idle" | "success" | "error";
  message: string;
  code?: string;
  expiresAt?: string;
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const deviceIdSchema = z.string().uuid();

function generatePairingCode() {
  return [...randomBytes(8)]
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createPairingCode(
  _previousState: PairingActionState,
  _formData: FormData,
): Promise<PairingActionState> {
  void _previousState;
  void _formData;

  const supabase = await createClient();
  if (!supabase) {
    return { status: "error", message: "Supabase belum dikonfigurasi." };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Pairing user lookup failed", JSON.stringify({ name: authError.name, message: authError.message }));
    return { status: "error", message: "Sesi sedang tidak dapat diverifikasi. Coba lagi." };
  }
  if (!authData.user) {
    return { status: "error", message: "Sesi berakhir. Masuk kembali untuk membuat kode." };
  }

  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: cleanupError } = await supabase
    .from("extension_pairing_codes")
    .delete()
    .eq("user_id", authData.user.id)
    .is("consumed_at", null);

  if (cleanupError) {
    console.error("Clear pairing codes failed", JSON.stringify({ code: cleanupError.code, message: cleanupError.message }));
    return {
      status: "error",
      message: cleanupError.code === "42P01" || cleanupError.code === "42703" || cleanupError.code === "PGRST204" || cleanupError.code === "PGRST205"
        ? "Migration pairing extension belum dijalankan."
        : "Kode belum berhasil dibuat. Coba lagi.",
    };
  }

  const { error } = await supabase.from("extension_pairing_codes").insert({
    user_id: authData.user.id,
    code_hash: hash(code),
    expires_at: expiresAt,
  });

  if (error) {
    console.error("Create pairing code failed", JSON.stringify({
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    }));
    return {
      status: "error",
      message: error.code === "42P01" || error.code === "42703" || error.code === "PGRST204" || error.code === "PGRST205"
        ? "Migration pairing extension belum dijalankan."
        : "Kode belum berhasil dibuat. Coba lagi.",
    };
  }

  return {
    status: "success",
    message: "Masukkan kode ini di popup extension. Kode hanya berlaku sekali selama 10 menit.",
    code,
    expiresAt,
  };
}

export async function revokeExtensionDevice(formData: FormData) {
  const deviceId = deviceIdSchema.safeParse(formData.get("deviceId"));
  if (!deviceId.success) return;

  const supabase = await createClient();
  if (!supabase) return;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Revoke device user lookup failed", JSON.stringify({ name: authError.name, message: authError.message }));
    throw new Error("Sesi sedang tidak dapat diverifikasi.");
  }
  if (!authData.user) return;

  const { error } = await supabase
    .from("extension_devices")
    .delete()
    .eq("id", deviceId.data)
    .eq("user_id", authData.user.id);

  if (error) {
    console.error("Revoke extension device failed", JSON.stringify({ code: error.code, message: error.message }));
    throw new Error("Akses extension belum berhasil dicabut.");
  }

  revalidatePath("/dashboard/extension");
}
