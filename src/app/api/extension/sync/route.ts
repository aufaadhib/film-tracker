import { createHash } from "node:crypto";
import { z } from "zod";
import type { CatalogResult } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { searchCatalog } from "@/lib/tmdb";

const syncSchema = z.object({
  eventId: z.string().uuid(),
  provider: z.enum(["netflix", "disney", "prime_video", "max"]),
  title: z.string().trim().min(1).max(300),
  url: z.string().url().max(2048).nullable().optional(),
  duration: z.number().int().positive().max(24 * 60 * 60).nullable().optional(),
  coverage: z.number().min(80).max(100),
  watchedAt: z.string().datetime({ offset: true }),
}).strict();

const providerHosts = {
  netflix: "www.netflix.com",
  disney: "www.disneyplus.com",
  prime_video: "www.primevideo.com",
  max: "play.max.com",
} as const;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function exactMatch(query: string, results: CatalogResult[]) {
  const normalized = normalizeTitle(query);
  return results.find((item) =>
    normalizeTitle(item.title) === normalized || normalizeTitle(item.originalTitle) === normalized,
  ) ?? null;
}

function safeProviderUrl(provider: keyof typeof providerHosts, value?: string | null) {
  if (!value) return null;
  const url = new URL(value);
  if (url.hostname !== providerHosts[provider]) return null;
  return `${url.origin}${url.pathname}`.slice(0, 1000);
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token.length < 32 || token.length > 200) {
    return Response.json({ error: "Token extension tidak valid." }, { status: 401 });
  }

  const body = syncSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Data tontonan tidak valid." }, { status: 400 });
  }

  const watchedAt = Date.parse(body.data.watchedAt);
  const now = Date.now();
  if (watchedAt > now + 5 * 60 * 1000 || watchedAt < now - 365 * 24 * 60 * 60 * 1000) {
    return Response.json({ error: "Waktu tontonan tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "Backend Reelmark belum dikonfigurasi." }, { status: 503 });
  }

  let match: CatalogResult | null = null;
  try {
    const catalog = await searchCatalog(body.data.title);
    match = exactMatch(body.data.title, catalog.results);
  } catch (error) {
    console.error("Extension catalog match failed", error);
  }

  const { data, error } = await supabase.rpc("sync_extension_watch", {
    p_token_hash: hash(token),
    p_event_id: body.data.eventId,
    p_provider: body.data.provider,
    p_provider_item_id: safeProviderUrl(body.data.provider, body.data.url),
    p_detected_title: body.data.title,
    p_duration_seconds: body.data.duration ?? null,
    p_coverage_percent: body.data.coverage,
    p_watched_at: body.data.watchedAt,
    p_tmdb_id: match?.tmdbId ?? null,
    p_media_type: match?.mediaType ?? null,
    p_title: match?.title ?? null,
    p_original_title: match?.originalTitle ?? null,
    p_release_year: match?.year ?? null,
    p_overview: match?.overview ?? null,
    p_poster_path: match?.posterPath ?? null,
    p_backdrop_path: match?.backdropPath ?? null,
    p_vote_average: match?.voteAverage ?? null,
  });

  if (error) {
    console.error("Extension sync failed", JSON.stringify({ code: error.code, message: error.message }));
    return Response.json({ error: "Tontonan belum berhasil disinkronkan." }, { status: 503 });
  }

  const result = data as { authenticated?: boolean; synced?: boolean; matched?: boolean } | null;
  if (!result?.authenticated) {
    return Response.json({ error: "Pairing extension tidak lagi valid." }, { status: 401 });
  }
  if (!result.synced) {
    return Response.json({ error: "Tontonan ditolak karena datanya tidak valid." }, { status: 400 });
  }

  return Response.json({ synced: true, matched: Boolean(result.matched) }, {
    headers: { "Cache-Control": "no-store" },
  });
}
