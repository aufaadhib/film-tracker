import { createHash } from "node:crypto";
import { z } from "zod";
import { isTrackableProviderUrl, isUsefulDetectedTitle, normalizeProviderUrl } from "@/lib/extension-title";
import { createClient } from "@/lib/supabase/server";
import { resolveCatalogMatch } from "@/lib/tmdb";

const syncSchema = z.object({
  eventId: z.string().uuid(),
  provider: z.enum(["netflix", "disney", "prime_video", "max"]),
  title: z.string().trim().min(1).max(300),
  canonicalTitle: z.string().trim().min(1).max(300).nullable().optional(),
  originalTitle: z.string().trim().min(1).max(300).nullable().optional(),
  seasonNumber: z.number().int().nonnegative().max(999).nullable().optional(),
  episodeNumber: z.number().int().positive().max(9999).nullable().optional(),
  episodeTitle: z.string().trim().min(1).max(300).nullable().optional(),
  url: z.string().url().max(2048).nullable().optional(),
  duration: z.preprocess(
    (value) => typeof value === "number" && value > 24 * 60 * 60 ? null : value,
    z.number().int().positive().max(24 * 60 * 60).nullable().optional(),
  ),
  progress: z.number().min(0).max(100).optional(),
  coverage: z.number().min(0).max(100).optional(),
  watchedAt: z.string().datetime({ offset: true }),
}).strict()
  .refine((data) => data.progress !== undefined || data.coverage !== undefined)
  .refine(
    (data) => (data.seasonNumber == null) === (data.episodeNumber == null),
    { message: "Season dan episode harus dikirim bersama." },
  );

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function within<T>(promise: Promise<T>, milliseconds: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Catalog lookup timed out")), milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token.length < 32 || token.length > 200) {
    return Response.json({ error: "Token extension tidak valid." }, { status: 401 });
  }

  const body = syncSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    console.warn("Extension watch payload rejected", JSON.stringify(body.error.issues.map((issue) => ({
      path: issue.path.join("."),
      code: issue.code,
      message: issue.message,
    }))));
    return Response.json({ error: "Data tontonan tidak valid." }, { status: 400 });
  }
  if (!isUsefulDetectedTitle(body.data.title, body.data.provider)) {
    console.warn("Extension watch title rejected", JSON.stringify({ provider: body.data.provider }));
    return Response.json({ error: "Data tontonan tidak valid." }, { status: 400 });
  }
  const providerItemId = normalizeProviderUrl(body.data.provider, body.data.url)?.slice(0, 1000) ?? null;
  if (!isTrackableProviderUrl(body.data.provider, providerItemId)) {
    console.warn("Extension watch URL rejected", JSON.stringify({ provider: body.data.provider, hasUrl: Boolean(providerItemId) }));
    return Response.json({ error: "Halaman ini bukan pemutar yang didukung." }, { status: 400 });
  }

  const watchedAt = Date.parse(body.data.watchedAt);
  const now = Date.now();
  if (watchedAt > now + 5 * 60 * 1000 || watchedAt < now - 365 * 24 * 60 * 60 * 1000) {
    console.warn("Extension watch timestamp rejected", JSON.stringify({ watchedAt: body.data.watchedAt }));
    return Response.json({ error: "Waktu tontonan tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "Backend Reelmark belum dikonfigurasi." }, { status: 503 });
  }

  let match = null;
  try {
    match = await within(resolveCatalogMatch({
      canonicalTitle: body.data.canonicalTitle,
      detectedTitle: body.data.title,
      provider: body.data.provider,
      providerUrl: body.data.url,
    }), 7000);
  } catch (error) {
    console.error("Extension catalog match failed", error);
  }

  const { data, error } = await supabase.rpc("sync_extension_watch_v2", {
    p_token_hash: hash(token),
    p_event_id: body.data.eventId,
    p_provider: body.data.provider,
    p_provider_item_id: providerItemId,
    p_detected_title: body.data.title,
    p_season_number: body.data.seasonNumber ?? null,
    p_episode_number: body.data.episodeNumber ?? null,
    p_episode_title: body.data.episodeTitle ?? null,
    p_duration_seconds: body.data.duration ?? null,
    p_coverage_percent: Math.max(80, body.data.progress ?? body.data.coverage ?? 80),
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

  if (match?.mediaType === "tv") {
    const { error: metadataError } = await supabase.rpc("set_extension_catalog_status", {
      p_token_hash: hash(token),
      p_tmdb_id: match.tmdbId,
      p_series_status: match.seriesStatus,
    });
    if (metadataError) {
      console.error("Extension catalog status sync failed", JSON.stringify({ code: metadataError.code, message: metadataError.message }));
    }
  }

  return Response.json({
    synced: true,
    matched: Boolean(result.matched),
    title: match?.title ?? body.data.canonicalTitle ?? body.data.title,
    originalTitle: match?.originalTitle ?? body.data.originalTitle ?? null,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
