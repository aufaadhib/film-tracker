export type SeriesStatus = "ongoing" | "ended" | "upcoming";

export type CatalogResult = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle: string;
  year: number | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  seriesStatus: SeriesStatus | null;
};

export type CatalogSearchItem = CatalogResult & {
  watched: null | {
    watchedAt: string;
    watchCount: number;
  };
};

export type WatchedTitle = {
  id: string;
  title: string;
  originalTitle: string | null;
  year: number | null;
  mediaType: CatalogResult["mediaType"] | null;
  posterPath: string | null;
  matched: boolean;
  provider: string | null;
  watchedAt: string;
  watchCount: number;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  episodeTitle?: string | null;
  seriesStatus?: SeriesStatus | null;
};

export type WatchedArchiveEntry =
  | { kind: "item"; item: WatchedTitle }
  | { kind: "series"; key: string; items: WatchedTitle[] };

export function formatDisplayTitle(title: string, originalTitle?: string | null) {
  const localized = title.trim();
  const original = originalTitle?.trim();
  if (!original || localized.normalize("NFKC").toLocaleLowerCase() === original.normalize("NFKC").toLocaleLowerCase()) {
    return localized;
  }
  return `${localized} (${original})`;
}

export function normalizeSeriesStatus(status?: string | null, inProduction?: boolean | null): SeriesStatus | null {
  if (inProduction || status === "Returning Series" || status === "In Production") return "ongoing";
  if (status === "Ended" || status === "Canceled") return "ended";
  if (status === "Planned" || status === "Pilot") return "upcoming";
  return null;
}

export function seriesStatusLabel(status?: SeriesStatus | null) {
  if (status === "ongoing") return "MASIH TAYANG";
  if (status === "ended") return "SELESAI TAYANG";
  if (status === "upcoming") return "AKAN DATANG";
  return null;
}

export function formatEpisodeDisplayTitle(
  title: string,
  seasonNumber?: number | null,
  episodeNumber?: number | null,
  episodeTitle?: string | null,
) {
  if (seasonNumber == null || episodeNumber == null) return title;
  const name = episodeTitle?.trim();
  return [title, `S${seasonNumber}:E${episodeNumber}`, name && !/^episode\s*\d+$/i.test(name) ? name : null]
    .filter(Boolean)
    .join(" · ");
}

export function groupWatchedTitles(items: WatchedTitle[]): WatchedArchiveEntry[] {
  const series = new Map<string, WatchedTitle[]>();
  for (const item of items) {
    if (item.mediaType !== "tv" || item.episodeNumber == null) continue;
    const key = `${item.title.normalize("NFKC").toLocaleLowerCase("id-ID")}:${item.year ?? ""}`;
    series.set(key, [...(series.get(key) ?? []), item]);
  }

  const seen = new Set<string>();
  const entries: WatchedArchiveEntry[] = [];
  for (const item of items) {
    if (item.mediaType !== "tv" || item.episodeNumber == null) {
      entries.push({ kind: "item", item });
      continue;
    }
    const key = `${item.title.normalize("NFKC").toLocaleLowerCase("id-ID")}:${item.year ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ kind: "series", key, items: series.get(key) ?? [item] });
  }
  return entries;
}
