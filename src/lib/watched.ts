import "server-only";

import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import type { WatchedTitle } from "@/lib/catalog";
import { isTrackableProviderUrl, isUsefulDetectedTitle, normalizeProviderUrl } from "@/lib/extension-title";
import { createClient } from "@/lib/supabase/server";

type RawState = {
  id: string;
  last_watched_at: string;
  watch_count: number;
  catalog_titles: {
    title: string;
    original_title: string;
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
  last_seen_at: string;
};

type RawUnmatchedWatch = {
  id: string;
  provider: string;
  detected_title: string | null;
  watched_at: string | null;
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
        .select("id,last_watched_at,watch_count,catalog_titles!inner(title,original_title,release_year,media_type,poster_path)")
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
    .select("id,provider,provider_item_id,detected_title,duration_seconds,current_time_seconds,progress_percent,last_seen_at")
    .eq("user_id", user.id)
    .is("dismissed_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(24);

  const unmatchedPromise = (async () => {
    const rows: RawUnmatchedWatch[] = [];
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("watch_sessions")
        .select("id,provider,detected_title,watched_at,last_seen_at")
        .eq("user_id", user.id)
        .eq("status", "watched")
        .is("title_id", null)
        .order("watched_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Unmatched watch sessions query failed", JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint }));
        throw new Error("Riwayat yang belum cocok tidak dapat dimuat.");
      }

      const batch = data as RawUnmatchedWatch[];
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }
    return rows;
  })();

  const [rows, progressResult, unmatchedRows] = await Promise.all([watchedPromise, progressPromise, unmatchedPromise]);
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
  const seenProgress = new Set<string>();
  const visibleProgress = progressRows.filter((item) => {
    if (!isUsefulDetectedTitle(item.detected_title, item.provider)
      || !isTrackableProviderUrl(item.provider, item.provider_item_id)) return false;
    const identity = normalizeProviderUrl(item.provider, item.provider_item_id)
      ?? `${item.provider}:${item.detected_title.trim().toLocaleLowerCase("en-US")}`;
    if (seenProgress.has(identity)) return false;
    seenProgress.add(identity);
    return true;
  });

  return {
    user,
    watched: [
      ...rows.map((item) => ({
        id: item.id,
        title: item.catalog_titles.title,
        originalTitle: item.catalog_titles.original_title,
        year: item.catalog_titles.release_year,
        mediaType: item.catalog_titles.media_type,
        posterPath: item.catalog_titles.poster_path,
        matched: true,
        provider: null,
        watchedAt: item.last_watched_at,
        watchCount: item.watch_count,
      } satisfies WatchedTitle)),
      ...unmatchedRows
        .filter((item) => item.detected_title?.trim())
        .map((item) => ({
          id: item.id,
          title: item.detected_title!.trim(),
          originalTitle: null,
          year: null,
          mediaType: null,
          posterPath: null,
          matched: false,
          provider: item.provider,
          watchedAt: item.watched_at ?? item.last_seen_at,
          watchCount: 1,
        } satisfies WatchedTitle)),
    ].sort((a, b) => b.watchedAt.localeCompare(a.watchedAt)),
    inProgress: visibleProgress
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        provider: item.provider,
        url: normalizeProviderUrl(item.provider, item.provider_item_id),
        title: item.detected_title,
        duration: item.duration_seconds,
        currentTime: item.current_time_seconds,
        progress: Number(item.progress_percent),
        lastSeenAt: item.last_seen_at,
      })),
  };
});
