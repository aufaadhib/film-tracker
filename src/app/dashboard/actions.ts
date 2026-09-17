"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type DeleteWatchedState = {
  status: "idle" | "error";
  message: string;
};

const stateIdSchema = z.string().uuid();

export async function deleteWatchedTitle(
  _previousState: DeleteWatchedState,
  formData: FormData,
): Promise<DeleteWatchedState> {
  void _previousState;
  const stateId = stateIdSchema.safeParse(formData.get("stateId"));
  if (!stateId.success) return { status: "error", message: "Data judul tidak valid." };

  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase belum dikonfigurasi." };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Delete watched title user lookup failed", JSON.stringify({ name: authError.name, message: authError.message }));
    return { status: "error", message: "Sesi sedang tidak dapat diverifikasi." };
  }
  if (!authData.user) return { status: "error", message: "Sesi berakhir. Silakan masuk kembali." };

  const { data: deleted, error } = await supabase.rpc("delete_watched_title", {
    p_state_id: stateId.data,
  });
  if (error) {
    console.error("Delete watched title failed", JSON.stringify({ code: error.code, message: error.message }));
    return {
      status: "error",
      message: error.code === "PGRST202" ? "Migration penghapusan belum dijalankan." : "Judul belum berhasil dihapus.",
    };
  }
  if (!deleted) return { status: "error", message: "Judul tidak ditemukan atau sudah dihapus." };

  refresh();
  return { status: "idle", message: "" };
}
