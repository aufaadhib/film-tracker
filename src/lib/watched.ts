import "server-only";

import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import type { WatchedTitle } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";

type RawState = {
  id: string;
  last_watched_at: string;
  watch_count: number;
  catalog_titles: {
    title: string;
    release_year: number | null;
    media_type: "movie" | "tv";
    poster_path: string | null;
  };
};

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Current user query failed", JSON.stringify({ name: error.name, message: error.message }));
    throw new Error("Sesi pengguna tidak dapat diverifikasi.");
  }
  return data.user;
});

export const getViewer = cache(async (): Promise<{
  user: User | null;
  watched: WatchedTitle[];
}> => {
  const user = await getCurrentUser();
  if (!user) return { user: null, watched: [] };

  const supabase = await createClient();
  if (!supabase) return { user: null, watched: [] };

  const rows: RawState[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("user_media_state")
      .select("id,last_watched_at,watch_count,catalog_titles!inner(title,release_year,media_type,poster_path)")
      .eq("user_id", user.id)
      .is("episode_id", null)
      .order("last_watched_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Watched titles query failed", JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint }));
      throw new Error("Riwayat tontonan tidak dapat dimuat.");
    }

    const batch = data as unknown as RawState[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return {
    user,
    watched: rows.map((item) => ({
      id: item.id,
      title: item.catalog_titles.title,
      year: item.catalog_titles.release_year,
      mediaType: item.catalog_titles.media_type,
      posterPath: item.catalog_titles.poster_path,
      watchedAt: item.last_watched_at,
      watchCount: item.watch_count,
    })),
  };
});
