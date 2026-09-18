import "server-only";

import { z } from "zod";
import { normalizeSeriesStatus, type CatalogResult, type SeriesStatus } from "@/lib/catalog";
import { resolveNetflixEnglishTitle } from "@/lib/provider-title";
import { mergeLocalizedTitle } from "@/lib/tmdb-localization";
import {
  normalizeWatchNetworks,
  normalizeWatchProviders,
  type WatchNetwork,
  type WatchProvider,
} from "@/lib/watchlist-utils";

const responseSchema = z.object({
  results: z.array(
    z
      .object({
        id: z.number().int(),
        media_type: z.enum(["movie", "tv", "person"]),
        title: z.string().optional(),
        name: z.string().optional(),
        original_title: z.string().optional(),
        original_name: z.string().optional(),
        original_language: z.string().nullable().optional(),
        release_date: z.string().nullable().optional(),
        first_air_date: z.string().nullable().optional(),
        overview: z.string().nullable().optional(),
        poster_path: z.string().nullable().optional(),
        backdrop_path: z.string().nullable().optional(),
        vote_average: z.number().optional(),
      })
      .passthrough(),
  ),
});

const detailSchema = z.object({
  id: z.number().int(),
  title: z.string().optional(),
  name: z.string().optional(),
  original_title: z.string().optional(),
  original_name: z.string().optional(),
  original_language: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  vote_average: z.number().optional(),
  status: z.string().nullable().optional(),
  in_production: z.boolean().nullable().optional(),
});

const rawProviderSchema = z.object({
  provider_id: z.number().int().positive(),
  provider_name: z.string(),
  logo_path: z.string().nullable(),
  display_priority: z.number().int(),
});

const watchProviderSchema = z.object({
  results: z.record(z.string(), z.object({
    link: z.string().url().optional(),
    flatrate: z.array(rawProviderSchema).optional(),
    free: z.array(rawProviderSchema).optional(),
    ads: z.array(rawProviderSchema).optional(),
  }).passthrough()),
});

const watchRegionSchema = z.object({
  results: z.array(z.object({
    iso_3166_1: z.string().length(2),
    english_name: z.string(),
    native_name: z.string().nullish(),
  })),
});

const tvWatchProviderSchema = z.object({
  networks: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string(),
    logo_path: z.string().nullable(),
    origin_country: z.string().nullable(),
  })),
  "watch/providers": watchProviderSchema,
});

const demoCatalog: CatalogResult[] = [
  {
    tmdbId: 157336,
    mediaType: "movie",
    title: "Interstellar",
    originalTitle: "Interstellar",
    year: 2014,
    overview: "Sekelompok penjelajah melintasi lubang cacing untuk mencari rumah baru bagi manusia.",
    posterPath: null,
    backdropPath: null,
    voteAverage: 8.5,
    seriesStatus: null,
    releaseDate: "2014-11-05",
  },
  {
    tmdbId: 1399,
    mediaType: "tv",
    title: "Game of Thrones",
    originalTitle: "Game of Thrones",
    year: 2011,
    overview: "Keluarga-keluarga bangsawan berebut kendali atas Tujuh Kerajaan.",
    posterPath: null,
    backdropPath: null,
    voteAverage: 8.4,
    seriesStatus: "ended",
    releaseDate: "2011-04-17",
  },
  {
    tmdbId: 27205,
    mediaType: "movie",
    title: "Inception",
    originalTitle: "Inception",
    year: 2010,
    overview: "Seorang pencuri memasuki mimpi orang lain untuk menanamkan sebuah gagasan.",
    posterPath: null,
    backdropPath: null,
    voteAverage: 8.4,
    seriesStatus: null,
    releaseDate: "2010-07-15",
  },
  {
    tmdbId: 94997,
    mediaType: "tv",
    title: "House of the Dragon",
    originalTitle: "House of the Dragon",
    year: 2022,
    overview: "Keluarga Targaryen terpecah dalam perebutan takhta yang brutal.",
    posterPath: null,
    backdropPath: null,
    voteAverage: 8.3,
    seriesStatus: "ongoing",
    releaseDate: "2022-08-21",
  },
];

