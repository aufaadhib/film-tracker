import "server-only";

import { z } from "zod";
import type { CatalogResult } from "@/lib/catalog";
import { mergeLocalizedTitle } from "@/lib/tmdb-localization";

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
      overview: item.overview || "Sinopsis belum tersedia.",
      posterPath: item.poster_path ?? null,
      backdropPath: item.backdrop_path ?? null,
      voteAverage: item.vote_average ?? 0,
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
      overview: item.overview || "Sinopsis belum tersedia.",
      posterPath: item.poster_path ?? null,
      backdropPath: item.backdrop_path ?? null,
      voteAverage: item.vote_average ?? 0,
    },
  } satisfies LocalizedResult;
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
