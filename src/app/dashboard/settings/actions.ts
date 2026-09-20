"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const thresholdSchema = z.coerce.number().int().min(50).max(100);

export async function updateCompletionThreshold(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  void _previousState;
  const threshold = thresholdSchema.safeParse(formData.get("completionThreshold"));
  if (!threshold.success) {
    return { status: "error", message: "Masukkan angka bulat antara 50 dan 100." };
  }

  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase belum dikonfigurasi." };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Settings user lookup failed", JSON.stringify({ name: authError.name, message: authError.message }));
    return { status: "error", message: "Sesi sedang tidak dapat diverifikasi." };
  }
  if (!authData.user) return { status: "error", message: "Sesi berakhir. Silakan masuk kembali." };

  const { data, error } = await supabase
    .from("profiles")
    .update({ completion_threshold: threshold.data })
    .eq("id", authData.user.id)
    .select("id");
  if (error) {
    console.error("Update completion threshold failed", JSON.stringify({ code: error.code, message: error.message }));
    return {
      status: "error",
      message: error.code === "42703" || error.code === "PGRST204"
        ? "Migration pengaturan ambang belum dijalankan."
        : "Ambang selesai belum berhasil disimpan.",
    };
  }
  if (!data?.length) return { status: "error", message: "Profil pengguna tidak ditemukan." };

  refresh();
  return { status: "success", message: `Tontonan kini dianggap selesai pada ${threshold.data}%.` };
}
