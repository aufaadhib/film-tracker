import { createHash } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const progressSchema = z.object({
  eventId: z.string().uuid(),
  provider: z.enum(["netflix", "disney", "prime_video", "max"]),
  title: z.string().trim().min(1).max(300),
  url: z.string().url().max(2048).nullable().optional(),
  duration: z.number().int().positive().max(24 * 60 * 60),
  currentTime: z.number().int().nonnegative().max(24 * 60 * 60),
  progress: z.number().min(0).max(100),
  coverage: z.number().min(0).max(100),
  observedAt: z.string().datetime({ offset: true }),
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
    return Response.json({ error: "Token extension tidak valid." }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const body = progressSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || body.data.currentTime > body.data.duration + 30) {
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

  const { data, error } = await supabase.rpc("sync_extension_progress", {
    p_token_hash: hash(token),
    p_event_id: body.data.eventId,
    p_provider: body.data.provider,
    p_provider_item_id: safeProviderUrl(body.data.provider, body.data.url),
    p_detected_title: body.data.title,
    p_duration_seconds: body.data.duration,
    p_current_time_seconds: Math.min(body.data.currentTime, body.data.duration),
    p_progress_percent: body.data.progress,
    p_coverage_percent: body.data.coverage,
    p_observed_at: body.data.observedAt,
  });

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

  return Response.json({ synced: true }, { headers: { "Cache-Control": "no-store" } });
}
