import type { CatalogResult } from "@/lib/catalog";

const missingOverview = "Sinopsis belum tersedia.";

export function mergeLocalizedTitle(
  primary: CatalogResult,
  english?: CatalogResult,
  originalLanguage?: string | null,
): CatalogResult {
  if (!english) return primary;

  return {
    ...primary,
    title: primary.title === primary.originalTitle && originalLanguage !== "id" ? english.title : primary.title,
    overview: primary.overview === missingOverview ? english.overview : primary.overview,
    posterPath: primary.posterPath ?? english.posterPath,
    backdropPath: primary.backdropPath ?? english.backdropPath,
  };
}