type LocalizedResult = { catalog: CatalogResult; originalLanguage: string | null };

function normalize(item: z.infer<typeof responseSchema>["results"][number]): LocalizedResult | null {
  if (item.media_type === "person") return null;

  const title = item.title ?? item.name;
  if (!title) return null;

  const date = item.release_date ?? item.first_air_date;
  const parsedYear = date ? Number(date.slice(0, 4)) : Number.NaN;

  return {
    originalLanguage: item.original_language ?? null,
    catalog: {
      tmdbId: item.id,
      mediaType: item.media_type,
      title,
      originalTitle: item.original_title ?? item.original_name ?? title,
      year: Number.isInteger(parsedYear) ? parsedYear : null,
      releaseDate: date || null,
      overview: item.overview || "Sinopsis belum tersedia.",
      posterPath: item.poster_path ?? null,
      backdropPath: item.backdrop_path ?? null,
      voteAverage: item.vote_average ?? 0,
      seriesStatus: null,
    },
  };
}

async function searchLanguage(query: string, language: "id-ID" | "en-US") {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) return [];

  const url = new URL("https://api.themoviedb.org/3/search/multi");
  url.searchParams.set("query", query);
  url.searchParams.set("language", language);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", "1");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });

  if (!response.ok) throw new Error(`TMDB merespons dengan status ${response.status}`);

  return responseSchema.parse(await response.json()).results
    .map(normalize)
    .filter((item): item is LocalizedResult => item !== null);
}

async function getTitleLanguage(tmdbId: number, mediaType: "movie" | "tv", language: "id-ID" | "en-US") {
  const token = process.env.TMDB_READ_ACCESS_TOKEN!;
  const url = new URL(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}`);
  url.searchParams.set("language", language);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`TMDB merespons dengan status ${response.status}`);

  const item = detailSchema.parse(await response.json());
  const title = item.title ?? item.name;
  if (!title) return null;
  const date = item.release_date ?? item.first_air_date;
  const year = date ? Number(date.slice(0, 4)) : Number.NaN;

  return {
    originalLanguage: item.original_language ?? null,
    catalog: {
      tmdbId: item.id,
      mediaType,
      title,
      originalTitle: item.original_title ?? item.original_name ?? title,
      year: Number.isInteger(year) ? year : null,
      releaseDate: date || null,
      overview: item.overview || "Sinopsis belum tersedia.",
      posterPath: item.poster_path ?? null,
      backdropPath: item.backdrop_path ?? null,
      voteAverage: item.vote_average ?? 0,
      seriesStatus: mediaType === "tv"
        ? normalizeSeriesStatus(item.status, item.in_production)
        : null,
    },
  } satisfies LocalizedResult;
}

export async function getWatchProviders(
  tmdbId: number,
  mediaType: "movie" | "tv",
  countryCode: string,
): Promise<{ providers: WatchProvider[]; networks: WatchNetwork[]; link: string | null }> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) return { providers: [], networks: [], link: null };

  const url = new URL(mediaType === "tv"
    ? `https://api.themoviedb.org/3/tv/${tmdbId}`
    : `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers`);
  if (mediaType === "tv") {
    url.searchParams.set("language", "id-ID");
    url.searchParams.set("append_to_response", "watch/providers");
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 * 60 * 6 },
  });
  if (!response.ok) throw new Error(`TMDB watch providers merespons dengan status ${response.status}`);

  const payload: unknown = await response.json();
  const parsed = mediaType === "tv" ? tvWatchProviderSchema.parse(payload) : null;
  const providerResults = parsed?.["watch/providers"] ?? watchProviderSchema.parse(payload);
  const networks = parsed ? normalizeWatchNetworks(parsed.networks) : [];
  const region = providerResults.results[countryCode.toUpperCase()];
  if (!region) return { providers: [], networks, link: null };
  return { providers: normalizeWatchProviders(region), networks, link: region.link ?? null };
}

export type WatchRegion = { code: string; name: string };

