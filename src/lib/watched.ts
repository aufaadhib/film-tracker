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

type RawProgress = {
  id: string;
  provider: "netflix" | "disney" | "prime_video" | "max";
  provider_item_id: string | null;
  detected_title: string;
  duration_seconds: number;
  current_time_seconds: number;
  progress_percent: number;
  coverage_percent: number;
  last_seen_at: string;
};

export type InProgressWatch = {
  id: string;
  provider: RawProgress["provider"];
  url: string | null;
  title: string;
  duration: number;
  currentTime: number;
  progress: number;
  coverage: number;
  lastSeenAt: string;
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
  inProgress: InProgressWatch[];
}> => {
  const user = await getCurrentUser();
  if (!user) return { user: null, watched: [], inProgress: [] };

  const supabase = await createClient();
  if (!supabase) return { user: null, watched: [], inProgress: [] };

  const watchedPromise = (async () => {
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
    return rows;
  })();

  const progressPromise = supabase
    .from("extension_watch_progress")
    .select("id,provider,provider_item_id,detected_title,duration_seconds,current_time_seconds,progress_percent,coverage_percent,last_seen_at")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false })
    .limit(8);

  const [rows, progressResult] = await Promise.all([watchedPromise, progressPromise]);
  if (progressResult.error) {
    console.error("In-progress titles query failed", JSON.stringify({
      code: progressResult.error.code,
      message: progressResult.error.message,
      details: progressResult.error.details,
      hint: progressResult.error.hint,
    }));
    throw new Error("Progres tontonan tidak dapat dimuat.");
  }

  const progressRows = progressResult.data as unknown as RawProgress[];

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
    inProgress: progressRows.map((item) => ({
      id: item.id,
      provider: item.provider,
      url: item.provider_item_id,
      title: item.detected_title,
      duration: item.duration_seconds,
      currentTime: item.current_time_seconds,
      progress: Number(item.progress_percent),
      coverage: Number(item.coverage_percent),
      lastSeenAt: item.last_seen_at,
    })),
  };
});
