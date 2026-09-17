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

export type WatchedTitle = Pick<
  CatalogResult,
  "title" | "year" | "mediaType" | "posterPath"
> & {
  id: string;
  watchedAt: string;
  watchCount: number;
};
