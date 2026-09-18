"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCatalogTitle, getWatchRegions } from "@/lib/tmdb";

export type WatchlistActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const titleSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
}).strict();
const itemSchema = z.string().uuid();
const countrySchema = z.string().regex(/^[A-Z]{2}$/);

async function authenticatedClient() {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase belum dikonfigurasi." } as const;
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Watchlist user lookup failed", JSON.stringify({ name: error.name, message: error.message }));
    return { error: "Sesi sedang tidak dapat diverifikasi." } as const;
  }
  if (!data.user) return { error: "Sesi berakhir. Silakan masuk kembali." } as const;
  return { supabase, user: data.user } as const;
}

export async function addToWatchlist(input: { tmdbId: number; mediaType: "movie" | "tv" }): Promise<WatchlistActionState> {
  const parsed = titleSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Data judul tidak valid." };

  const auth = await authenticatedClient();
  if ("error" in auth && auth.error) return { status: "error", message: auth.error };

  const title = await getCatalogTitle(parsed.data.tmdbId, parsed.data.mediaType).catch((error) => {
    console.error("Watchlist catalog lookup failed", error);
    return null;
  });
  if (!title) return { status: "error", message: "Detail judul TMDB tidak dapat dimuat." };

  const { error } = await auth.supabase.rpc("add_to_watchlist", {
    p_tmdb_id: title.tmdbId,
    p_media_type: title.mediaType,
    p_title: title.title,
    p_original_title: title.originalTitle,
    p_release_year: title.year,
    p_release_date: title.releaseDate ?? null,
    p_overview: title.overview,
    p_poster_path: title.posterPath,
    p_backdrop_path: title.backdropPath,
    p_vote_average: title.voteAverage,
    p_series_status: title.seriesStatus,
  });
  if (error) {
    console.error("Add watchlist failed", JSON.stringify({ code: error.code, message: error.message }));
    return {
      status: "error",
      message: error.code === "PGRST202" || error.code === "PGRST205"
        ? "Migration watchlist belum dijalankan."
        : "Judul belum berhasil disimpan ke watchlist.",
    };
  }
  refresh();
  return { status: "success", message: "Judul tersimpan di watchlist." };
}

export async function removeWatchlist(
  _previousState: WatchlistActionState,
  formData: FormData,
): Promise<WatchlistActionState> {
  void _previousState;
  const itemId = itemSchema.safeParse(formData.get("itemId"));
  if (!itemId.success) return { status: "error", message: "Item watchlist tidak valid." };
  const auth = await authenticatedClient();
  if ("error" in auth && auth.error) return { status: "error", message: auth.error };

  const { data, error } = await auth.supabase.from("user_watchlist")
    .delete().eq("id", itemId.data).eq("user_id", auth.user.id).select("id");
  if (error) {
    console.error("Remove watchlist failed", JSON.stringify({ code: error.code, message: error.message }));
    return { status: "error", message: "Judul belum berhasil dihapus." };
  }
  if (!data?.length) return { status: "error", message: "Judul sudah tidak ada di watchlist." };
  refresh();
  return { status: "success", message: "Judul dihapus dari watchlist." };
}

export async function toggleWatchlistPriority(
  _previousState: WatchlistActionState,
  formData: FormData,
): Promise<WatchlistActionState> {
  void _previousState;
  const parsed = z.object({
    itemId: itemSchema,
    priority: z.enum(["true", "false"]),
  }).safeParse({ itemId: formData.get("itemId"), priority: formData.get("priority") });
  if (!parsed.success) return { status: "error", message: "Prioritas tidak valid." };
  const auth = await authenticatedClient();
  if ("error" in auth && auth.error) return { status: "error", message: auth.error };

  const { data, error } = await auth.supabase.from("user_watchlist")
    .update({ is_priority: parsed.data.priority === "true" })
    .eq("id", parsed.data.itemId).eq("user_id", auth.user.id).select("id");
  if (error) {
    console.error("Toggle watchlist priority failed", JSON.stringify({ code: error.code, message: error.message }));
    return { status: "error", message: "Prioritas belum berhasil diubah." };
  }
  if (!data?.length) return { status: "error", message: "Judul sudah tidak ada di watchlist." };
  refresh();
  return { status: "success", message: "Prioritas watchlist diperbarui." };
}

export async function updateProviderRegion(
  _previousState: WatchlistActionState,
  formData: FormData,
): Promise<WatchlistActionState> {
  void _previousState;
  const countryCode = countrySchema.safeParse(formData.get("countryCode"));
  if (!countryCode.success) return { status: "error", message: "Negara provider tidak valid." };
  const auth = await authenticatedClient();
  if ("error" in auth && auth.error) return { status: "error", message: auth.error };
  const regions = await getWatchRegions().catch((error) => {
    console.error("Provider region validation failed", error);
    return null;
  });
  if (!regions) return { status: "error", message: "Daftar negara sedang tidak dapat diverifikasi." };
  if (!regions.some((region) => region.code === countryCode.data)) {
    return { status: "error", message: "Negara tersebut tidak didukung TMDB." };
  }

  const { error } = await auth.supabase.from("profiles")
    .update({ country_code: countryCode.data }).eq("id", auth.user.id);
  if (error) {
    console.error("Update provider region failed", JSON.stringify({ code: error.code, message: error.message }));
    return { status: "error", message: "Negara provider belum berhasil disimpan." };
  }
  refresh();
  return { status: "success", message: "Negara provider diperbarui." };
}
