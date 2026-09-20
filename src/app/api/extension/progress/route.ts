import { createHash } from "node:crypto";
import { z } from "zod";
import { formatDisplayTitle, type CatalogResult } from "@/lib/catalog";
import { getExtensionCompletionThreshold } from "@/lib/extension-preferences";
import { isTrackableProviderUrl, isUsefulDetectedTitle, normalizeProviderUrl } from "@/lib/extension-title";
import { createClient } from "@/lib/supabase/server";
import { resolveCatalogMatch } from "@/lib/tmdb";

const progressSchema = z.object({
  eventId: z.string().uuid(),
  provider: z.enum(["netflix", "disney", "prime_video", "max"]),
  title: z.string().trim().min(1).max(300),
  canonicalTitle: z.string().trim().min(1).max(300).nullable().optional(),
  originalTitle: z.string().trim().min(1).max(300).nullable().optional(),
  seasonNumber: z.number().int().nonnegative().max(999).nullable().optional(),
  episodeNumber: z.number().int().positive().max(9999).nullable().optional(),
  episodeTitle: z.string().trim().min(1).max(300).nullable().optional(),
  url: z.string().url().max(2048).nullable().optional(),
  duration: z.number().int().positive().max(24 * 60 * 60),
  currentTime: z.number().int().nonnegative().max(24 * 60 * 60),
  progress: z.number().min(0).max(100),
  coverage: z.number().min(0).max(100).optional(),
  observedAt: z.string().datetime({ offset: true }),
}).strict().refine(
  (data) => (data.seasonNumber == null) === (data.episodeNumber == null),
  { message: "Season dan episode harus dikirim bersama." },
);

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function syncFailure(
  data: unknown,
  error: { code?: string; message: string } | null,
) {
  if (error) {
    console.error("Extension progress sync failed", JSON.stringify({ code: error.code, message: error.message }));
    return Response.json({ error: "Progres belum berhasil disinkronkan." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const result = data as { authenticated?: boolean; synced?: boolean } | null;
  if (!result?.authenticated) {
    return Response.json({ error: "Pairing extension tidak lagi valid." }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (!result.synced) {
    return Response.json({ error: "Progres ditolak karena datanya tidak valid." }, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return null;
}

function wasDismissed(data: unknown) {
  return Boolean((data as { dismissed?: boolean } | null)?.dismissed);
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token.length < 32 || token.length > 200) {
    return Response.json({ error: "Token extension tidak valid." }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const body = progressSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    console.warn("Extension progress payload rejected", JSON.stringify(body.error.issues.map((issue) => ({
      path: issue.path.join("."),
      code: issue.code,
      message: issue.message,
    }))));
    return Response.json({ error: "Data progres tidak valid." }, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (!isUsefulDetectedTitle(body.data.title, body.data.provider)) {
    console.warn("Extension progress title rejected", JSON.stringify({ provider: body.data.provider }));
    return Response.json({ error: "Data progres tidak valid." }, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (body.data.currentTime > body.data.duration + 30) {
    console.warn("Extension progress timeline rejected", JSON.stringify({
      duration: body.data.duration,
      currentTime: body.data.currentTime,
    }));
    return Response.json({ error: "Data progres tidak valid." }, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const observedAt = Date.parse(body.data.observedAt);
  const now = Date.now();
  if (observedAt > now + 5 * 60 * 1000 || observedAt < now - 30 * 24 * 60 * 60 * 1000) {
    return Response.json({ error: "Waktu progres tidak valid." }, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "Backend Reelmark belum dikonfigurasi." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const preferences = await getExtensionCompletionThreshold(supabase, hash(token));
  if (preferences.error) {
    return Response.json({ error: "Pengaturan extension belum dapat dimuat." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (!preferences.authenticated) {
    return Response.json({ error: "Pairing extension tidak lagi valid." }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const providerItemId = normalizeProviderUrl(body.data.provider, body.data.url)?.slice(0, 1000) ?? null;
  if (!isTrackableProviderUrl(body.data.provider, providerItemId)) {
    return Response.json({ error: "Video preview tidak disimpan sebagai progres." }, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const syncProgress = (title: string) => supabase.rpc("sync_extension_progress_v2", {
    p_token_hash: hash(token),
    p_event_id: body.data.eventId,
    p_provider: body.data.provider,
    p_provider_item_id: providerItemId,
    p_detected_title: title,
    p_season_number: body.data.seasonNumber ?? null,
    p_episode_number: body.data.episodeNumber ?? null,
    p_episode_title: body.data.episodeTitle ?? null,
    p_duration_seconds: body.data.duration,
    p_current_time_seconds: Math.min(body.data.currentTime, body.data.duration),
    p_progress_percent: body.data.progress,
    p_coverage_percent: body.data.progress,
    p_observed_at: body.data.observedAt,
  });

  let canonicalTitle = body.data.canonicalTitle ?? body.data.title;
  let originalTitle = body.data.originalTitle ?? null;
  let storedTitle = formatDisplayTitle(canonicalTitle, originalTitle).slice(0, 300);
  let matched = Boolean(body.data.canonicalTitle);
  let catalogMatch: CatalogResult | null = null;
  let syncResult = await syncProgress(storedTitle);
  let failure = syncFailure(syncResult.data, syncResult.error);
  if (failure) return failure;
  if (wasDismissed(syncResult.data)) {
    return Response.json({ synced: true, dismissed: true, title: canonicalTitle, originalTitle, completionThreshold: preferences.completionThreshold }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (!body.data.canonicalTitle || !body.data.originalTitle) {
    try {
      catalogMatch = await resolveCatalogMatch({
        canonicalTitle: body.data.canonicalTitle,
        detectedTitle: body.data.title,
        provider: body.data.provider,
        providerUrl: body.data.url,
        expectedMediaType: body.data.episodeNumber != null ? "tv" : null,
      });
      if (catalogMatch) {
        canonicalTitle = catalogMatch.title;
        originalTitle = catalogMatch.originalTitle;
        storedTitle = formatDisplayTitle(canonicalTitle, originalTitle).slice(0, 300);
        matched = true;
        syncResult = await syncProgress(storedTitle);
        failure = syncFailure(syncResult.data, syncResult.error);
        if (failure) return failure;
        if (wasDismissed(syncResult.data)) {
          return Response.json({ synced: true, dismissed: true, title: canonicalTitle, originalTitle, completionThreshold: preferences.completionThreshold }, {
            headers: { "Cache-Control": "no-store" },
          });
        }
      }
    } catch (error) {
      console.error("Extension progress catalog match failed", error);
    }
  }

  if (catalogMatch) {
    const { error } = await supabase.rpc("set_extension_progress_catalog", {
      p_token_hash: hash(token),
      p_event_id: body.data.eventId,
      p_tmdb_id: catalogMatch.tmdbId,
      p_media_type: catalogMatch.mediaType,
      p_series_status: catalogMatch.seriesStatus,
    });
    if (error) {
      console.error("Extension progress metadata sync failed", JSON.stringify({ code: error.code, message: error.message }));
    }
  }

  return Response.json({ synced: true, matched, dismissed: false, title: canonicalTitle, originalTitle, completionThreshold: preferences.completionThreshold }, {
    headers: { "Cache-Control": "no-store" },
  });
}
