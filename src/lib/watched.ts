import "server-only";

import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import type { SeriesStatus, WatchedTitle } from "@/lib/catalog";
import { isTrackableProviderUrl, isUsefulDetectedTitle, normalizeProviderUrl } from "@/lib/extension-title";
import { createClient } from "@/lib/supabase/server";
import { getSeriesStatus, resolveCatalogMatch } from "@/lib/tmdb";

type RawState = {
  id: string;
  episode_id: string | null;
  last_watched_at: string;
  watch_count: number;
  catalog_titles: {
    title: string;
    original_title: string;
    tmdb_id: number;
    release_year: number | null;
    media_type: "movie" | "tv";
    poster_path: string | null;
    series_status: SeriesStatus | null;
  };
  episode: {
    season_number: number;
    episode_number: number;
    title: string;
  } | null;
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
  season_number: number | null;
  episode_number: number | null;
  episode_title: string | null;
  tmdb_id: number | null;
  media_type: "movie" | "tv" | null;
  series_status: SeriesStatus | null;
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
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeTitle: string | null;
  mediaType: "movie" | "tv" | null;
  seriesStatus: SeriesStatus | null;
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
        .select("id,episode_id,last_watched_at,watch_count,catalog_titles!inner(title,original_title,tmdb_id,release_year,media_type,poster_path,series_status),episode:episodes(season_number,episode_number,title)")
        .eq("user_id", user.id)
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
    .select("id,provider,provider_item_id,detected_title,duration_seconds,current_time_seconds,progress_percent,last_seen_at,season_number,episode_number,episode_title,tmdb_id,media_type,series_status")
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
    const episode = item.season_number != null && item.episode_number != null
      ? `:s${item.season_number}e${item.episode_number}`
      : "";
    const identity = `${normalizeProviderUrl(item.provider, item.provider_item_id)
      ?? `${item.provider}:${item.detected_title.trim().toLocaleLowerCase("en-US")}`}${episode}`;
    if (seenProgress.has(identity)) return false;
    seenProgress.add(identity);
    return true;
  });

  const missingStatusIds = [...new Set(rows
    .filter((item) => item.catalog_titles.media_type === "tv" && !item.catalog_titles.series_status)
    .map((item) => item.catalog_titles.tmdb_id))];
  const statusResults = await Promise.allSettled(missingStatusIds.map(async (tmdbId) => [
    tmdbId,
    await getSeriesStatus(tmdbId),
  ] as const));
  const fallbackStatuses = new Map<number, SeriesStatus | null>();
  for (const result of statusResults) {
    if (result.status === "fulfilled") fallbackStatuses.set(...result.value);
    else console.error("Watched series status lookup failed", result.reason);
  }

  const progressToResolve = visibleProgress
    .slice(0, 8)
    .filter((item) => !item.tmdb_id || !item.media_type || (item.media_type === "tv" && !item.series_status));
  const progressMatchResults = await Promise.allSettled(progressToResolve.map(async (item) => [
    item.id,
    await resolveCatalogMatch({
      detectedTitle: item.detected_title,
      provider: item.provider,
      providerUrl: normalizeProviderUrl(item.provider, item.provider_item_id),
      expectedMediaType: item.episode_number != null ? "tv" : item.media_type,
    }),
  ] as const));
  const progressMatches = new Map<string, Awaited<ReturnType<typeof resolveCatalogMatch>>>();
  for (const result of progressMatchResults) {
    if (result.status === "fulfilled") progressMatches.set(...result.value);
    else console.error("In-progress catalog lookup failed", result.reason);
  }

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
        seasonNumber: item.episode?.season_number ?? null,
        episodeNumber: item.episode?.episode_number ?? null,
        episodeTitle: item.episode?.title ?? null,
        seriesStatus: item.catalog_titles.series_status
          ?? fallbackStatuses.get(item.catalog_titles.tmdb_id)
          ?? null,
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
        seasonNumber: null,
        episodeNumber: null,
        episodeTitle: null,
        seriesStatus: null,
        } satisfies WatchedTitle)),
    ].sort((a, b) => b.watchedAt.localeCompare(a.watchedAt)),
    inProgress: visibleProgress
      .slice(0, 8)
      .map((item) => {
        const match = progressMatches.get(item.id);
        return {
        id: item.id,
        provider: item.provider,
        url: normalizeProviderUrl(item.provider, item.provider_item_id),
        title: item.detected_title,
        duration: item.duration_seconds,
        currentTime: item.current_time_seconds,
        progress: Number(item.progress_percent),
        lastSeenAt: item.last_seen_at,
        seasonNumber: item.season_number,
        episodeNumber: item.episode_number,
        episodeTitle: item.episode_title,
        mediaType: item.media_type ?? match?.mediaType ?? null,
        seriesStatus: item.series_status ?? match?.seriesStatus ?? null,
        };
      }),
  };
});
