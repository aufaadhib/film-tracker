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
};

export function formatDisplayTitle(title: string, originalTitle?: string | null) {
  const localized = title.trim();
  const original = originalTitle?.trim();
  if (!original || localized.normalize("NFKC").toLocaleLowerCase() === original.normalize("NFKC").toLocaleLowerCase()) {
    return localized;
  }
  return `${localized} (${original})`;
}