export async function getWatchRegions(): Promise<WatchRegion[]> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) return [{ code: "ID", name: "Indonesia" }];

  const url = new URL("https://api.themoviedb.org/3/watch/providers/regions");
  url.searchParams.set("language", "id-ID");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!response.ok) throw new Error(`TMDB watch regions merespons dengan status ${response.status}`);

  return watchRegionSchema.parse(await response.json()).results
    .map((region) => ({ code: region.iso_3166_1, name: region.native_name || region.english_name }))
    .sort((a, b) => a.code === "ID" ? -1 : b.code === "ID" ? 1 : a.name.localeCompare(b.name, "id-ID"));
}

export async function getSeriesStatus(tmdbId: number): Promise<SeriesStatus | null> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) return demoCatalog.find((item) => item.tmdbId === tmdbId)?.seriesStatus ?? null;

  const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}`);
  url.searchParams.set("language", "en-US");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`TMDB merespons dengan status ${response.status}`);
  const item = detailSchema.parse(await response.json());
  return normalizeSeriesStatus(item.status, item.in_production);
}

export async function getCatalogTitle(tmdbId: number, mediaType: "movie" | "tv"): Promise<CatalogResult | null> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    return demoCatalog.find((item) => item.tmdbId === tmdbId && item.mediaType === mediaType) ?? null;
  }

  const [indonesian, english] = await Promise.all([
    getTitleLanguage(tmdbId, mediaType, "id-ID"),
    getTitleLanguage(tmdbId, mediaType, "en-US"),
  ]);
  return indonesian
    ? mergeLocalizedTitle(indonesian.catalog, english?.catalog, indonesian.originalLanguage)
    : english?.catalog ?? null;
}

export async function searchCatalog(query: string): Promise<{
  results: CatalogResult[];
  source: "tmdb" | "demo";
}> {
  if (!process.env.TMDB_READ_ACCESS_TOKEN) {
    const normalized = query.toLocaleLowerCase("id-ID");
    return {
      results: demoCatalog.filter((item) =>
        `${item.title} ${item.originalTitle}`.toLocaleLowerCase("id-ID").includes(normalized),
      ),
      source: "demo",
    };
  }

  const [indonesian, english] = await Promise.all([
    searchLanguage(query, "id-ID"),
    searchLanguage(query, "en-US"),
  ]);
  const englishById = new Map(english.map((item) => [`${item.catalog.mediaType}:${item.catalog.tmdbId}`, item.catalog]));
  const localized = indonesian.map((item) =>
    mergeLocalizedTitle(
      item.catalog,
      englishById.get(`${item.catalog.mediaType}:${item.catalog.tmdbId}`),
      item.originalLanguage,
    ),
  );
  const localizedIds = new Set(localized.map((item) => `${item.mediaType}:${item.tmdbId}`));
  return {
    results: [
      ...localized,
      ...english
        .map((item) => item.catalog)
        .filter((item) => !localizedIds.has(`${item.mediaType}:${item.tmdbId}`)),
    ],
    source: "tmdb",
  };
}

function normalizeComparableTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export function findExactCatalogMatch(query: string, results: CatalogResult[]) {
  const normalized = normalizeComparableTitle(query);
  return results.find((item) =>
    normalizeComparableTitle(item.title) === normalized
      || normalizeComparableTitle(item.originalTitle) === normalized,
  ) ?? null;
}

export async function resolveCatalogMatch({
  canonicalTitle,
  detectedTitle,
  provider,
  providerUrl,
}: {
  canonicalTitle?: string | null;
  detectedTitle: string;
  provider: string;
  providerUrl?: string | null;
}) {
  const netflixTitle = canonicalTitle?.trim()
    || (provider === "netflix" ? await resolveNetflixEnglishTitle(providerUrl) : null);
  const candidates = [...new Set([netflixTitle, detectedTitle].filter((title): title is string => Boolean(title)))];

  for (const candidate of candidates) {
    const catalog = await searchCatalog(candidate);
    const match = findExactCatalogMatch(candidate, catalog.results);
    if (match) {
      if (match.mediaType !== "tv") return match;
      const seriesStatus = await getSeriesStatus(match.tmdbId).catch((error) => {
        console.error("TMDB series status lookup failed", error);
        return null;
      });
      return { ...match, seriesStatus };
    }
  }

  return null;
}
