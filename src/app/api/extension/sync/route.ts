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
  url: z.string().url().max(2048).nullable().optional(),
  duration: z.number().int().positive().max(24 * 60 * 60).nullable().optional(),
  progress: z.number().min(80).max(100).optional(),
  coverage: z.number().min(80).max(100).optional(),
  watchedAt: z.string().datetime({ offset: true }),
}).strict().refine((data) => data.progress !== undefined || data.coverage !== undefined);

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token.length < 32 || token.length > 200) {
    return Response.json({ error: "Token extension tidak valid." }, { status: 401 });
  }

  const body = syncSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !isUsefulDetectedTitle(body.data.title, body.data.provider)) {
    return Response.json({ error: "Data tontonan tidak valid." }, { status: 400 });
  }
  const providerItemId = normalizeProviderUrl(body.data.provider, body.data.url)?.slice(0, 1000) ?? null;
  if (!isTrackableProviderUrl(body.data.provider, providerItemId)) {
    return Response.json({ error: "Halaman ini bukan pemutar yang didukung." }, { status: 400 });
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

  let match = null;
  try {
    match = await resolveCatalogMatch({
      canonicalTitle: body.data.canonicalTitle,
      detectedTitle: body.data.title,
      provider: body.data.provider,
      providerUrl: body.data.url,
    });
  } catch (error) {
    console.error("Extension catalog match failed", error);
  }

  const { data, error } = await supabase.rpc("sync_extension_watch", {
    p_token_hash: hash(token),
    p_event_id: body.data.eventId,
    p_provider: body.data.provider,
    p_provider_item_id: providerItemId,
    p_detected_title: body.data.title,
    p_duration_seconds: body.data.duration ?? null,
    p_coverage_percent: body.data.progress ?? body.data.coverage,
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

  return Response.json({
    synced: true,
    matched: Boolean(result.matched),
    title: match?.title ?? body.data.canonicalTitle ?? body.data.title,
    originalTitle: match?.originalTitle ?? body.data.originalTitle ?? null,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
