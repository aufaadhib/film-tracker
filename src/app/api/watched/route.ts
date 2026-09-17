import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCatalogTitle } from "@/lib/tmdb";

const watchedSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
}).strict();

export async function POST(request: Request) {
  const body = watchedSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Data judul tidak valid." }, { status: 400 });
  }

  let title;
  try {
    title = await getCatalogTitle(body.data.tmdbId, body.data.mediaType);
  } catch (error) {
    console.error("Catalog title lookup failed", error);
    return Response.json({ error: "Metadata judul sedang tidak dapat diverifikasi." }, { status: 502 });
  }
  if (!title) return Response.json({ error: "Judul tidak ditemukan di katalog TMDB." }, { status: 404 });

  if (!hasSupabaseEnv()) return Response.json({ mode: "demo", watched: true });

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase!.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Mark watched user lookup failed", JSON.stringify({ name: authError.name, message: authError.message }));
    return Response.json({ error: "Sesi pengguna sedang tidak dapat diverifikasi." }, { status: 503 });
  }
  if (!authData.user) {
    return Response.json(
      { error: "Masuk untuk menyimpan riwayat ke akunmu." },
      { status: 401 },
    );
  }

  const { error } = await supabase!.rpc("mark_title_watched", {
    p_tmdb_id: title.tmdbId,
    p_media_type: title.mediaType,
    p_title: title.title,
    p_original_title: title.originalTitle,
    p_release_year: title.year,
    p_overview: title.overview,
    p_poster_path: title.posterPath,
    p_backdrop_path: title.backdropPath,
    p_vote_average: title.voteAverage,
  });

  if (error) {
    console.error("Mark watched failed", JSON.stringify({
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    }));
    if (error.code === "PGRST202" || error.code === "PGRST205") {
      return Response.json(
        { error: "Database Reelmark belum disiapkan. Jalankan migration Supabase terlebih dahulu." },
        { status: 503 },
      );
    }
    return Response.json(
      { error: "Riwayat belum berhasil disimpan. Coba lagi." },
      { status: 500 },
    );
  }

  return Response.json({ mode: "supabase", watched: true });
}
