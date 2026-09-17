"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCatalogTitle } from "@/lib/tmdb";

export type DeleteWatchedState = {
  status: "idle" | "error";
  message: string;
};

export type DeleteProgressState = DeleteWatchedState;
export type CorrectTitleState = {
  status: "idle" | "error" | "success";
  message: string;
};

const stateIdSchema = z.string().uuid();
const correctionSchema = z.object({
  sessionId: z.string().uuid(),
  selection: z.string().regex(/^(movie|tv):\d+$/),
});

export async function deleteWatchedTitle(
  _previousState: DeleteWatchedState,
  formData: FormData,
): Promise<DeleteWatchedState> {
  void _previousState;
  const stateId = stateIdSchema.safeParse(formData.get("itemId"));
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

export async function deleteUnmatchedWatch(
  _previousState: DeleteWatchedState,
  formData: FormData,
): Promise<DeleteWatchedState> {
  void _previousState;
  const sessionId = stateIdSchema.safeParse(formData.get("itemId"));
  if (!sessionId.success) return { status: "error", message: "Data tontonan tidak valid." };

  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase belum dikonfigurasi." };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Delete unmatched watch user lookup failed", JSON.stringify({ name: authError.name, message: authError.message }));
    return { status: "error", message: "Sesi sedang tidak dapat diverifikasi." };
  }
  if (!authData.user) return { status: "error", message: "Sesi berakhir. Silakan masuk kembali." };

  const { data: deleted, error } = await supabase
    .from("watch_sessions")
    .delete()
    .eq("id", sessionId.data)
    .eq("user_id", authData.user.id)
    .is("title_id", null)
    .select("id");
  if (error) {
    console.error("Delete unmatched watch failed", JSON.stringify({ code: error.code, message: error.message }));
    return { status: "error", message: "Tontonan belum berhasil dihapus." };
  }
  if (!deleted?.length) return { status: "error", message: "Tontonan tidak ditemukan atau sudah dihapus." };

  refresh();
  return { status: "idle", message: "" };
}

export async function deleteInProgress(
  _previousState: DeleteProgressState,
  formData: FormData,
): Promise<DeleteProgressState> {
  void _previousState;
  const progressId = stateIdSchema.safeParse(formData.get("progressId"));
  if (!progressId.success) return { status: "error", message: "Data progres tidak valid." };

  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase belum dikonfigurasi." };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Delete progress user lookup failed", JSON.stringify({ name: authError.name, message: authError.message }));
    return { status: "error", message: "Sesi sedang tidak dapat diverifikasi." };
  }
  if (!authData.user) return { status: "error", message: "Sesi berakhir. Silakan masuk kembali." };

  const { data: deleted, error } = await supabase.rpc("dismiss_extension_progress", {
    p_progress_id: progressId.data,
  });
  if (error) {
    console.error("Delete progress failed", JSON.stringify({ code: error.code, message: error.message }));
    return {
      status: "error",
      message: error.code === "PGRST202" ? "Migration penghapusan progres belum dijalankan." : "Progres belum berhasil dihapus.",
    };
  }
  if (!deleted) return { status: "error", message: "Progres tidak ditemukan atau sudah dihapus." };

  refresh();
  return { status: "idle", message: "" };
}

export async function correctUnmatchedWatch(
  _previousState: CorrectTitleState,
  formData: FormData,
): Promise<CorrectTitleState> {
  void _previousState;
  const parsed = correctionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    selection: formData.get("selection"),
  });
  if (!parsed.success) return { status: "error", message: "Pilihan judul tidak valid." };

  const [mediaType, rawTmdbId] = parsed.data.selection.split(":") as ["movie" | "tv", string];
  const title = await getCatalogTitle(Number(rawTmdbId), mediaType).catch((error) => {
    console.error("Correction catalog lookup failed", error);
    return null;
  });
  if (!title) return { status: "error", message: "Detail judul TMDB tidak dapat dimuat." };

  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase belum dikonfigurasi." };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Correct title user lookup failed", JSON.stringify({ name: authError.name, message: authError.message }));
    return { status: "error", message: "Sesi sedang tidak dapat diverifikasi." };
  }
  if (!authData.user) return { status: "error", message: "Sesi berakhir. Silakan masuk kembali." };

  const { data: corrected, error } = await supabase.rpc("correct_unmatched_watch", {
    p_session_id: parsed.data.sessionId,
    p_tmdb_id: title.tmdbId,
    p_media_type: title.mediaType,
    p_title: title.title,
    p_original_title: title.originalTitle,
    p_release_year: title.year,
    p_overview: title.overview,
    p_poster_path: title.posterPath,
    p_backdrop_path: title.backdropPath,
    p_vote_average: title.voteAverage,
  });
  if (error) {
    console.error("Correct unmatched watch failed", JSON.stringify({ code: error.code, message: error.message }));
    return {
      status: "error",
      message: error.code === "PGRST202" ? "Migration koreksi judul belum dijalankan." : "Judul belum berhasil dikoreksi.",
    };
  }
  if (!corrected) return { status: "error", message: "Tontonan tidak ditemukan atau sudah dikoreksi." };

  refresh();
  return { status: "success", message: "Judul berhasil dikoreksi." };
}
