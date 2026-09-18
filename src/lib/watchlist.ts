import "server-only";

import type { SeriesStatus } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { getWatchProviders } from "@/lib/tmdb";
import type { WatchNetwork, WatchProvider } from "@/lib/watchlist-utils";
import { getReleaseState, type ReleaseState } from "@/lib/watchlist-utils";
import { getCurrentUser } from "@/lib/watched";

const PAGE_SIZE = 12;

type RawWatchlistItem = {
  id: string;
  is_priority: boolean;
  created_at: string;
  catalog_titles: {
    tmdb_id: number;
    media_type: "movie" | "tv";
    title: string;
    original_title: string;
    release_year: number | null;
    release_date: string | null;
    overview: string;
    poster_path: string | null;
    vote_average: number;
    series_status: SeriesStatus | null;
  };
};

export type WatchlistItem = {
  id: string;
  isPriority: boolean;
  createdAt: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle: string;
  year: number | null;
  releaseDate: string | null;
  releaseState: ReleaseState;
  overview: string;
  posterPath: string | null;
  voteAverage: number;
  seriesStatus: SeriesStatus | null;
  providers: WatchProvider[];
  networks: WatchNetwork[];
  providerLink: string | null;
  providerStatus: "ready" | "unavailable" | "error";
};

export type WatchlistFilters = {
  q: string;
  type: "all" | "movie" | "tv";
  release: "all" | ReleaseState;
  page: number;
};

export async function getWatchlist(filters: WatchlistFilters): Promise<{
  items: WatchlistItem[];
  total: number;
  pages: number;
  page: number;
  countryCode: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { items: [], total: 0, pages: 1, page: 1, countryCode: "ID" };

  const supabase = await createClient();
  if (!supabase) return { items: [], total: 0, pages: 1, page: 1, countryCode: "ID" };

  const [watchlistResult, profileResult] = await Promise.all([
    supabase
      .from("user_watchlist")
      .select("id,is_priority,created_at,catalog_titles!inner(tmdb_id,media_type,title,original_title,release_year,release_date,overview,poster_path,vote_average,series_status)")
      .eq("user_id", user.id)
      .order("is_priority", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("country_code").eq("id", user.id).maybeSingle(),
  ]);

  if (watchlistResult.error) {
    console.error("Watchlist query failed", JSON.stringify({
      code: watchlistResult.error.code,
      message: watchlistResult.error.message,
      details: watchlistResult.error.details,
    }));
    throw new Error("Watchlist tidak dapat dimuat.");
  }
  if (profileResult.error) {
    console.error("Watchlist profile query failed", JSON.stringify({
      code: profileResult.error.code,
      message: profileResult.error.message,
    }));
    throw new Error("Negara provider tidak dapat dimuat.");
  }

  const countryCode = profileResult.data?.country_code ?? "ID";
  const normalizedQuery = filters.q.toLocaleLowerCase("id-ID");
  const filtered = (watchlistResult.data as unknown as RawWatchlistItem[])
    .filter((item) => filters.type === "all" || item.catalog_titles.media_type === filters.type)
    .filter((item) => !normalizedQuery || `${item.catalog_titles.title} ${item.catalog_titles.original_title}`
      .toLocaleLowerCase("id-ID").includes(normalizedQuery))
    .filter((item) => filters.release === "all"
      || getReleaseState(item.catalog_titles.release_date) === filters.release);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pages);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const providerResults = await Promise.allSettled(visible.map((item) => getWatchProviders(
    item.catalog_titles.tmdb_id,
    item.catalog_titles.media_type,
    countryCode,
  )));

  const items = visible.map((item, index): WatchlistItem => {
    const title = item.catalog_titles;
    const providerResult = providerResults[index];
    if (providerResult.status === "rejected") {
      console.error("TMDB watch provider lookup failed", providerResult.reason);
    }
    const availability = providerResult.status === "fulfilled" ? providerResult.value : null;
    return {
      id: item.id,
      isPriority: item.is_priority,
      createdAt: item.created_at,
      tmdbId: title.tmdb_id,
      mediaType: title.media_type,
      title: title.title,
      originalTitle: title.original_title,
      year: title.release_year,
      releaseDate: title.release_date,
      releaseState: getReleaseState(title.release_date),
      overview: title.overview,
      posterPath: title.poster_path,
      voteAverage: Number(title.vote_average),
      seriesStatus: title.series_status,
      providers: availability?.providers ?? [],
      networks: availability?.networks ?? [],
      providerLink: availability?.link ?? null,
      providerStatus: providerResult.status === "rejected"
        ? "error"
        : availability?.providers.length ? "ready" : "unavailable",
    };
  });

  return { items, total: filtered.length, pages, page, countryCode };
}

export async function getProviderCountryCode() {
  const user = await getCurrentUser();
  if (!user) return "ID";
  const supabase = await createClient();
  if (!supabase) return "ID";
  const { data, error } = await supabase.from("profiles").select("country_code").eq("id", user.id).maybeSingle();
  if (error) {
    console.error("Provider country query failed", JSON.stringify({ code: error.code, message: error.message }));
    throw new Error("Negara provider tidak dapat dimuat.");
  }
  return data?.country_code ?? "ID";
}
